import type { AccessRule, AccessSnapshot } from "./accessModel.ts";
import type { ModuloAccesoFE } from "../pages/Usuarios/GestionUsuarios/types.tsx";
import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";

export function buildAccesosPorModulo(list: ModuloAccesoFE[]): Partial<Record<Modulo, ModuloAccesoFE>> {
    const out: Partial<Record<Modulo, ModuloAccesoFE>> = {};
    for (const ma of list) {
        if (ma.modulo) {
            out[ma.modulo as Modulo] = ma;
        }
    }
    return out;
}

export function canAccessTab(
    moduloAccesos: ModuloAccesoFE[] | null | undefined,
    modulo: Modulo,
    tabId: string
): boolean {
    if (!moduloAccesos?.length) return false;
    const ma = moduloAccesos.find((m) => m.modulo === modulo);
    if (!ma?.tabs?.length) return false;
    return ma.tabs.some((t) => t.tabId === tabId || t.tabId === "MAIN");
}

export function getTabNivel(
    moduloAccesos: ModuloAccesoFE[] | null | undefined,
    modulo: Modulo,
    tabId: string
): number | null {
    const ma = moduloAccesos?.find((m) => m.modulo === modulo);
    const tab = ma?.tabs?.find((t) => t.tabId === tabId) ?? ma?.tabs?.find((t) => t.tabId === "MAIN");
    return tab != null ? tab.nivel : null;
}

/** Nivel máximo entre todos los tabs del módulo (útil para UI legacy por módulo). */
export function maxNivelForModule(
    moduloAccesos: ModuloAccesoFE[] | null | undefined,
    modulo: Modulo
): number | null {
    const ma = moduloAccesos?.find((m) => m.modulo === modulo);
    if (!ma?.tabs?.length) return null;
    return Math.max(...ma.tabs.map((t) => t.nivel));
}

export const MASTER_EFFECTIVE_NIVEL = 999;

export function canAccessModule(
    moduloAccesos: ModuloAccesoFE[] | null | undefined,
    modulo: Modulo,
    minLevel: number = 1
): boolean {
    return (maxNivelForModule(moduloAccesos, modulo) ?? 0) >= minLevel;
}

export function canAccessModuleFromSnapshot(
    access: AccessSnapshot,
    modulo: Modulo,
    minLevel: number = 1
): boolean {
    if (access.isMasterLike) return true;
    return canAccessModule(access.moduloAccesos, modulo, minLevel);
}

export function effectiveMaxNivelForModule(
    isMasterLike: boolean,
    moduloAccesos: ModuloAccesoFE[] | null | undefined,
    modulo: Modulo
): number {
    if (isMasterLike) return MASTER_EFFECTIVE_NIVEL;
    return maxNivelForModule(moduloAccesos, modulo) ?? 0;
}

export function effectiveTabNivel(
    isMasterLike: boolean,
    moduloAccesos: ModuloAccesoFE[] | null | undefined,
    modulo: Modulo,
    tabId: string
): number {
    if (isMasterLike) return MASTER_EFFECTIVE_NIVEL;
    return getTabNivel(moduloAccesos, modulo, tabId) ?? 0;
}

export function canAccessTabFromSnapshot(
    access: AccessSnapshot,
    modulo: Modulo,
    tabId: string,
    minLevel: number = 1
): boolean {
    if (access.isMasterLike) return true;
    return (getTabNivel(access.moduloAccesos, modulo, tabId) ?? 0) >= minLevel;
}

export function moduleAccessRule(modulo: Modulo, minLevel: number = 1): AccessRule {
    return (access) => canAccessModuleFromSnapshot(access, modulo, minLevel);
}

export function tabAccessRule(modulo: Modulo, tabId: string, minLevel: number = 1): AccessRule {
    return (access) => canAccessTabFromSnapshot(access, modulo, tabId, minLevel);
}
