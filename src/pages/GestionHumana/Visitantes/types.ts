export const GENEROS_VISITANTE = {
    FEMENINO: "Femenino",
    MASCULINO: "Masculino",
    NO_BINARIO: "No binario",
    OTRO: "Otro",
    PREFIERO_NO_INFORMAR: "Prefiero no informar",
} as const;

export type GeneroVisitante = keyof typeof GENEROS_VISITANTE;

export type RegistroVisitanteRequest = {
    cedula: string;
    nombreCompleto: string;
    edad: number | null;
    genero: GeneroVisitante | null;
};

export type ReciboVisitante = { fechaRegistro: string };

export type RegistroVisitante = RegistroVisitanteRequest & ReciboVisitante & { id: number };

export type PaginaVisitantes = {
    content: RegistroVisitante[];
    number: number;
    totalPages: number;
    totalElements: number;
};
