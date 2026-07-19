import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import {
    CargaCostosConfirmacion,
    CargaCostosErrorResponse,
    CargaCostosItemsPage,
    CargaCostosPreparacion,
    CargaCostosToken,
} from "./types";

export class CargaMasivaCostosApi {
    constructor(private readonly endpoints: EndPointsURL) {}

    async preparar(file: File, motivo: string): Promise<CargaCostosPreparacion> {
        const form = new FormData();
        form.append("file", file);
        form.append("motivo", motivo);
        const response = await axios.post<CargaCostosPreparacion>(
            this.endpoints.carga_masiva_costos_preparaciones,
            form,
        );
        return response.data;
    }

    async listarItems(loteId: string, page: number, size: number): Promise<CargaCostosItemsPage> {
        const response = await axios.get<CargaCostosItemsPage>(
            this.endpoints.carga_masiva_costos_items(loteId, page, size),
        );
        return response.data;
    }

    async generarToken(loteId: string): Promise<CargaCostosToken> {
        const response = await axios.post<CargaCostosToken>(
            this.endpoints.carga_masiva_costos_token(loteId),
            {},
        );
        return response.data;
    }

    async confirmar(loteId: string, token: string): Promise<CargaCostosConfirmacion> {
        const response = await axios.post<CargaCostosConfirmacion>(
            this.endpoints.carga_masiva_costos_confirmacion(loteId),
            { token },
        );
        return response.data;
    }

    async cancelar(loteId: string): Promise<void> {
        await axios.delete(this.endpoints.carga_masiva_costos_cancelar(loteId));
    }
}

export function readCargaCostosError(error: unknown): CargaCostosErrorResponse | null {
    if (!axios.isAxiosError<CargaCostosErrorResponse>(error)) return null;
    const data = error.response?.data;
    return data && typeof data === "object" && typeof data.mensaje === "string" ? data : null;
}

export function cargaCostosErrorMessage(error: unknown): string {
    const data = readCargaCostosError(error);
    if (data) return data.mensaje;
    if (axios.isAxiosError(error)) {
        const payload: unknown = error.response?.data;
        if (typeof payload === "string" && payload.trim()) return payload;
        if (payload && typeof payload === "object") {
            for (const field of ["mensaje", "message", "detail", "error"] as const) {
                const value = (payload as Record<string, unknown>)[field];
                if (typeof value === "string" && value.trim()) return value;
            }
        }
        return error.message || "No fue posible completar la operacion.";
    }
    return "Ocurrio un error inesperado.";
}
