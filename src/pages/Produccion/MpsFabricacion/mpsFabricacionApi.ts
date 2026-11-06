import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type { OrdenFabricacion } from "../OrdenesFabricacion/types";

export type MpsOfEstado = "BORRADOR" | "APROBADO" | "CERRADO";
export interface MpsOfRefreshSignal { weekStartDate: string; sequence: number; origin: "programacion" | "aprobacion"; }
export type MpsOfObservacionTipo = "BLOQUEANTE" | "ADVERTENCIA" | "INFORMATIVA" | "OTRO";

export interface MpsOfObservacion {
    observacionId: number;
    mpsId: number;
    revisionMps: number;
    autorUsername: string;
    mensaje: string;
    tipo: MpsOfObservacionTipo;
    estado: "ABIERTA" | "ATENDIDA" | "CERRADA";
    respuestaCorreccion: string | null;
    atendidaPorUsername: string | null;
    fechaAtencion: string | null;
    cerradaPorUsername: string | null;
    fechaCierre: string | null;
    fechaCreacion: string;
}

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
    estado: "ACTIVO" | "CANCELADO";
    ordenFabricacionId: number | null;
    lote: string | null;
    estadoOrdenFabricacion: OrdenFabricacion["estado"] | null;
    editable: boolean;
    cancelable: boolean;
    motivoBloqueo: string | null;
}

export interface MpsOfPrograma {
    id: number | null;
    version: number | null;
    weekStartDate: string;
    weekEndDate: string;
    actualizadoEn: string | null;
    actualizadoPor: string | null;
    propuestas: MpsOfPropuesta[];
    estado: MpsOfEstado;
    revisionNumero: number | null;
    fechaAprobacion: string | null;
    aprobadoPorUsername: string | null;
    fechaGeneracionOfs: string | null;
    generadoPorUsername: string | null;
    observacionesPendientes: number;
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

export async function aprobarMpsOf(week: string, version: number | null): Promise<MpsOfPrograma> {
    const response = await axios.post<MpsOfPrograma>(`${base(false)}/${week}/aprobar`, { version }, options);
    return response.data;
}

export async function emitirMpsOf(week: string, version: number | null): Promise<MpsOfPrograma> {
    const response = await axios.post<MpsOfPrograma>(`${base(false)}/${week}/emitir`, { version }, options);
    return response.data;
}

export async function guardarPropuestaAprobadaMpsOf(week: string, version: number | null, propuesta: MpsOfLineaRequest): Promise<MpsOfPrograma> {
    const payload = { version, ...propuesta };
    const response = propuesta.id === null
        ? await axios.post<MpsOfPrograma>(`${base(false)}/${week}/propuestas`, payload, options)
        : await axios.put<MpsOfPrograma>(`${base(false)}/${week}/propuestas/${propuesta.id}`, payload, options);
    return response.data;
}

export async function cancelarPropuestaMpsOf(week: string, id: number, version: number | null): Promise<MpsOfPrograma> {
    const response = await axios.post<MpsOfPrograma>(`${base(false)}/${week}/propuestas/${id}/cancelar`, { version }, options);
    return response.data;
}

export async function consultarObservacionesMpsOf(week: string, signal?: AbortSignal): Promise<MpsOfObservacion[]> {
    const response = await axios.get<MpsOfObservacion[]>(`${base(false)}/${week}/observaciones`, { ...options, signal });
    return response.data;
}

export async function crearObservacionMpsOf(week: string, version: number | null, tipo: MpsOfObservacionTipo, mensaje: string): Promise<MpsOfObservacion> {
    const response = await axios.post<MpsOfObservacion>(`${base(false)}/${week}/observaciones`, { version, tipo, mensaje }, options);
    return response.data;
}

export async function atenderObservacionMpsOf(id: number, version: number | null, respuestaCorreccion: string): Promise<MpsOfObservacion> {
    const response = await axios.post<MpsOfObservacion>(`${base(false)}/observaciones/${id}/atender`, { version, respuestaCorreccion }, options);
    return response.data;
}

export async function cerrarObservacionMpsOf(id: number, version: number | null): Promise<MpsOfObservacion> {
    const response = await axios.post<MpsOfObservacion>(`${base(false)}/observaciones/${id}/cerrar`, { version }, options);
    return response.data;
}
