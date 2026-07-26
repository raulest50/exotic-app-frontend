import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import type {
    BusquedaStockMaterial,
    CoberturaMateriales,
    GrupoMaterialAjuste,
    InformeInventario,
    InformeProduccion,
    InformeQuery,
    MaterialImpactoAjuste,
    OcmPendiente,
    OpMaterial,
    OrdenAjusteMaterial,
    PaginaInformeInventario,
    TipoFiltroAjuste,
} from "./informesGlobales.types";

const endpoints = new EndPointsURL();

export async function fetchInventoryReport(
    query: InformeQuery,
): Promise<InformeInventario> {
    const response = await axios.get<InformeInventario>(
        endpoints.biInformesGlobalesAlmacen(query),
    );
    if (![2, 3, 4].includes(response.data?.versionContrato)) {
        throw new Error("El backend no expone la versión actual del informe de almacén.");
    }
    return normalizeInventoryReport(response.data);
}

export async function fetchAdjustmentMaterialsPage({
    query,
    group,
    type,
    order,
    search,
    page,
    size,
    signal,
}: {
    query: InformeQuery;
    group: GrupoMaterialAjuste;
    type: TipoFiltroAjuste;
    order: OrdenAjusteMaterial;
    search: string;
    page: number;
    size: 5 | 10;
    signal?: AbortSignal;
}): Promise<PaginaInformeInventario<MaterialImpactoAjuste>> {
    const response = await axios.get<PaginaInformeInventario<MaterialImpactoAjuste>>(
        `${endpoints.domain}/bi/informes-globales/almacen/ajustes-materiales`,
        {
            params: {
                ...query,
                grupo: group,
                tipo: type,
                orden: order,
                ...(search.trim() ? { buscar: search.trim() } : {}),
                page,
                size,
            },
            signal,
        },
    );
    return normalizePage(response.data);
}

export async function fetchPendingPurchaseOrdersPage(
    page: number,
    size: number,
    signal?: AbortSignal,
): Promise<PaginaInformeInventario<OcmPendiente>> {
    const response = await axios.get<PaginaInformeInventario<OcmPendiente>>(
        `${endpoints.domain}/bi/informes-globales/almacen/ocm-pendientes`,
        { params: { page, size }, signal },
    );
    return normalizePage(response.data);
}

export async function fetchOpenProductionOrdersPage(
    page: number,
    size: number,
    signal?: AbortSignal,
): Promise<PaginaInformeInventario<OpMaterial>> {
    const response = await axios.get<PaginaInformeInventario<OpMaterial>>(
        `${endpoints.domain}/bi/informes-globales/almacen/op-material-directo`,
        { params: { page, size }, signal },
    );
    return normalizePage(response.data);
}

export async function fetchProductionReport(
    query: InformeQuery,
): Promise<InformeProduccion> {
    const response = await axios.get<InformeProduccion>(
        endpoints.biInformesGlobalesProduccion(query),
    );
    return {
        ...response.data,
        mpsIds: response.data.mpsIds ?? [],
        consolidadoCategorias: response.data.consolidadoCategorias ?? [],
        detalleReferencias: response.data.detalleReferencias ?? [],
        analiticaAreas: response.data.analiticaAreas
            ? {
                ...response.data.analiticaAreas,
                areas: (response.data.analiticaAreas.areas ?? []).map((area) => ({
                    ...area,
                    motivos: area.motivos ?? [],
                    produccion: area.produccion ?? [],
                    serieActual: area.serieActual ?? [],
                    serieAnterior: area.serieAnterior ?? [],
                })),
            }
            : undefined,
        notas: response.data.notas ?? [],
    };
}

export async function searchMaterialStock(
    search: string,
    signal?: AbortSignal,
): Promise<BusquedaStockMaterial> {
    const response = await axios.get<BusquedaStockMaterial>(
        `${endpoints.domain}/bi/informes-globales/almacen/stock-materiales`,
        { params: { buscar: search }, signal },
    );
    return {
        buscar: response.data.buscar ?? search,
        resultados: response.data.resultados ?? [],
    };
}

