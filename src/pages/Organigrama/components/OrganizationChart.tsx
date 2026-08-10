import { useEffect, useMemo, useRef } from "react";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import { useBlocker } from "react-router-dom";
import "@xyflow/react/dist/style.css";
import { AccessLevel, type Cargo } from "../types";
import { useOrganigramaEditor } from "../useOrganigramaEditor";
import CargoNode from "./CargoNode";
import EditCargoDialog from "./EditCargoDialog";
import ManualFuncionesDialog from "./ManualFuncionesDialog";

const nodeTypes: NodeTypes = { positionNode: CargoNode };

interface Props {
  accessLevel: AccessLevel;
  isMaster: boolean;
  organizationChartId: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

function toCargo(data: Cargo & Record<string, unknown>): Cargo {
  return {
    idCargo: data.idCargo,
    tituloCargo: data.tituloCargo,
    descripcionCargo: data.descripcionCargo,
    departamento: data.departamento,
    usuario: data.usuario,
    nivel: data.nivel,
    urlDocManualFunciones: data.urlDocManualFunciones,
  };
}

export default function OrganizationChart({
  accessLevel,
  isMaster,
  organizationChartId,
  onDirtyChange,
}: Props) {
  const toast = useToast();
  const leaveCancelRef = useRef<HTMLButtonElement>(null);
  const editor = useOrganigramaEditor({ accessLevel, isMaster, organizationChartId });

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      editor.isDirty &&
      `${currentLocation.pathname}${currentLocation.search}` !==
        `${nextLocation.pathname}${nextLocation.search}`,
  );

  useEffect(() => onDirtyChange?.(editor.isDirty), [editor.isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const editingCargo = useMemo(
    () => (editor.editingNode ? toCargo(editor.editingNode.data) : null),
    [editor.editingNode],
  );
  const detailsCargo = useMemo(
    () => (editor.detailsNode ? toCargo(editor.detailsNode.data) : null),
    [editor.detailsNode],
  );

  const save = async () => {
    if (await editor.save()) {
      toast({ title: "Organigrama guardado.", status: "success", duration: 3000 });
    }
  };

  const reload = async () => {
    if (
      editor.isDirty &&
      !window.confirm("¿Descartar tu borrador y cargar la versión vigente del organigrama?")
    ) {
      return;
    }
    if (await editor.reload()) {
      toast({ title: "Organigrama recargado.", status: "info", duration: 2500 });
    }
  };

  const closeEdit = () => {
    if (
      editingCargo &&
      !editor.isPersisted(editingCargo.idCargo) &&
      !editingCargo.tituloCargo.trim() &&
      !editingCargo.departamento.trim() &&
      !editingCargo.descripcionCargo.trim()
    ) {
      editor.deleteCargo(editingCargo.idCargo);
      return;
    }
    editor.closeEdit();
  };

  const deleteEditingCargo = () => {
    if (!editingCargo) return;
    if (!window.confirm(`¿Eliminar el cargo "${editingCargo.tituloCargo || "sin título"}" del borrador?`)) {
      return;
    }
    editor.deleteCargo(editingCargo.idCargo);
  };

  if (editor.isLoading) {
    return (
      <Flex minH="65vh" align="center" justify="center">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box>
      <Flex mb={3} gap={3} align="center" wrap="wrap">
        {editor.canEdit && (
          <>
            <Button colorScheme="blue" onClick={editor.addCargo}>
              Agregar cargo
            </Button>
            <Button
              colorScheme="green"
              onClick={() => void save()}
              isDisabled={!editor.isDirty}
              isLoading={editor.isSaving}
              loadingText="Guardando"
            >
              Guardar organigrama
            </Button>
          </>
        )}
        <Button variant="outline" onClick={() => void reload()} isDisabled={editor.isSaving}>
          Recargar
        </Button>
        {editor.isDirty ? (
          <Badge colorScheme="orange" fontSize="sm" px={2} py={1}>
            Cambios sin guardar
          </Badge>
        ) : (
          <Badge colorScheme="green" fontSize="sm" px={2} py={1}>
            Sincronizado
          </Badge>
        )}
        {!editor.canEdit && <Text color="app.textMuted">Modo de solo visualización</Text>}
      </Flex>

      {editor.error && (
        <Alert status={editor.hasConflict ? "warning" : "error"} mb={3} borderRadius="md">
          <AlertIcon />
          <AlertDescription flex="1">{editor.error}</AlertDescription>
          {editor.hasConflict && (
            <Button size="sm" mr={2} onClick={() => void reload()}>
              Descartar y recargar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={editor.clearError}>
            Cerrar
          </Button>
        </Alert>
      )}

      <Box h="72vh" minH="520px" border="1px solid" borderColor="app.border" borderRadius="md">
        <ReactFlow
          nodes={editor.nodes}
          edges={editor.edges}
          nodeTypes={nodeTypes}
          onNodesChange={editor.onNodesChange}
          onEdgesChange={editor.onEdgesChange}
          onConnect={editor.onConnect}
          nodesDraggable={editor.canEdit}
          nodesConnectable={editor.canEdit}
          nodesDeletable={false}
          edgesReconnectable={false}
          deleteKeyCode={editor.canEdit ? ["Backspace", "Delete"] : null}
          fitView
        >
          <Controls />
          <MiniMap pannable zoomable />
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        </ReactFlow>
      </Box>

      {editingCargo && (
        <EditCargoDialog
          isOpen
          cargo={editingCargo}
          users={editor.users}
          assignedUsers={editor.assignedUsers.filter(
            (username) => username !== editingCargo.usuario,
          )}
          onClose={closeEdit}
          onSave={(cargo) => editor.updateCargo(editingCargo.idCargo, cargo)}
          onDelete={deleteEditingCargo}
        />
      )}

      {detailsCargo && (
        <ManualFuncionesDialog
          isOpen
          cargo={detailsCargo}
          canEdit={editor.canEdit}
          isPersisted={editor.isPersisted(detailsCargo.idCargo)}
          isLoading={editor.isManagingManual}
          onClose={editor.closeDetails}
          onOpenManual={editor.openManual}
          onUpload={editor.uploadManual}
          onSaveUrl={editor.saveManualUrl}
          onRemove={editor.removeManual}
        />
      )}

      <AlertDialog
        isOpen={blocker.state === "blocked"}
        leastDestructiveRef={leaveCancelRef}
        onClose={() => {
          if (blocker.state === "blocked") blocker.reset();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Cambios sin guardar</AlertDialogHeader>
            <AlertDialogBody>
              Si sales de esta página se descartará el borrador del organigrama.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={leaveCancelRef}
                onClick={() => {
                  if (blocker.state === "blocked") blocker.reset();
                }}
              >
                Permanecer
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                onClick={() => {
                  if (blocker.state === "blocked") blocker.proceed();
                }}
              >
                Salir y descartar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
