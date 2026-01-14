export interface TransaccionAlmacen {
    transaccionId: number;
    fechaTransaccion: string;
    idEntidadCausante: number;
    tipoEntidadCausante: string; // 'OD' | 'OP' | 'OCM' | 'OTA' | 'OAA' - viene como string del backend
    observaciones?: string;
    estadoContable: string; // 'PENDIENTE' | 'CONTABILIZADA' | 'NO_APLICA' - viene como string del backend
    usuarioAprobador?: {
        userId: number; // Long en backend, number en TypeScript
        nombre?: string; // nombreCompleto en backend
    };
}

export interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

export interface FiltroHistDispensacionDTO {
    tipoFiltroId: number; // 0 = ninguno, 1 = transaccionId, 2 = ordenProduccionId
    transaccionId?: number | null;
    ordenProduccionId?: number | null;
    tipoFiltroFecha: number; // 0 = ninguno, 1 = rango, 2 = específica
    fechaInicio?: string | null;
    fechaFin?: string | null;
    fechaEspecifica?: string | null;
    page: number;
    size: number;
}

