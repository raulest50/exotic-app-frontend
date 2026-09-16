export type AmbitoControl = "PROCESO" | "CALIDAD";
export type EstadoVersionPlanControl = "BORRADOR" | "VIGENTE" | "RETIRADA";
export type TipoCaracteristicaControl = "NUMERICA" | "BOOLEANA";
export type TipoOrdenControl = "OP" | "OF" | "AMBAS";
export type PuntoAplicacionControl = "LOTE_FINAL" | "SALIDA_OPERACION";
export type MomentoEjecucionControl = "DURANTE_FABRICACION" | "REVISION_FINAL";
export type PuntoExigenciaControl = "INFORMATIVO" | "CIERRE_ETAPA" | "ENVIO_CALIDAD" | "LIBERACION";
export type EstadoControlRequerido =
    | "PENDIENTE"
    | "CONFORME"
    | "NO_CONFORME"
    | "ACEPTADO_POR_DESVIACION"
    | "POR_REVALIDAR";
export type EstadoDesviacionControl = "ABIERTA" | "EN_INVESTIGACION" | "RESUELTA" | "CERRADA";
export type DisposicionDesviacion = "REPETIR" | "CORREGIR_REPROCESAR" | "ACEPTAR_JUSTIFICADAMENTE" | "RECHAZAR";

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export interface CatalogoMagnitud {
    id: number;
    codigo: string;
    nombre: string;
    dimension: string;
    simbolo?: string | null;
    activo: boolean;
    usado: boolean;
}

export interface CatalogoUnidad {
    id: number;
    codigo: string;
    nombre: string;
    simbolo: string;
    dimension: string;
    activo: boolean;
    usado: boolean;
}

export interface ResponsablePlanControl {
    ejecucion: string;
    revision?: string | null;
    disposicion?: string | null;
}

export interface ControlProductOption {
    productoId: string;
    nombre: string;
    tipoProducto: "T" | "S";
    categoriaId?: number | null;
    categoriaNombre?: string | null;
}

export interface AplicabilidadPlanControl {
    id?: number;
    productoId?: string | null;
    productoNombre?: string | null;
    categoriaId?: number | null;
    categoriaNombre?: string | null;
    productosExcluidosIds: string[];
    productosExcluidos?: ControlProductOption[];
    tipoOrden: TipoOrdenControl;
    puntoAplicacion: PuntoAplicacionControl;
    areaOperativaId?: number | null;
    areaOperativaNombre?: string | null;
    procesoProduccionId?: number | null;
    procesoProduccionNombre?: string | null;
    /** Nodo gráfico exacto; ausente en planes legados que aplican por área/proceso. */
    frontendNodeId?: string | null;
    momentoEjecucion: MomentoEjecucionControl;
    puntoExigencia: PuntoExigenciaControl;
    /** Estado exclusivo del editor: confirma que el punto fue elegido en la ruta. */
    ubicacionGraficaConfirmada?: boolean;
    /** Solo viene en respuestas históricas; el backend no lo acepta al guardar un plan. */
    legadoGlobal?: boolean;
}

export interface CategoriaControlOption {
    categoriaId: number;
    categoriaNombre: string;
}

export interface CaracteristicaPlanControl {
    id?: number;
    nombre: string;
    tipo: TipoCaracteristicaControl;
    magnitudId?: number | null;
    magnitudCodigo?: string | null;
    magnitudNombre?: string | null;
    unidadId?: number | null;
    unidadCodigo?: string | null;
    unidadNombre?: string | null;
    unidadSimbolo?: string | null;
    escala: number;
    objetivo?: string | null;
    limiteInferior?: string | null;
    limiteSuperior?: string | null;
    valorBooleanoEsperado?: boolean | null;
    cantidadMuestras: number;
    unidadesPorMuestra: number;
    orden: number;
    /** Señala catálogos históricos ambiguos que requieren depuración administrativa. */
    requiereDepuracion?: boolean;
}

export interface VersionPlanControl {
    id: number;
    numero: number;
    estado: EstadoVersionPlanControl;
    proposito: string;
    motivoCambio?: string | null;
    responsableEjecucion: string;
    responsableRevision?: string | null;
    responsableDisposicion?: string | null;
    aplicabilidades: AplicabilidadPlanControl[];
    caracteristicas: CaracteristicaPlanControl[];
    creadaEn?: string | null;
    publicadaEn?: string | null;
    retiradaEn?: string | null;
}

export interface PlanControl {
    id: number;
    codigo: string;
    nombre: string;
    ambito: AmbitoControl;
    creadoEn?: string | null;
    versiones: VersionPlanControl[];
}

export interface PlanControlWrite {
    codigo: string;
    nombre: string;
    motivoCambio?: string | null;
    aplicabilidades: AplicabilidadPlanControl[];
    caracteristicas: CaracteristicaPlanControl[];
}

