export interface AreaOperativaOrdenDetalleDTO {
    orden: OrdenOperativaResumenDTO;
    seguimiento: SeguimientoOperativoItemDTO[];
    rutaProceso: RutaProcesoVisualDTO;
    bom: BomJerarquicoDTO;
}

export interface OrdenOperativaResumenDTO {
    ordenId: number;
    loteAsignado: string | null;
    productoId: string;
    productoNombre: string;
    cantidadProducir: number;
    estadoOrden: number;
    ordenObservaciones: string | null;
    fechaCreacion: string | null;
    fechaInicio: string | null;
    fechaFinal: string | null;
    fechaFinalPlanificada: string | null;
    categoriaId: number | null;
    categoriaNombre: string | null;
}

export interface SeguimientoOperativoItemDTO {
    seguimientoId: number;
    nodeId: number;
    nodeLabel: string;
    areaId: number | null;
    areaNombre: string | null;
    estado: number;
    estadoDescripcion: string;
    fechaVisible: string | null;
    fechaEstadoActual: string | null;
    fechaCompletado: string | null;
    usuarioReportaNombre: string | null;
    observaciones: string | null;
}

export interface RutaProcesoVisualDTO {
    nodes: RutaProcesoVisualNodeDTO[];
    edges: RutaProcesoVisualEdgeDTO[];
}

export interface RutaProcesoVisualNodeDTO {
    nodeId: number;
    frontendId: string;
    label: string | null;
    areaId: number | null;
    areaNombre: string | null;
    posicionX: number;
    posicionY: number;
    hasLeftHandle: boolean;
    hasRightHandle: boolean;
    seguimientoId: number | null;
    estadoActual: number | null;
    estadoDescripcion: string | null;
    fechaEstadoActual: string | null;
    currentLeaderArea: boolean;
}

export interface RutaProcesoVisualEdgeDTO {
    edgeId: number;
    frontendId: string;
    sourceNodeId: number;
    targetNodeId: number;
    sourceFrontendId: string;
    targetFrontendId: string;
}

export interface BomJerarquicoDTO {
    receta: BomRecetaNodeDTO[];
    empaque: BomEmpaqueItemDTO[];
}

export interface BomRecetaNodeDTO {
    insumoId: number | null;
    productoId: string;
    productoNombre: string;
    cantidadTotalRequerida: number;
    tipoUnidades: string | null;
    tipoProducto: string;
    inventareable: boolean;
    subInsumos: BomRecetaNodeDTO[];
}

export interface BomEmpaqueItemDTO {
    productoId: string;
    productoNombre: string;
    cantidadTotalRequerida: number;
    tipoUnidades: string | null;
    inventareable: boolean;
}
