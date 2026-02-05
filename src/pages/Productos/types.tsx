// Path: src/pages/Productos/types.tsx
// Used in: src/pages/Productos/Basic/*; src/pages/Productos/DefProcesses/*; src/pages/Productos/DefSemiTer/*; src/pages/TransaccionesAlmacen/AjustesInventario/*; src/pages/Produccion/types.tsx y componentes relacionados
// Summary: Tipos y constantes para productos, insumos y procesos productivos reutilizados en codificación, consultas y planeación.

export const TIPOS_PRODUCTOS = {materiaPrima: "M", semiTerminado:"S", terminado:"T"};
export const UNIDADES = {L:"L", KG:"KG", U:"U", G:"G"};
export const TIPOS_MATERIALES = {materiaPrima: 1, materialDeEmpaque: 2};
export const IVA_VALUES = {'iva_0':0, 'iva_5':5,'iva_19':19, };

import type {ActivoFijo} from '../ActivosFijos/types';

/**
 * interfaces para la codificacion de materias primas
 */



/**
 * para uso principalmente en step 2 creacion de semiterminado o temrinado
 */
export interface Producto{
    productoId: string;
    tipo_producto: string;
    nombre: string;
    observaciones?: string;
    costo: number;
    inventareable?: boolean;
    tipoUnidades: string;
    cantidadUnidad: string;
    fechaCreacion?: string;
    ivaPercentual?: number;
    prefijoLote?: string; // solo producto terminado; prefijo de lote unico
}

export interface Material extends Producto{
    fichaTecnicaUrl?: string;
    tipoMaterial?: number; // 1: materia prima, 2: material de empaque
}

export interface Insumo {
    cantidadRequerida: number;
    producto: Producto;
    subtotal?: number; // this is not part of the model at backend, but useful for frontend
}


/**
 * para usar exclusivamente en la bandeja de seleccion de insumos.
 */
export interface Semiterminado extends Producto{
    insumos: Insumo[]
}




/**
 * Interfaces usadas principalmente aunque no necesariamente de manera exclusiva
 * en el feuture de ProcesDesigner
 */

export interface Node{
    Id: number;
    type: string;
    localId: string;
    label: string;
    x: number;
    y: number;
}

export interface ProcesoNode extends Node {
    unidadesTiempo?: number;
    tiempo?: string;
    nombreProceso?: string;
    instrucciones?: string;
    descripcionSalida: string;
}

export interface ProcesoProduccion{
    procesoId: number;
    procesoNodes: ProcesoNode[];
    materiaPrimaNodes: Node[];
    targetNode: Node;
}

export interface ProcesoProduccionNode {
    id: string;
    data: unknown;
    type?: string;
    targetIds: string[];
}

export interface ProcesoDiseñado {
    procesosProduccion: ProcesoProduccionNode[];
}

export interface ProcesoProduccionCompleto extends ProcesoDiseñado {
    rendimientoTeorico: number;
}

/**
 * se usa en el tab de codificacion de producto terminado o semiterminado
 */
export interface ProductoSemiter {
    productoId: string;
    nombre: string;
    observaciones?: string;
    costo?: string; // se determina a al momento de seleccinoar los insumos - step 2
    insumos?: Insumo[]; // se determina tambien en - step 2
    tipoUnidades: string;
    cantidadUnidad: string;
    tipo_producto: string;
    procesoProduccionCompleto?: ProcesoProduccionCompleto; // se determina a la hora de definir el proceso - step 3
    categoria?: Categoria; // solo se usa para terminado, por ello es opcional
    inventareable?: boolean; // true para terminados, false para semiterminados
    casePack?: CasePack;
    prefijoLote?: string; // prefijo de lote para producto terminado (unico)
}

export interface CasePack {
    id?: number;

    /** Número de unidades EACH por caja (CASE). Ej: 24 */
    unitsPerCase: number;

    /** ITF-14 / EAN-14 del CASE */
    ean14?: string;

    /** Dimensiones del CASE (útiles para WMS / envíos) */
    largoCm?: number;
    anchoCm?: number;
    altoCm?: number;

    /** Peso bruto del CASE */
    grossWeightKg?: number;

    /**
     * Indica si el despacho por defecto es por caja
     * (no fuerza lógica de negocio)
     */
    defaultForShipping?: boolean;

    /** Insumos de empaque asociados al CASE */
    insumosEmpaque?: Insumo[];
}


export interface Categoria{
     categoriaId: number;
     categoriaNombre: string;
     categoriaDescripcion: string;
     loteSize?: number;
}

export interface RecursoProduccion {
    id?: number;
    nombre: string;
    descripcion: string;
    cantidad?: number; // Nuevo campo para la cantidad requerida
    capacidadTotal?: number;
    cantidadDisponible?: number;
    capacidadPorHora?: number;
    turnos?: number;
    horasPorTurno?: number;
    activosFijos?: ActivoFijo[];
}

export enum TimeModelType {
    CONSTANT = "CONSTANT",
    THROUGHPUT_RATE = "THROUGHPUT_RATE",
    PER_UNIT = "PER_UNIT",
    PER_BATCH = "PER_BATCH"
}

export interface ProcesoProduccionEntity {
    procesoId?: number;
    nombre: string;
    recursosRequeridos: RecursoProduccion[];
    setUpTime: number;
    nivelAcceso?: number; // Define qué usuarios pueden ver este proceso según su nivel de acceso

    // Nuevo modelo de tiempo
    model: TimeModelType;

    // Campos específicos para cada modelo
    constantSeconds?: number;        // Para CONSTANT
    throughputUnitsPerSec?: number;  // Para THROUGHPUT_RATE
    secondsPerUnit?: number;         // Para PER_UNIT
    secondsPerBatch?: number;        // Para PER_BATCH
    batchSize?: number;              // Para PER_BATCH
}