export interface ContextoControlRequerido {
    loteId: number;
    lote: string;
    productoId: string;
    productoNombre: string;
    tipoOrden?: Exclude<TipoOrdenControl, "AMBAS">;
    ordenId?: number | null;
    ordenCodigo?: string | null;
    batchRecordId?: number | null;
    batchRecordCodigo?: string | null;
    etapaId?: number | null;
    etapaNombre?: string | null;
    areaOperativaId?: number | null;
    areaOperativaNombre?: string | null;
    procesoProduccionId?: number | null;
    procesoProduccionNombre?: string | null;
    rutaVersion?: number | null;
}

export interface ControlRequerido {
    id: number;
    ambito: AmbitoControl;
    estado: EstadoControlRequerido;
    planId: number;
    planCodigo: string;
    planNombre: string;
    versionId: number;
    versionNumero: number;
    proposito: string;
    momentoEjecucion: MomentoEjecucionControl;
    puntoExigencia: PuntoExigenciaControl;
    contexto: ContextoControlRequerido;
    caracteristicas: CaracteristicaPlanControl[];
    requiereRepeticion: boolean;
    requiereRevalidacion: boolean;
    ultimaEjecucionId?: number | null;
    ultimaEjecucionFecha?: string | null;
    fechaVencimientoLote?: string | null;
}

export interface LecturaControlWrite {
    indiceUnidad: number;
    valorNumerico?: string | null;
    valorBooleano?: boolean | null;
}

export interface MuestraControlWrite {
    caracteristicaId: number;
    numeroMuestra: number;
    lecturas: LecturaControlWrite[];
}

export interface EjecucionControlWrite {
    controlRequeridoId: number;
    observaciones?: string | null;
    repeticionDeId?: number | null;
    motivoRepeticion?: string | null;
    muestras: MuestraControlWrite[];
}

export interface RevalidacionControl {
    id: number;
    controlRequeridoId: number;
    ejecucionRevalidadaId: number;
    cicloRevisionNumero: number;
    justificacion: string;
    confirmadaEn: string;
    confirmadaPor: string;
}

export interface LecturaControl extends LecturaControlWrite {
    id: number;
    conforme: boolean;
}

export interface MuestraControl {
    id: number;
    caracteristicaId: number;
    caracteristicaNombre: string;
    tipo: TipoCaracteristicaControl;
    unidadSimbolo?: string | null;
    escalaVisible: number;
    objetivo?: string | null;
    limiteInferior?: string | null;
    limiteSuperior?: string | null;
    valorBooleanoEsperado?: boolean | null;
    numeroMuestra: number;
    lecturas: LecturaControl[];
}

export interface EjecucionControl {
    id: number;
    ambito: AmbitoControl;
    controlRequeridoId: number;
    estado: EstadoControlRequerido;
    planCodigo: string;
    planNombre: string;
    versionNumero: number;
    contexto: ContextoControlRequerido;
    usuarioUsername: string;
    usuarioNombreCompleto?: string | null;
    fechaRegistro: string;
    observaciones?: string | null;
    repeticionDeId?: number | null;
    motivoRepeticion?: string | null;
    muestras: MuestraControl[];
}

export interface HistorialControlItem extends Omit<EjecucionControl, "muestras"> {
    tieneDesviacion: boolean;
}

export interface DesviacionControl {
    id: number;
    ambito: AmbitoControl;
    codigo: string;
    estado: EstadoDesviacionControl;
    disposicion?: DisposicionDesviacion | null;
    controlRequeridoId: number;
    ejecucionId: number;
    planCodigo: string;
    planNombre: string;
    contexto: ContextoControlRequerido;
    descripcion?: string | null;
    investigacion?: string | null;
    resolucion?: string | null;
    justificacionDisposicion?: string | null;
    abiertaEn: string;
    abiertaPor: string;
    resueltaEn?: string | null;
    resueltaPor?: string | null;
    cerradaEn?: string | null;
    cerradaPor?: string | null;
}

export interface DesviacionResolveWrite {
    investigacion: string;
    resolucion: string;
    disposicion: DisposicionDesviacion;
}

export interface PendientesFilters {
    planId?: number;
    batchRecordId?: number;
    loteId?: number;
    search?: string;
    tipoOrden?: Exclude<TipoOrdenControl, "AMBAS">;
    areaId?: number;
    batchRecordEtapaId?: number;
    vencimientoDesde?: string;
    vencimientoHasta?: string;
    momento?: MomentoEjecucionControl;
    estado?: EstadoControlRequerido;
    page?: number;
    size?: number;
}

export interface EnsayoPendienteOption {
    planId: number;
    codigo: string;
    nombre: string;
    momentos: MomentoEjecucionControl[];
}

export interface EnsayoPendienteOptionFilters {
    search?: string;
    tipoOrden?: Exclude<TipoOrdenControl, "AMBAS">;
    areaId?: number;
    page?: number;
    size?: number;
}

export interface HistorialFilters {
    batchRecordId?: number;
    loteId?: number;
    search?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    resultado?: "CONFORME" | "NO_CONFORME";
    page?: number;
    size?: number;
}
