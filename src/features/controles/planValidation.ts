import type { AmbitoControl, PlanControlWrite } from "./types";

export type PlanStep = 0 | 1 | 2;
export interface PlanValidationIssue {
    step: PlanStep;
    field: string;
    message: string;
}

function validDecimal(value: string) {
    if (!/^-?\d+(?:\.\d+)?$/.test(value)) return false;
    const [integer, fraction = ""] = value.replace(/^-/, "").split(".");
    return integer.length <= 12 && fraction.length <= 8;
}

function compareDecimal(left: string, right: string) {
    const scaled = (value: string) => {
        const [integer, fraction = ""] = value.replace(/^-/, "").split(".");
        const absolute = BigInt(`${integer}${fraction.padEnd(8, "0")}`);
        return value.startsWith("-") ? -absolute : absolute;
    };
    const difference = scaled(left) - scaled(right);
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

export function validatePlanStep(
    draft: PlanControlWrite, ambito: AmbitoControl, changeReasonRequired: boolean, step: PlanStep,
): PlanValidationIssue[] {
    const issues: PlanValidationIssue[] = [];
    const add = (field: string, message: string) => issues.push({ step, field, message });
    if (step === 0) {
        if (!draft.codigo.trim()) add("codigo", "El código del plan es obligatorio.");
        if (draft.codigo.length > 60) add("codigo", "El código admite hasta 60 caracteres.");
        if (!draft.nombre.trim()) add("nombre", "El nombre del plan es obligatorio.");
        if (draft.nombre.length > 160) add("nombre", "El nombre admite hasta 160 caracteres.");
        if (changeReasonRequired && !draft.motivoCambio?.trim()) add("motivoCambio", "El motivo del cambio es obligatorio para una nueva versión.");
        if ((draft.motivoCambio?.length ?? 0) > 500) add("motivoCambio", "El motivo del cambio admite hasta 500 caracteres.");
    }
    if (step === 1) {
        if (draft.aplicabilidades.length !== 1) add("ubicacion", "El plan debe tener exactamente una aplicación y una ubicación.");
        for (const rule of draft.aplicabilidades) {
            const product = Boolean(rule.productoId?.trim());
            const category = rule.categoriaId != null;
            if (!product && !category) add("destino", "Seleccione un producto o una categoría.");
            if (product && category) add("destino", "Producto y categoría son mutuamente excluyentes.");
            if (!rule.ubicacionGraficaConfirmada) add("ubicacion", `Seleccione gráficamente ${ambito === "PROCESO" ? "la operación" : "la salida"} donde se realizará el control.`);
            if (rule.puntoAplicacion === "SALIDA_OPERACION"
                && (!rule.areaOperativaId || !rule.procesoProduccionId || !rule.frontendNodeId?.trim())) {
                add("ubicacion", "La ubicación exige área, proceso y un nodo de la ruta.");
            }
            if (rule.puntoAplicacion === "LOTE_FINAL"
                && (rule.areaOperativaId != null || rule.procesoProduccionId != null || rule.frontendNodeId)) {
                add("ubicacion", "La salida final no debe referenciar un área, operación o nodo.");
            }
            if (ambito === "PROCESO" && (rule.puntoAplicacion !== "SALIDA_OPERACION"
                || rule.momentoEjecucion !== "DURANTE_FABRICACION" || rule.puntoExigencia !== "INFORMATIVO")) {
                add("ubicacion", "Un control de proceso debe ubicarse en una operación y siempre es informativo.");
            }
        }
    }
    if (step === 2) {
        if (!draft.caracteristicas.length) add("caracteristicas", "Debe existir al menos una medición.");
        draft.caracteristicas.forEach((item, index) => {
            const field = (name: string) => `caracteristicas.${index}.${name}`;
            const fail = (name: string, message: string) => add(field(name), `Medición ${index + 1}: ${message}`);
            if (!item.nombre.trim()) fail("nombre", "el nombre es obligatorio.");
            if (item.nombre.length > 120) fail("nombre", "el nombre admite hasta 120 caracteres.");
            if (!item.magnitudId) fail("magnitudId", "la magnitud es obligatoria.");
            for (const name of ["cantidadMuestras", "unidadesPorMuestra"] as const) {
                if (!Number.isInteger(item[name]) || item[name] < 1 || item[name] > 2147483647) {
                    fail(name, "el muestreo debe ser un entero positivo válido.");
                }
            }
            if (!Number.isInteger(item.escala) || item.escala < 0 || item.escala > 8) fail("escala", "los decimales visibles deben ser un entero entre 0 y 8.");
            if (item.tipo === "NUMERICA") {
                if (!item.unidadId) fail("unidadId", "la unidad es obligatoria.");
                if (item.limiteInferior == null && item.limiteSuperior == null) fail("limiteInferior", "configure al menos un límite.");
                const values = [item.objetivo, item.limiteInferior, item.limiteSuperior].filter((value): value is string => value != null);
                for (const name of ["objetivo", "limiteInferior", "limiteSuperior"] as const) {
                    const value = item[name];
                    if (value != null && !validDecimal(value)) fail(name, "objetivo y límites admiten hasta 12 dígitos enteros y 8 decimales.");
                }
                if (values.every(validDecimal)) {
                    if (item.limiteInferior != null && item.limiteSuperior != null && compareDecimal(item.limiteInferior, item.limiteSuperior) > 0) fail("limiteInferior", "el límite inferior no puede superar al superior.");
                    if (item.objetivo != null && item.limiteInferior != null && compareDecimal(item.objetivo, item.limiteInferior) < 0) fail("objetivo", "el objetivo está bajo el límite inferior.");
                    if (item.objetivo != null && item.limiteSuperior != null && compareDecimal(item.objetivo, item.limiteSuperior) > 0) fail("objetivo", "el objetivo supera el límite superior.");
                }
            } else if (item.tipo === "BOOLEANA") {
                if (item.valorBooleanoEsperado == null) fail("valorBooleanoEsperado", "indique el valor booleano esperado.");
                if (item.unidadId != null || item.objetivo != null || item.limiteInferior != null || item.limiteSuperior != null) fail("tipo", "una medición booleana solo define su valor esperado.");
            } else {
                fail("tipo", "seleccione un tipo de medición válido.");
            }
        });
    }
    return issues;
}

export function validatePlan(draft: PlanControlWrite, ambito: AmbitoControl, changeReasonRequired: boolean) {
    return ([0, 1, 2] as const).flatMap((step) => validatePlanStep(draft, ambito, changeReasonRequired, step));
}

export function planIssueFromApi(detail: { message: string; errorCode?: string; field?: string }): PlanValidationIssue | null {
    const field = detail.errorCode === "PLAN_CODE_ALREADY_EXISTS" ? "codigo" : detail.field;
    if (!field) return null;
    if (["codigo", "nombre", "motivoCambio"].includes(field)) return { step: 0, field, message: detail.message };
    if (field.startsWith("aplicabilidades")) return { step: 1, field: "ubicacion", message: detail.message };
    if (field.startsWith("caracteristicas")) return {
        step: 2, field: field.replace(/\[(\d+)\]/g, ".$1").replace(/\.escalaVisible$/, ".escala"), message: detail.message,
    };
    return null;
}
