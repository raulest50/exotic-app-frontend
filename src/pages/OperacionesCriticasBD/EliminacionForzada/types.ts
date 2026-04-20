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
    eliminable: boolean;
    itemsOrdenCompra: ItemOrdenCompraResumenDTO[];
    lotes: LoteResumenDTO[];
    transaccionesAlmacen: TransaccionAlmacenResumenDTO[];
    asientosContables: AsientoContableResumenDTO[];
}

export interface EstudiarEliminacionOPResponseDTO {
    ordenProduccionId: number;
    eliminable: boolean;
    lotes: LoteResumenDTO[];
    transaccionesAlmacen: TransaccionAlmacenResumenDTO[];
    asientosContables: AsientoContableResumenDTO[];
}

export interface MaterialEliminacionResumenDTO {
    productoId: string;
    nombre: string;
    tipoMaterial: number | null;
    tipoUnidades: string | null;
}

export interface ItemOrdenCompraMaterialResumenDTO {
    itemOrdenId: number;
    ordenCompraId: number;
    proveedorNombre: string | null;
    estadoOrdenCompra: number | null;
    cantidad: number;
    precioUnitario: number;
    subTotal: number;
}

export interface InsumoRecetaResumenDTO {
    insumoId: number;
    productoDestinoId: string;
    productoDestinoNombre: string;
    tipoProductoDestino: string;
    cantidadRequerida: number;
}

export interface InsumoEmpaqueResumenDTO {
    insumoEmpaqueId: number;
    terminadoId: string;
    terminadoNombre: string;
    unitsPerCase: number | null;
    cantidad: number;
    uom: string | null;
}

export interface EstudiarEliminacionMaterialResponseDTO {
    material: MaterialEliminacionResumenDTO;
    eliminable: boolean;
    itemsOrdenCompra: ItemOrdenCompraMaterialResumenDTO[];
    lotes: LoteResumenDTO[];
    transaccionesAlmacen: TransaccionAlmacenResumenDTO[];
    asientosContables: AsientoContableResumenDTO[];
    insumosReceta: InsumoRecetaResumenDTO[];
    insumosEmpaque: InsumoEmpaqueResumenDTO[];
}

export interface EliminacionBatchFailureDTO {
    productoId: string;
    reason: string;
}

export interface EliminacionTerminadosBatchResultDTO {
    permitted: boolean;
    executed: boolean;
    message: string;
    totalTerminados: number;
    eliminados: number;
    fallidos: number;
    productoIdsProcesados: string[];
    failures: EliminacionBatchFailureDTO[];
}

export interface PurgaBaseDatosResultDTO {
    permitted: boolean;
    executed: boolean;
    message: string;
    environment: string;
    truncatedTablesCount: number;
    truncatedTables: string[];
    preservedTables: string[];
    preservedUsers: string[];
}
