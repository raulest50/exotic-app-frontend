import { describe, expect, test } from "bun:test";
import { planIssueFromApi, validatePlan, validatePlanStep } from "../src/features/controles/planValidation";
import type { AmbitoControl, PlanControlWrite } from "../src/features/controles/types";

function validPlan(ambito: AmbitoControl): PlanControlWrite {
    return {
        codigo: "ENSAYO-1", nombre: "Peso", motivoCambio: "Ajuste de tolerancia",
        aplicabilidades: [{
            categoriaId: 7, productosExcluidosIds: [], tipoOrden: "OP", puntoAplicacion: "SALIDA_OPERACION",
            areaOperativaId: 3, procesoProduccionId: 4, frontendNodeId: "mezcla", ubicacionGraficaConfirmada: true,
            momentoEjecucion: "DURANTE_FABRICACION", puntoExigencia: ambito === "PROCESO" ? "INFORMATIVO" : "CIERRE_ETAPA",
        }],
        caracteristicas: [{
            nombre: "Peso", tipo: "NUMERICA", magnitudId: 1, unidadId: 2, escala: 2,
            objetivo: "0", limiteInferior: "-1", limiteSuperior: "1", cantidadMuestras: 2, unidadesPorMuestra: 1, orden: 1,
        }],
    };
}

for (const ambito of ["PROCESO", "CALIDAD"] as const) {
    describe(ambito, () => {
        test("un plan válido supera los pasos y el guardado sin mutaciones", () => {
            const plan = validPlan(ambito);
            const original = JSON.stringify(plan);
            expect(validatePlan(plan, ambito, true)).toEqual([]);
            for (const step of [0, 1, 2] as const) expect(validatePlanStep(plan, ambito, true, step)).toEqual([]);
            expect(JSON.stringify(plan)).toBe(original);
        });

        test("identificación no exige completar por anticipado las mediciones", () => {
            const plan = validPlan(ambito);
            plan.codigo = "  ";
            plan.nombre = "";
            plan.caracteristicas = [];
            expect(validatePlanStep(plan, ambito, false, 0).map((issue) => issue.field)).toEqual(["codigo", "nombre"]);
            plan.codigo = "ENSAYO-1";
            plan.nombre = "Peso";
            expect(validatePlanStep(plan, ambito, false, 0)).toEqual([]);
            expect(validatePlan(plan, ambito, false)[0].step).toBe(2);
        });

        test("el guardado detecta cambios que invalidan pasos anteriores", () => {
            const plan = validPlan(ambito);
            expect(validatePlan(plan, ambito, false)).toEqual([]);
            plan.aplicabilidades[0].categoriaId = null;
            plan.aplicabilidades[0].ubicacionGraficaConfirmada = false;
            const issues = validatePlan(plan, ambito, false);
            expect(issues[0].step).toBe(1);
            expect(issues.some((issue) => issue.field === "destino")).toBe(true);
            expect(issues.some((issue) => issue.field === "ubicacion")).toBe(true);
        });

        test("false es una respuesta booleana válida y null no lo es", () => {
            const plan = validPlan(ambito);
            Object.assign(plan.caracteristicas[0], {
                tipo: "BOOLEANA", unidadId: null, objetivo: null, limiteInferior: null,
                limiteSuperior: null, valorBooleanoEsperado: false,
            });
            expect(validatePlan(plan, ambito, false)).toEqual([]);
            plan.caracteristicas[0].valorBooleanoEsperado = null;
            expect(validatePlan(plan, ambito, false)[0].field).toBe("caracteristicas.0.valorBooleanoEsperado");
        });
    });
}

test("motivo obligatorio solo para nuevas versiones y longitudes máximas", () => {
    const plan = validPlan("CALIDAD");
    plan.motivoCambio = "  ";
    expect(validatePlanStep(plan, "CALIDAD", false, 0)).toEqual([]);
    expect(validatePlanStep(plan, "CALIDAD", true, 0)[0].field).toBe("motivoCambio");
    plan.codigo = "A".repeat(61);
    plan.nombre = "A".repeat(161);
    plan.motivoCambio = "A".repeat(501);
    expect(validatePlanStep(plan, "CALIDAD", true, 0).map((issue) => issue.field)).toEqual(["codigo", "nombre", "motivoCambio"]);
});

test("rechaza cantidades fraccionarias, vacías, no finitas o fuera del rango del servidor", () => {
    for (const value of [0, -1, 1.5, Number.NaN, Infinity, 2147483648]) {
        const plan = validPlan("CALIDAD");
        plan.caracteristicas[0].cantidadMuestras = value;
        expect(validatePlan(plan, "CALIDAD", false).some((issue) => issue.field === "caracteristicas.0.cantidadMuestras")).toBe(true);
    }
    for (const value of [-1, 9, 1.5, Number.NaN]) {
        const plan = validPlan("CALIDAD");
        plan.caracteristicas[0].escala = value;
        expect(validatePlan(plan, "CALIDAD", false).some((issue) => issue.field === "caracteristicas.0.escala")).toBe(true);
    }
});

test("compara límites decimales sin perder precisión y rechaza formatos inválidos", () => {
    const plan = validPlan("CALIDAD");
    Object.assign(plan.caracteristicas[0], {
        limiteInferior: "999999999999.12345678", limiteSuperior: "999999999999.12345677", objetivo: null,
    });
    expect(validatePlan(plan, "CALIDAD", false)[0].field).toBe("caracteristicas.0.limiteInferior");
    plan.caracteristicas[0].limiteInferior = "incorrecto";
    expect(validatePlan(plan, "CALIDAD", false)[0].message).toContain("8 decimales");
});

test("errores del servidor se asignan por campo; otros conflictos no se confunden con duplicados", () => {
    expect(planIssueFromApi({ message: "Ocupado", errorCode: "PLAN_CODE_ALREADY_EXISTS" })).toEqual({ step: 0, field: "codigo", message: "Ocupado" });
    expect(planIssueFromApi({ message: "Inválido", field: "caracteristicas[1].escalaVisible" })?.field).toBe("caracteristicas.1.escala");
    expect(planIssueFromApi({ message: "Inválido", field: "aplicabilidades[0].categoriaId" })?.step).toBe(1);
    expect(planIssueFromApi({ message: "Conflicto concurrente" })).toBeNull();
});
