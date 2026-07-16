import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type {
    CierreProduccionRequest,
    CierreProduccionResponse,
    PendientesProduccionFecha,
    ResumenPendientesProduccion,
} from "./types";

const endpoints = new EndPointsURL();

export async function fetchResumenPendientes(): Promise<ResumenPendientesProduccion> {
    const response = await axios.get<ResumenPendientesProduccion>(
        endpoints.ingreso_terminados_pendientes_resumen,
        { withCredentials: true },
    );
    return response.data;
}

export async function fetchPendientesFecha(fecha: string): Promise<PendientesProduccionFecha> {
    const response = await axios.get<PendientesProduccionFecha>(
        endpoints.ingreso_terminados_pendientes,
        { params: { fecha }, withCredentials: true },
    );
    return response.data;
}

export async function confirmarCierreProduccion(
    request: CierreProduccionRequest,
): Promise<CierreProduccionResponse> {
    const response = await axios.post<CierreProduccionResponse>(
        endpoints.ingreso_terminados_cierres,
        request,
        { withCredentials: true },
    );
    return response.data;
}

export function resolveApiError(error: unknown, fallback: string): string {
    if (!axios.isAxiosError(error)) {
        return error instanceof Error ? error.message : fallback;
    }
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error || error.message || fallback;
}
