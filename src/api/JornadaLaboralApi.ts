import axios from "axios";
import EndPointsURL from "./EndPointsURL";

export type JornadaLaboralEstado = "VIGENTE" | "RETIRADA";

export interface JornadaLaboralBloque {
    id?: number;
    diaSemana: number;
    orden: number;
    horaInicio: string;
    horaFin: string;
}

export interface JornadaLaboralVersion {
    id: number;
    version: number;
    estado: JornadaLaboralEstado;
    vigenteDesde: string;
    vigenteHasta?: string | null;
    creadoEn: string;
    creadoPor?: string | null;
    motivoCambio?: string | null;
    bloques: JornadaLaboralBloque[];
}

export interface JornadaLaboralBloquePayload {
    horaInicio: string;
    horaFin: string;
}

export interface JornadaLaboralDiaPayload {
    diaSemana: number;
    laborable: boolean;
    bloques: JornadaLaboralBloquePayload[];
}

export interface JornadaLaboralVersionPayload {
    motivoCambio: string;
    dias: JornadaLaboralDiaPayload[];
}

const endPoints = new EndPointsURL();

export async function getJornadaLaboralVigente(): Promise<JornadaLaboralVersion> {
    const response = await axios.get<JornadaLaboralVersion>(endPoints.jornada_laboral_vigente);
    return response.data;
}

export async function getJornadaLaboralVersiones(): Promise<JornadaLaboralVersion[]> {
    const response = await axios.get<JornadaLaboralVersion[]>(endPoints.jornada_laboral_versiones);
    return response.data;
}

export async function createJornadaLaboralVersion(
    payload: JornadaLaboralVersionPayload
): Promise<JornadaLaboralVersion> {
    const response = await axios.post<JornadaLaboralVersion>(
        endPoints.jornada_laboral_versiones,
        payload
    );
    return response.data;
}
