import axios from "axios";

import EndPointsURL from "../../api/EndPointsURL";
import type {
    AmbitoControl,
    AplicabilidadPlanControl,
    CaracteristicaPlanControl,
    CatalogoMagnitud,
    CatalogoUnidad,
    CategoriaControlOption,
    ControlProductOption,
    ControlRequerido,
    DesviacionControl,
    DesviacionResolveWrite,
    DisposicionDesviacion,
    EjecucionControl,
    EjecucionControlWrite,
    HistorialControlItem,
    HistorialFilters,
    PageResponse,
    PendientesFilters,
    PlanControl,
    PlanControlWrite,
    RevalidacionControl,
    VersionPlanControl,
} from "./types";

const endpoints = new EndPointsURL();
const requestOptions = { withCredentials: true };

interface CatalogReferenceWire {
    id: number;
    codigo: string;
    nombre: string;
    dimension: string;
    simbolo?: string | null;
    activo: boolean;
}

type CharacteristicWire = Omit<CaracteristicaPlanControl,
    "escala" | "magnitudId" | "magnitudCodigo" | "magnitudNombre" | "unidadId" | "unidadCodigo" | "unidadNombre" | "unidadSimbolo"> & {
    escalaVisible: number;
    magnitud?: CatalogReferenceWire | null;
    unidad?: CatalogReferenceWire | null;
};

type ApplicabilityWire = Omit<AplicabilidadPlanControl,
    "procesoProduccionId" | "procesoProduccionNombre" | "momentoEjecucion"> & {
    procesoId?: number | null;
    procesoNombre?: string | null;
    momento: AplicabilidadPlanControl["momentoEjecucion"];
};

type VersionWire = Omit<VersionPlanControl, "aplicabilidades" | "caracteristicas"> & {
    aplicabilidades: ApplicabilityWire[];
    caracteristicas: CharacteristicWire[];
};
type PlanWire = Omit<PlanControl, "versiones"> & { versiones: VersionWire[] };

type PlanWriteWire = Pick<PlanControlWrite, "codigo" | "nombre" | "motivoCambio"> & {
    aplicabilidades: Array<{
        productoId?: string | null;
        categoriaId?: number | null;
        productosExcluidosIds: string[];
        tipoOrden: AplicabilidadPlanControl["tipoOrden"];
        puntoAplicacion: AplicabilidadPlanControl["puntoAplicacion"];
        areaOperativaId?: number | null;
        procesoId?: number | null;
        frontendNodeId?: string | null;
        bloqueante: boolean;
    }>;
    caracteristicas: Array<{
        nombre: string;
        tipo: CaracteristicaPlanControl["tipo"];
        magnitudId?: number | null;
        unidadId?: number | null;
        escalaVisible: number;
        objetivo?: string | null;
        limiteInferior?: string | null;
        limiteSuperior?: string | null;
        valorBooleanoEsperado?: boolean | null;
        cantidadMuestras: number;
        unidadesPorMuestra: number;
        orden: number;
    }>;
};

type PendingWire = Omit<ControlRequerido, "id" | "contexto" | "momentoEjecucion" | "caracteristicas"> & {
    controlRequeridoId: number;
    loteId: number;
    lote: string;
    productoId: string;
    productoNombre?: string;
    tipoOrden: "OP" | "OF";
    ordenProduccionId?: number | null;
    ordenFabricacionId?: number | null;
    batchRecordId?: number | null;
    batchRecordCodigo?: string | null;
    batchRecordEtapaId?: number | null;
    etapaNombre?: string | null;
    areaOperativaId?: number | null;
    areaOperativaNombre?: string | null;
    procesoId?: number | null;
    procesoNombre?: string | null;
    momento: ControlRequerido["momentoEjecucion"];
    requiereRepeticion?: boolean;
    requiereRevalidacion?: boolean;
    ultimaEjecucionFecha?: string | null;
    caracteristicas: CharacteristicWire[];
};

