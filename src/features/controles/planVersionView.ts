import { formatDecimalScale } from "./controlUi";
import type { EstadoVersionPlanControl, PlanControlResumen, VersionPlanControl } from "./types";

export type PlanVersionFilter = "TODAS" | EstadoVersionPlanControl;

export const PLAN_VERSION_FILTERS: ReadonlyArray<{ value: PlanVersionFilter; label: string }> = [
    { value: "TODAS", label: "Todas" },
    { value: "VIGENTE", label: "Vigentes" },
    { value: "BORRADOR", label: "Borradores" },
    { value: "RETIRADA", label: "Retiradas" },
];

/** References cover the full plan even when the server only returns versions matching the filter. */
export function getPlanVersionActions(plan: PlanControlResumen, versionId: number, nivel: number) {
    const version = plan.versiones.find((item) => item.id === versionId);
    const copySource = plan.vigente ?? plan.ultimaRetirada;
    const isDraft = version?.estado === "BORRADOR" && plan.borrador?.id === versionId;
    const isCurrent = version?.estado === "VIGENTE" && plan.vigente?.id === versionId;
    return {
        view: nivel >= 1 && version != null,
        edit: nivel >= 2 && isDraft,
        create: nivel >= 2 && !plan.borrador && version != null && version.id === copySource?.id,
        publish: nivel >= 3 && isDraft,
        retire: nivel >= 3 && isCurrent,
    };
}

export function planVersionDate(version: Pick<VersionPlanControl, "estado" | "creadaEn" | "publicadaEn" | "retiradaEn">) {
    if (version.estado === "VIGENTE") return { label: "Publicada", value: version.publicadaEn };
    if (version.estado === "RETIRADA") return { label: "Retirada", value: version.retiradaEn };
    return { label: "Creada", value: version.creadaEn };
}

export function planVersionFilterNotice(filter: PlanVersionFilter, newState: EstadoVersionPlanControl) {
    return filter === "TODAS" || filter === newState
        ? ""
        : " La versión no se muestra con el filtro de estado seleccionado.";
}

export function planReference(name: string | null | undefined, id: string | number | null | undefined, label: string) {
    if (name?.trim()) return id != null && name !== String(id) ? `${name} (${id})` : name;
    return id != null ? `${label} ${id}` : "No definido";
}

export function planNumericValue(value: string | null | undefined, scale: number) {
    if (value == null) return "No definido";
    // Keep incomplete historical values readable without changing or coercing their precision.
    if (!/^-?\d+(?:[.,]\d+)?$/.test(value) || !Number.isInteger(scale) || scale < 0 || scale > 8) return value;
    return formatDecimalScale(value, scale);
}

export function planBooleanValue(value: boolean | null | undefined) {
    return value == null ? "No definido" : value ? "Sí" : "No";
}
