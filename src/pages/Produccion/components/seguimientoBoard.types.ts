export interface SeguimientoOrdenAreaCardDTO {
    id: number;
    ordenId: number;
    loteAsignado: string | null;
    productoId: string;
    productoNombre: string;
    cantidadProducir: number;
    estadoOrden: number;
    ordenObservaciones: string | null;
    fechaFinalPlanificada: string | null;
    nodeId: number;
    nodeLabel: string;
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

export interface TableroOperativoDTO {
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
    ordenObservaciones: string | null;
    fechaCreacion: string | null;
    fechaInicio: string | null;
    fechaFinal: string | null;
    fechaFinalPlanificada: string | null;
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
    resumen: EstadoResumenDTO;
    promedioMinutosEspera: number | null;
    promedioMinutosEnProceso: number | null;
    ordenMasAtrasada: OrdenMasAtrasadaDTO | null;
    cola: SeguimientoOrdenAreaCardDTO[];
    espera: SeguimientoOrdenAreaCardDTO[];
    enProceso: SeguimientoOrdenAreaCardDTO[];
    completado: SeguimientoOrdenAreaCardDTO[];
}

export type EstadoTableroKey = "cola" | "espera" | "enProceso" | "completado";
