import { describe, expect, test } from "bun:test";
import type { Edge, Node } from "@xyflow/react";
import {
    buildLayoutSignature,
    buildSemanticSignature,
    getRouteSaveAvailability,
    normalizeLayoutCoordinate,
} from "../src/pages/Produccion/ConfParamsCategoria/RutaProcesoCatDesigner/changeTracking.ts";
import type { RutaProcesoNodeData } from "../src/pages/Produccion/ConfParamsCategoria/RutaProcesoCatDesigner/types.ts";

function node(id: string, x: number, y: number): Node<RutaProcesoNodeData> {
    return {
        id,
        position: { x, y },
        data: {
            label: `Nodo ${id}`,
            areaOperativaId: Number(id),
            areaOperativaNombre: `Área ${id}`,
            procesoProduccionId: Number(id) + 10,
            procesoProduccionNombre: `Proceso ${id}`,
            poeVigenteDisponible: true,
            poeVigenteVersion: 1,
            hasLeftHandle: true,
            hasRightHandle: true,
            duracionEstimadaMinutos: 15,
            requiereJornadaLaboral: true,
        },
    };
}

const edges: Edge[] = [{ id: "e-1-2", source: "1", target: "2" }];

describe("seguimiento de cambios de la ruta", () => {
    test("normaliza coordenadas a dos decimales", () => {
        expect(normalizeLayoutCoordinate(12.345)).toBe(12.35);
        expect(normalizeLayoutCoordinate(-0.004)).toBe(-0);
    });

    test("mover un nodo cambia solo la firma visual", () => {
        const original = [node("1", 10, 20), node("2", 30, 40)];
        const moved = [node("1", 10.005, 20), node("2", 30, 40)];

        expect(buildSemanticSignature(moved, edges)).toBe(buildSemanticSignature(original, edges));
        expect(buildLayoutSignature(moved)).not.toBe(buildLayoutSignature(original));
    });

    test("los datos derivados del servidor no cambian la firma semántica", () => {
        const original = node("1", 10, 20);
        const refreshed = node("1", 10, 20);
        refreshed.data.areaOperativaNombre = "Área renombrada";
        refreshed.data.procesoProduccionNombre = "Proceso renombrado";
        refreshed.data.poeVigenteVersion = 9;

        expect(buildSemanticSignature([refreshed], [])).toBe(buildSemanticSignature([original], []));
    });

    test("los guardados son mutuamente excluyentes", () => {
        expect(getRouteSaveAvailability({
            hasCurrentVersion: true,
            isReadOnly: false,
            isSaving: false,
            isValid: true,
            semanticDirty: false,
            layoutDirty: true,
        })).toEqual({ canSaveNewVersion: false, canSaveLayout: true });

        expect(getRouteSaveAvailability({
            hasCurrentVersion: true,
            isReadOnly: false,
            isSaving: false,
            isValid: true,
            semanticDirty: true,
            layoutDirty: true,
        })).toEqual({ canSaveNewVersion: true, canSaveLayout: false });
    });

    test("proceso, duración, handles y conexiones son cambios semánticos", () => {
        const originalNodes = [node("1", 10, 20), node("2", 30, 40)];
        const originalSignature = buildSemanticSignature(originalNodes, edges);
        const mutations: Node<RutaProcesoNodeData>[][] = [
            originalNodes.map((item, index) => index === 0
                ? { ...item, data: { ...item.data, procesoProduccionId: 99 } }
                : item),
            originalNodes.map((item, index) => index === 0
                ? { ...item, data: { ...item.data, duracionEstimadaMinutos: 30 } }
                : item),
            originalNodes.map((item, index) => index === 0
                ? { ...item, data: { ...item.data, hasRightHandle: false } }
                : item),
        ];

        for (const changedNodes of mutations) {
            expect(buildSemanticSignature(changedNodes, edges)).not.toBe(originalSignature);
            expect(buildLayoutSignature(changedNodes)).toBe(buildLayoutSignature(originalNodes));
        }
        expect(buildSemanticSignature(originalNodes, [
            ...edges,
            { id: "e-2-1", source: "2", target: "1" },
        ])).not.toBe(originalSignature);
    });

    test("un cambio visual combinado con uno funcional habilita solo la nueva versión", () => {
        expect(getRouteSaveAvailability({
            hasCurrentVersion: true,
            isReadOnly: false,
            isSaving: false,
            isValid: true,
            semanticDirty: true,
            layoutDirty: true,
        })).toEqual({ canSaveNewVersion: true, canSaveLayout: false });
    });

    test("selección y estado transitorio de React Flow no generan cambios pendientes", () => {
        const original = node("1", 10, 20);
        const selected: Node<RutaProcesoNodeData> = {
            ...original,
            selected: true,
            dragging: true,
            measured: { width: 200, height: 100 },
        };

        expect(buildSemanticSignature([selected], [])).toBe(buildSemanticSignature([original], []));
        expect(buildLayoutSignature([selected])).toBe(buildLayoutSignature([original]));
    });

    test("una versión histórica nunca permite guardar", () => {
        expect(getRouteSaveAvailability({
            hasCurrentVersion: true,
            isReadOnly: true,
            isSaving: false,
            isValid: true,
            semanticDirty: true,
            layoutDirty: true,
        })).toEqual({ canSaveNewVersion: false, canSaveLayout: false });
    });

    test("una ruta antigua inválida todavía puede guardar solo su disposición", () => {
        expect(getRouteSaveAvailability({
            hasCurrentVersion: true,
            isReadOnly: false,
            isSaving: false,
            isValid: false,
            semanticDirty: false,
            layoutDirty: true,
        })).toEqual({ canSaveNewVersion: false, canSaveLayout: true });
    });
});
