export interface InformeGlobalAlmacen {
    fechaDesde: string;
    fechaHasta: string;
    modoFecha: "FECHA_UNICA" | "RANGO";
    diasRango: number;
    resumen: ResumenAlmacen;
    resumenPorUnidad: ResumenUnidadAlmacen[];
    rankingDispensacion: RankingDispensacionUnidad[];
    serieFisicaDiaria: SerieFisicaDiaria[];
    notas: NotaInformeAlmacen[];
}

export interface ResumenAlmacen {
    movimientosDispensacion: number;
    materialesDispensados: number;
    movimientosRecepcionCompra: number;
    materialesRecibidosCompra: number;
    movimientosOtrosIngresos: number;
    materialesOtrosIngresos: number;
    valorDispensacionesEstimado: number;
    valorRecepcionesCompraEstimado: number;
    valorOtrosIngresosEstimado: number;
    materialesConCosto: number;
    materialesSinCosto: number;
    coberturaCostosPct?: number | null;
}

export interface ResumenUnidadAlmacen {
    unidadMedida: string;
    cantidadDispensada: number;
    cantidadRecibidaCompra: number;
    cantidadOtrosIngresos: number;
}

export interface RankingDispensacionUnidad {
    unidadMedida: string;
    cantidadTotal: number;
    materialesTotales: number;
    materiales: MaterialDispensado[];
    cantidadOtros: number;
    materialesOtros: number;
}

export interface MaterialDispensado {
    productoId: string;
    productoNombre: string;
    tipoMaterial: string;
    cantidadDispensada: number;
    participacionPct: number;
    movimientos: number;
}

export interface SerieFisicaDiaria {
    fecha: string;
    unidadMedida: string;
    cantidadDispensada: number;
    cantidadRecibidaCompra: number;
}

export interface NotaInformeAlmacen {
    tipo: "INFO" | "WARNING" | string;
    mensaje: string;
}
