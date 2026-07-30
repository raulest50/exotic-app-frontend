export type InformeQuery = {
    fecha?: string;
    fechaDesde?: string;
    fechaHasta?: string;
};

export type PeriodoInforme = {
    fechaDesde: string;
    fechaHasta: string;
    modoFecha: "FECHA_UNICA" | "RANGO";
    dias: number;
};

export type CantidadUnidad = {
    unidadMedida: string;
    cantidad: number;
};

export type NotaInforme = {
    tipo: string;
    mensaje: string;
};

export interface InformeInventario {
    versionContrato: number;
    periodo: PeriodoInforme;
    periodoTendencia: PeriodoInforme;
    fechaHoraCorteStock: string;
    stock: StockInventario;
    movimientos: MovimientosInventario;
    ajustesInventario?: AjustesInventario;
    ocmPendientes: OcmPendientes;
    materialDirectoOp: MaterialDirectoOp;
    notas: NotaInforme[];
}

export interface StockInventario {
    resumen: ResumenStock;
    porUnidad: StockPorUnidad[];
    materialesPorTipo: MaterialesPorTipo;
    composicion: ComposicionInventario[];
    abc: ClasificacionAbc;
    alertas: ResumenAlertasStock;
}

export interface MaterialesPorTipo {
    materiaPrima: StockPorUnidad[];
    empaque: StockPorUnidad[];
}

export interface ResumenStock {
    valorEstimado: number;
    referenciasConStock: number;
    referenciasValorizadas: number;
    coberturaCostosPct?: number | null;
    valorizacion: ValorizacionInventario;
    coberturaCostosDetalle: CoberturaCostosDetalle;
    referenciasNegativas: number;
}

export interface ValorizacionInventario {
    materiales: ValorizacionMateriales;
    terminados: number;
}

export interface ValorizacionMateriales {
    total: number;
    materiaPrima: number;
    empaque: number;
}

export interface CoberturaCostosDetalle {
    globalPct?: number | null;
    materialesPct?: number | null;
    terminadosPct?: number | null;
}

export interface StockPorUnidad {
    unidadMedida: string;
    cantidadNeta: number;
    cantidadPositiva: number;
    cantidadNegativa: number;
    referenciasConStock: number;
}

export interface ComposicionInventario {
    tipo: string;
    referencias: number;
    valorEstimado: number;
    participacionPct: number;
}

export interface ClasificacionAbc {
    clases: ClaseAbc[];
    referenciasExcluidasSinCosto: number;
}

export interface ClaseAbc {
    clase: string;
    referencias: number;
    valorEstimado: number;
    participacionPct: number;
}

export interface ResumenAlertasStock {
    total: number;
    negativas: number;
    agotadas: number;
    bajoUmbral: number;
    sinCosto: number;
    items: AlertaStock[];
}

export interface AlertaStock {
    tipo: TipoAlertaInventario;
    prioridad: number;
    productoId: string;
    productoNombre: string;
    grupo: GrupoAlertaInventario;
    unidadMedida: string;
    stock: number;
    umbral?: number | null;
    stockMinimo: number;
    puntoReorden: number;
    brechaUmbral?: number | null;
    brechaPct?: number | null;
    costoVigente: boolean;
    umbralesIncumplidos: string[];
}

export type TipoAlertaInventario =
    | "STOCK_NEGATIVO"
    | "AGOTADO"
    | "BAJO_UMBRAL"
    | "SIN_COSTO";

export type FiltroTipoAlertaInventario = "TODAS" | TipoAlertaInventario;

export type GrupoAlertaInventario =
    | "MATERIA_PRIMA"
    | "EMPAQUE"
    | "OTROS";

export type FiltroGrupoAlertaInventario =
    | "TODOS"
    | GrupoAlertaInventario;

export type OrdenAlertaInventario =
    | "PRIORIDAD"
    | "MAYOR_BRECHA_RELATIVA"
    | "STOCK_ASC"
    | "NOMBRE";

