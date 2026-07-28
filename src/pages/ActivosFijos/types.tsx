// Path: src/pages/ActivosFijos/types.tsx
// Used in: src/pages/ActivosFijos/OC/*; src/pages/ActivosFijos/Incorporacion/*; src/pages/ActivosFijos/Reportes/*; src/pages/Productos/DefProcesses/RecursosProduccion/*; src/pages/Compras/pdfGenerator.tsx
// Summary: Tipos para activos fijos, órdenes de compra de activos y parametrización de depreciación usados en flujos de incorporación y reporting.
import {Proveedor} from "../Compras/types.tsx";
import type { EmpresaIdentidadLegalVersion } from "../../api/EmpresaIdentidadLegalApi";
import type { EmpresaLogoDocumentalVersion } from "../../api/EmpresaLogoDocumentalApi";

export const TIPO_INCORPORACION = {
        CON_OC:'CON_OC', SIN_OC:'SIN_OC', AF_EXISTENTE:'AF_EXISTENTE'
    } as const;

export enum MetodoDepreciacion {
    SL = "SL",
    DB = "DB",
}

// Nuevo enum para TipoActivo que reemplaza el string
export enum TipoActivo {
    PRODUCCION = "PRODUCCION",
    MOBILIARIO = "MOBILIARIO",
    EQUIPO = "EQUIPO"
}

// Nuevo enum para UnidadesCapacidad
export enum UnidadesCapacidad {
    L = "L",
    KG = "KG",
    TON = "TON",
    M3 = "M3",
    W = "W",
    HP = "HP"
}

export interface DepreciacionActivo{}
export interface MantenimientoActivo{}

export interface ActivoFijo {
    id: string;
    nombre: string; // nombre que se le desea asignar en el sistema
    brand?: string; // ejemplo dell, fluke, lenovo etc. puede ser el mismo o diferente del proveedor segun el caso
    url?: string; // ruta ficha tecnia, la establece el backend con el multiparfile adjunto.
    estado: number; // 0:activo, 1:obsoleto, 2:dado de baja

    // Tipo de activo fijo (ahora usando el enum)
    tipo?: TipoActivo;

    // Campos para activos de producción (ahora disponibles para todos los tipos)
    capacidad?: number;
    unidadCapacidad?: UnidadesCapacidad;

    // Campos para ubicación y responsable
    ubicacion?: string;
    responsable?: string;
    /**
     * Referencia al recurso de producción por ID
     * Este campo reemplaza la dependencia implícita de RecursoProduccion
     */
    recursoProduccionId?: number;

    fechaCodificacion?: Date | string;
    fechaBaja?: Date | string;

    // Campos para integración contable
    valorAdquisicion?: number;
    valorResidual?: number;
    vidaUtilMeses?: number;
    metodoDespreciacion?: string; // "LINEAL", "SUMA_DIGITOS", etc.

    // Precio (nuevo campo solicitado)
    precio?: number;
    divisa?: DIVISAS;

    depreciaciones?: DepreciacionActivo[];
    traslados?: TrasladoActivo[];
    mantenimientos?: MantenimientoActivo[];
    lineaIncorporacion?: IncorporacionActivoLine;
    documentosBaja?: DocumentoBajaActivo[];
}

interface TrasladoActivo {
    // Propiedades según el modelo de backend
}

interface IncorporacionActivoLine {
    // Propiedades según el modelo de backend
}

interface DocumentoBajaActivo {
    // Propiedades según el modelo de backend
}

export interface GrupoActivos {
    id: string;
    itemOrdenCompra: ItemOrdenCompraActivo;
    activos: ActivoFijo[];
}


export interface IncorporacionActivoDto {
    tipoIncorporacion?: 'CON_OC' | 'SIN_OC' | 'AF_EXISTENTE';
    id_OC_AF ?: number;
    documentoSoporte?: File;  // Documento soporte (factura) para la incorporación
    userId?: string;          // ID del usuario que realiza la incorporación
    gruposActivos?: GrupoActivos[]; // Grupos de activos a incorporar
}


 export interface ItemOrdenCompraActivo {
    itemOrdenId?: number;
    ordenCompraActivoId?: number;
    nombre: string;
    cantidad: number;
    precioUnitario: number ;
    ivaPercentage: number;
    ivaValue: number;
    subTotal: number;
}

export type DIVISAS = 'USD' | 'COP'; // Add other currencies as needed

export interface OrdenCompraActivo {
    ordenCompraActivoId?: number;
    fechaEmision: Date;
    fechaVencimiento: Date;
    proveedor: Proveedor;
    subTotal: number;
    iva: number;
    totalPagar: number;
    condicionPago: string; // 0:credito, 1:contado
    tiempoEntrega: string;
    plazoPago: number;
    cotizacionUrl?: string; // la asigna el backend cuando se adjunta la cotizacion en pdf (multipartfile)
    observaciones?: string;
    /**
     * -1: cancelada
     *  0: pendiente liberacion
     *  1: pendiente envio
     *  2: pendiente recepcion
     *  3: cerrada con éxito
     */
    estado: number;
    empresaIdentidadLegalVersion?: EmpresaIdentidadLegalVersion | null;
    empresaLogoDocumentalVersion?: EmpresaLogoDocumentalVersion | null;
    divisa: DIVISAS;
    trm: number;
    facturaCompraActivoId?: number;
    itemsOrdenCompra: ItemOrdenCompraActivo[];
}

export function getEstadoOCAFText(estado: number) {
    if (estado === -1) return 'Cancelada';
    if (estado === 0) return 'Pendiente liberacion';
    if (estado === 1) return 'Pendiente envio';
    if (estado === 2) return 'Pendiente recepcion';
    if (estado === 3) return 'Cerrada exitosamente';
    return '';
}
