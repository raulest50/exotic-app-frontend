import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
    canAccessTabFromSnapshot,
    effectiveMaxNivelForModule,
    effectiveTabNivel,
} from "./accessHelpers";
import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";
import type { AccessSnapshot } from "./accessModel.ts";

export function useAccesosReady() {
    const { accesosReady, moduloAccesos, isMasterLike, isAreaResponsable, areaResponsable } = useAuth();
    return { accesosReady, moduloAccesos, isMasterLike, isAreaResponsable, areaResponsable };
}

export function useAccessSnapshot(): AccessSnapshot {
    const { moduloAccesos, isMasterLike, isAreaResponsable, areaResponsable } = useAuth();
    return useMemo(
        () => ({ moduloAccesos, isMasterLike, isAreaResponsable, areaResponsable }),
        [moduloAccesos, isMasterLike, isAreaResponsable, areaResponsable]
    );
}

export function useModuleAccessLevel(modulo: Modulo) {
    const { moduloAccesos, isMasterLike, accesosReady } = useAuth();
    const nivel = useMemo(
        () => effectiveMaxNivelForModule(isMasterLike, moduloAccesos, modulo),
        [isMasterLike, moduloAccesos, modulo]
    );
    return { nivel, ready: accesosReady, isMaster: isMasterLike };
}

export function useTabPermission(modulo: Modulo, tabId: string) {
    const { moduloAccesos, isMasterLike, accesosReady } = useAuth();
    const access = useAccessSnapshot();
    const canSee = useMemo(
        () => canAccessTabFromSnapshot(access, modulo, tabId),
        [access, modulo, tabId]
    );
    const nivel = useMemo(
        () => effectiveTabNivel(isMasterLike, moduloAccesos, modulo, tabId),
        [isMasterLike, moduloAccesos, modulo, tabId]
    );
    return { canSee, nivel, ready: accesosReady };
}
