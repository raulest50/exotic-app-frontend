import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import type { OcmCierreCandidata, OcmCierreConfig, OcmCierreResultado, OcmEstadoRecepcion } from "./types";

const domain = new EndPointsURL().domain;
const base = `${domain}/api/super-master-directives/ocm-cierre`;

export async function consultarCierreConfig() {
    return (await axios.get<OcmCierreConfig>(`${base}/config`, { withCredentials: true })).data;
}

export async function guardarCierreConfig(config: Pick<OcmCierreConfig, "modo" | "dias">) {
    return (await axios.put<OcmCierreConfig>(`${base}/config`, config, { withCredentials: true })).data;
}

export async function previsualizarOcmCompletas() {
    return (await axios.get<OcmCierreCandidata[]>(`${base}/completas`, { withCredentials: true })).data;
}

export async function cerrarOcmCompletas(ordenCompraIds: number[]) {
    return (await axios.post<OcmCierreResultado>(`${base}/cerrar-completas`, { ordenCompraIds }, { withCredentials: true })).data;
}

export async function consultarEstadoRecepcion(id: number, signal?: AbortSignal) {
    return (await axios.get<OcmEstadoRecepcion>(`${domain}/ingresos_almacen/ocm/${id}/estado-recepcion`, {
        withCredentials: true, signal,
    })).data;
}

export function ocmErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data: unknown = error.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        if (data && typeof data === "object") {
            const message = (data as { message?: unknown; error?: unknown }).message
                ?? (data as { error?: unknown }).error;
            if (typeof message === "string" && message.trim()) return message;
        }
    }
    return fallback;
}
