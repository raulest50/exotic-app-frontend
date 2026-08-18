export type EstadoControlProcesoPlantilla = "BORRADOR" | "VIGENTE" | "RETIRADA";
export type TipoCaracteristicaControlProceso = "NUMERICA" | "BOOLEANA";
export type ResultadoControlProceso = "CONFORME" | "NO_CONFORME";
export type DecisionCalidadBatchRecord = "LIBERAR" | "RECHAZAR" | "DEVOLVER_A_PRODUCCION";

export interface AreaOperativaOption {
    areaId: number;
    nombre: string;
    descripcion?: string;
    responsableArea?: {
        id?: number;
        cedula?: number;
        username?: string;
        nombreCompleto?: string;
    } | null;
}

export interface ProductoResumen {
    productoId: string;
    nombre: string;
}

export interface LoteProduccionResumen {
    id: number;
    batchNumber: string;
    productionDate?: string;
    expirationDate?: string;
    estadoCalidad?: string;
    ordenProduccionId?: number;
    batchRecordId?: number;
    batchRecordCodigo?: string;
    producto?: ProductoResumen;
}

export interface CaracteristicaRequest {
    nombre: string;
    tipo: TipoCaracteristicaControlProceso;
    unidad?: string | null;
    orden: number;
    cantidadMuestras: number;
    unidadesPorMuestra: number;
    limiteInferior?: number | null;
    limiteSuperior?: number | null;
}

export interface CaracteristicaResponse extends CaracteristicaRequest {
    id: number;
}

export interface PlantillaRequest {
    areaOperativaId: number;
    caracteristicas: CaracteristicaRequest[];
}

export interface PlantillaResponse {
    id: number;
    areaOperativa: AreaOperativaOption;
    version: number;
    estado: EstadoControlProcesoPlantilla;
    caracteristicas: CaracteristicaResponse[];
}

export interface PrepararEjecucionResponse {
    plantilla: PlantillaResponse;
    lote: LoteProduccionResumen;
    batchRecordEtapaId?: number | null;
}

export interface LecturaRequest {
    indiceUnidad: number;
    valorNumerico?: number | null;
    valorBooleano?: boolean | null;
}

export interface MuestraRequest {
    caracteristicaId: number;
    numeroMuestra: number;
    lecturas: LecturaRequest[];
}

export interface EjecucionRequest {
    plantillaId: number;
    loteId: number;
    batchRecordEtapaId?: number | null;
    observaciones?: string | null;
    muestras: MuestraRequest[];
}

export interface LecturaResponse extends LecturaRequest {
    id: number;
}

export interface MuestraResponse {
    id: number;
    caracteristicaId: number;
    caracteristicaNombre: string;
    tipo: TipoCaracteristicaControlProceso;
    unidad?: string | null;
    limiteInferior?: number | null;
    limiteSuperior?: number | null;
    numeroMuestra: number;
    lecturas: LecturaResponse[];
}

export interface EjecucionListItemResponse {
    id: number;
    plantillaId: number;
    plantillaVersion: number;
    areaOperativa: AreaOperativaOption;
    lote: LoteProduccionResumen;
    usuarioUsername: string;
    usuarioNombreCompleto?: string;
    fechaRegistro: string;
    resultado?: ResultadoControlProceso | null;
    batchRecordId?: number | null;
    batchRecordCodigo?: string | null;
    batchRecordEtapaId?: number | null;
    observaciones?: string | null;
}

export interface EjecucionDetalleResponse extends EjecucionListItemResponse {
    muestras: MuestraResponse[];
}

export interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

export interface BatchRecordQualityInboxItem {
    batchRecordId: number;
    codigo: string;
    estado: string;
    ordenProduccionId: number;
    loteId: number;
    lote: string;
    estadoCalidadLote: string;
    productoId: string;
    productoNombre: string;
    cantidadObtenida: number;
    unidadMedida: string;
    enviadoRevisionEn: string;
    controlesRequeridos: number;
    controlesConformes: number;
    controlesPendientes: number;
    desviacionesAbiertas: number;
    puedeLiberar: boolean;
    bloqueos: string[];
}

export interface BatchRecordEtapaControl {
    etapaId: number;
    secuencia: number;
    areaOperativaId: number;
    areaOperativaNombre: string;
    etapaNombre: string;
    plantillaId: number;
    plantillaVersion: number;
    ultimaEjecucionId?: number | null;
    ultimoResultado?: ResultadoControlProceso | null;
    ultimaEjecucionEn?: string | null;
    pendiente: boolean;
}

export interface BatchRecordQualityReviewDetail {
    expediente: import("../Produccion/BatchRecords/types").BatchRecordDetail;
    evaluacion: BatchRecordQualityInboxItem;
    controles: BatchRecordEtapaControl[];
}
