import axios from "axios";
import EndPointsURL from "./EndPointsURL";

export type MisionVisionEstado = "VIGENTE" | "RETIRADA";

export interface MisionVisionValor {
    id: number;
    orden: number;
    titulo: string;
    descripcionHtml: string;
}

export interface MisionVisionVersionSummary {
    id: number;
    version: number;
    estado: MisionVisionEstado;
    vigenteDesde: string;
    vigenteHasta?: string | null;
    creadoEn: string;
    creadoPor?: string | null;
    motivoCambio: string;
    origenVersion?: number | null;
}

export interface MisionVisionVersion extends MisionVisionVersionSummary {
    misionHtml: string;
    visionHtml: string;
    valores: MisionVisionValor[];
}

export interface MisionVisionValorPayload {
    titulo: string;
    descripcionHtml: string;
}

export interface MisionVisionVersionPayload {
    versionBase: number;
    misionHtml: string;
    visionHtml: string;
    valores: MisionVisionValorPayload[];
    motivoCambio: string;
}

export interface MisionVisionRestorePayload {
    versionBase: number;
    motivoCambio: string;
}

const endPoints = new EndPointsURL();

export async function getMisionVisionVigente(): Promise<MisionVisionVersion> {
    const response = await axios.get<MisionVisionVersion>(endPoints.mision_vision_vigente);
    return response.data;
}

export async function getMisionVisionVersiones(): Promise<MisionVisionVersionSummary[]> {
    const response = await axios.get<MisionVisionVersionSummary[]>(endPoints.mision_vision_versiones);
    return response.data;
}

export async function getMisionVisionVersion(id: number): Promise<MisionVisionVersion> {
    const response = await axios.get<MisionVisionVersion>(endPoints.getMisionVisionVersion(id));
    return response.data;
}

export async function createMisionVisionVersion(
    payload: MisionVisionVersionPayload
): Promise<MisionVisionVersion> {
    const response = await axios.post<MisionVisionVersion>(endPoints.mision_vision_versiones, payload);
    return response.data;
}

export async function restoreMisionVisionVersion(
    id: number,
    payload: MisionVisionRestorePayload
): Promise<MisionVisionVersion> {
    const response = await axios.post<MisionVisionVersion>(
        endPoints.restoreMisionVisionVersion(id),
        payload
    );
    return response.data;
}
