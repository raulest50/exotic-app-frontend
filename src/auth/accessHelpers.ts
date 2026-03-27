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
    return Boolean(ma?.tabs?.some((t) => t.tabId === tabId));
}

export function getTabNivel(
    moduloAccesos: ModuloAccesoFE[] | null | undefined,
    modulo: Modulo,
    tabId: string
): number | null {
    const ma = moduloAccesos?.find((m) => m.modulo === modulo);
    const tab = ma?.tabs?.find((t) => t.tabId === tabId);
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

/** Nivel efectivo para comparaciones `>= n` cuando el usuario es master (JWT / username). */
export const MASTER_EFFECTIVE_NIVEL = 999;

export function isMasterLike(roles: string[] | null | undefined, username: string | null | undefined): boolean {
    if (roles?.includes('ROLE_MASTER')) return true;
    const u = username?.toLowerCase();
    return u === 'master' || u === 'super_master';
}

/** Master / super_master / ROLE_MASTER: todas las tabs del módulo. Resto: según moduloAccesos. */
export function canAccessTabOrMaster(
    roles: string[] | null | undefined,
    username: string | null | undefined,
    moduloAccesos: ModuloAccesoFE[] | null | undefined,
    modulo: Modulo,
    tabId: string
): boolean {
    if (isMasterLike(roles, username)) return true;
    return canAccessTab(moduloAccesos, modulo, tabId);
}

/** Nivel máximo del módulo, o alto simbólico si es master; si no hay acceso, 0. */
export function effectiveMaxNivelForModule(
    roles: string[] | null | undefined,
    username: string | null | undefined,
    moduloAccesos: ModuloAccesoFE[] | null | undefined,
    modulo: Modulo
): number {
    if (isMasterLike(roles, username)) return MASTER_EFFECTIVE_NIVEL;
    return maxNivelForModule(moduloAccesos, modulo) ?? 0;
}

/** Nivel del tab o alto simbólico si es master; si no hay tab, 0. */
export function effectiveTabNivel(
    roles: string[] | null | undefined,
    username: string | null | undefined,
    moduloAccesos: ModuloAccesoFE[] | null | undefined,
    modulo: Modulo,
    tabId: string
): number {
    if (isMasterLike(roles, username)) return MASTER_EFFECTIVE_NIVEL;
    return getTabNivel(moduloAccesos, modulo, tabId) ?? 0;
}