export interface ExecutionSummaryWire {
    id: number;
    controlRequeridoId: number;
    repeticionDeId?: number | null;
    ambito: AmbitoControl;
    planId: number;
    planCodigo: string;
    planNombre: string;
    versionNumero: number;
    loteId: number;
    lote: string;
    productoId: string;
    productoNombre?: string | null;
    tipoOrden: "OP" | "OF";
    ordenProduccionId?: number | null;
    ordenFabricacionId?: number | null;
    batchRecordId?: number | null;
    batchRecordCodigo?: string | null;
    batchRecordEtapaId?: number | null;
    etapaNombre?: string | null;
    areaOperativaId?: number | null;
    areaOperativaNombre?: string | null;
    procesoId?: number | null;
    procesoNombre?: string | null;
    usuarioUsername: string;
    usuarioNombreCompleto?: string | null;
    fechaRegistro: string;
    resultado: EjecucionControl["estado"];
    observaciones?: string | null;
    motivoRepeticion?: string | null;
    desviacionId?: number | null;
}

export interface ExecutionDetailWire {
    resumen: ExecutionSummaryWire;
    muestras: Array<{
        id: number;
        caracteristicaId: number;
        caracteristicaNombre: string;
        tipo?: "NUMERICA" | "BOOLEANA";
        unidadSimbolo?: string | null;
        escalaVisible: number;
        objetivo?: string | null;
        limiteInferior?: string | null;
        limiteSuperior?: string | null;
        valorBooleanoEsperado?: boolean | null;
        numeroMuestra: number;
        lecturas: Array<{
            id: number;
            indiceUnidad: number;
            valorNumerico?: string | null;
            valorBooleano?: boolean | null;
            conforme: boolean;
        }>;
    }>;
    desviacionId?: number | null;
}

