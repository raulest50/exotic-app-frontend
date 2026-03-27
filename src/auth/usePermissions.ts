import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
    canAccessTabOrMaster,
    effectiveMaxNivelForModule,
    effectiveTabNivel,
    isMasterLike,
} from "./accessHelpers";
import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";

export function useAccesosReady() {
    const { accesosReady, moduloAccesos, authorities } = useAuth();
    return { accesosReady, moduloAccesos, authorities };
}

export function useModuleAccessLevel(modulo: Modulo) {
    const { moduloAccesos, roles, user, accesosReady } = useAuth();
    const isMaster = isMasterLike(roles, user);
    const nivel = useMemo(
        () => effectiveMaxNivelForModule(roles, user, moduloAccesos, modulo),
        [roles, user, moduloAccesos, modulo]
    );
    return { nivel, ready: accesosReady, isMaster };
}

export function useTabPermission(modulo: Modulo, tabId: string) {
    const { moduloAccesos, roles, user, accesosReady } = useAuth();
    const canSee = useMemo(
        () => canAccessTabOrMaster(roles, user, moduloAccesos, modulo, tabId),
        [roles, user, moduloAccesos, modulo, tabId]
    );
    const nivel = useMemo(
        () => effectiveTabNivel(roles, user, moduloAccesos, modulo, tabId),
        [roles, user, moduloAccesos, modulo, tabId]
    );
    return { canSee, nivel, ready: accesosReady };
}
