// Path: src/pages/TransaccionesAlmacen/types.tsx
// Used in: src/pages/TransaccionesAlmacen/AsistenteDispensacion/*; src/pages/TransaccionesAlmacen/AsistenteDispensacionDirecta/*; src/pages/TransaccionesAlmacen/AsistenteIngresoOCM/*; src/pages/TransaccionesAlmacen/AjustesInventario/*; src/pages/TransaccionesAlmacen/AsistenteBackflushDirecto/*; src/pages/TransaccionesAlmacen/components/MateriaPrimaPicker.tsx; src/pages/TransaccionesAlmacen/AsistenteBackflushDirecto/TerminadoPicker.tsx
// Summary: Tipos para dispensaciones, ingresos, ajustes de inventario y movimientos de almacén.
// RecibirMercancia/types.tsx
import {Contacto} from "../Proveedores/types";

export interface Proveedor {
    id: string;
    tipoIdentificacion: number;
    nombre: string;
    direccion?: string;
    regimenTributario: number;
    ciudad?: string;
    departamento?: string;
    contactos: Contacto[];
    url?: string;
    observacion?: string;
    categorias:number[];
    condicionPago: string;
    rutFile?: File;         // Optional file for RUT
    camaraFile?: File;      // Optional file for Cámara y Comercio
}

export function getRegimenTributario(regimen: number) {
    if(regimen == 0) return "Regimen Comun";
    if(regimen == 0) return "Regimen Simplificado";
    if(regimen == 0) return "Regimen Especial";
}

export function getEstadoText(estado: number){
    if(estado == -1) return "Cancelada";
    if(estado == 0) return "Pendiente confirmacion proveedor";
    if(estado == 1) return "Pendiente recepcion y verificacion precios";
    if(estado == 2) return "Pendiente recepcion y verificacion cantidades";
    if(estado == 3) return "Cerrada exitosamente";
}

export function getCondicionPagoText(condicion: string){
    if(condicion == "0") return "Credito";
    if(condicion == "1") return "Contado";
}

export function getCantidadCorrectaText(cantidadCorrecta: number){
    if(cantidadCorrecta == 0) return "Pendiente Revision";
    if(cantidadCorrecta == 1) return "Cantidad Correcta";
    if(cantidadCorrecta == -1) return "Cantidad Incorrecta";
}

export interface Producto{
    productoId: number;
    nombre: string;
    observaciones: string;
    costo: number;
    ivaPercentual: number;
    fechaCreacion?: string;
    tipoUnidades: string;
    cantidadUnidad: string;
    tipo_producto: string;
}

export interface Material extends Producto{
    fichaTecnicaUrl?: string;
    tipoMaterial?: number; // 1: materia prima, 2: material de empaque
}

export interface ItemOrdenCompra {
    itemOrdenId?: number;
    // The selected MateriaPrima is wrapped here.
    material: Material;
    cantidad: number;
    precioUnitario: number;
    ivaCOP: number;
    subTotal: number;
    /**
     * 0: aún por revisar
     * 1: si concuerda
     * -1: no concuerda
     */
    cantidadCorrecta: number;
    /**
     * 0: aún por revisar
     * 1: si concuerda
     * -1: no concuerda
     */
    precioCorrecto: number;
}

export interface OrdenCompra {
    // The backend generates this id
    ordenCompraId?: number;
    fechaEmision?: string;
    fechaVencimiento: string;
    facturaCompraId?: string;
    proveedor: Proveedor;
    itemsOrdenCompra: ItemOrdenCompra[];
    subTotal: number;
    ivaCOP: number;
    totalPagar: number;
    condicionPago: string;
    tiempoEntrega: string;
    plazoPago: number;
    /**
     * -1: cancelada
     *  0: pendiente liberacion
     *  1: pendiente envio a proveedor
     *  2: pendiente recepcion en almacen
     *  3: cerrada con éxito
     */
    estado: number;
    /**
     * Porcentaje estimado de materiales recibidos para esta orden de compra.
     * Calculado dinámicamente por el backend cuando se consultan OCMs pendientes.
     * 
     * Valores posibles:
     * - undefined/null: No se ha calculado (cuando se obtiene de otros endpoints)
     * - 0.0: No se ha recibido nada
     * - 0.0 a 100.0: Porcentaje de recepción normal
     * - > 100.0: Se ha recibido más de lo ordenado (caso válido)
     * 
     * Solo está disponible cuando se consulta a través de:
     * GET /ingresos_almacen/ocms_pendientes_ingreso
     * 
     * @see StepZeroComponent_v2.tsx - Componente que usa este campo
     */
    porcentajeRecibido?: number;
}


