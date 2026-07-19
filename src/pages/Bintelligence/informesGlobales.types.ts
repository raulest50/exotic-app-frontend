export type InformeQuery = {
    fecha?: string;
    fechaDesde?: string;
    fechaHasta?: string;
};

export type PeriodoInforme = {
    fechaDesde: string;
    fechaHasta: string;
    modoFecha: "FECHA_UNICA" | "RANGO";
    dias: number;
};

export type CantidadUnidad = {
    unidadMedida: string;
    cantidad: number;
};

export type NotaInforme = {
    tipo: string;
    mensaje: string;
};

export interface InformeInventario {
    versionContrato: number;
    periodo: PeriodoInforme;
    periodoTendencia: PeriodoInforme;
    fechaHoraCorteStock: string;
    stock: StockInventario;
    movimientos: MovimientosInventario;
    ocmPendientes: OcmPendientes;
    materialDirectoOp: MaterialDirectoOp;
    notas: NotaInforme[];
}

export interface StockInventario {
    resumen: ResumenStock;
    porUnidad: StockPorUnidad[];
    composicion: ComposicionInventario[];
    abc: ClasificacionAbc;
    alertas: ResumenAlertasStock;
}

export interface ResumenStock {
    valorEstimado: number;
    referenciasConStock: number;
    referenciasValorizadas: number;
    coberturaCostosPct?: number | null;
    referenciasNegativas: number;
}

export interface StockPorUnidad {
    unidadMedida: string;
    cantidadNeta: number;
    cantidadPositiva: number;
    cantidadNegativa: number;
    referenciasConStock: number;
}

export interface ComposicionInventario {
    tipo: string;
    referencias: number;
    valorEstimado: number;
    participacionPct: number;
}

export interface ClasificacionAbc {
    clases: ClaseAbc[];
    referenciasExcluidasSinCosto: number;
}

export interface ClaseAbc {
    clase: string;
    referencias: number;
    valorEstimado: number;
    participacionPct: number;
}

export interface ResumenAlertasStock {
    total: number;
    negativas: number;
    bajoUmbral: number;
    sinCosto: number;
    items: AlertaStock[];
}

export interface AlertaStock {
    tipo: string;
    prioridad: number;
    productoId: string;
    productoNombre: string;
    unidadMedida: string;
    stock: number;
    umbral?: number | null;
    umbralesIncumplidos: string[];
}

export interface MovimientosInventario {
    resumen: ResumenMovimientos;
    porUnidad: FlujoPorUnidad[];
    serieDiaria: SerieMovimiento[];
}

export interface ResumenMovimientos {
    recepcionesOcm: FlujoResumen;
    dispensaciones: FlujoResumen;
    productoTerminado: FlujoResumen;
    otrosIngresos: FlujoResumen;
}

export interface FlujoResumen {
    movimientos: number;
    referencias: number;
    valorEstimado: number;
}

export interface FlujoPorUnidad {
    unidadMedida: string;
    recepcionesOcm: number;
    dispensaciones: number;
    productoTerminado: number;
    otrosIngresos: number;
}

export interface SerieMovimiento extends FlujoPorUnidad {
    fecha: string;
    valorRecepcionesOcm: number;
    valorDispensaciones: number;
    valorProductoTerminado: number;
    valorOtrosIngresos: number;
}

export interface OcmPendientes {
    ordenes: number;
    referencias: number;
    cantidadesPorUnidad: CantidadUnidad[];
    valorPendienteSinIva: number;
    items: OcmPendiente[];
}

export interface OcmPendiente {
    ocmId: number;
    fechaEmision: string;
    proveedor: string;
    referencias: number;
    cantidadesPorUnidad: CantidadUnidad[];
    valorPendienteSinIva: number;
    lineas: LineaOcmPendiente[];
}

export interface LineaOcmPendiente {
    itemId: number;
    productoId: string;
    productoNombre: string;
    unidadMedida: string;
    ordenado: number;
    recibidoAplicado: number;
    pendiente: number;
    precioUnitarioSinIva: number;
    valorPendienteSinIva: number;
}

