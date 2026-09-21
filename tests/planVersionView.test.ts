import { describe, expect, test } from "bun:test";
import {
    getPlanVersionActions,
    planBooleanValue,
    planNumericValue,
    planReference,
    planVersionDate,
    planVersionFilterNotice,
    selectPlanVersionGroups,
} from "../src/features/controles/planVersionView";
import type { AmbitoControl, EstadoVersionPlanControl, PlanControl, VersionPlanControl } from "../src/features/controles/types";

function version(numero: number, estado: EstadoVersionPlanControl): VersionPlanControl {
    return {
        id: numero + 100,
        numero,
        estado,
        proposito: "Verificar peso",
        responsableEjecucion: "Operador",
        aplicabilidades: [],
        caracteristicas: [],
        creadaEn: "2026-09-01T10:00:00Z",
        publicadaEn: estado === "BORRADOR" ? null : "2026-09-02T10:00:00Z",
        retiradaEn: estado === "RETIRADA" ? "2026-09-03T10:00:00Z" : null,
    };
}

function plan(ambito: AmbitoControl, versiones = [version(2, "VIGENTE"), version(1, "RETIRADA"), version(3, "BORRADOR")]): PlanControl {
    return { id: 1, codigo: "PLAN-1", nombre: "Plan de peso", ambito, versiones };
}

for (const ambito of ["PROCESO", "CALIDAD"] as const) {
    describe(`listado de versiones de ${ambito}`, () => {
        test("todas incluye retiradas y ordena por versión sin alterar el plan original", () => {
            const original = plan(ambito);
            const before = JSON.stringify(original);
            const groups = selectPlanVersionGroups([original], "TODAS");
            expect(groups[0].versions.map((item) => item.numero)).toEqual([3, 2, 1]);
            expect(groups[0].plan).toBe(original);
            expect(groups[0].versions[0]).toBe(original.versiones[2]);
            expect(JSON.stringify(original)).toBe(before);
        });

        test("cada filtro muestra solo sus versiones y omite los planes sin coincidencias", () => {
            const original = plan(ambito);
            const retiredOnly = { ...plan(ambito, [version(1, "RETIRADA")]), id: 2 };
            for (const state of ["VIGENTE", "BORRADOR", "RETIRADA"] as const) {
                const groups = selectPlanVersionGroups([original, retiredOnly], state);
                expect(groups.length).toBe(state === "RETIRADA" ? 2 : 1);
                expect(groups.flatMap((group) => group.versions).every((item) => item.estado === state)).toBe(true);
            }
            expect(selectPlanVersionGroups([retiredOnly], "BORRADOR")).toEqual([]);
            expect(selectPlanVersionGroups([], "TODAS")).toEqual([]);
        });

        test("el borrador oculto sigue bloqueando otra nueva versión", () => {
            const original = plan(ambito);
            const group = selectPlanVersionGroups([original], "VIGENTE")[0];
            expect(group.versions.map((item) => item.numero)).toEqual([2]);
            expect(group.draft?.numero).toBe(3);
            expect(getPlanVersionActions(group.plan, group.versions[0].id, 3).create).toBe(false);
        });

        test("nivel 1 consulta; nivel 2 edita; nivel 3 publica o retira la versión indicada", () => {
            const original = plan(ambito);
            for (const item of original.versiones) {
                expect(getPlanVersionActions(original, item.id, 0)).toEqual({ view: false, edit: false, create: false, publish: false, retire: false });
                expect(getPlanVersionActions(original, item.id, 1)).toEqual({ view: true, edit: false, create: false, publish: false, retire: false });
            }
            expect(getPlanVersionActions(original, 103, 2)).toEqual({ view: true, edit: true, create: false, publish: false, retire: false });
            expect(getPlanVersionActions(original, 103, 3)).toEqual({ view: true, edit: true, create: false, publish: true, retire: false });
            expect(getPlanVersionActions(original, 102, 2)).toEqual({ view: true, edit: false, create: false, publish: false, retire: false });
            expect(getPlanVersionActions(original, 102, 3)).toEqual({ view: true, edit: false, create: false, publish: false, retire: true });
            expect(getPlanVersionActions(original, 101, 3)).toEqual({ view: true, edit: false, create: false, publish: false, retire: false });
            expect(getPlanVersionActions(original, 999, 3)).toEqual({ view: false, edit: false, create: false, publish: false, retire: false });
        });

        test("sin borrador se copia la vigente; si no hay vigente, solo la última retirada", () => {
            const original = plan(ambito, [version(1, "RETIRADA"), version(2, "VIGENTE")]);
            expect(getPlanVersionActions(original, 102, 1).create).toBe(false);
            expect(getPlanVersionActions(original, 102, 2).create).toBe(true);
            expect(getPlanVersionActions(original, 101, 3).create).toBe(false);
            const retired = plan(ambito, [version(1, "RETIRADA"), version(3, "RETIRADA"), version(2, "RETIRADA")]);
            const before = JSON.stringify(retired);
            expect(getPlanVersionActions(retired, 103, 2)).toEqual({ view: true, edit: false, create: true, publish: false, retire: false });
            expect(getPlanVersionActions(retired, 101, 3).create).toBe(false);
            expect(getPlanVersionActions(retired, 102, 3).create).toBe(false);
            expect(JSON.stringify(retired)).toBe(before);
        });
    });
}

