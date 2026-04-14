// Path: src/pages/Productos/types.tsx
// Used in: src/pages/Productos/Basic/*; src/pages/Productos/DefProcesses/*; src/pages/Productos/DefSemiTer/*; src/pages/TransaccionesAlmacen/AjustesInventario/*; src/pages/Produccion/types.tsx y componentes relacionados
// Summary: Tipos y constantes para productos, insumos y procesos productivos reutilizados en codificacion, consultas y planeacion.

import type { ActivoFijo } from "../ActivosFijos/types";

export const TIPOS_PRODUCTOS = { materiaPrima: "M", semiTerminado: "S", terminado: "T" };
export const UNIDADES = { L: "L", KG: "KG", U: "U", G: "G" };
export const TIPOS_MATERIALES = { materiaPrima: 1, materialDeEmpaque: 2 };
export const IVA_VALUES = { iva_0: 0, iva_5: 5, iva_19: 19 };

export interface Producto {
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
    prefijoLote?: string;
}

export interface Material extends Producto {
    fichaTecnicaUrl?: string;
    tipoMaterial?: number;
    puntoReorden?: number;
}

export interface Insumo {
    cantidadRequerida: number;
    producto: Producto;
    subtotal?: number;
}

export interface Semiterminado extends Producto {
    insumos: Insumo[];
}

export interface Node {
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

export interface ProcesoProduccion {
    procesoId: number;
    procesoNodes: ProcesoNode[];
    materiaPrimaNodes: Node[];
    targetNode: Node;
}

export interface AreaOperativaRef {
    areaId: number;
    nombre: string;
    descripcion?: string;
    responsableArea?: any;
}

export type ProcesoFabricacionNodeType = "INSUMO" | "PROCESO" | "TARGET";

export interface ProcesoFabricacionNodoBase {
    id?: number;
    nodeType: ProcesoFabricacionNodeType;
    frontendId: string;
    posicionX: number;
    posicionY: number;
    label?: string;
}

export interface NodoInsumoDTO extends ProcesoFabricacionNodoBase {
    nodeType: "INSUMO";
    insumoId?: number;
    inputProductoId: string;
}

export interface NodoProcesoDTO extends ProcesoFabricacionNodoBase {
    nodeType: "PROCESO";
    procesoId: number;
    procesoNombre?: string;
    areaOperativaId: number;
    areaOperativaNombre?: string;
    setUpTime?: number;
    model?: TimeModelType | string;
    constantSeconds?: number;
    throughputUnitsPerSec?: number;
    secondsPerUnit?: number;
    secondsPerBatch?: number;
    batchSize?: number;
}

export interface NodoTargetDTO extends ProcesoFabricacionNodoBase {
    nodeType: "TARGET";
}

export type ProcesoFabricacionNodoDTO = NodoInsumoDTO | NodoProcesoDTO | NodoTargetDTO;

export interface ProcesoFabricacionEdgeDTO {
    id?: number;
    frontendId: string;
    sourceFrontendId: string;
    targetFrontendId: string;
}

export interface ProcesoDiseñado {
    nodes: ProcesoFabricacionNodoDTO[];
    edges: ProcesoFabricacionEdgeDTO[];
}

export interface ProcesoProduccionCompleto extends ProcesoDiseñado {
    id?: number;
    rendimientoTeorico: number;
}

export interface ProductoSemiter {
    productoId: string;
    nombre: string;
    observaciones?: string;
    costo?: string;
    insumos?: Insumo[];
    tipoUnidades: string;
    cantidadUnidad: string;
    tipo_producto: string;
    procesoProduccionCompleto?: ProcesoProduccionCompleto;
    categoria?: Categoria;
    inventareable?: boolean;
    casePack?: CasePack;
    prefijoLote?: string;
    ivaPercentual?: number;
}

export interface CasePackInsumo {
    id?: number;
    material: Pick<Material, "productoId" | "nombre" | "tipoUnidades" | "tipoMaterial">;
    cantidad: number;
    uom?: string;
}

export interface CasePack {
    id?: number;
    unitsPerCase: number;
    ean14?: string;
    largoCm?: number;
    anchoCm?: number;
    altoCm?: number;
    grossWeightKg?: number;
    defaultForShipping?: boolean;
    insumosEmpaque?: CasePackInsumo[];
}

export interface Categoria {
    categoriaId: number;
    categoriaNombre: string;
    categoriaDescripcion: string;
    loteSize?: number;
    tiempoDiasFabricacion?: number;
}

export interface ProductoBasicUpdatePayload {
    productoId: string;
    nombre: string;
    cantidadUnidad: number;
    observaciones?: string;
    ivaPercentual: number;
    tipoMaterial?: number;
    puntoReorden?: number;
    prefijoLote?: string;
    categoriaId?: number;
}

export interface ProductoManufacturingInsumoDTO {
    insumoId?: number;
    productoId: string;
    productoNombre?: string;
    costoUnitario?: number;
    tipoUnidades?: string;
    cantidadRequerida: number;
    subtotal?: number;
}

export interface ProductoManufacturingInsumoEmpaqueDTO {
    id?: number;
    materialId: string;
    materialNombre?: string;
    cantidad: number;
    uom?: string;
}

export interface ProductoManufacturingCasePackDTO {
    id?: number;
    unitsPerCase: number;
    ean14?: string;
    largoCm?: number;
    anchoCm?: number;
    altoCm?: number;
    grossWeightKg?: number;
    defaultForShipping?: boolean;
    insumosEmpaque?: ProductoManufacturingInsumoEmpaqueDTO[];
}

export interface ProductoManufacturingDTO {
    productoId: string;
    tipoProducto: string;
    nombre: string;
    observaciones?: string;
    costo?: number;
    ivaPercentual?: number;
    tipoUnidades: string;
    cantidadUnidad: number;
    inventareable?: boolean;
    categoriaId?: number;
    categoriaNombre?: string;
    status?: number;
    fotoUrl?: string;
    prefijoLote?: string;
    insumos: ProductoManufacturingInsumoDTO[];
    casePack?: ProductoManufacturingCasePackDTO;
    procesoProduccionCompleto?: ProcesoProduccionCompleto;
}

export interface RecursoProduccion {
    id?: number;
    nombre: string;
    descripcion: string;
    cantidad?: number;
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
    nivelAcceso?: number;
    model: TimeModelType;
    constantSeconds?: number;
    throughputUnitsPerSec?: number;
    secondsPerUnit?: number;
    secondsPerBatch?: number;
    batchSize?: number;
}
