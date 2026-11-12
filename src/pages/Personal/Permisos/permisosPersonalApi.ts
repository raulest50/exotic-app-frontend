import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type { BorradorPermiso, ConfiguracionPermisos, ContextoPermisos, EstadoPermiso, FirmaPermisoRequest, FirmaVigentePermiso, PermisoPage, ScopePermiso, PermisoDetalle, PermisoResumen } from "./types";

const base = new EndPointsURL().personal_permisos;
export const permisosApi = {
    contexto: async (signal?: AbortSignal) => (await axios.get<ContextoPermisos>(`${base}/contexto`, { signal })).data,
    configuracion: async (signal?: AbortSignal) => (await axios.get<ConfiguracionPermisos>(`${base}/configuracion`, { signal })).data,
    configurar: async (id: number, body: { version: number | null; usuarioId: number | null; jefeUsuarioId: number | null; motivo: string }) => (await axios.put(`${base}/configuracion/${id}`, body)).data,
    listar: async (params: { scope: ScopePermiso; q?: string; estado?: EstadoPermiso | ""; desde?: string; hasta?: string; page: number; size: number }, signal?: AbortSignal) => (await axios.get<PermisoPage<PermisoResumen>>(base, { params, signal })).data,
    detalle: async (id: number, signal?: AbortSignal) => (await axios.get<PermisoDetalle>(`${base}/${id}`, { signal })).data,
    guardar: async (id: number | null, body: BorradorPermiso) => {
        const payload = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, value === "" ? null : value]));
        return (id === null ? await axios.post<PermisoDetalle>(base, payload) : await axios.put<PermisoDetalle>(`${base}/${id}`, payload)).data;
    },
    presentar: async (id: number, version: number, firma: FirmaPermisoRequest) => (await axios.post<PermisoDetalle>(`${base}/${id}/presentar`, { version, ...firma })).data,
    decidir: async (id: number, version: number, decision: "APROBAR" | "RECHAZAR", motivo: string, firma?: FirmaPermisoRequest) => (await axios.post<PermisoDetalle>(`${base}/${id}/decidir`, { version, decision, motivo, ...firma })).data,
    anular: async (id: number, version: number, motivo: string) => (await axios.post<PermisoDetalle>(`${base}/${id}/anular`, { version, motivo })).data,
    subirSoporte: async (id: number, version: number, archivo: File) => {
        const data = new FormData(); data.append("archivo", archivo); data.append("version", String(version));
        return (await axios.put<PermisoDetalle>(`${base}/${id}/soporte`, data)).data;
    },
    borrarSoporte: async (id: number, version: number) => (await axios.delete<PermisoDetalle>(`${base}/${id}/soporte`, { params: { version } })).data,
    firmaVigente: async (signal?: AbortSignal) => {
        const response = await axios.get<FirmaVigentePermiso>(`${base}/firma-vigente`, { signal });
        return response.status === 204 ? null : response.data;
    },
    archivo: async (id: number, tipo: "pdf" | "soporte") => (await axios.get<Blob>(`${base}/${id}/${tipo}`, { responseType: "blob" })).data,
};

export function errorPermiso(error: unknown, fallback = "No fue posible completar la operación."): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { detail?: unknown; message?: unknown } | undefined;
        if (typeof data?.detail === "string") return data.detail;
        if (typeof data?.message === "string") return data.message;
        if (error.response?.status === 409) return "La solicitud cambió o ya fue resuelta. Recargue el expediente antes de continuar; sus cambios sin guardar permanecen en pantalla.";
    }
    return error instanceof Error ? error.message : fallback;
}

export function cancelado(error: unknown): boolean { return axios.isCancel(error); }

export function descargarPermiso(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = nombre; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function imagenFirma(base64: string): string { return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`; }
