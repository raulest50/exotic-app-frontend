// Types for the AsistenteIngresoTerminados wizard

export interface CategoriaBE {
    categoriaId: number;
    categoriaNombre: string;
    categoriaDescripcion?: string;
    loteSize?: number;
    tiempoDiasFabricacion?: number;
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

// ============================================================================
// Tipos para el flujo temporal de reporte diario consolidado de terminados.
// El flujo por lote/OP y RegistroMasivoPayload queda temporalmente en desuso,
// pero se conserva por posible reintegracion futura al workflow de cierre de OP.
// ============================================================================

/** Datos validados del Excel subido - representa una fila consolidada por terminado */
export interface IngresoTerminadoValidado {
    productoId: string;
    productoNombre: string;
    categoriaNombre: string;
    tipoUnidades: string;
    capacidadProductivaDiaria: number;
    cantidadProducida: number;
    fechaProduccion: string; // YYYY-MM-DD
    observaciones?: string;
    rendimientoOperativoPct: number | null;
}

/** Temporalmente en desuso: payload para registro masivo por lote/OP. */
export interface RegistroMasivoPayload {
    username: string;
    ingresos: {
        ordenProduccionId: number;
        cantidadIngresada: number;
        fechaVencimiento: string;
    }[];
}

/** Error de validación individual */
export interface ValidationError {
    rowNumber: number;
    productoId: string;
    message: string;
}

/** Respuesta de validación del Excel */
export interface ValidacionExcelResponse {
    valid: boolean;
    errors: ValidationError[];
    rowCount: number;
}

export interface IngresoTerminadosReporteResumen {
    unidadesPlaneadas: number;
    unidadesProducidas: number;
    unidadesProducidasDiaAnterior: number;
    capacidadProductivaDia: number;
    rendimientoPlaneacionPct: number | null;
    cumplimientoReferenciasPct: number | null;
    rendimientoOperativoPct: number | null;
    tendenciaVsDiaAnteriorPct: number | null;
    referenciasPlaneadas: number;
    referenciasProducidas: number;
    referenciasPlaneadasProducidas: number;
    referenciasNoPlaneadas: number;
    categoriasConCapacidad: number;
    categoriasSinCapacidad: number;
}

export interface IngresoTerminadosReporteCategoria {
    categoriaId: number | null;
    categoriaNombre: string;
    unidadesPlaneadas: number;
    unidadesProducidas: number;
    capacidadProductivaDia: number;
    rendimientoPlaneacionPct: number | null;
    rendimientoOperativoPct: number | null;
    referenciasPlaneadas: number;
    referenciasProducidas: number;
    referenciasPlaneadasProducidas: number;
}

export interface IngresoTerminadosReporteReferencia {
    productoId: string;
    productoNombre: string;
    categoriaId: number | null;
    categoriaNombre: string;
    cantidadPlaneada: number;
    cantidadProducida: number;
    diferencia: number;
    rendimientoPlaneacionPct: number | null;
    planeado: boolean;
    producido: boolean;
    noPlaneado: boolean;
}

export interface IngresoTerminadosReporteMovimiento {
    movimientoId: number;
    fechaMovimiento: string;
    transaccionId: number | null;
    ordenProduccionId: number | null;
    productoId: string | null;
    productoNombre: string | null;
    categoriaId: number | null;
    categoriaNombre: string;
    cantidad: number;
    unidad: string | null;
    almacen: string | null;
    loteBatchNumber: string | null;
    fechaVencimiento: string | null;
    observaciones: string | null;
}

export interface IngresoTerminadosReporteDiario {
    fecha: string;
    mpsId: number | null;
    mpsEstado: string | null;
    weekStartDate: string | null;
    weekEndDate: string | null;
    resumen: IngresoTerminadosReporteResumen;
    consolidadoCategorias: IngresoTerminadosReporteCategoria[];
    detalleReferencias: IngresoTerminadosReporteReferencia[];
    movimientos: IngresoTerminadosReporteMovimiento[];
}
