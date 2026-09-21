import type { AmbitoControl, PuntoAplicacionControl } from "./types";

export const ROUTE_CONTROLS_CHANGED_EVENT = "route-controls-changed";

/** Published configuration only, never execution results or route topology. */
export interface RouteControlSummary {
    planId: number;
    codigo: string;
    nombre: string;
    ambito: AmbitoControl;
    version: number;
    puntoAplicacion: PuntoAplicacionControl;
    frontendNodeId: string | null;
    areaOperativaId: number | null;
    procesoProduccionId: number | null;
    productoId: string | null;
    productoNombre: string | null;
    categoriaId: number | null;
    legadoGlobal: boolean;
    productosExcluidosIds: string[];
}

interface RouteControlNode {
    id: string;
    data: {
        kind?: string;
        areaOperativaId?: number | null;
        procesoProduccionId?: number | null;
    };
}

interface RouteControlEdge { id: string; source: string; target: string }

export interface RouteControlNodeIndicators {
    processControls?: RouteControlSummary[];
    finalQualityControls?: RouteControlSummary[];
}

export function uniqueRouteControls(controls: RouteControlSummary[]): RouteControlSummary[] {
    return [...new Map(controls.map((control) => [`${control.planId}:${control.version}`, control])).values()];
}

export function indexRouteControls(
    nodes: RouteControlNode[], edges: RouteControlEdge[], controls: RouteControlSummary[],
) {
    const processByNode = new Map<string, RouteControlSummary[]>();
    const qualityByEdge = new Map<string, RouteControlSummary[]>();
    const finalByNode = new Map<string, RouteControlSummary[]>();
    const located = new Set<RouteControlSummary>();
    const operational = nodes.filter((node) => node.data.areaOperativaId != null
        && node.data.areaOperativaId !== -1 && node.data.procesoProduccionId != null);
    const finalNodeIds = new Set(nodes.filter((node) => node.data.kind === "FINAL").map((node) => node.id));
    const outgoing = new Set(edges.map((edge) => edge.source));
    const terminalNodes = operational.filter((node) => !outgoing.has(node.id));
    const finalControls = controls.filter((control) => control.ambito === "CALIDAD"
        && control.puntoAplicacion === "LOTE_FINAL");

    for (const node of operational) {
        // A node ID can survive a process reassignment; require all persisted constraints to match.
        const atNode = controls.filter((control) => control.puntoAplicacion === "SALIDA_OPERACION"
            && (!control.frontendNodeId || control.frontendNodeId === node.id)
            && (control.areaOperativaId == null || control.areaOperativaId === node.data.areaOperativaId)
            && (control.procesoProduccionId == null || control.procesoProduccionId === node.data.procesoProduccionId));
        const process = atNode.filter((control) => control.ambito === "PROCESO");
        processByNode.set(node.id, uniqueRouteControls(process));
        process.forEach((control) => located.add(control));
        const quality = atNode.filter((control) => control.ambito === "CALIDAD");
        const outputs = edges.filter((edge) => edge.source === node.id);
        for (const edge of outputs) {
            const atOutput = finalNodeIds.has(edge.target) ? [...quality, ...finalControls] : quality;
            qualityByEdge.set(edge.id, uniqueRouteControls(atOutput));
            atOutput.forEach((control) => located.add(control));
        }
        // The category designer has no persisted edge after its terminal operation.
        // Represent that output as an annotation, without inventing editable nodes or edges.
        if (outputs.length === 0) {
            const atOutput = terminalNodes.length === 1 ? [...quality, ...finalControls] : quality;
            finalByNode.set(node.id, uniqueRouteControls(atOutput));
            atOutput.forEach((control) => located.add(control));
        }
    }
    return { processByNode, qualityByEdge, finalByNode,
        unmapped: uniqueRouteControls(controls.filter((control) => !located.has(control))) };
}
