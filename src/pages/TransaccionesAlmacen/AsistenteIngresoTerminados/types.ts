// Types for the AsistenteIngresoTerminados wizard

export interface CategoriaBE {
    categoriaId: number;
    categoriaNombre: string;
    categoriaDescripcion?: string;
    loteSize?: number;
}

export interface TerminadoBE {
    productoId: string;
    nombre: string;
    tipoUnidades?: string;
    cantidadUnidad?: number;
    fotoUrl?: string;
    categoria?: CategoriaBE;
    status?: number;
    prefijoLote?: string;
    tipo_producto?: string;
    costo?: number;
    ivaPercentual?: number;
    observaciones?: string;
}

export interface OrdenProduccionBE {
    ordenId: number;
    loteAsignado: string;
    estadoOrden: number;
    cantidadProducir: number;
    observaciones?: string;
    fechaCreacion?: string;
    fechaLanzamiento?: string;
    fechaFinalPlanificada?: string;
    fechaInicio?: string;
    fechaFinal?: string;
    areaOperativa?: string;
    departamentoOperativo?: string;
    numeroPedidoComercial?: string;
    producto?: TerminadoBE;
}

export interface IngresoTerminadoConsultaResponse {
    ordenProduccion: OrdenProduccionBE;
    terminado: TerminadoBE;
    loteSizeEsperado: number;
}

export interface IngresoTerminadoDatos {
    /** Unidades reales que ingresan al almacén (entero >= 1) */
    cantidadIngresada: number;
    /** Fecha de vencimiento en formato ISO YYYY-MM-DD */
    fechaVencimiento: string;
}