interface DeviationWire {
    id: number;
    controlRequeridoId: number;
    ejecucionOrigenId: number;
    ambito: AmbitoControl;
    estado: DesviacionControl["estado"];
    planCodigo: string;
    planNombre: string;
    loteId: number;
    lote: string;
    productoId: string;
    productoNombre?: string | null;
    tipoOrden: "OP" | "OF";
    disposicion?: DesviacionControl["disposicion"];
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

export interface ApiFailureDetail {
    message: string;
    bloqueos: string[];
    status?: number;
}

export function apiFailureDetail(error: unknown, fallback: string): ApiFailureDetail {
    if (axios.isAxiosError(error)) {
        const body = error.response?.data as {
            message?: string;
            error?: string;
            bloqueos?: Array<string | { mensaje?: string; message?: string }>;
        } | undefined;
        return {
            message: body?.message || body?.error || error.message || fallback,
            bloqueos: (body?.bloqueos ?? []).map((item) => (
                typeof item === "string" ? item : item.mensaje || item.message || "Bloqueo sin descripción"
            )),
            status: error.response?.status,
        };
    }
    return { message: error instanceof Error ? error.message : fallback, bloqueos: [] };
}

function asPage<T>(value: PageResponse<T> | T[], page = 0, size = 20): PageResponse<T> {
    if (!Array.isArray(value)) return value;
    return { content: value, number: page, size, totalElements: value.length, totalPages: value.length ? 1 : 0 };
}

function normalizeCharacteristic(item: CharacteristicWire): CaracteristicaPlanControl {
    return {
        ...item,
        escala: item.escalaVisible,
        magnitudId: item.magnitud?.id,
        magnitudCodigo: item.magnitud?.codigo,
        magnitudNombre: item.magnitud?.nombre,
        unidadId: item.unidad?.id,
        unidadCodigo: item.unidad?.codigo,
        unidadNombre: item.unidad?.nombre,
        unidadSimbolo: item.unidad?.simbolo,
    };
}

function normalizeApplicability(item: ApplicabilityWire): AplicabilidadPlanControl {
    const productosExcluidos = item.productosExcluidos
        ?? (item.productosExcluidosIds ?? []).map((productoId) => ({
            productoId,
            nombre: productoId,
            tipoProducto: "T" as const,
        }));
    return {
        ...item,
        procesoProduccionId: item.procesoId,
        procesoProduccionNombre: item.procesoNombre,
        momentoEjecucion: item.momento,
        productosExcluidosIds: item.productosExcluidosIds
            ?? productosExcluidos.map((producto) => producto.productoId),
        productosExcluidos,
    };
}

function serializePlanWrite(item: PlanControlWrite): PlanWriteWire {
    return {
        codigo: item.codigo,
        nombre: item.nombre,
        motivoCambio: item.motivoCambio,
        aplicabilidades: item.aplicabilidades.map((rule) => ({
            productoId: rule.productoId,
            categoriaId: rule.categoriaId,
            productosExcluidosIds: rule.productosExcluidosIds,
            tipoOrden: rule.tipoOrden,
            puntoAplicacion: rule.puntoAplicacion,
            areaOperativaId: rule.areaOperativaId,
            procesoId: rule.procesoProduccionId,
            frontendNodeId: rule.frontendNodeId,
            bloqueante: rule.puntoExigencia !== "INFORMATIVO",
        })),
        caracteristicas: item.caracteristicas.map((characteristic) => ({
            nombre: characteristic.nombre,
            tipo: characteristic.tipo,
            magnitudId: characteristic.magnitudId,
            unidadId: characteristic.unidadId,
            escalaVisible: characteristic.escala,
            objetivo: characteristic.objetivo,
            limiteInferior: characteristic.limiteInferior,
            limiteSuperior: characteristic.limiteSuperior,
            valorBooleanoEsperado: characteristic.valorBooleanoEsperado,
            cantidadMuestras: characteristic.cantidadMuestras,
            unidadesPorMuestra: characteristic.unidadesPorMuestra,
            orden: characteristic.orden,
        })),
    };
}

function normalizePlan(item: PlanWire): PlanControl {
    return {
        ...item,
        versiones: item.versiones.map((version) => ({
            ...version,
            aplicabilidades: version.aplicabilidades.map(normalizeApplicability),
            caracteristicas: version.caracteristicas.map(normalizeCharacteristic),
        })),
    };
}

function normalizePending(item: PendingWire): ControlRequerido {
    const orderId = item.tipoOrden === "OP" ? item.ordenProduccionId : item.ordenFabricacionId;
    return {
        ...item,
        id: item.controlRequeridoId,
        momentoEjecucion: item.momento,
        contexto: {
            loteId: item.loteId,
            lote: item.lote,
            productoId: item.productoId,
            productoNombre: item.productoNombre ?? item.productoId,
            tipoOrden: item.tipoOrden,
            ordenId: orderId,
            batchRecordId: item.batchRecordId,
            batchRecordCodigo: item.batchRecordCodigo,
            etapaId: item.batchRecordEtapaId,
            etapaNombre: item.etapaNombre,
            areaOperativaId: item.areaOperativaId,
            areaOperativaNombre: item.areaOperativaNombre,
            procesoProduccionId: item.procesoId,
            procesoProduccionNombre: item.procesoNombre,
        },
        caracteristicas: item.caracteristicas.map(normalizeCharacteristic),
    };
}

function executionContext(item: ExecutionSummaryWire): EjecucionControl["contexto"] {
    const orderId = item.tipoOrden === "OP" ? item.ordenProduccionId : item.ordenFabricacionId;
    return {
        loteId: item.loteId,
        lote: item.lote,
        productoId: item.productoId,
        productoNombre: item.productoNombre ?? item.productoId,
        tipoOrden: item.tipoOrden,
        ordenId: orderId,
        batchRecordId: item.batchRecordId,
        batchRecordCodigo: item.batchRecordCodigo,
        etapaId: item.batchRecordEtapaId,
        etapaNombre: item.etapaNombre,
        areaOperativaId: item.areaOperativaId,
        areaOperativaNombre: item.areaOperativaNombre,
        procesoProduccionId: item.procesoId,
        procesoProduccionNombre: item.procesoNombre,
    };
}

export function normalizeExecutionDetail(item: ExecutionDetailWire): EjecucionControl {
    const summary = item.resumen;
    return {
        id: summary.id,
        ambito: summary.ambito,
        controlRequeridoId: summary.controlRequeridoId,
        estado: summary.resultado,
        planCodigo: summary.planCodigo,
        planNombre: summary.planNombre,
        versionNumero: summary.versionNumero,
        contexto: executionContext(summary),
        usuarioUsername: summary.usuarioUsername,
        usuarioNombreCompleto: summary.usuarioNombreCompleto,
        fechaRegistro: summary.fechaRegistro,
        observaciones: summary.observaciones,
        repeticionDeId: summary.repeticionDeId,
        motivoRepeticion: summary.motivoRepeticion,
        muestras: item.muestras.map((sample) => ({
            ...sample,
            tipo: sample.tipo ?? (sample.lecturas.some((reading) => reading.valorNumerico != null) ? "NUMERICA" : "BOOLEANA"),
            lecturas: sample.lecturas,
        })),
    };
}

function normalizeHistory(item: ExecutionSummaryWire): HistorialControlItem {
    const detail = normalizeExecutionDetail({ resumen: item, muestras: [] });
    return { ...detail, tieneDesviacion: item.desviacionId != null };
}

function normalizeDeviation(item: DeviationWire): DesviacionControl {
    return {
        ...item,
        codigo: `DES-${item.id}`,
        ejecucionId: item.ejecucionOrigenId,
        planCodigo: item.planCodigo,
        planNombre: item.planNombre,
        contexto: {
            loteId: item.loteId,
            lote: item.lote,
            productoId: item.productoId,
            productoNombre: item.productoNombre ?? item.productoId,
            tipoOrden: item.tipoOrden,
        },
    };
}

export interface ControlDomainApi {
    ambito: AmbitoControl;
    listPlanes: (params?: { search?: string; estado?: string }) => Promise<PlanControl[]>;
    savePlan: (request: PlanControlWrite, planId?: number) => Promise<PlanControl>;
    publishVersion: (planId: number, versionId: number) => Promise<PlanControl>;
    retireVersion: (planId: number, versionId: number) => Promise<PlanControl>;
    listPendientes: (filters?: PendientesFilters) => Promise<PageResponse<ControlRequerido>>;
    execute: (request: EjecucionControlWrite) => Promise<EjecucionControl>;
    revalidate?: (requirementId: number, justification: string) => Promise<RevalidacionControl>;
    listHistorial: (filters?: HistorialFilters) => Promise<PageResponse<HistorialControlItem>>;
    getEjecucion: (id: number) => Promise<EjecucionControl>;
    listDesviaciones: (params?: { estado?: string; search?: string; page?: number; size?: number }) => Promise<PageResponse<DesviacionControl>>;
    resolveDesviacion: (id: number, request: DesviacionResolveWrite) => Promise<DesviacionControl>;
    closeDesviacion: (id: number, request: { disposicion: DisposicionDesviacion; justificacionDisposicion: string }) => Promise<DesviacionControl>;
}

function createControlDomainApi(ambito: AmbitoControl): ControlDomainApi {
    const base = ambito === "PROCESO"
        ? `${endpoints.domain}/api/produccion/controles-proceso`
        : `${endpoints.domain}/api/calidad/controles-calidad`;

    return {
        ambito,
        async listPlanes(params = {}) {
            const response = await axios.get<PlanWire[] | PageResponse<PlanWire>>(`${base}/planes`, {
                ...requestOptions,
                params: { search: params.search },
            });
            const items = Array.isArray(response.data) ? response.data : response.data.content;
            const search = params.search?.trim().toLocaleLowerCase("es-CO");
            return items.map(normalizePlan).filter((plan) => (
                (!search
                    || plan.codigo.toLocaleLowerCase("es-CO").includes(search)
                    || plan.nombre.toLocaleLowerCase("es-CO").includes(search))
                && (!params.estado || plan.versiones.some((version) => version.estado === params.estado))
            ));
        },
        async savePlan(request, planId) {
            const payload = serializePlanWrite(request);
            const response = planId == null
                ? await axios.post<PlanWire>(`${base}/planes`, payload, requestOptions)
                : await axios.put<PlanWire>(`${base}/planes/${planId}/borrador`, payload, requestOptions);
            return normalizePlan(response.data);
        },
        async publishVersion(planId, versionId) {
            const response = await axios.post<PlanWire>(`${base}/planes/${planId}/versiones/${versionId}/publicar`, null, requestOptions);
            return normalizePlan(response.data);
        },
        async retireVersion(planId, versionId) {
            const response = await axios.post<PlanWire>(`${base}/planes/${planId}/versiones/${versionId}/retirar`, null, requestOptions);
            return normalizePlan(response.data);
        },
        async listPendientes(filters = {}) {
            const response = await axios.get<PageResponse<PendingWire> | PendingWire[]>(`${base}/pendientes`, { ...requestOptions, params: filters });
            const page = asPage(response.data, filters.page, filters.size);
            return { ...page, content: page.content.map(normalizePending) };
        },
        async execute(request) {
            const response = await axios.post<ExecutionDetailWire>(`${base}/ejecuciones`, request, requestOptions);
            return normalizeExecutionDetail(response.data);
        },
        revalidate: ambito === "CALIDAD" ? async (requirementId, justification) => {
            const response = await axios.post<RevalidacionControl>(
                `${base}/requisitos/${requirementId}/revalidaciones`,
                { justificacion: justification },
                requestOptions,
            );
            return response.data;
        } : undefined,
        async listHistorial(filters = {}) {
            const response = await axios.get<PageResponse<ExecutionSummaryWire> | ExecutionSummaryWire[]>(`${base}/historial`, {
                ...requestOptions,
                params: {
                    batchRecordId: filters.batchRecordId,
                    loteId: filters.loteId,
                    search: filters.search,
                    desde: filters.fechaDesde,
                    hasta: filters.fechaHasta,
                    resultado: filters.resultado,
                    page: filters.page,
                    size: filters.size,
                },
            });
            const page = asPage(response.data, filters.page, filters.size);
            return { ...page, content: page.content.map(normalizeHistory) };
        },
        async getEjecucion(id) {
            const response = await axios.get<ExecutionDetailWire>(`${base}/ejecuciones/${id}`, requestOptions);
            return normalizeExecutionDetail(response.data);
        },
        async listDesviaciones(params = {}) {
            const response = await axios.get<PageResponse<DeviationWire> | DeviationWire[]>(`${base}/desviaciones`, { ...requestOptions, params });
            const page = asPage(response.data, params.page, params.size);
            return { ...page, content: page.content.map(normalizeDeviation) };
        },
        async resolveDesviacion(id, request) {
            const response = await axios.post<DeviationWire>(`${base}/desviaciones/${id}/resolver`, request, requestOptions);
            return normalizeDeviation(response.data);
        },
        async closeDesviacion(id, request) {
            const response = await axios.post<DeviationWire>(`${base}/desviaciones/${id}/cerrar`, request, requestOptions);
            return normalizeDeviation(response.data);
        },
    };
}

export const processControlApi = createControlDomainApi("PROCESO");
export const qualityControlApi = createControlDomainApi("CALIDAD");

const catalogBase = `${endpoints.domain}/api/controles/catalogos`;

export async function listMagnitudes(incluirInactivas = false): Promise<CatalogoMagnitud[]> {
    const response = await axios.get<CatalogoMagnitud[]>(`${catalogBase}/magnitudes`, { ...requestOptions, params: { incluirInactivas } });
    return response.data ?? [];
}

export async function createMagnitud(request: { codigo: string; nombre: string; dimension: string; simbolo?: string | null }): Promise<CatalogoMagnitud> {
    const response = await axios.post<CatalogoMagnitud>(`${catalogBase}/magnitudes`, request, requestOptions);
    return response.data;
}

export async function setMagnitudActive(id: number, activo: boolean): Promise<CatalogoMagnitud> {
    const response = await axios.patch<CatalogoMagnitud>(`${catalogBase}/magnitudes/${id}/estado`, { activo }, requestOptions);
    return response.data;
}

export async function listUnidades(incluirInactivas = false): Promise<CatalogoUnidad[]> {
    const response = await axios.get<CatalogoUnidad[]>(`${catalogBase}/unidades`, { ...requestOptions, params: { incluirInactivas } });
    return response.data ?? [];
}

export async function listControlCategories(): Promise<CategoriaControlOption[]> {
    const response = await axios.get<CategoriaControlOption[]>(endpoints.get_categorias, requestOptions);
    return response.data ?? [];
}

export async function searchControlProducts(params: {
    search?: string;
    tipoBusqueda?: "NOMBRE" | "ID";
    categoriaId?: number;
    page?: number;
    size?: number;
}): Promise<PageResponse<ControlProductOption>> {
    const page = params.page ?? 0;
    const size = params.size ?? 10;
    const response = await axios.get<PageResponse<ControlProductOption> | ControlProductOption[]>(
        `${catalogBase}/productos`,
        { ...requestOptions, params: { ...params, page, size } },
    );
    return asPage(response.data, page, size);
}

export async function createUnidad(request: { codigo: string; nombre: string; simbolo: string; dimension: string }): Promise<CatalogoUnidad> {
    const response = await axios.post<CatalogoUnidad>(`${catalogBase}/unidades`, request, requestOptions);
    return response.data;
}

export async function setUnidadActive(id: number, activo: boolean): Promise<CatalogoUnidad> {
    const response = await axios.patch<CatalogoUnidad>(`${catalogBase}/unidades/${id}/estado`, { activo }, requestOptions);
    return response.data;
}
