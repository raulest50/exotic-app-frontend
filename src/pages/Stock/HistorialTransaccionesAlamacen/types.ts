export interface TransaccionAlmacenRow {
    transaccionId: number;
    fechaTransaccion: string;
    idEntidadCausante: number;
    tipoEntidadCausante: string;
    observaciones?: string;
    estadoContable: string;
    usuarioAprobador?: {
        userId: number;
        nombre?: string;
    };
}

export interface FiltroHistorialTransaccionAlmacenDTO {
    tipoEntidadCausante: string;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    page: number;
    size: number;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

export const TIPO_ENTIDAD_CAUSANTE_OPTIONS: { value: string; label: string }[] = [
    { value: 'OCM', label: 'Orden de Compra de Materiales (OCM)' },
    { value: 'OP', label: 'Orden de Producción (OP)' },
    { value: 'OTA', label: 'Orden de Transferencia de Almacén (OTA)' },
    { value: 'OAA', label: 'Orden de Ajuste de Almacén (OAA)' },
    { value: 'OD', label: 'Orden de Dispensación (OD)' },
    { value: 'CM', label: 'Carga Masiva de Inventario (CM)' },
];

export const TIPO_ENTIDAD_CAUSANTE_LABELS: Record<string, string> = {
    OCM: 'Orden de Compra de Materiales',
    OP: 'Orden de Producción',
    OTA: 'Transferencia de Almacén',
    OAA: 'Ajuste de Almacén',
    OD: 'Dispensación',
    CM: 'Carga Masiva',
};
