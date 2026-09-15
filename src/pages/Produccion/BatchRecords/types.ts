export type EstadoBatchRecord =
    | "BORRADOR"
    | "EN_EJECUCION"
    | "LISTO_PARA_REVISION"
    | "PENDIENTE_REVISION"
    | "DEVUELTO_PRODUCCION"
    | "EN_CORRECCION"
    | "APROBADO"
    | "RECHAZADO"
    | "CERRADO"
    | "ANULADO";

export type EstadoCalidadLote =
    | "SIN_CLASIFICAR"
    | "CUARENTENA"
    | "APROBADO"
    | "LIBERADO"
    | "RECHAZADO"
    | "BLOQUEADO"
    | "NO_APLICA_CALIDAD";

export type EstadoSincronizacionBatchRecord =
    | "PENDIENTE"
    | "SINCRONIZANDO"
    | "ACTUALIZADO"
    | "INCOMPLETO"
    | "ERROR";

export interface BatchRecordListItem {
    id: number;
    codigo: string;
    estado: EstadoBatchRecord;
    estadoSincronizacion: EstadoSincronizacionBatchRecord;
    sincronizadoEn?: string | null;
    advertenciasDocumentales: string[];
    ultimoErrorDocumental?: string | null;
    revisionDocumental: number;
    ordenProduccionId?: number | null;
    ordenFabricacionId?: number | null;
    lote: string;
    estadoCalidadLote: EstadoCalidadLote;
    productoId: string;
    productoNombre: string;
    tipoProducto: string;
    cantidadPlanificada: number;
    cantidadObtenida?: number | null;
    unidadMedida: string;
    creadoEn: string;
    enviadoRevisionEn?: string | null;
    cicloRevisionActual: number;
}

export interface BatchRecordEtapa {
    id: number;
    secuencia: number;
    nombre: string;
    areaOperativaId: number;
    areaOperativaNombre: string;
    estado: "PENDIENTE" | "EN_EJECUCION" | "EN_CORRECCION" | "COMPLETADA" | "OMITIDA";
    iniciadaEn?: string | null;
    completadaEn?: string | null;
    reportadaPor?: string | null;
    observaciones?: string | null;
    plantillaControlId?: number | null;
    plantillaControlVersion?: number | null;
    /** Identificador del ciclo que habilitó la corrección; null fuera de corrección. */
    cicloCorreccionHabilitado?: number | null;
    seguimientoEventoOrigenId?: number | null;
    ordenFabricacionOperacionId?: number | null;
    ordenFabricacionEventoOrigenId?: number | null;
    poe?: BatchRecordPoeReferencia | null;
}

export interface BatchRecordPoeReferencia {
    procesoProduccionId: number;
    procesoProduccionNombre: string;
    documentoVersionId: number;
    version: number;
    nombreArchivo: string;
    sha256: string;
}

export interface BatchRecordConsumo {
    id: number;
    productoId: string;
    productoNombre: string;
    loteOrigenId?: number | null;
    loteOrigen?: string | null;
    movimientoId?: number | null;
    tipo: "DISPENSACION" | "REPOSICION_AVERIA" | "EXCLUSION_AVERIA";
    cantidad: number;
    unidadMedida: string;
    registradoEn: string;
    registradoPor: string;
}

export interface BatchRecordVinculoGenealogia {
    batchRecordId?: number | null;
    batchRecordCodigo?: string | null;
    ordenProduccionId?: number | null;
    ordenFabricacionId?: number | null;
    loteId: number;
    lote: string;
    productoId: string;
    productoNombre: string;
    cantidad?: number | null;
    unidadMedida?: string | null;
}

export interface BatchRecordControl {
    id: number;
    etapaId?: number | null;
    plantillaId?: number | null;
    areaOperativaId?: number | null;
    areaOperativaNombre: string;
    plantillaVersion: number;
    resultado?: "CONFORME" | "NO_CONFORME" | null;
    fechaRegistro: string;
    registradoPor: string;
    observaciones?: string | null;
}

export interface BatchRecordFirma {
    id: number;
    etapaId?: number | null;
    seguimientoEventoId?: number | null;
    ordenFabricacionEventoId?: number | null;
    revision?: number | null;
    alcance:
        | "CIERRE_ETAPA_AREA"
        | "CORRECCION_EXPEDIENTE"
        | "REVISION_PRODUCCION"
        | "REVISION_CALIDAD"
        | "LIBERACION_LOTE"
        | "SOLICITUD_REAPERTURA_RECHAZO"
        | "APROBACION_REAPERTURA_RECHAZO"
        | "ADICION_CONTROL_REQUERIDO";
    decision: "CONFIRMA" | "APRUEBA" | "RECHAZA" | "DEVUELVE" | "SOLICITA" | "REABRE";
    firmadoEn: string;
    usernameFirmante: string;
    nombreFirmante: string;
    cedulaFirmante: string;
    rolFirmante: string;
    manifestacion: string;
    hashContenidoFirmado: string;
    firmaVisualVersionId?: number | null;
}

