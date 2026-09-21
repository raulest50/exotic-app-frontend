import { describe, expect, test } from "bun:test";
import {
    getPlanVersionActions,
    planBooleanValue,
    planNumericValue,
    planReference,
    planVersionDate,
    planVersionFilterNotice,
} from "../src/features/controles/planVersionView";
import type { AmbitoControl, EstadoVersionPlanControl, PlanControlResumen, VersionPlanResumen } from "../src/features/controles/types";

function version(numero: number, estado: EstadoVersionPlanControl): VersionPlanResumen {
    return {
        id: numero + 100,
        numero,
        estado,
        cantidadAplicabilidades: 1,
        cantidadCaracteristicas: 2,
        creadaEn: "2026-09-01T10:00:00Z",
        publicadaEn: estado === "BORRADOR" ? null : "2026-09-02T10:00:00Z",
        retiradaEn: estado === "RETIRADA" ? "2026-09-03T10:00:00Z" : null,
    };
}

function plan(ambito: AmbitoControl, versiones = [version(2, "VIGENTE"), version(1, "RETIRADA"), version(3, "BORRADOR")]): PlanControlResumen {
    return {
        id: 1, codigo: "PLAN-1", nombre: "Plan de peso", ambito, versiones,
        borrador: versiones.find((item) => item.estado === "BORRADOR") ?? null,
        vigente: versiones.find((item) => item.estado === "VIGENTE") ?? null,
        ultimaRetirada: versiones.filter((item) => item.estado === "RETIRADA").sort((a, b) => b.numero - a.numero)[0] ?? null,
    };
}

for (const ambito of ["PROCESO", "CALIDAD"] as const) {
    describe(`listado de versiones de ${ambito}`, () => {
        test("el borrador oculto sigue bloqueando otra nueva versión", () => {
            const original = plan(ambito);
            // The server returns only current rows, plus references to hidden versions.
            const filtered = { ...original, versiones: [version(2, "VIGENTE")] };
            expect(filtered.borrador?.numero).toBe(3);
            expect(getPlanVersionActions(filtered, 102, 3).create).toBe(false);
            expect(getPlanVersionActions(filtered, 103, 3).edit).toBe(false);
        });

        test("una vigente oculta impide copiar una retirada aunque no exista borrador", () => {
            const filtered = {
                ...plan(ambito, [version(1, "RETIRADA"), version(2, "VIGENTE")]),
                versiones: [version(1, "RETIRADA")],
            };
            expect(getPlanVersionActions(filtered, 101, 3).create).toBe(false);
        });

        test("no habilita editar, publicar o retirar si las referencias ya no respaldan el estado de la fila", () => {
            const stale = { ...plan(ambito), borrador: null, vigente: null };
            expect(getPlanVersionActions(stale, 103, 3).edit).toBe(false);
            expect(getPlanVersionActions(stale, 103, 3).publish).toBe(false);
            expect(getPlanVersionActions(stale, 102, 3).retire).toBe(false);
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
