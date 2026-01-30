export interface ItemOrdenCompraResumenDTO {
    itemOrdenId: number;
    productId: string | null;
    cantidad: number;
    precioUnitario: number;
    subTotal: number;
}

export interface LoteResumenDTO {
    id: number;
    batchNumber: string;
    productionDate: string | null;
    expirationDate: string | null;
}

export interface MovimientoResumenDTO {
    movimientoId: number;
    cantidad: number;
    productId: string | null;
    tipoMovimiento: string | null;
    almacen: string | null;
    fechaMovimiento: string | null;
}

export interface AsientoContableResumenDTO {
    id: number;
    fecha: string | null;
    descripcion: string | null;
    modulo: string | null;
    documentoOrigen: string | null;
    estado: string | null;
}

export interface TransaccionAlmacenResumenDTO {
    transaccionId: number;
    fechaTransaccion: string | null;
    estadoContable: string | null;
    observaciones: string | null;
    movimientos: MovimientoResumenDTO[];
    asientoContable: AsientoContableResumenDTO | null;
}

export interface EstudiarEliminacionOCMResponseDTO {
    ordenCompraId: number;
    itemsOrdenCompra: ItemOrdenCompraResumenDTO[];
    lotes: LoteResumenDTO[];
    transaccionesAlmacen: TransaccionAlmacenResumenDTO[];
    asientosContables: AsientoContableResumenDTO[];
}
