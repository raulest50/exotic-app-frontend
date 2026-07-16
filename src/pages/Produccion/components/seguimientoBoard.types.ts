export interface SeguimientoOrdenAreaCardDTO {
    id: number;
    ordenId: number;
    loteAsignado: string | null;
    productoId: string;
    productoNombre: string;
    tipoUnidades: string | null;
    cantidadProducir: number;
    estadoOrden: number;
    politicaDispensacionInicio: string | null;
    fechaAplicacionPoliticaDispensacion: string | null;
    estadoDispensacionMateriales: string | null;
    ordenObservaciones: string | null;
    fechaFinalPlanificada: string | null;
    nodeId: number;
    nodeLabel: string;
    esNodoFinal: boolean;
    areaId: number;
    areaNombre: string;
    estado: number;
    estadoDescripcion: string;
    posicionSecuencia: number | null;
    fechaCreacion: string | null;
    fechaVisible: string | null;
    fechaEstadoActual: string | null;
    fechaCompletado: string | null;
    minutosEnEstadoActual: number | null;
    duracionEstimadaMinutos: number;
    requiereJornadaLaboral: boolean;
    usuarioReportaId: number | null;
    usuarioReportaNombre: string | null;
    observaciones: string | null;
}

export interface EstadoResumenDTO {
    total: number;
    cola: number;
    espera: number;
    enProceso: number;
    completado: number;
}

export type TableroVista = "HOY" | "SEMANA_ACTUAL" | "HISTORICO";

export interface TableroOperativoDTO {
    vista?: TableroVista | null;
    periodStartDate?: string | null;
    periodEndDate?: string | null;
    resumen: EstadoResumenDTO;
    cola: SeguimientoOrdenAreaCardDTO[];
    espera: SeguimientoOrdenAreaCardDTO[];
    enProceso: SeguimientoOrdenAreaCardDTO[];
    completado: SeguimientoOrdenAreaCardDTO[];
}

export interface RutaEstadoDTO {
    seguimientoId: number;
    nodeId: number;
    nodeLabel: string;
    areaId: number;
    areaNombre: string;
    estado: number;
    estadoDescripcion: string;
    fechaVisible: string | null;
    fechaEstadoActual: string | null;
    fechaCompletado: string | null;
    duracionEstimadaMinutos: number;
    requiereJornadaLaboral: boolean;
    usuarioReportaId: number | null;
    usuarioReportaNombre: string | null;
    observaciones: string | null;
}

export interface OrdenProduccionSeguimientoDetalleDTO {
    ordenId: number;
    loteAsignado: string | null;
    productoId: string;
    productoNombre: string;
    cantidadProducir: number;
    estadoOrden: number;
    politicaDispensacionInicio: string | null;
    fechaAplicacionPoliticaDispensacion: string | null;
    estadoDispensacionMateriales: string | null;
    ordenObservaciones: string | null;
    fechaCreacion: string | null;
    fechaInicio: string | null;
    fechaFinal: string | null;
    fechaFinalPlanificada: string | null;
    fechaInicioEstimacion: string | null;
    fechaFinalEstimada: string | null;
    duracionCalendarioRutaCriticaMinutos: number | null;
    rutaEstados: RutaEstadoDTO[];
}

export interface ResponsableAreaResumenDTO {
    id: number;
    username: string;
    nombreCompleto: string | null;
}

export interface OrdenMasAtrasadaDTO {
    ordenId: number;
    loteAsignado: string | null;
    productoNombre: string;
    estado: number;
    estadoDescripcion: string;
    minutosEnEstadoActual: number | null;
}

export interface AreaOperativaMonitoreoDTO {
    areaId: number;
    nombre: string;
    descripcion: string | null;
    responsableArea: ResponsableAreaResumenDTO;
}

export interface AreaOperativaTableroDTO {
    areaId: number;
    areaNombre: string;
    areaDescripcion: string | null;
    responsableArea: ResponsableAreaResumenDTO | null;
    fechaConsulta: string;
    instanteFoto: string;
    ultimaFechaReporteResponsable: string | null;
    ultimaOrdenReporteResponsableId: number | null;
    ultimaOrdenReporteResponsableLote: string | null;
    resumen: EstadoResumenDTO;
    promedioMinutosEspera: number | null;
    promedioMinutosEnProceso: number | null;
    ordenMasAtrasada: OrdenMasAtrasadaDTO | null;
    cola: SeguimientoOrdenAreaCardDTO[];
    espera: SeguimientoOrdenAreaCardDTO[];
    enProceso: SeguimientoOrdenAreaCardDTO[];
    completado: SeguimientoOrdenAreaCardDTO[];
}

export type MetricMode = "actual" | "historico" | "rango";

export interface AreaOperativaMetricasDTO {
    areaId: number;
    modo: MetricMode;
    fecha: string | null;
    fechaDesde: string | null;
    fechaHasta: string | null;
    promedioMinutosEspera: number | null;
    promedioMinutosEnProceso: number | null;
    muestrasEspera: number;
    muestrasEnProceso: number;
}

export type EstadoTableroKey = "cola" | "espera" | "enProceso" | "completado";
