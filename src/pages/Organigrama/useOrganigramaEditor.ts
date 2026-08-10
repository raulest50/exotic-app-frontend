import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  addEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import EndPointsURL from "../../api/EndPointsURL";
import {
  clearManualFunciones,
  getOrganigramaSnapshot,
  openManualFunciones,
  saveOrganigramaSnapshot,
  setManualFuncionesUrl,
  uploadManualFunciones,
  type CargoOrganigramaApi,
  type GuardarOrganigramaPayload,
  type OrganigramaSnapshot,
} from "../../api/OrganigramaApi";
import {
  AccessLevel,
  type Cargo,
  type OrganigramaNode,
  type OrganigramaUser,
} from "./types";

const endPoints = new EndPointsURL();

interface UseOrganigramaEditorOptions {
  accessLevel: AccessLevel;
  isMaster: boolean;
  organizationChartId: string;
}

interface NodeActions {
  onEdit: (nodeId: string) => void;
  onViewDetails: (nodeId: string) => void;
}

const emptySignature = JSON.stringify({ cargos: [], relaciones: [] });

function snapshotToNodes(
  snapshot: OrganigramaSnapshot,
  accessLevel: AccessLevel,
  isMaster: boolean,
  actions: NodeActions,
): OrganigramaNode[] {
  return snapshot.cargos.map((cargo) => ({
    id: cargo.idCargo,
    type: "positionNode",
    position: { x: cargo.posicionX, y: cargo.posicionY },
    data: {
      idCargo: cargo.idCargo,
      tituloCargo: cargo.tituloCargo,
      descripcionCargo: cargo.descripcionCargo,
      departamento: cargo.departamento,
      usuario: cargo.usuario || undefined,
      nivel: cargo.nivel,
      urlDocManualFunciones: cargo.urlDocManualFunciones || undefined,
      accessLevel,
      isMaster,
      ...actions,
    },
  }));
}

function snapshotToEdges(snapshot: OrganigramaSnapshot): Edge[] {
  return snapshot.relaciones.map((relacion) => ({
    id: edgeId(relacion.jefeId, relacion.subordinadoId),
    source: relacion.jefeId,
    target: relacion.subordinadoId,
    type: "smoothstep",
  }));
}

function edgeId(source: string, target: string): string {
  return `org:${source}:${target}`;
}

function graphSignature(nodes: OrganigramaNode[], edges: Edge[]): string {
  const cargos = nodes
    .map((node) => ({
      idCargo: node.id,
      tituloCargo: node.data.tituloCargo,
      descripcionCargo: node.data.descripcionCargo,
      departamento: node.data.departamento,
      usuario: node.data.usuario || null,
      nivel: node.data.nivel,
      posicionX: node.position.x,
      posicionY: node.position.y,
    }))
    .sort((left, right) => left.idCargo.localeCompare(right.idCargo));
  const relaciones = edges
    .map((edge) => ({ jefeId: edge.source, subordinadoId: edge.target }))
    .sort((left, right) =>
      `${left.jefeId}\u0000${left.subordinadoId}`.localeCompare(
        `${right.jefeId}\u0000${right.subordinadoId}`,
      ),
    );
  return JSON.stringify({ cargos, relaciones });
}

function toSavePayload(
  revision: number,
  nodes: OrganigramaNode[],
  edges: Edge[],
): GuardarOrganigramaPayload {
  return {
    baseRevision: revision,
    cargos: nodes.map((node) => ({
      idCargo: node.id,
      tituloCargo: node.data.tituloCargo.trim(),
      descripcionCargo: node.data.descripcionCargo.trim(),
      departamento: node.data.departamento.trim(),
      usuario: node.data.usuario?.trim() || null,
      posicionX: node.position.x,
      posicionY: node.position.y,
      nivel: node.data.nivel,
    })),
    relaciones: edges.map((edge) => ({
      jefeId: edge.source,
      subordinadoId: edge.target,
    })),
  };
}

function validateDraft(nodes: OrganigramaNode[]): string | null {
  const assignedUsers = new Set<string>();
  for (const node of nodes) {
    if (
      !node.data.tituloCargo.trim() ||
      !node.data.departamento.trim() ||
      !node.data.descripcionCargo.trim()
    ) {
      return "Todos los cargos deben tener título, departamento y descripción.";
    }
    if (
      !Number.isInteger(node.data.nivel) ||
      node.data.nivel < 1 ||
      node.data.nivel > 10
    ) {
      return "El nivel jerárquico de cada cargo debe estar entre 1 y 10.";
    }
    if (!Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) {
      return "Todos los cargos deben tener coordenadas válidas.";
    }
    const username = node.data.usuario?.trim();
    if (username && assignedUsers.has(username)) {
      return `El usuario ${username} está asignado a más de un cargo.`;
    }
    if (username) assignedUsers.add(username);
  }
  return null;
}

