import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import type { ConsumoSemiterminadoLoteDTO, ConsumoSemiterminadosContextoDTO } from "./areaOperativaPanel.types";

export interface RegistrarConsumoSemiterminadosRequest {
    idempotencyKey: string;
    lotes: Array<{ productoId: string; loteId: number; cantidad: string }>;
    observaciones?: string;
}

export interface RegistrarConsumoSemiterminadosResponse {
    transaccionId: number;
    reutilizado: boolean;
    contexto: ConsumoSemiterminadosContextoDTO;
}

const domain = new EndPointsURL().domain;
const seguimientoUrl = (ordenId: number, seguimientoId: number) =>
    `${domain}/api/area-operativa-panel/ordenes/${ordenId}/seguimientos/${seguimientoId}`;

export async function consultarConsumosSemiterminados(ordenId: number, seguimientoId: number, signal?: AbortSignal) {
    const response = await axios.get<ConsumoSemiterminadosContextoDTO>(
        `${seguimientoUrl(ordenId, seguimientoId)}/semiterminados`, { withCredentials: true, signal },
    );
    return response.data;
}

export async function consultarLotesSemiterminado(ordenId: number, seguimientoId: number, productoId: string) {
    const response = await axios.get<ConsumoSemiterminadoLoteDTO[]>(
        `${seguimientoUrl(ordenId, seguimientoId)}/semiterminados/${encodeURIComponent(productoId)}/lotes`,
        { withCredentials: true },
    );
    return response.data;
}

export async function registrarConsumosSemiterminados(
    ordenId: number, seguimientoId: number, request: RegistrarConsumoSemiterminadosRequest,
) {
    const response = await axios.post<RegistrarConsumoSemiterminadosResponse>(
        `${seguimientoUrl(ordenId, seguimientoId)}/consumos-semiterminados`, request, { withCredentials: true },
    );
    return response.data;
}