export interface MaterialDirectoOp {
    ordenes: number;
    referencias: number;
    cantidadesPorUnidad: CantidadUnidad[];
    valorEstimado: number;
    items: OpMaterial[];
}

export interface OpMaterial {
    opId: number;
    lote?: string | null;
    estado: number;
    referencias: number;
    cantidadesPorUnidad: CantidadUnidad[];
    valorEstimado: number;
}

export interface BusquedaStockMaterial {
    buscar: string;
    resultados: ResultadoStockMaterial[];
}

export interface ResultadoStockMaterial {
    productoId: string;
    nombre: string;
    unidadMedida: string;
    stockGeneral: number;
    costoUnitario: number;
    costoDisponible: boolean;
    valorEstimado: number;
}

export interface CoberturaMateriales {
    ventanaDias: number;
    fechaDesde: string;
    fechaHasta: string;
    fechaHoraCorteStock: string;
    estado: "ESTIMADO" | "SIN_CONSUMO";
    fechaPrimerAgotamiento?: string | null;
    materialCriticoId?: string | null;
    materialCriticoNombre?: string | null;
    intervaloFechaMin?: string | null;
    intervaloFechaMax?: string | null;
    confianzaBaja: boolean;
    motivosConfianzaBaja: string[];
    diasObservados: number;
    diasConDispensacion: number;
    materialesAnalizados: number;
    materialesConDemanda: number;
    estimaciones: EstimacionCoberturaMaterial[];
}

export interface EstimacionCoberturaMaterial {
    productoId: string;
    nombre: string;
    unidadMedida: string;
    stockActual: number;
    demandaMediaDiaria: number;
    diasConDispensacion: number;
    diasHastaAgotamiento?: number | null;
    fechaAgotamiento?: string | null;
    intervaloFechaMin?: string | null;
    intervaloFechaMax?: string | null;
}

export interface InformeProduccion {
    fechaDesde: string;
    fechaHasta: string;
    modoFecha: "FECHA_UNICA" | "RANGO";
    diasRango: number;
    mpsIds: number[];
    resumen: ResumenProduccion;
    consolidadoCategorias: CategoriaProduccion[];
    detalleReferencias: ReferenciaProduccion[];
    notas: NotaInforme[];
}

export interface ResumenProduccion {
    unidadesPlaneadas: number;
    unidadesProducidas: number;
    unidadesProducidasPeriodoAnterior: number;
    capacidadProductivaPeriodo: number;
    rendimientoPlaneacionPct?: number | null;
    cumplimientoReferenciasPct?: number | null;
    capacidadUtilizadaPct?: number | null;
    tendenciaProduccionPct?: number | null;
    referenciasPlaneadas: number;
    referenciasProducidas: number;
    referenciasPlaneadasProducidas: number;
    referenciasNoPlaneadas: number;
    categoriasConCapacidad: number;
    categoriasSinCapacidad: number;
    movimientosProduccion: number;
}

export interface CategoriaProduccion {
    categoriaId?: number | null;
    categoriaNombre: string;
    unidadesPlaneadas: number;
    unidadesProducidas: number;
    capacidadProductivaPeriodo: number;
    rendimientoPlaneacionPct?: number | null;
    cumplimientoReferenciasPct?: number | null;
    capacidadUtilizadaPct?: number | null;
    referenciasPlaneadas: number;
    referenciasProducidas: number;
    referenciasPlaneadasProducidas: number;
}

export interface ReferenciaProduccion {
    productoId?: string | null;
    productoNombre: string;
    categoriaId?: number | null;
    categoriaNombre: string;
    cantidadPlaneada: number;
    cantidadProducida: number;
    diferencia: number;
    rendimientoPlaneacionPct?: number | null;
    planeado: boolean;
    producido: boolean;
    noPlaneado: boolean;
}
