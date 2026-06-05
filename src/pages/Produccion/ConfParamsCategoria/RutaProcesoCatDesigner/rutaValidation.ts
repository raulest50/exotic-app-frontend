import { Edge, Node } from "@xyflow/react";
import { RutaProcesoNodeData } from "./types";

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
        }

        nodeMap.set(node.id, node);
        adjacency.set(node.id, new Set<string>());
        indegree.set(node.id, 0);
    }

    if (almacenCount !== 1) {
        errors.push("La ruta debe incluir exactamente un nodo de Almacen General.");
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
