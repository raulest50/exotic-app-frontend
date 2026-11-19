export const GENEROS_REGISTRO_VISITANTE = {
    MASCULINO: "Masculino",
    FEMENINO: "Femenino",
} as const;

// Preserve labels for records saved before the registration options changed.
export const GENEROS_VISITANTE = {
    ...GENEROS_REGISTRO_VISITANTE,
    NO_BINARIO: "No binario",
    OTRO: "Otro",
    PREFIERO_NO_INFORMAR: "Prefiero no informar",
} as const;

export type GeneroVisitante = keyof typeof GENEROS_VISITANTE;
export type GeneroRegistroVisitante = keyof typeof GENEROS_REGISTRO_VISITANTE;

// Initial order agreed with MRP II / ERP; it is not based on measured visit counts.
export const MOTIVOS_VISITA = {
    ENTREGA_MATERIALES: "Entrega de materias primas, insumos o empaques",
    RECOGIDA_MERCANCIA: "Recogida de productos o mercancía",
    MANTENIMIENTO_EQUIPOS: "Instalación, mantenimiento o reparación de equipos",
    MENSAJERIA_DOCUMENTOS: "Mensajería o entrega de documentos",
    REUNION_COMERCIAL: "Reunión comercial con clientes o proveedores",
    CALIBRACION_VALIDACION: "Calibración, validación o pruebas técnicas",
    SERVICIOS_INSTALACIONES: "Servicios generales o trabajos en instalaciones",
    AUDITORIA_INSPECCION: "Auditoría o inspección",
    CAPACITACION_ASESORIA: "Capacitación o asesoría",
    GESTION_HUMANA: "Entrevista o trámite de Gestión Humana",
    OTROS: "Otros",
} as const;

export type MotivoVisita = keyof typeof MOTIVOS_VISITA;

export type RegistroVisitanteRequest = {
    cedula: string;
    nombreCompleto: string;
    edad: number | null;
    genero: GeneroRegistroVisitante | null;
    motivo: MotivoVisita;
    motivoOtro: string | null;
};

export type ReciboVisitante = { fechaRegistro: string };

export type RegistroVisitante = Omit<RegistroVisitanteRequest, "genero" | "motivo"> & ReciboVisitante & {
    id: number;
    genero: GeneroVisitante | null;
    motivo: MotivoVisita | null;
};

export type PaginaVisitantes = {
    content: RegistroVisitante[];
    number: number;
    totalPages: number;
    totalElements: number;
};

export type FiltrosVisitantes = {
    fecha: string;
    horaDesde: string;
    horaHasta: string;
    nombre: string;
    orden: "DESC" | "ASC";
    size: number;
};
