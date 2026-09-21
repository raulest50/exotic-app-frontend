import { describe, expect, test } from "bun:test";
import { fetchPlanListPage, INITIAL_PLAN_QUERY } from "../src/features/controles/planListQuery";
import type { PageResponse, PlanControlResumen, PlanesResumenFilters } from "../src/features/controles/types";

function page(number: number, totalElements: number, totalPages: number): PageResponse<PlanControlResumen> {
    return { content: [], number, size: 10, totalElements, totalPages };
}

describe("consultas paginadas de planes", () => {
    test("envía búsqueda, estado y página al servidor sin filtrar la respuesta localmente", async () => {
        const calls: PlanesResumenFilters[] = [];
        const response = page(1, 25, 3);
        const result = await fetchPlanListPage(async (params) => {
            calls.push(params);
            return response;
        }, { search: "CP-001", filter: "VIGENTE", page: 1, size: 10 }, () => true);
        expect(calls).toEqual([{ search: "CP-001", estado: "VIGENTE", page: 1, size: 10 }]);
        expect(result).toBe(response);
    });

    test("Todas omite el estado y una búsqueda vacía omite el texto", async () => {
        await fetchPlanListPage(async (params) => {
            expect(params.estado).toBeUndefined();
            expect(params.search).toBeUndefined();
            expect(params.page).toBe(0);
            return page(0, 0, 0);
        }, INITIAL_PLAN_QUERY, () => true);
    });

    test("si desaparece la última página vuelve a la última disponible conservando los filtros", async () => {
        const calls: PlanesResumenFilters[] = [];
        const result = await fetchPlanListPage(async (params) => {
            calls.push(params);
            return page(params.page!, 20, 2);
        }, { search: "Peso", filter: "BORRADOR", page: 2, size: 10 }, () => true);
        expect(calls).toEqual([
            { search: "Peso", estado: "BORRADOR", page: 2, size: 10 },
            { search: "Peso", estado: "BORRADOR", page: 1, size: 10 },
        ]);
        expect(result?.number).toBe(1);
    });

    test("si desaparecen todos los resultados vuelve a la primera página", async () => {
        const calls: number[] = [];
        const result = await fetchPlanListPage(async (params) => {
            calls.push(params.page!);
            return page(params.page!, 0, 0);
        }, { ...INITIAL_PLAN_QUERY, page: 3 }, () => true);
        expect(calls).toEqual([3, 0]);
        expect(result?.totalElements).toBe(0);
        expect(result?.number).toBe(0);
    });

    test("descarta respuestas de solicitudes anteriores sin lanzar una corrección de página", async () => {
        let current = true;
        let calls = 0;
        const result = await fetchPlanListPage(async () => {
            calls += 1;
            current = false;
            return page(3, 0, 0);
        }, { ...INITIAL_PLAN_QUERY, page: 3 }, () => current);
        expect(result).toBeNull();
        expect(calls).toBe(1);
    });

    test("también descarta la respuesta tardía de una corrección de página", async () => {
        let current = true;
        const result = await fetchPlanListPage(async (params) => {
            if (params.page === 0) current = false;
            return page(params.page!, 0, 0);
        }, { ...INITIAL_PLAN_QUERY, page: 3 }, () => current);
        expect(result).toBeNull();
    });

    test("un error de red se conserva como error, no como una página vacía", async () => {
        const failure = new Error("Consulta fallida");
        await expect(fetchPlanListPage(async () => { throw failure; }, INITIAL_PLAN_QUERY, () => true)).rejects.toBe(failure);
    });
});
