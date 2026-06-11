import axios from "axios";
import EndPointsURL from "./EndPointsURL";

export type EmpresaIdentidadLegalEstado = "VIGENTE" | "RETIRADA";

export interface EmpresaIdentidadLegalVersion {
    id: number;
    version: number;
    estado: EmpresaIdentidadLegalEstado;
    razonSocial: string;
    nombreComercial: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    digitoVerificacion: string;
    telefonoPrincipal: string;
    emailPrincipal: string;
    vigenteDesde: string;
    vigenteHasta?: string | null;
    creadoEn: string;
    creadoPor?: string | null;
    motivoCambio?: string | null;
}

export interface EmpresaIdentidadLegalVersionPayload {
    razonSocial: string;
    nombreComercial: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    digitoVerificacion: string;
    telefonoPrincipal: string;
    emailPrincipal: string;
    motivoCambio: string;
}

const endPoints = new EndPointsURL();

export async function getEmpresaIdentidadLegalVigente(): Promise<EmpresaIdentidadLegalVersion> {
    const response = await axios.get<EmpresaIdentidadLegalVersion>(endPoints.empresa_identidad_legal_vigente);
    return response.data;
}

export async function getEmpresaIdentidadLegalVersiones(): Promise<EmpresaIdentidadLegalVersion[]> {
    const response = await axios.get<EmpresaIdentidadLegalVersion[]>(endPoints.empresa_identidad_legal_versiones);
    return response.data;
}

export async function createEmpresaIdentidadLegalVersion(
    payload: EmpresaIdentidadLegalVersionPayload
): Promise<EmpresaIdentidadLegalVersion> {
    const response = await axios.post<EmpresaIdentidadLegalVersion>(
        endPoints.empresa_identidad_legal_versiones,
        payload
    );
    return response.data;
}
