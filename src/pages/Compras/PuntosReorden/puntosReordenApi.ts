import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type {
    CalculoPuntosReorden,
    ParametrosPuntosReorden,
    PreparacionPuntosReorden,
    ResultadoPuntosReorden,
} from "./types";

const baseUrl = () => `${EndPointsURL.getDomain()}/api/compras/puntos-reorden`;
const preparacionUrl = (id: string) => `${baseUrl()}/preparaciones/${encodeURIComponent(id)}`;

export async function calcularPuntosReorden(parametros: ParametrosPuntosReorden, signal?: AbortSignal) {
    return (await axios.post<CalculoPuntosReorden>(`${baseUrl()}/calcular`, parametros, { signal })).data;
}

export async function prepararPuntosReorden(
    parametros: ParametrosPuntosReorden,
    productoIds: string[],
    calculoHash: string,
) {
    return (await axios.post<PreparacionPuntosReorden>(`${baseUrl()}/preparar`, {
        parametros, productoIds, calculoHash,
    })).data;
}

export async function continuarPuntosReorden(id: string, token: string) {
    return (await axios.post<PreparacionPuntosReorden>(`${preparacionUrl(id)}/continuar`, { token })).data;
}

export async function confirmarPuntosReorden(id: string, token: string) {
    return (await axios.post<ResultadoPuntosReorden>(`${preparacionUrl(id)}/confirmar`, { token })).data;
}

export async function cancelarPuntosReorden(id: string) {
    await axios.delete(preparacionUrl(id));
}

export function puntosReordenError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const body: unknown = error.response?.data;
        if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
            return body.message;
        }
        if (typeof body === "string" && body.trim()) return body;
    }
    return error instanceof Error ? error.message : "No fue posible completar la operación.";
}
