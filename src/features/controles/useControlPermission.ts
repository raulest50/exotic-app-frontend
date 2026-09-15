import { useMemo } from "react";

import { effectiveExactTabNivel } from "../../auth/accessHelpers";
import { useAuth } from "../../context/AuthContext";
import { Modulo } from "../../pages/Usuarios/GestionUsuarios/types";

export function useMasterLikeExactControlPermission(modulo: Modulo, tabId: string) {
    const { moduloAccesos, isMasterLike, accesosReady } = useAuth();
    const level = useMemo(
        () => effectiveExactTabNivel(isMasterLike, moduloAccesos, modulo, tabId),
        [isMasterLike, modulo, moduloAccesos, tabId],
    );
    return { nivel: level, ready: accesosReady };
}
