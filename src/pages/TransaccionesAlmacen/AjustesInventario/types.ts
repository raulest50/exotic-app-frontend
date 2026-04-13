export interface AjusteLoteOption {
    loteId: number;
    batchNumber: string;
    productionDate?: string | null;
    expirationDate?: string | null;
    cantidadDisponible: number;
    cantidadRecomendada: number;
}

export interface AjusteLoteAsignado extends AjusteLoteOption {
    cantidadAsignada: number;
}

export interface AjusteLotePageResponse {
    productoId: string;
    nombreProducto: string;
    lotesDisponibles: AjusteLoteOption[];
    totalPages: number;
    totalElements: number;
    currentPage: number;
    size: number;
}

export interface AjusteInventarioItemNormalizado {
    productoId: string;
    productoNombre: string;
    tipoProducto: string;
    loteId: number;
    batchNumber: string;
    cantidad: number;
}
