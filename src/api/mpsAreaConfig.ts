export type VisibilidadMps = "SOLO_OP" | "SOLO_OF" | "AMBOS";
export type AlcanceMps = "TODOS" | "SOLO_RUTA";

export const VISIBILIDAD_MPS_LABELS: Record<VisibilidadMps, string> = {
    SOLO_OP: "Solo MPS OP",
    SOLO_OF: "Solo MPS OF",
    AMBOS: "Ambos MPS",
};

export const ALCANCE_MPS_LABELS: Record<AlcanceMps, string> = {
    TODOS: "Todos los productos",
    SOLO_RUTA: "Solo productos de la ruta del área",
};