export interface Lote{
    id?: number;
    batchNumber?: string;
    productionDate?: string;
    expirationDate: string;
}

export enum TipoMovimiento{
    COMPRA = "COMPRA",
    BAJA = "BAJA",
    CONSUMO = "CONSUMO",
    BACKFLUSH = "BACKFLUSH",
    VENTA = "VENTA",
    PERDIDA = "PERDIDA"
}

export enum Almacen {
    GENERAL = "GENERAL", // donde se reciben compras, se dispensa material, se ingresa backflush
    PERDIDAS = "PERDIDAS", // scrap de OP's y perdidas de material por eventos fortuitos
    CALIDAD = "CANTIDAD", // producto para control de calidad
    DEVOLUCIONES = "DEVOLUCIONES" // terminados devuelto por clientes o materiales para devolverle a proveedor
}

export interface Movimiento{
    movimientoId?: number;
    cantidad: number;
    producto: Producto
    tipoMovimiento: TipoMovimiento;
    almacen: Almacen;
    lote: Lote;
    fechaMovimiento: string;
}

export enum TipoEntidadCausante{
    OCM = "OCM", // orden de compra de materiales
    OP = "OP", // orden de produccion
    OTA = "OTA", // orden de tranferencia de almacen
    OAA = "OAA", // orden de ajuste de almacen
}

export interface TransaccionAlmacen{
    transaccionId?: number;
    movimientosTransaccion: Movimiento[];
    fechaTransaccion?: string;
    urlDocSoporte: string;
    tipoEntidadCausante: TipoEntidadCausante;
    idEntidadCausante: string;
    observaciones: string;
    estadoContable?: 'PENDIENTE' | 'CONTABILIZADA' | 'NO_APLICA'; // Agregar este campo si no existe
}

export interface IngresoOCM_DTA{
    transaccionAlmacen: TransaccionAlmacen;
    ordenCompraMateriales: OrdenCompra;
    userId: string | undefined; // responsable del ingreso a almacen
    observaciones: string;
    file: File;
}

// ===== Dispensación de Materiales =====

export interface LoteDispensacion {
    loteId: number;
    batchNumber: string;
    cantidadDisponible: number;
}

export interface DispensacionFormularioItemDTO {
    seguimientoId: number;
    producto: Producto;
    cantidadSolicitada: number;
}

export interface DispensacionFormularioLoteDTO {
    seguimientoId: number;
    loteId: number;
    batchNumber: string;
    cantidadDisponible: number;
    cantidadSugerida: number;
}

export interface DispensacionFormularioDTO {
    ordenProduccionId: number;
    dispensaciones: DispensacionFormularioItemDTO[];
    lotesRecomendados: DispensacionFormularioLoteDTO[];
}

export interface ItemDispensacionDTO {
    seguimientoId: number;
    producto: Producto;
    lote: LoteDispensacion;
    /** Cantidad sugerida por el backend */
    cantidadSugerida: number;
    /** Cantidad que se va a dispensar (editable por el usuario) */
    cantidad: number;
}

export interface DispensacionDTO {
    ordenProduccionId: number;
    items: ItemDispensacionDTO[];
    /**
     * Lista de IDs de usuarios responsables de realizar la dispensación.
     * Puede ser undefined. Si se proporciona, debe tener al menos un usuario.
     */
    usuarioRealizadorIds?: number[];
    /**
     * ID del usuario que aprueba la dispensación.
     * Puede ser undefined si no hay aprobador asignado.
     */
    usuarioAprobadorId?: number;
    /**
     * ID del usuario que realiza la operación (para compatibilidad).
     * Si se proporciona usuarioRealizadorIds, se usa el primer ID de esa lista.
     */
    usuarioId?: number;
    /**
     * Observaciones adicionales sobre la dispensación.
     */
    observaciones?: string;
}

