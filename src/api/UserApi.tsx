/**
 * UserApi.tsx
 *
 * Perfil (`User`) y normalización de /me. Niveles por módulo/tab: usar `useAuth()` / `useModuleAccessLevel` / `accessHelpers`.
 */

import axios from 'axios';
import EndPointsURL from './EndPointsURL';
import type { AreaResponsableSummary } from './userAssignmentStatus.ts';
import type { ModuloAccesoFE, TabAccesoFE } from '../pages/Usuarios/GestionUsuarios/types.tsx';

export interface User {
    id: number;
    cedula: number;
    username: string;
    nombreCompleto?: string;
    email?: string;
    cel?: string;
    direccion?: string;
    fechaNacimiento?: string;
    estado: number;
}

/** Cuerpo de GET /api/auth/me (usar AuthContext para permisos; esto es solo para tipos/normalización). */
export interface MeResponseRaw {
    user: User;
    isMasterLike: boolean;
    isAreaResponsable: boolean;
    areaResponsable: AreaResponsableSummary | null;
    accesos: unknown;
}

export function normalizeModuloAccesosFromMe(raw: unknown): ModuloAccesoFE[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item: Record<string, unknown>) => {
        const tabsRaw = item.tabs;
        const tabs: TabAccesoFE[] = Array.isArray(tabsRaw)
            ? tabsRaw.map((t: Record<string, unknown>) => ({
                  id: Number(t.id),
                  tabId: String(t.tabId ?? ''),
                  nivel: Number(t.nivel),
              }))
            : [];
        return {
            id: Number(item.id),
            modulo: String(item.modulo ?? ''),
            tabs,
        };
    });
}

export function clearUserCache(): void {
    /* reservado por si en el futuro se reintroduce caché; AuthContext es la fuente de permisos */
}

/**
 * Una llamada a /me solo para obtener el objeto user (p. ej. handlers async sin acceso a React context).
 * Niveles y tabs: usar useAuth() / accessHelpers.
 */
export async function getCurrentUser(): Promise<User> {
    const endPoints = new EndPointsURL();
    const response = await axios.get<MeResponseRaw>(endPoints.me, {
        headers: { 'Content-Type': 'application/json' },
    });
    return response.data.user;
}
