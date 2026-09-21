import { formatDecimalScale } from "./controlUi";
import type { EstadoVersionPlanControl, PlanControl, VersionPlanControl } from "./types";

export type PlanVersionFilter = "TODAS" | EstadoVersionPlanControl;

export const PLAN_VERSION_FILTERS: ReadonlyArray<{ value: PlanVersionFilter; label: string }> = [
    { value: "TODAS", label: "Todas" },
    { value: "VIGENTE", label: "Vigentes" },
    { value: "BORRADOR", label: "Borradores" },
    { value: "RETIRADA", label: "Retiradas" },
];

export function selectPlanVersionGroups(plans: PlanControl[], filter: PlanVersionFilter) {
    return plans.map((plan) => ({
        plan,
        versions: plan.versiones
            .filter((version) => filter === "TODAS" || version.estado === filter)
            .sort((left, right) => right.numero - left.numero),
        draft: plan.versiones.find((version) => version.estado === "BORRADOR"),
    })).filter((group) => group.versions.length > 0);
}

/** Permissions and draft existence always use the full plan, never its filtered rows. */
export function getPlanVersionActions(plan: PlanControl, versionId: number, nivel: number) {
    const version = plan.versiones.find((item) => item.id === versionId);
    const hasDraft = plan.versiones.some((item) => item.estado === "BORRADOR");
    const current = plan.versiones.find((item) => item.estado === "VIGENTE");
    const latestRetired = plan.versiones.filter((item) => item.estado === "RETIRADA")
        .sort((left, right) => right.numero - left.numero)[0];
    const copySource = current ?? latestRetired;
    return {
        view: nivel >= 1 && version != null,
        edit: nivel >= 2 && version?.estado === "BORRADOR",
        create: nivel >= 2 && !hasDraft && version != null && version.id === copySource?.id,
        publish: nivel >= 3 && version?.estado === "BORRADOR",
        retire: nivel >= 3 && version?.estado === "VIGENTE",
    };
}

export function planVersionDate(version: VersionPlanControl) {
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