export interface BatchRecordRevision {
    id: number;
    numero: number;
    tipo:
        | "ENVIO_CALIDAD"
        | "REENVIO_CALIDAD"
        | "DECISION_CALIDAD"
        | "SOLICITUD_REAPERTURA_RECHAZO"
        | "REAPERTURA_RECHAZO"
        | "ADICION_CONTROL_REQUERIDO"
        | "CORRECCION"
        | "CIERRE";
    contenidoSha256: string;
    esquemaVersion: string;
    plantillaPdfVersion: string;
    creadaEn: string;
    creadaPor: string;
    motivo?: string | null;
}

export interface BatchRecordSeccionCorreccion {
    id: number;
    cicloRevisionNumero: number;
    seccion: string;
    estado: "PENDIENTE" | "ATENDIDA";
    solicitadaEn: string;
    solicitadaPor: string;
    atendidaEn?: string | null;
    atendidaPor?: string | null;
    justificacion?: string | null;
}

export interface BatchRecordSolicitudReapertura {
    id: number;
    cicloRevisionNumero: number;
    estado: "PENDIENTE" | "APROBADA";
    motivo: string;
    evidencia: string;
    alcance: string;
    revisionSolicitud?: number | null;
    firmaSolicitudId?: number | null;
    solicitadaEn: string;
    solicitadaPor: string;
    aprobadaEn?: string | null;
    aprobadaPor?: string | null;
    motivoAprobacion?: string | null;
    revisionAprobacion?: number | null;
    firmaAprobacionId?: number | null;
}

export interface BatchRecordDesviacion {
    id: number;
    etapaId?: number | null;
    codigo: string;
    descripcion: string;
    estado: "ABIERTA" | "EN_INVESTIGACION" | "RESUELTA" | "CERRADA";
    ocurridaEn?: string | null;
    detectadaEn: string;
    detectadaPor: string;
    origen: "PROCESO" | "MATERIAL" | "EQUIPO" | "AMBIENTE" | "DOCUMENTACION" | "CONTROL_CALIDAD" | "OTRO";
    accionInmediata?: string | null;
    evaluacionImpacto?: string | null;
    causaRaiz?: string | null;
    accionesCorrectivasPreventivas?: string | null;
    resolucion?: string | null;
    resueltaEn?: string | null;
    resueltaPor?: string | null;
}

export interface BatchRecordCorreccion {
    id: number;
    etapaId?: number | null;
    eventoCorreccionId?: number | null;
    eventoRevertidoId?: number | null;
    ordenFabricacionEventoCorreccionId?: number | null;
    ordenFabricacionEventoRevertidoId?: number | null;
    valorAnterior?: string | null;
    valorNuevo?: string | null;
    motivo: string;
    corregidaEn: string;
    corregidaPor: string;
    revision: number;
}

export interface BatchRecordDecisionCalidad {
    id: number;
    decision: "LIBERAR" | "RECHAZAR" | "DEVOLVER_A_PRODUCCION";
    motivo: string;
    decididaEn: string;
    decididaPor: string;
    revision: number;
    firmaId: number;
    cicloRevision: number;
    alcanceDevolucionJson?: string | null;
}

export interface BatchRecordCicloRevision {
    id: number;
    numero: number;
    origen: "ENVIO_INICIAL" | "REENVIO" | "REENVIO_TRAS_REAPERTURA";
    estado: "EN_REVISION" | "DEVUELTO_PRODUCCION" | "LIBERADO" | "RECHAZADO" | "MIGRADO_INCOMPLETO";
    enviadoEn: string;
    enviadoPor: string;
    motivoEnvio: string;
    revisionEnvio: number;
    cerradoEn?: string | null;
    cerradoPor?: string | null;
}

export interface BatchRecordPrevalidationBlock {
    controlRequeridoId: number;
    planCodigo: string;
    planNombre: string;
    ambito: "PROCESO" | "CALIDAD";
    estado: "PENDIENTE" | "CONFORME" | "NO_CONFORME" | "ACEPTADO_POR_DESVIACION" | "POR_REVALIDAR";
    puntoExigencia: "INFORMATIVO" | "CIERRE_ETAPA" | "ENVIO_CALIDAD" | "LIBERACION";
    mensaje: string;
}

export interface BatchRecordSendPrevalidation {
    batchRecordId: number;
    estado: EstadoBatchRecord;
    cicloRevisionActual: number;
    reenvio: boolean;
    permitido: boolean;
    bloqueosGenerales: string[];
    bloqueosControl: BatchRecordPrevalidationBlock[];
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
    desviaciones: BatchRecordDesviacion[];
    correcciones: BatchRecordCorreccion[];
    firmas: BatchRecordFirma[];
    revisiones: BatchRecordRevision[];
    decisionesCalidad: BatchRecordDecisionCalidad[];
    ciclosRevision: BatchRecordCicloRevision[];
    solicitudesReapertura: BatchRecordSolicitudReapertura[];
    seccionesCorreccion: BatchRecordSeccionCorreccion[];
    lotesOrigen: BatchRecordVinculoGenealogia[];
    lotesDestino: BatchRecordVinculoGenealogia[];
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}
