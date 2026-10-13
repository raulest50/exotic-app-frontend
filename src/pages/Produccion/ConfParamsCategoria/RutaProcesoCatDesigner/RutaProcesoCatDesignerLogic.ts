import type { Edge, Node } from "@xyflow/react";
import type {
    RutaProcesoCatDTO,
    RutaProcesoEdgeDTO,
    RutaProcesoNodeDTO,
    RutaProcesoNodeData,
} from "./types.ts";

// Conversión de la ruta recibida de la API al modelo del diseñador.
export function toFlowNodes(ruta: RutaProcesoCatDTO): Node<RutaProcesoNodeData>[] {
    return ruta.nodes.map((node: RutaProcesoNodeDTO) => ({
        id: node.id,
        type: 'areaOperativaNode',
        position: { x: node.posicionX, y: node.posicionY },
        data: {
            label: node.label || node.areaOperativaNombre || 'Sin asignar',
            areaOperativaId: node.areaOperativaId,
            areaOperativaNombre: node.areaOperativaNombre,
            procesoProduccionId: node.procesoProduccionId ?? null,
            procesoProduccionNombre: node.procesoProduccionNombre ?? null,
            poeVigenteDisponible: node.poeVigenteDisponible ?? false,
            poeVigenteVersion: node.poeVigenteVersion ?? null,
            hasLeftHandle: node.hasLeftHandle ?? true,
            hasRightHandle: node.hasRightHandle ?? true,
            duracionEstimadaMinutos: node.duracionEstimadaMinutos ?? 0,
            requiereJornadaLaboral: node.requiereJornadaLaboral ?? true,
        },
    }));
}

export function toFlowEdges(ruta: RutaProcesoCatDTO): Edge[] {
    return ruta.edges.map((edge: RutaProcesoEdgeDTO) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
    }));
}

export function getNextNodeId(ruta: RutaProcesoCatDTO): number {
    const maxId = Math.max(0, ...ruta.nodes.map((node) => Number.parseInt(node.id, 10) || 0));
    return maxId + 1;
}

// Validación de la ruta y de las conexiones.
export const ALMACEN_GENERAL_ID = -1;
export const ALMACEN_GENERAL_NOMBRE = "Almacen General";

export interface RutaValidationResult {
    isValid: boolean;
    errors: string[];
}

type RutaNode = Node<RutaProcesoNodeData>;
type RutaEdge = Edge;

