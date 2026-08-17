export type EstadoBatchRecord =
    | "BORRADOR"
    | "EN_EJECUCION"
    | "PENDIENTE_REVISION"
    | "DEVUELTO_PRODUCCION"
    | "APROBADO"
    | "RECHAZADO"
    | "CERRADO"
    | "ANULADO";

export interface BatchRecordListItem {
    id: number;
    codigo: string;
    estado: EstadoBatchRecord;
    revisionDocumental: number;
    ordenProduccionId?: number | null;
    ordenFabricacionId?: number | null;
    lote: string;
    estadoCalidadLote: string;
    productoId: string;
    productoNombre: string;
    tipoProducto: string;
    cantidadPlanificada: number;
    cantidadObtenida?: number | null;
    unidadMedida: string;
    creadoEn: string;
    enviadoRevisionEn?: string | null;
}

export interface BatchRecordEtapa {
    id: number;
    secuencia: number;
    nombre: string;
    areaOperativaId: number;
    areaOperativaNombre: string;
    estado: string;
    iniciadaEn?: string | null;
    completadaEn?: string | null;
    reportadaPor?: string | null;
    observaciones?: string | null;
    plantillaControlId?: number | null;
    plantillaControlVersion?: number | null;
}

export interface BatchRecordConsumo {
    id: number;
    productoId: string;
    productoNombre: string;
    loteOrigen?: string | null;
    tipo: string;
    cantidad: number;
    unidadMedida: string;
    registradoEn: string;
    registradoPor: string;
}

export interface BatchRecordControl {
    id: number;
    etapaId?: number | null;
    areaOperativaNombre: string;
    plantillaVersion: number;
    resultado?: "CONFORME" | "NO_CONFORME" | null;
    fechaRegistro: string;
    registradoPor: string;
}

export interface BatchRecordFirma {
    id: number;
    etapaId?: number | null;
    revision?: number | null;
    alcance: string;
    decision: string;
    firmadoEn: string;
    nombreFirmante: string;
    rolFirmante: string;
    manifestacion: string;
    hashContenidoFirmado: string;
    firmaVisualVersionId?: number | null;
}

export interface BatchRecordRevision {
    id: number;
    numero: number;
    tipo: string;
    contenidoSha256: string;
    esquemaVersion: string;
    plantillaPdfVersion: string;
    creadaEn: string;
    creadaPor: string;
    motivo?: string | null;
}

export interface BatchRecordDetail {
    resumen: BatchRecordListItem;
    manufacturingVersionId: number;
    manufacturingVersionNumber: number;
    creadoPor: string;
    iniciadoEn?: string | null;
    cerradoEn?: string | null;
    observaciones?: string | null;
    etapas: BatchRecordEtapa[];
    consumos: BatchRecordConsumo[];
    controles: BatchRecordControl[];
    desviaciones: Array<Record<string, unknown>>;
    correcciones: Array<Record<string, unknown>>;
    firmas: BatchRecordFirma[];
    revisiones: BatchRecordRevision[];
    decisionesCalidad: Array<Record<string, unknown>>;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}
