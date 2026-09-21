import { describe, expect, test } from "bun:test";
import { indexRouteControls, type RouteControlSummary } from "../src/features/controles/routeControlSummary";

const nodes = [
    { id: "warehouse", data: { areaOperativaId: -1, procesoProduccionId: null } },
    { id: "mix", data: { areaOperativaId: 10, procesoProduccionId: 20 } },
    { id: "pack", data: { areaOperativaId: 11, procesoProduccionId: 21 } },
];
const edges = [
    { id: "w-m", source: "warehouse", target: "mix" },
    { id: "m-p", source: "mix", target: "pack" },
];
function control(overrides: Partial<RouteControlSummary> = {}): RouteControlSummary {
    return { planId: 1, codigo: "QC-1", nombre: "Control", version: 1, ambito: "CALIDAD",
        puntoAplicacion: "SALIDA_OPERACION", frontendNodeId: "mix", areaOperativaId: 10,
        procesoProduccionId: 20, productoId: null, productoNombre: null, categoriaId: 7,
        legadoGlobal: false, productosExcluidosIds: [], ...overrides };
}

describe("indicadores de controles en la ruta", () => {
    test("ubica proceso dentro del nodo y calidad en todas sus salidas sin duplicar planes", () => {
        const quality = control();
        const process = control({ planId: 2, ambito: "PROCESO" });
        const fork = [...edges, { id: "m-other", source: "mix", target: "other" }];
        const branches = [...nodes, { id: "other", data: { areaOperativaId: 12, procesoProduccionId: 22 } }];
        const result = indexRouteControls(branches, fork, [quality, quality, process]);
        expect(result.processByNode.get("mix")).toEqual([process]);
        expect(result.qualityByEdge.get("m-p")).toEqual([quality]);
        expect(result.qualityByEdge.get("m-other")).toEqual([quality]);
        expect(result.qualityByEdge.has("w-m")).toBe(false);
        expect(result.unmapped).toEqual([]);
    });

    test("un ID conservado con otro proceso no hereda controles de la operación anterior", () => {
        const changed = nodes.map((node) => node.id === "mix"
            ? { ...node, data: { ...node.data, procesoProduccionId: 99 } } : node);
        const quality = control();
        const result = indexRouteControls(changed, edges, [quality]);
        expect(result.qualityByEdge.get("m-p")).toEqual([]);
        expect(result.unmapped).toEqual([quality]);
    });

    test("el almacén queda excluido incluso ante una configuración heredada amplia", () => {
        const legacy = control({ frontendNodeId: null, areaOperativaId: null, procesoProduccionId: null, legadoGlobal: true });
        const result = indexRouteControls(nodes, edges, [legacy]);
        expect(result.qualityByEdge.has("w-m")).toBe(false);
        expect(result.processByNode.has("warehouse")).toBe(false);
        expect(result.qualityByEdge.get("m-p")).toEqual([legacy]);
    });

    test("el lote final aparece tanto con arista final como con salida anotada", () => {
        const final = control({ puntoAplicacion: "LOTE_FINAL", frontendNodeId: null, areaOperativaId: null, procesoProduccionId: null });
        const designer = indexRouteControls(nodes, edges, [final]);
        expect(designer.finalByNode.get("pack")).toEqual([final]);
        const picker = indexRouteControls(
            [...nodes, { id: "final", data: { kind: "FINAL", areaOperativaId: null, procesoProduccionId: null } }],
            [...edges, { id: "p-final", source: "pack", target: "final" }], [final],
        );
        expect(picker.qualityByEdge.get("p-final")).toEqual([final]);
        expect(picker.finalByNode.size).toBe(0);
    });

    test("no atribuye un lote final a una de varias operaciones terminales ambiguas", () => {
        const final = control({ puntoAplicacion: "LOTE_FINAL" });
        const result = indexRouteControls(nodes, [edges[0]], [final]);
        expect(result.unmapped).toEqual([final]);
    });

    test("calcular los indicadores no altera nodos, aristas ni posiciones guardables", () => {
        const before = JSON.stringify({ nodes, edges });
        indexRouteControls(nodes, edges, [control(), control({ planId: 2, ambito: "PROCESO" })]);
        expect(JSON.stringify({ nodes, edges })).toBe(before);
    });
});