export interface ExploracionAlertasMateriales {
    fechaHoraCorteStock: string;
    resumen: Omit<ResumenAlertasStock, "items">;
    prioritarios: AlertaStock[];
    facetas: {
        gruposDisponibles: GrupoAlertaInventario[];
        unidadesDisponibles: string[];
    };
    pagina: PaginaInformeInventario<AlertaStock>;
}

export interface MovimientosInventario {
    resumen: ResumenMovimientos;
    porUnidad: FlujoPorUnidad[];
    serieDiaria: SerieMovimiento[];
}

export interface ResumenMovimientos {
    recepcionesOcm: FlujoResumen;
    dispensaciones: FlujoResumen;
    productoTerminado: FlujoResumen;
    otrosIngresos: FlujoResumen;
}

export interface FlujoResumen {
    movimientos: number;
    referencias: number;
    valorEstimado: number;
}

export interface FlujoPorUnidad {
    unidadMedida: string;
    recepcionesOcm: number;
    dispensaciones: number;
    productoTerminado: number;
    otrosIngresos: number;
}

export interface SerieMovimiento extends FlujoPorUnidad {
    fecha: string;
    valorRecepcionesOcm: number;
    valorDispensaciones: number;
    valorProductoTerminado: number;
    valorOtrosIngresos: number;
}

export type GrupoAjusteInventario = "MATERIA_PRIMA" | "EMPAQUE" | "OTROS";
export type GrupoMaterialAjuste = Exclude<GrupoAjusteInventario, "OTROS">;
export type TipoFiltroAjuste = "TODOS" | "POSITIVO" | "NEGATIVO";
export type OrdenAjusteMaterial =
    | "IMPACTO"
    | "MOVIMIENTOS"
    | "RECIENTES"
    | "NOMBRE";

export interface AjustesInventario {
    resumen: ResumenAjustesInventario;
    comparativo: ComparativoAjustesInventario;
    serieDiaria: SerieAjusteInventario[];
    mayorImpacto: MayorImpactoAjustes;
}

export interface ResumenAjustesInventario {
    positivos: FlujoResumen;
    negativos: FlujoResumen;
    balanceNeto: number;
    transacciones: number;
    movimientos: number;
    referencias: number;
}

export interface ComparativoAjustesInventario {
    materiaPrima: GrupoAjustesInventario;
    empaque: GrupoAjustesInventario;
    otros: GrupoAjustesInventario;
}

export interface GrupoAjustesInventario {
    grupo: GrupoAjusteInventario;
    positivos: FlujoResumen;
    negativos: FlujoResumen;
    balanceNeto: number;
    transacciones: number;
    movimientos: number;
    referencias: number;
    participacionValorAjustadoPct: number;
}

export interface SerieAjusteInventario {
    fecha: string;
    grupo: GrupoAjusteInventario;
    unidadMedida: string;
    cantidadPositiva: number;
    cantidadNegativa: number;
    valorPositivo: number;
    valorNegativo: number;
}

export interface MayorImpactoAjustes {
    limite: number;
    materiaPrima: MaterialImpactoAjuste[];
    empaque: MaterialImpactoAjuste[];
}

export interface MaterialImpactoAjuste {
    productoId: string;
    productoNombre: string;
    unidadMedida: string;
    cantidadPositiva: number;
    cantidadNegativa: number;
    balanceCantidad: number;
    valorPositivo: number;
    valorNegativo: number;
    balanceValor: number;
    impactoEstimado: number;
    movimientos: number;
    transacciones: number;
    ultimoAjuste?: string | null;
    costoVigente: boolean;
}

export interface OcmPendientes {
    ordenes: number;
    referencias: number;
    cantidadesPorUnidad: CantidadUnidad[];
    valorPendienteSinIva: number;
    items?: OcmPendiente[];
}

export interface OcmPendiente {
    ocmId: number;
    fechaEmision: string;
    proveedor: string;
    referencias: number;
    cantidadesPorUnidad: CantidadUnidad[];
    valorPendienteSinIva: number;
    lineas: LineaOcmPendiente[];
}

