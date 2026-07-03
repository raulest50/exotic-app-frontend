export type EstadoControlProcesoPlantilla = "BORRADOR" | "VIGENTE" | "RETIRADA";
export type TipoCaracteristicaControlProceso = "NUMERICA" | "BOOLEANA";

export interface AreaOperativaOption {
    areaId: number;
    nombre: string;
    descripcion?: string;
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
    ordenProduccionId?: number;
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
