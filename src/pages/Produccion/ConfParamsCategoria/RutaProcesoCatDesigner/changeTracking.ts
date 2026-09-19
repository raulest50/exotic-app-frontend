import type { Edge, Node } from "@xyflow/react";
import type { RutaProcesoNodeData } from "./types.ts";

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

