import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type { OrdenFabricacion } from "../OrdenesFabricacion/types";

export interface MpsOfPropuesta {
    id: number;
    semiTerminadoId: string;
    semiTerminadoNombre: string;
    cantidad: string;
    unidadMedida: string;
    fechaInicio: string;
    fechaFinal: string;
    observaciones: string | null;
    elegible: boolean;
}

export interface MpsOfPrograma {
    id: number | null;
    version: number | null;
    weekStartDate: string;
    weekEndDate: string;
    actualizadoEn: string | null;
    actualizadoPor: string | null;
    propuestas: MpsOfPropuesta[];
}

export interface MpsOfLineaRequest {
    id: number | null;
    semiTerminadoId: string;
    cantidad: string;
    fechaInicio: string;
    fechaFinal: string;
    observaciones: string | null;
}

export interface MpsOfGuardarRequest {
    version: number | null;
    propuestas: MpsOfLineaRequest[];
}

export interface MpsOfOrden {
    ordenFabricacionId: number;
    semiTerminadoId: string;
    semiTerminadoNombre: string;
    cantidadPlanificada: number;
    unidadMedida: string;
    lote: string | null;
    estado: OrdenFabricacion["estado"];
    fechaInicioSemana: string;
    usaFechaCreacion: boolean;
    fechaFinalPlanificada: string | null;
}

export interface MpsOfOrdenPage {
    content: MpsOfOrden[];
    number: number;
    totalPages: number;
    totalElements: number;
}

const endpoints = new EndPointsURL();
const options = { withCredentials: true };
const base = (operativo: boolean) => operativo ? endpoints.area_operativa_panel_mps_of : endpoints.produccion_mps_of;

export async function consultarMpsOf(weekStartDate: string, operativo: boolean, signal?: AbortSignal): Promise<MpsOfPrograma> {
    const response = await axios.get<MpsOfPrograma>(base(operativo), { ...options, params: { weekStartDate }, signal });
    return response.data;
}

export async function guardarMpsOf(weekStartDate: string, request: MpsOfGuardarRequest): Promise<MpsOfPrograma> {
    const response = await axios.put<MpsOfPrograma>(`${base(false)}/${weekStartDate}`, request, options);
    return response.data;
}

export async function consultarOrdenesMpsOf(weekStartDate: string, page: number, operativo: boolean, signal?: AbortSignal): Promise<MpsOfOrdenPage> {
    const response = await axios.get<MpsOfOrdenPage>(`${base(operativo)}/ordenes`, {
        ...options, params: { weekStartDate, page, size: 20 }, signal,
    });
    return response.data;
}

export async function detalleOrdenMpsOf(id: number, operativo: boolean, signal?: AbortSignal): Promise<OrdenFabricacion> {
    const response = await axios.get<OrdenFabricacion>(`${base(operativo)}/ordenes/${id}`, { ...options, signal });
    return response.data;
}