export interface LineaOcmPendiente {
    itemId: number;
    productoId: string;
    productoNombre: string;
    unidadMedida: string;
    ordenado: number;
    recibidoAplicado: number;
    pendiente: number;
    precioUnitarioSinIva: number;
    valorPendienteSinIva: number;
}

export interface MaterialDirectoOp {
    ordenes: number;
    referencias: number;
    cantidadesPorUnidad: CantidadUnidad[];
    valorEstimado: number;
    items?: OpMaterial[];
}

export interface OpMaterial {
    opId: number;
    lote?: string | null;
    estado: number;
    fechaReferencia?: string | null;
    referencias: number;
    cantidadesPorUnidad: CantidadUnidad[];
    valorEstimado: number;
}

export interface PaginaInformeInventario<T> {
    items: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

export interface BusquedaStockMaterial {
    buscar: string;
    resultados: ResultadoStockMaterial[];
}

export interface ResultadoStockMaterial {
    productoId: string;
    nombre: string;
    unidadMedida: string;
    stockGeneral: number;
    costoUnitario: number;
    costoDisponible: boolean;
    valorEstimado: number;
}

export interface CoberturaMateriales {
    ventanaDias: number;
    fechaDesde: string;
    fechaHasta: string;
    fechaHoraCorteStock: string;
    fuenteDemanda: FuenteDemandaCobertura;
    escenarioExploratorio: boolean;
    estado: "ESTIMADO" | "SIN_CONSUMO";
    fechaPrimerAgotamiento?: string | null;
    materialCriticoId?: string | null;
    materialCriticoNombre?: string | null;
    intervaloFechaMin?: string | null;
    intervaloFechaMax?: string | null;
    confianzaBaja: boolean;
    motivosConfianzaBaja: string[];
    diasObservados: number;
    diasConDispensacion: number;
    diasConDemanda: number;
    materialesAnalizados: number;
    materialesConDemanda: number;
    resumenFuentesDemanda: ResumenFuentesDemandaCobertura;
    estimaciones: EstimacionCoberturaMaterial[];
    facetas: FacetasCoberturaMateriales;
    pagina: PaginaInformeInventario<EstimacionCoberturaMaterial>;
}

export type FuenteDemandaCobertura =
    | "SOLO_DISPENSACIONES"
    | "DISPENSACIONES_MAS_CONTINGENCIAS";

export type GrupoCoberturaMaterial =
    | "MATERIA_PRIMA"
    | "EMPAQUE"
    | "OTROS";

export type FiltroGrupoCoberturaMaterial =
    | "TODOS"
    | GrupoCoberturaMaterial;

export type HorizonteCoberturaMaterial =
    | "TODOS"
    | "AGOTADO"
    | "HASTA_7_DIAS"
    | "DE_8_A_30_DIAS"
    | "MAS_DE_30_DIAS";

export type OrdenCoberturaMaterial =
    | "AGOTAMIENTO"
    | "MAYOR_DEMANDA"
    | "NOMBRE";

export interface FacetasCoberturaMateriales {
    gruposDisponibles: GrupoCoberturaMaterial[];
    unidadesDisponibles: string[];
}

export interface ResumenFuentesDemandaCobertura {
    movimientosDispensacionIncluidos: number;
    ajustesContingenciaDisponibles: number;
    ajustesContingenciaIncluidos: number;
    ajustesNegativosSinClasificarExcluidos: number;
}

export interface EstimacionCoberturaMaterial {
    productoId: string;
    nombre: string;
    grupo: GrupoCoberturaMaterial;
    unidadMedida: string;
    stockActual: number;
    demandaMediaDiaria: number;
    demandaMediaDiariaOperativa: number;
    demandaMediaDiariaContingencia: number;
    diasConDispensacion: number;
    diasConDemanda: number;
    ajustesContingenciaIncluidos: number;
    diasHastaAgotamiento?: number | null;
    fechaAgotamiento?: string | null;
    intervaloFechaMin?: string | null;
    intervaloFechaMax?: string | null;
    confianzaBaja: boolean;
    motivosConfianzaBaja: string[];
}

export interface InformeProduccion {
    fechaDesde: string;
    fechaHasta: string;
    modoFecha: "FECHA_UNICA" | "RANGO";
    diasRango: number;
    mpsIds: number[];
    resumen: ResumenProduccion;
    consolidadoCategorias: CategoriaProduccion[];
    detalleReferencias: ReferenciaProduccion[];
    analiticaAreas?: AnaliticaAreasProduccion | null;
    notas: NotaInforme[];
}

export interface ResumenProduccion {
    unidadesPlaneadas: number;
    unidadesProducidas: number;
    unidadesProducidasPeriodoAnterior: number;
    capacidadProductivaPeriodo: number;
    rendimientoPlaneacionPct?: number | null;
    cumplimientoReferenciasPct?: number | null;
    capacidadUtilizadaPct?: number | null;
    tendenciaProduccionPct?: number | null;
    referenciasPlaneadas: number;
    referenciasProducidas: number;
    referenciasPlaneadasProducidas: number;
    referenciasNoPlaneadas: number;
    categoriasConCapacidad: number;
    categoriasSinCapacidad: number;
    movimientosProduccion: number;
}

export interface CategoriaProduccion {
    categoriaId?: number | null;
    categoriaNombre: string;
    unidadesPlaneadas: number;
    unidadesProducidas: number;
    capacidadProductivaPeriodo: number;
    rendimientoPlaneacionPct?: number | null;
    cumplimientoReferenciasPct?: number | null;
    capacidadUtilizadaPct?: number | null;
    referenciasPlaneadas: number;
    referenciasProducidas: number;
    referenciasPlaneadasProducidas: number;
}

export interface ReferenciaProduccion {
    productoId?: string | null;
    productoNombre: string;
    categoriaId?: number | null;
    categoriaNombre: string;
    cantidadPlaneada: number;
    cantidadProducida: number;
    diferencia: number;
    rendimientoPlaneacionPct?: number | null;
    planeado: boolean;
    producido: boolean;
    noPlaneado: boolean;
}

export type EstadoAreaProduccion =
    | "ESTABLE"
    | "OBSERVACION"
    | "POSIBLE_CUELLO"
    | "SIN_DATOS";

export type ConfiabilidadAreaProduccion = "SUFICIENTE" | "LIMITADA";

export type FuenteProduccionArea = "REPORTADA" | "ESTANDAR" | "LOTES";

export interface AnaliticaAreasProduccion {
    disponible: boolean;
    mensaje?: string | null;
    fechaDesdePeriodoAnterior: string;
    fechaHastaPeriodoAnterior: string;
    areas: AnaliticaAreaProduccion[];
}

export interface AnaliticaAreaProduccion {
    areaId: number;
    areaNombre: string;
    estado: EstadoAreaProduccion;
    confiabilidad: ConfiabilidadAreaProduccion;
    motivos: string[];
    comparacionDisponible: boolean;
    coberturaUnidadPct?: number | null;
    produccion: ProduccionUnidadArea[];
    actual: MetricasFlujoArea;
    anterior: MetricasFlujoArea;
    serieActual: SerieFlujoArea[];
    serieAnterior: SerieFlujoArea[];
}

export interface ProduccionUnidadArea {
    fuente: FuenteProduccionArea;
    unidad: string;
    cantidadActual: number;
    cantidadAnterior: number;
    variacionPct?: number | null;
    cantidadEquivalenteActual?: number | null;
    cantidadEquivalenteAnterior?: number | null;
    unidadEquivalente?: string | null;
}

export interface MetricasFlujoArea {
    entradas: number;
    salidas: number;
    trabajoListo: number;
    ritmoSalidaDiario: number;
    diasBacklog?: number | null;
    medianaMinutosEspera?: number | null;
    medianaMinutosProceso?: number | null;
    muestrasEspera: number;
    muestrasProceso: number;
}

export interface SerieFlujoArea {
    fecha: string;
    indiceDia: number;
    entradas: number;
    salidas: number;
    backlogCierre: number;
}