describe("presentación de versiones históricas", () => {
    test("distingue ceros, falsos y valores ausentes sin perder precisión decimal", () => {
        expect(planNumericValue("0", 2)).toBe("0.00");
        expect(planNumericValue("999999999999.12345678", 8)).toBe("999999999999.12345678");
        expect(planNumericValue("-1,125", 3)).toBe("-1.125");
        expect(planNumericValue(null, 2)).toBe("No definido");
        expect(planNumericValue(undefined, 2)).toBe("No definido");
        expect(planNumericValue("1E-8", 8)).toBe("1E-8");
        expect(planNumericValue("1.25", -1)).toBe("1.25");
        expect(planBooleanValue(false)).toBe("No");
        expect(planBooleanValue(true)).toBe("Sí");
        expect(planBooleanValue(null)).toBe("No definido");
    });

    test("mantiene las referencias históricas aunque falte un nombre del catálogo", () => {
        expect(planReference("Gramos históricos", "G", "Unidad")).toBe("Gramos históricos (G)");
        expect(planReference(null, 21, "Proceso")).toBe("Proceso 21");
        expect(planReference("PT-01", "PT-01", "Producto")).toBe("PT-01");
        expect(planReference(null, null, "Categoría")).toBe("No definido");
    });

    test("la fecha del listado corresponde al estado y tolera fechas no registradas", () => {
        const draft = version(3, "BORRADOR");
        const current = version(2, "VIGENTE");
        const retired = version(1, "RETIRADA");
        expect(planVersionDate(draft)).toEqual({ label: "Creada", value: draft.creadaEn });
        expect(planVersionDate(current)).toEqual({ label: "Publicada", value: current.publicadaEn });
        expect(planVersionDate(retired)).toEqual({ label: "Retirada", value: retired.retiradaEn });
        expect(planVersionDate({ ...retired, retiradaEn: null })).toEqual({ label: "Retirada", value: null });
    });

    test("avisa si publicar, retirar o guardar deja la versión fuera del filtro", () => {
        for (const state of ["VIGENTE", "BORRADOR", "RETIRADA"] as const) {
            expect(planVersionFilterNotice("TODAS", state)).toBe("");
            expect(planVersionFilterNotice(state, state)).toBe("");
        }
        expect(planVersionFilterNotice("BORRADOR", "VIGENTE")).toContain("no se muestra");
        expect(planVersionFilterNotice("VIGENTE", "RETIRADA")).toContain("no se muestra");
        expect(planVersionFilterNotice("RETIRADA", "BORRADOR")).toContain("no se muestra");
    });
});
