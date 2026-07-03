import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import type {
    AreaOperativaOption,
    EjecucionDetalleResponse,
    EjecucionListItemResponse,
    EjecucionRequest,
    EstadoControlProcesoPlantilla,
    LoteProduccionResumen,
    PageResponse,
    PlantillaRequest,
    PlantillaResponse,
    PrepararEjecucionResponse,
} from "./types";

const endpoints = new EndPointsURL();
const axiosOptions = { withCredentials: true };

export function extractApiError(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message || error.message || fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
}

export async function searchAreasOperativas(nombre: string): Promise<AreaOperativaOption[]> {
    const response = await axios.post<AreaOperativaOption[]>(
        endpoints.area_prod_search_by_name,
        { nombre },
        {
            params: { page: 0, size: 20 },
            withCredentials: true,
        },
    );
    return response.data ?? [];
}

export async function listPlantillas(params: {
    areaId?: number;
    estado?: EstadoControlProcesoPlantilla;
} = {}): Promise<PlantillaResponse[]> {
    const response = await axios.get<PlantillaResponse[]>(endpoints.calidad_plantillas, {
        ...axiosOptions,
        params,
    });
    return response.data ?? [];
}

export async function guardarBorradorPlantilla(request: PlantillaRequest): Promise<PlantillaResponse> {
    const response = await axios.post<PlantillaResponse>(endpoints.calidad_plantillas, request, axiosOptions);
    return response.data;
}

export async function publicarPlantilla(id: number): Promise<PlantillaResponse> {
    const response = await axios.post<PlantillaResponse>(
        endpoints.calidad_plantilla_publicar.replace("{id}", String(id)),
        null,
        axiosOptions,
    );
    return response.data;
}

export async function retirarPlantilla(id: number): Promise<PlantillaResponse> {
    const response = await axios.post<PlantillaResponse>(
        endpoints.calidad_plantilla_retirar.replace("{id}", String(id)),
        null,
        axiosOptions,
    );
    return response.data;
}

export async function searchLotesProduccion(search: string): Promise<LoteProduccionResumen[]> {
    const response = await axios.get<LoteProduccionResumen[]>(endpoints.calidad_lotes_produccion_search, {
        ...axiosOptions,
        params: { search, size: 20 },
    });
    return response.data ?? [];
}

export async function prepararEjecucion(areaId: number, loteId: number): Promise<PrepararEjecucionResponse> {
    const response = await axios.get<PrepararEjecucionResponse>(endpoints.calidad_ejecucion_preparar, {
        ...axiosOptions,
        params: { areaId, loteId },
    });
    return response.data;
}

export async function guardarEjecucion(request: EjecucionRequest): Promise<EjecucionDetalleResponse> {
    const response = await axios.post<EjecucionDetalleResponse>(endpoints.calidad_ejecuciones, request, axiosOptions);
    return response.data;
}

export async function buscarEjecuciones(params: {
    areaId?: number;
    loteId?: number;
    producto?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    size?: number;
}): Promise<PageResponse<EjecucionListItemResponse>> {
    const response = await axios.get<PageResponse<EjecucionListItemResponse>>(endpoints.calidad_ejecuciones, {
        ...axiosOptions,
        params,
    });
    return response.data;
}

export async function detalleEjecucion(id: number): Promise<EjecucionDetalleResponse> {
    const response = await axios.get<EjecucionDetalleResponse>(
        endpoints.calidad_ejecucion_detalle.replace("{id}", String(id)),
        axiosOptions,
    );
    return response.data;
}
