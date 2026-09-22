export type OcmCierreModo = "DESACTIVADO" | "RECEPCION_COMPLETA" | "PLAZO";
export type OcmCierreOrigen = "MANUAL" | "MANUAL_DIRECTIVAS" | "AUTOMATICO_RECEPCION" | "AUTOMATICO_PLAZO";

export interface OcmCierreConfig {
    modo: OcmCierreModo;
    dias: number | null;
    activadoDesde: string | null;
}

export interface OcmClosureFields {
    fechaRecepcionCompleta?: string | null;
    fechaCierre?: string | null;
    origenCierre?: OcmCierreOrigen | null;
    usuarioCierreUsername?: string | null;
}

export interface OcmEstadoRecepcion extends OcmClosureFields {
    ordenCompraId: number;
    estado: number;
    recepcionCompleta: boolean;
    fechaCierreAutomaticoPrevista: string | null;
}

export interface OcmCierreCandidata {
    ordenCompraId: number;
    proveedor: string;
    fechaEmision: string | null;
    fechaRecepcionCompleta: string | null;
    fechaCierreAutomaticoPrevista: string | null;
}

export interface OcmCierreIncidencia { ordenCompraId: number; motivo: string }
export interface OcmCierreResultado {
    cerradas: number[];
    omitidas: OcmCierreIncidencia[];
    fallidas: OcmCierreIncidencia[];
}