export function validateRuta(nodes: RutaNode[], edges: RutaEdge[]): RutaValidationResult {
    const errors: string[] = [];

    if (nodes.length === 0) {
        errors.push("La ruta debe contener al menos un nodo.");
        return { isValid: false, errors };
    }

    const nodeMap = new Map<string, RutaNode>();
    const adjacency = new Map<string, Set<string>>();
    const indegree = new Map<string, number>();
    const areaIds = new Set<number>();
    let almacenCount = 0;

    for (const node of nodes) {
        if (nodeMap.has(node.id)) {
            errors.push("La ruta contiene nodos duplicados.");
            continue;
        }

        const areaId = node.data.areaOperativaId;
        if (areaId == null) {
            errors.push("Todos los nodos deben tener un área operativa asignada.");
            continue;
        }

        if (areaIds.has(areaId)) {
            errors.push("No se permite repetir la misma área operativa en la ruta.");
        } else {
            areaIds.add(areaId);
        }

        if (areaId === ALMACEN_GENERAL_ID) {
            almacenCount += 1;
            if (node.data.procesoProduccionId != null) {
                errors.push("Almacen General no puede tener un proceso de producción asignado.");
            }
        } else if (node.data.procesoProduccionId == null) {
            errors.push("Cada área productiva debe tener un proceso de producción asignado.");
        }

        nodeMap.set(node.id, node);
        adjacency.set(node.id, new Set<string>());
        indegree.set(node.id, 0);
    }

    if (almacenCount !== 1) {
        errors.push("La ruta debe incluir exactamente un nodo de Almacen General.");
    }
    if (nodes.length < 2) {
        errors.push("La ruta debe incluir al menos un área productiva además de Almacen General.");
    }

    const edgePairs = new Set<string>();
    for (const edge of edges) {
        if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
            errors.push("La ruta contiene conexiones hacia nodos inexistentes.");
            continue;
        }

        if (edge.source === edge.target) {
            errors.push("No se permiten ciclos directos de un nodo hacia sí mismo.");
            continue;
        }

        const pairKey = `${edge.source}->${edge.target}`;
        if (edgePairs.has(pairKey)) {
            errors.push("No se permiten conexiones duplicadas entre la misma pareja de nodos.");
            continue;
        }
        edgePairs.add(pairKey);

        adjacency.get(edge.source)?.add(edge.target);
        indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    }

    const terminalIds = Array.from(adjacency.entries())
        .filter(([, targets]) => targets.size === 0)
        .map(([nodeId]) => nodeId);

    if (terminalIds.length !== 1) {
        errors.push("La ruta debe terminar en exactamente una única área operativa.");
    } else if (nodeMap.get(terminalIds[0])?.data.areaOperativaId === ALMACEN_GENERAL_ID) {
        errors.push("Almacen General no puede ser el nodo terminal de la ruta.");
    }

    const rootIds = Array.from(indegree.entries())
        .filter(([, degree]) => degree === 0)
        .map(([nodeId]) => nodeId);

    if (rootIds.length !== 1) {
        errors.push("La ruta debe tener exactamente un nodo raíz.");
    } else {
        const rootNode = nodeMap.get(rootIds[0]);
        if (rootNode?.data.areaOperativaId !== ALMACEN_GENERAL_ID) {
            errors.push("El nodo raíz debe ser Almacen General.");
        }
    }

    for (const [nodeId, node] of nodeMap.entries()) {
        if (node.data.areaOperativaId === ALMACEN_GENERAL_ID && (indegree.get(nodeId) ?? 0) > 0) {
            errors.push("Almacen General no puede tener predecesores.");
        }
    }

    if (rootIds.length === 1) {
        const visited = new Set<string>();
        const queue = [rootIds[0]];
        visited.add(rootIds[0]);

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) {
                continue;
            }

            for (const target of adjacency.get(current) ?? []) {
                if (!visited.has(target)) {
                    visited.add(target);
                    queue.push(target);
                }
            }
        }

        if (visited.size !== nodeMap.size) {
            errors.push("La ruta no puede contener nodos huérfanos o desconectados del flujo principal.");
        }
    }

    if (hasCycle(nodeMap, adjacency, indegree)) {
        errors.push("La ruta debe ser un grafo acíclico dirigido (DAG).");
    }

    return {
        isValid: errors.length === 0,
        errors: uniqueErrors(errors),
    };
}

export function getConnectionError(
    connection: Pick<RutaEdge, "source" | "target">,
    nodes: RutaNode[],
    edges: RutaEdge[],
): string | null {
    if (!connection.source || !connection.target) {
        return "La conexión debe tener origen y destino.";
    }

    if (connection.source === connection.target) {
        return "No se permite conectar un nodo consigo mismo.";
    }

    const sourceNode = nodes.find((node) => node.id === connection.source);
    const targetNode = nodes.find((node) => node.id === connection.target);

    if (!sourceNode || !targetNode) {
        return "La conexión referencia nodos inexistentes.";
    }

    if (targetNode.data.areaOperativaId === ALMACEN_GENERAL_ID) {
        return "Almacen General solo puede ser el nodo inicial y no puede recibir conexiones.";
    }

    const isDuplicate = edges.some(
        (edge) => edge.source === connection.source && edge.target === connection.target,
    );
    if (isDuplicate) {
        return "Ya existe una conexión entre esos dos nodos.";
    }

    if (wouldCreateCycle(connection.source, connection.target, edges)) {
        return "Esa conexión crearía un ciclo en la ruta.";
    }

    return null;
}

