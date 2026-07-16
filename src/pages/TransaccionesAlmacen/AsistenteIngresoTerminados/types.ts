export interface FechaPendienteProduccion {
    fechaProduccion: string;
    cantidadReportes: number;
    totalUnidades: number;
    vencida: boolean;
}

export interface ResumenPendientesProduccion {
    fechaHoy: string;
    pendientesHoy: number;
    pendientesVencidos: number;
    fechas: FechaPendienteProduccion[];
}

export interface ReporteProduccionPendiente {
    reporteId: number;
    version: number;
    ordenProduccionId: number;
    lote: string;
    productoId: string;
    productoNombre: string;
    tipoUnidades: string | null;
    cantidadPlaneada: number;
    cantidadReportada: number;
    reportadoEn: string;
    reportadoPor: string;
}

export interface PendientesProduccionFecha {
    fechaProduccion: string;
    reportes: ReporteProduccionPendiente[];
}

export interface EdicionReporteProduccion {
    cantidadConfirmada: number;
    motivoCorreccion: string;
}

export interface CierreProduccionRequest {
    fechaProduccion: string;
    idempotencyKey: string;
    reportes: Array<{
        reporteId: number;
        version: number;
        cantidadConfirmada: number;
        motivoCorreccion: string | null;
    }>;
}

export interface CierreProduccionResponse {
    cierreId: number;
    fechaProduccion: string;
    cerradoEn: string;
    cantidadReportes: number;
    totalUnidades: number;
    reportes: Array<{
        reporteId: number;
        ordenProduccionId: number;
        lote: string;
        cantidadConfirmada: number;
        transaccionAlmacenId: number;
    }>;
}

export interface ConsolidadoProductoProduccion {
    productoId: string;
    productoNombre: string;
    tipoUnidades: string | null;
    cantidadReportada: number;
    cantidadConfirmada: number;
    lotes: number;
}