function createsCycle(edges: Edge[], source: string, target: string): boolean {
  const pending = [target];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (current === source) return true;
    if (!visited.add(current)) continue;
    edges
      .filter((edge) => edge.source === current)
      .forEach((edge) => pending.push(edge.target));
  }
  return false;
}

function errorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const responseData = error.response?.data as
    | { detail?: string; message?: string; error?: string }
    | undefined;
  return responseData?.detail || responseData?.message || responseData?.error || fallback;
}

export function useOrganigramaEditor({
  accessLevel,
  isMaster,
  organizationChartId,
}: UseOrganigramaEditorOptions) {
  const canEdit = accessLevel === AccessLevel.EDIT || isMaster;
  const [nodes, setNodes, applyNodesChange] = useNodesState<OrganigramaNode>([]);
  const [edges, setEdges, applyEdgesChange] = useEdgesState<Edge>([]);
  const [revision, setRevision] = useState(0);
  const [baselineSignature, setBaselineSignature] = useState(emptySignature);
  const [persistedCargoIds, setPersistedCargoIds] = useState<Set<string>>(new Set());
  const [editingCargoId, setEditingCargoId] = useState<string | null>(null);
  const [detailsCargoId, setDetailsCargoId] = useState<string | null>(null);
  const [users, setUsers] = useState<OrganigramaUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagingManual, setIsManagingManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);

  const openEdit = useCallback((nodeId: string) => setEditingCargoId(nodeId), []);
  const openDetails = useCallback((nodeId: string) => setDetailsCargoId(nodeId), []);

  const applySnapshot = useCallback(
    (snapshot: OrganigramaSnapshot) => {
      const nextNodes = snapshotToNodes(snapshot, accessLevel, isMaster, {
        onEdit: openEdit,
        onViewDetails: openDetails,
      });
      const nextEdges = snapshotToEdges(snapshot);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setRevision(snapshot.revision);
      setPersistedCargoIds(new Set(snapshot.cargos.map((cargo) => cargo.idCargo)));
      setBaselineSignature(graphSignature(nextNodes, nextEdges));
      setHasConflict(false);
      setEditingCargoId(null);
      setDetailsCargoId(null);
    },
    [accessLevel, isMaster, openDetails, openEdit, setEdges, setNodes],
  );

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      applySnapshot(await getOrganigramaSnapshot());
      return true;
    } catch (loadError) {
      setError(errorMessage(loadError, "No fue posible cargar el organigrama."));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot, organizationChartId]);

  useEffect(() => {
    if (!canEdit) {
      setUsers([]);
      return;
    }
    let active = true;
    axios
      .get<OrganigramaUser[]>(endPoints.get_all_users)
      .then((response) => {
        if (active) setUsers(response.data.filter((user) => user.username !== "master"));
      })
      .catch(() => {
        if (active) setError("No fue posible cargar la lista de usuarios asignables.");
      });
    return () => {
      active = false;
    };
  }, [canEdit]);

  const currentSignature = useMemo(() => graphSignature(nodes, edges), [edges, nodes]);
  const isDirty = currentSignature !== baselineSignature;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const onNodesChange = useCallback(
    (changes: NodeChange<OrganigramaNode>[]) => {
      const allowedChanges = changes.filter((change) => {
        if (change.type === "remove") return false;
        if (!canEdit && change.type === "position") return false;
        return true;
      });
      applyNodesChange(allowedChanges);
    },
    [applyNodesChange, canEdit],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      const allowedChanges = canEdit
        ? changes
        : changes.filter((change) => change.type !== "remove");
      applyEdgesChange(allowedChanges);
    },
    [applyEdgesChange, canEdit],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit || !connection.source || !connection.target) return;
      const { source, target } = connection;
      if (source === target) {
        setError("Un cargo no puede ser jefe de sí mismo.");
        return;
      }
      if (edges.some((edge) => edge.target === target)) {
        setError("Cada cargo puede tener solamente un jefe inmediato.");
        return;
      }
      if (createsCycle(edges, source, target)) {
        setError("La relación produciría un ciclo en el organigrama.");
        return;
      }
      setError(null);
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            id: edgeId(source, target),
            type: "smoothstep",
          },
          current,
        ),
      );
    },
    [canEdit, edges, setEdges],
  );

  const addCargo = useCallback(() => {
    if (!canEdit) return;
    const idCargo = crypto.randomUUID();
    const newNode: OrganigramaNode = {
      id: idCargo,
      type: "positionNode",
      position: { x: 100, y: nodes.length * 150 },
      data: {
        idCargo,
        tituloCargo: "",
        descripcionCargo: "",
        departamento: "",
        nivel: 1,
        accessLevel,
        isMaster,
        onEdit: openEdit,
        onViewDetails: openDetails,
      },
    };
    setNodes((current) => [...current, newNode]);
    setEditingCargoId(idCargo);
  }, [accessLevel, canEdit, isMaster, nodes.length, openDetails, openEdit, setNodes]);

  const updateCargo = useCallback(
    (cargoId: string, cargo: Cargo) => {
      if (!canEdit) return;
      setNodes((current) =>
        current.map((node) =>
          node.id === cargoId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...cargo,
                  idCargo: node.id,
                },
              }
            : node,
        ),
      );
      setEditingCargoId(null);
      setError(null);
    },
    [canEdit, setNodes],
  );

  const deleteCargo = useCallback(
    (cargoId: string) => {
      if (!canEdit) return;
      setNodes((current) => current.filter((node) => node.id !== cargoId));
      setEdges((current) =>
        current.filter((edge) => edge.source !== cargoId && edge.target !== cargoId),
      );
      setEditingCargoId(null);
      setDetailsCargoId(null);
    },
    [canEdit, setEdges, setNodes],
  );

  const save = useCallback(async () => {
    if (!canEdit || !isDirty) return false;
    const validationError = validateDraft(nodes);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setIsSaving(true);
    setError(null);
    setHasConflict(false);
    try {
      const snapshot = await saveOrganigramaSnapshot(toSavePayload(revision, nodes, edges));
      applySnapshot(snapshot);
      return true;
    } catch (saveError) {
      if (axios.isAxiosError(saveError) && saveError.response?.status === 409) {
        setHasConflict(true);
        setError(
          "Otro usuario guardó cambios en el organigrama. Tu borrador se conserva; recarga para ver la versión vigente.",
        );
      } else {
        setError(errorMessage(saveError, "No fue posible guardar el organigrama."));
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [applySnapshot, canEdit, edges, isDirty, nodes, revision]);

  const updateManualInNode = useCallback(
    (cargo: CargoOrganigramaApi) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === cargo.idCargo
            ? {
                ...node,
                data: {
                  ...node.data,
                  urlDocManualFunciones: cargo.urlDocManualFunciones || undefined,
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const manageManual = useCallback(
    async (operation: () => Promise<CargoOrganigramaApi>) => {
      setIsManagingManual(true);
      setError(null);
      try {
        updateManualInNode(await operation());
        return true;
      } catch (manualError) {
        setError(errorMessage(manualError, "No fue posible actualizar el manual de funciones."));
        return false;
      } finally {
        setIsManagingManual(false);
      }
    },
    [updateManualInNode],
  );

  const uploadManual = useCallback(
    (cargoId: string, file: File) =>
      manageManual(() => uploadManualFunciones(cargoId, file)),
    [manageManual],
  );
  const saveManualUrl = useCallback(
    (cargoId: string, url: string) =>
      manageManual(() => setManualFuncionesUrl(cargoId, url)),
    [manageManual],
  );
  const removeManual = useCallback(
    (cargoId: string) => manageManual(() => clearManualFunciones(cargoId)),
    [manageManual],
  );
  const openManual = useCallback(async (cargo: Cargo) => {
    try {
      await openManualFunciones({
        ...cargo,
        posicionX: 0,
        posicionY: 0,
        usuario: cargo.usuario || null,
        urlDocManualFunciones: cargo.urlDocManualFunciones || null,
      });
      return true;
    } catch (manualError) {
      setError(errorMessage(manualError, "No fue posible abrir el manual de funciones."));
      return false;
    }
  }, []);

  const editingNode = nodes.find((node) => node.id === editingCargoId) || null;
  const detailsNode = nodes.find((node) => node.id === detailsCargoId) || null;
  const assignedUsers = nodes
    .map((node) => node.data.usuario)
    .filter((username): username is string => Boolean(username));

  return {
    nodes,
    edges,
    users,
    assignedUsers,
    editingNode,
    detailsNode,
    isLoading,
    isSaving,
    isManagingManual,
    isDirty,
    canEdit,
    hasConflict,
    error,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addCargo,
    updateCargo,
    deleteCargo,
    save,
    reload: loadSnapshot,
    closeEdit: () => setEditingCargoId(null),
    closeDetails: () => setDetailsCargoId(null),
    clearError: () => setError(null),
    isPersisted: (cargoId: string) => persistedCargoIds.has(cargoId),
    uploadManual,
    saveManualUrl,
    removeManual,
    openManual,
  };
}