export async function fetchMaterialCoverage(
    windowDays: 7 | 30 | 90,
): Promise<CoberturaMateriales> {
    const response = await axios.get<CoberturaMateriales>(
        `${endpoints.domain}/bi/informes-globales/almacen/cobertura`,
        { params: { ventanaDias: windowDays } },
    );
    return {
        ...response.data,
        motivosConfianzaBaja: response.data.motivosConfianzaBaja ?? [],
        estimaciones: response.data.estimaciones ?? [],
    };
}

export function requestErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error
            ?? "Revise las fechas y la conexión antes de intentar nuevamente.";
    }
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible completar la consulta.";
}

function normalizeInventoryReport(report: InformeInventario): InformeInventario {
    const composition = report.stock.composicion ?? [];
    const rawMaterialValue = compositionValue(composition, "MATERIA_PRIMA");
    const packagingValue = compositionValue(composition, "EMPAQUE");

    return {
        ...report,
        notas: report.notas ?? [],
        stock: {
            ...report.stock,
            resumen: {
                ...report.stock.resumen,
                valorizacion: report.stock.resumen.valorizacion ?? {
                    materiales: {
                        total: rawMaterialValue + packagingValue,
                        materiaPrima: rawMaterialValue,
                        empaque: packagingValue,
                    },
                    terminados: compositionValue(composition, "TERMINADO"),
                },
                coberturaCostosDetalle: {
                    globalPct:
                        report.stock.resumen.coberturaCostosDetalle?.globalPct
                        ?? report.stock.resumen.coberturaCostosPct,
                    materialesPct:
                        report.stock.resumen.coberturaCostosDetalle?.materialesPct,
                    terminadosPct:
                        report.stock.resumen.coberturaCostosDetalle?.terminadosPct,
                },
            },
            porUnidad: report.stock.porUnidad ?? [],
            materialesPorTipo: {
                materiaPrima: report.stock.materialesPorTipo?.materiaPrima ?? [],
                empaque: report.stock.materialesPorTipo?.empaque ?? [],
            },
            composicion: composition,
            abc: {
                ...report.stock.abc,
                clases: report.stock.abc.clases ?? [],
                referenciasExcluidasSinCosto:
                    report.stock.abc.referenciasExcluidasSinCosto ?? 0,
            },
            alertas: {
                ...report.stock.alertas,
                items: report.stock.alertas.items ?? [],
            },
        },
        movimientos: {
            ...report.movimientos,
            porUnidad: report.movimientos.porUnidad ?? [],
            serieDiaria: report.movimientos.serieDiaria ?? [],
        },
        ajustesInventario: report.ajustesInventario
            ? {
                ...report.ajustesInventario,
                serieDiaria: report.ajustesInventario.serieDiaria ?? [],
                mayorImpacto: {
                    ...report.ajustesInventario.mayorImpacto,
                    materiaPrima:
                        report.ajustesInventario.mayorImpacto?.materiaPrima ?? [],
                    empaque:
                        report.ajustesInventario.mayorImpacto?.empaque ?? [],
                },
            }
            : undefined,
        ocmPendientes: {
            ...report.ocmPendientes,
            cantidadesPorUnidad: report.ocmPendientes.cantidadesPorUnidad ?? [],
            items: report.ocmPendientes.items ?? [],
        },
        materialDirectoOp: {
            ...report.materialDirectoOp,
            cantidadesPorUnidad: report.materialDirectoOp.cantidadesPorUnidad ?? [],
            items: report.materialDirectoOp.items ?? [],
        },
    };
}

function compositionValue(
    composition: InformeInventario["stock"]["composicion"],
    type: string,
) {
    return composition.find((item) => item.tipo === type)?.valorEstimado ?? 0;
}

function normalizePage<T>(page: PaginaInformeInventario<T>): PaginaInformeInventario<T> {
    return {
        ...page,
        items: page.items ?? [],
        page: page.page ?? 0,
        size: page.size ?? 10,
        totalElements: page.totalElements ?? 0,
        totalPages: page.totalPages ?? 0,
        first: page.first ?? true,
        last: page.last ?? true,
    };
}
