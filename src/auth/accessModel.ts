import type { ModuloAccesoFE } from "../pages/Usuarios/GestionUsuarios/types.tsx";

export type AccessSnapshot = {
    isMasterLike: boolean;
    moduloAccesos: ModuloAccesoFE[];
};

export type AccessRule = (access: AccessSnapshot) => boolean;
