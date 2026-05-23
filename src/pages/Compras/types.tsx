// Path: src/pages/Compras/types.tsx
// Used in: src/pages/Compras/ExcelOCGenerator.tsx; src/pages/Compras/ReporteOrdenesCompras.tsx; src/pages/Compras/CrearOCM.tsx; src/pages/Compras/pdfGenerator.tsx; src/pages/Compras/components/*; src/pages/ActivosFijos/types.tsx; src/pages/ActivosFijos/OC/CrearOC_AF.tsx; src/utils/formatters.tsx
// Summary: Modelos de proveedor, materiales y órdenes de compra reutilizados en flujos de compras y activos fijos.
// ./types.tsx
import {Contacto} from "../Proveedores/types.tsx";

export interface Proveedor {
    id: string;
    tipoIdentificacion: number;
    nombre: string;
    direccion: string;
    regimenTributario: number;
    ciudad: string;
    departamento: string;
    contactos: Contacto[];
    url?: string;
    observacion?: string;
    categorias:number[];
    condicionPago: string;
    limiteRecepcionesParcialesOcm?: number;
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
    if(estado == 0) return "Pendiente liberacion";
    if(estado == 1) return "Pendiente envio a proveedor";
    if(estado == 2) return "Pendiente recepcion en almacen";
    if(estado == 3) return "Cerrada exitosamente";
}

export function getCondicionPagoText(condicion: string){
    if(condicion == "0") return "Credito";
    if(condicion == "1") return "Contado";
    if(condicion == "2") return "Mixta";
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

export interface OrdenCompraMateriales {
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
    observaciones?: string;
    /**
     * -1: cancelada
     *  0: pendiente liberacion
     *  1: pendiente envio a proveedor
     *  2: pendiente recepcion en almacen
     *  3: cerrada con éxito
     */
    estado: number;
    divisas?: DIVISAS;  // COP or USD
    trm?: number;       // Exchange rate
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
     */
    porcentajeRecibido?: number;
}


export enum DIVISAS {
    COP = "COP",
    USD = "USD"
}

export enum TipoEnvio{
    MANUAL = "MANUAL",
    EMAIL = "EMAIL",
    WHATSAPP = "WHATSAPP"
}
