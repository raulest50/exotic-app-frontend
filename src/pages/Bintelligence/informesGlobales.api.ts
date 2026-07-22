import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import type {
    BusquedaStockMaterial,
    CoberturaMateriales,
    InformeInventario,
    InformeProduccion,
    InformeQuery,
    OcmPendiente,
    OpMaterial,
    PaginaInformeInventario,
} from "./informesGlobales.types";

const endpoints = new EndPointsURL();

export async function fetchInventoryReport(
    query: InformeQuery,
): Promise<InformeInventario> {
    const response = await axios.get<InformeInventario>(
        endpoints.biInformesGlobalesAlmacen(query),
    );
    if (![2, 3].includes(response.data?.versionContrato)) {
        throw new Error("El backend no expone la versión actual del informe de almacén.");
    }
    return normalizeInventoryReport(response.data);
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
    return {
        ...report,
        notas: report.notas ?? [],
        stock: {
            ...report.stock,
            porUnidad: report.stock.porUnidad ?? [],
            composicion: report.stock.composicion ?? [],
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