function hasCycle(
    nodeMap: Map<string, RutaNode>,
    adjacency: Map<string, Set<string>>,
    indegree: Map<string, number>,
): boolean {
    const remainingIndegree = new Map(indegree);
    const queue = Array.from(remainingIndegree.entries())
        .filter(([, degree]) => degree === 0)
        .map(([nodeId]) => nodeId);

    let processed = 0;
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            continue;
        }

        processed += 1;
        for (const target of adjacency.get(current) ?? []) {
            const nextIndegree = (remainingIndegree.get(target) ?? 0) - 1;
            remainingIndegree.set(target, nextIndegree);
            if (nextIndegree === 0) {
                queue.push(target);
            }
        }
    }

    return processed !== nodeMap.size;
}

function wouldCreateCycle(sourceId: string, targetId: string, edges: RutaEdge[]): boolean {
    const adjacency = new Map<string, Set<string>>();

    for (const edge of edges) {
        if (!adjacency.has(edge.source)) {
            adjacency.set(edge.source, new Set<string>());
        }
        adjacency.get(edge.source)?.add(edge.target);
    }

    const stack = [targetId];
    const visited = new Set<string>();

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || visited.has(current)) {
            continue;
        }

        if (current === sourceId) {
            return true;
        }

        visited.add(current);
        for (const next of adjacency.get(current) ?? []) {
            stack.push(next);
        }
    }

    return false;
}

function uniqueErrors(errors: string[]): string[] {
    return Array.from(new Set(errors));
}

// Detección de cambios y disponibilidad de las opciones de guardado.
export interface RouteSaveAvailabilityInput {
    hasCurrentVersion: boolean;
    isReadOnly: boolean;
    isSaving: boolean;
    isValid: boolean;
    semanticDirty: boolean;
    layoutDirty: boolean;
}

export interface RouteSaveAvailability {
    canSaveNewVersion: boolean;
    canSaveLayout: boolean;
}

export function normalizeLayoutCoordinate(value: number): number {
    return Number(value.toFixed(2));
}

export function buildSemanticSignature(
    nodes: Node<RutaProcesoNodeData>[],
    edges: Edge[],
): string {
    return JSON.stringify({
        nodes: nodes
            .map((node) => ({
                id: node.id,
                areaOperativaId: node.data.areaOperativaId ?? null,
                procesoProduccionId: node.data.procesoProduccionId ?? null,
                label: node.data.label ?? "",
                hasLeftHandle: node.data.hasLeftHandle ?? true,
                hasRightHandle: node.data.hasRightHandle ?? true,
                duracionEstimadaMinutos: node.data.duracionEstimadaMinutos ?? 0,
                requiereJornadaLaboral: node.data.requiereJornadaLaboral ?? true,
            }))
            .sort((left, right) => left.id.localeCompare(right.id)),
        edges: edges
            .map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
            }))
            .sort((left, right) => left.id.localeCompare(right.id)),
    });
}

export function buildLayoutSignature(nodes: Node<RutaProcesoNodeData>[]): string {
    return JSON.stringify(
        nodes
            .map((node) => ({
                id: node.id,
                x: normalizeLayoutCoordinate(node.position.x),
                y: normalizeLayoutCoordinate(node.position.y),
            }))
            .sort((left, right) => left.id.localeCompare(right.id)),
    );
}

export function getRouteSaveAvailability({
    hasCurrentVersion,
    isReadOnly,
    isSaving,
    isValid,
    semanticDirty,
    layoutDirty,
}: RouteSaveAvailabilityInput): RouteSaveAvailability {
    return {
        canSaveNewVersion:
            !isReadOnly
            && !isSaving
            && isValid
            && (!hasCurrentVersion || semanticDirty),
        canSaveLayout:
            !isReadOnly
            && !isSaving
            && hasCurrentVersion
            && layoutDirty
            && !semanticDirty,
    };
}