// ===== Dispensación No Planificada =====

/** Item básico solicitado por el usuario para la dispensación directa */
export interface DispensacionDirectaItem {
    material: Material;
    cantidad: number;
}

/** Item detallado luego de la recomendación de lotes */
export interface DispensacionDirectaDetalleItem {
    material: Material;
    loteId: number | null;
    /** Cantidad sugerida por el backend */
    cantidadSugerida: number;
    /** Cantidad final a dispensar (editable) */
    cantidad: number;
}

export interface DispensacionNoPlanificadaItemDTO {
    productoId: string;
    cantidad: number;
    loteId?: number;
}

export interface DispensacionNoPlanificadaDTO {
    observaciones: string;
    usuarioId: number;
    items: DispensacionNoPlanificadaItemDTO[];
}

// ===== Insumos Desglosados y Selección de Lotes =====

export interface InsumosDesglosadosResponse {
    insumosReceta: InsumoDesglosado[];
    insumosEmpaque: InsumoDesglosado[];
}

export interface InsumoEmpaqueCasePackDTO {
    materialId: string | null;
    cantidad: number;
    uom?: string | null;
}

export interface CasePackResponseDTO {
    unitsPerCase: number | null;
    insumosEmpaque: InsumoEmpaqueCasePackDTO[];
}

export interface LoteSeleccionado {
    loteId: number;
    batchNumber: string;
    cantidad: number; // Cantidad a tomar de este lote
    cantidadDisponible: number; // Cantidad disponible en el lote
    productionDate?: string | null;
    expirationDate?: string | null;
}

export interface InsumoDesglosado {
    insumoId?: number;
    productoId: string;
    productoNombre: string;
    cantidadTotalRequerida: number;
    tipoUnidades: string;
    tipoProducto: string;
    lotesSeleccionados?: LoteSeleccionado[];
    /**
     * ID del seguimiento de orden de producción asociado a este insumo.
     * Puede ser undefined si el insumo no está asociado a un seguimiento específico.
     */
    seguimientoId?: number;
    /**
     * Estructura anidada de subinsumos (para semiterminados).
     * Solo presente cuando el insumo es un semiterminado que contiene otros insumos.
     */
    subInsumos?: InsumoDesglosado[];
    /**
     * Tipo de producto para identificar semiterminados ('S') vs materiales ('M').
     * Usado para determinar si mostrar botón de lotes y estilo visual.
     */
    tipo_producto?: string;
    /**
     * Indica si el producto es inventariable (true) o no (false, como el agua).
     * Los productos no inventariables se muestran en la tabla pero no requieren lotes
     * y no se incluyen en la dispensación final.
     */
    inventareable?: boolean;
}

export interface TransaccionAlmacenDetalle {
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
    movimientos: MovimientoDetalle[];
}

export interface DispensacionResumenResponse {
    insumosReceta: InsumoDesglosado[];
    insumosEmpaque: InsumoDesglosado[];
    casePack?: CasePackResponseDTO | null;
    historialDispensaciones: TransaccionAlmacenDetalle[];
}

// ===== Movimientos y Consolidado OCM =====

export interface MovimientoDetalle {
    movimientoId: number;
    productoId: string;
    productoNombre: string;
    tipoUnidades: string;
    cantidad: number;
    batchNumber?: string;
    productionDate?: string;
    expirationDate?: string;
    tipoMovimiento: string;
    almacen: string;
    fechaMovimiento: string;
}

export interface LoteConsolidado {
    batchNumber?: string;
    cantidad: number;
    expirationDate?: string;
    transaccionId: number;
}

export interface MaterialConsolidado {
    productoId: string;
    productoNombre: string;
    tipoUnidades: string;
    cantidadTotal: number;
    lotes: LoteConsolidado[];
}

export interface ConsolidadoOCMResponse {
    ordenCompraId: number;
    materiales: MaterialConsolidado[];
    totalTransacciones: number;
}