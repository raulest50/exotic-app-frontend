import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";

export type MpsEstado = "BORRADOR" | "APROBADO" | "CERRADO";
export type EstadoMpsSemanalItem = "ACTIVO" | "CANCELADO";
export type EstadoMpsSemanalLotePlanificado = "PENDIENTE_ODP" | "ODP_GENERADA" | "CANCELADO";

export interface ProgramacionProduccionSemanalItemRequestDTO {
    terminadoId: string;
    numeroLotes: number;
    observacion?: string;
}

export interface ProgramacionProduccionSemanalDiaRequestDTO {
    fecha: string;
    dayIndex: number;
    items: ProgramacionProduccionSemanalItemRequestDTO[];
}

export interface GuardarProgramacionProduccionSemanalRequestDTO {
    weekStartDate: string;
    dias: ProgramacionProduccionSemanalDiaRequestDTO[];
}

export interface MpsSemanalLotePlanificadoDTO {
    id: number;
    loteOrdinal: number;
    cantidadPlanificada: number;
    estado: EstadoMpsSemanalLotePlanificado;
    ordenProduccionId: number | null;
    loteAsignado: string | null;
    ordenIniciada: boolean;
    ordenCancelable: boolean;
}

export interface MpsSemanalItemDTO {
    id: number;
    terminadoId: string;
    terminadoNombre: string;
    categoriaId: number | null;
    categoriaNombre: string | null;
    loteSize: number;
    tiempoDiasFabricacion: number;
    numeroLotes: number;
    estadoItem: EstadoMpsSemanalItem | null;
    cantidadTotal: number;
    fechaLanzamiento: string;
    fechaFinalPlanificada: string;
    observacion: string | null;
    warning: string | null;
    displayOrder: number;
    editable: boolean;
    blockedReason: string | null;
    ordenesIniciadas: number;
    ordenesCancelables: number;
    lotesActivos: number;
    lotesCancelados: number;
    lotesPlanificados: MpsSemanalLotePlanificadoDTO[];
}

export interface MpsSemanalDiaDTO {
    id: number;
    fecha: string;
    dayIndex: number;
    displayOrder: number;
    items: MpsSemanalItemDTO[];
}

export interface MpsSemanalDraftDTO {
    mpsId: number;
    estado: MpsEstado;
    fechaCreacion: string;
    fechaActualizacion: string | null;
    fechaAprobacion: string | null;
    aprobadoPorUsername: string | null;
    fechaGeneracionOdps: string | null;
    generadoPorUsername: string | null;
    semanaMpsId: number | null;
    semanaMpsCodigo: string | null;
    anioSemana: number | null;
    numeroSemana: number | null;
    standard: string | null;
    revisionNumero: number | null;
    weekStartDate: string;
    weekEndDate: string;
    dias: MpsSemanalDiaDTO[];
    totalItems: number;
    totalLotesPlanificados: number;
    totalOdpsGeneradas: number;
}

export interface MpsSemanalListItemDTO {
    mpsId: number;
    estado: MpsEstado;
    fechaCreacion: string;
    fechaActualizacion: string | null;
    fechaAprobacion: string | null;
    aprobadoPorUsername: string | null;
    fechaGeneracionOdps: string | null;
    generadoPorUsername: string | null;
    semanaMpsId: number | null;
    semanaMpsCodigo: string | null;
    anioSemana: number | null;
    numeroSemana: number | null;
    standard: string | null;
    revisionNumero: number | null;
    weekStartDate: string;
    weekEndDate: string;
    totalItems: number;
    totalLotesPlanificados: number;
    totalOdpsGeneradas: number;
}

export interface SemanaMPSDTO {
    id: number | null;
    codigo: string;
    anioSemana: number;
    numeroSemana: number;
    startDate: string;
    endDate: string;
    standard: string;
    mpsId: number | null;
    estado: MpsEstado | null;
    fechaGeneracionOdps: string | null;
}

export interface AprobarMpsSemanalRequestDTO {
    weekStartDate: string;
}

export interface GenerarOdpDesdeMpsRequestDTO {
    weekStartDate: string;
}

export interface EditarMpsSemanalAprobadoItemRequestDTO {
    dayIndex: number;
    numeroLotes: number;
    observacion?: string;
}

export interface GenerarOdpDesdeMpsResponseDTO {
    mpsId: number;
    weekStartDate: string;
    totalBloquesProgramados: number;
    totalLotesProgramados: number;
    totalOrdenesCreadas: number;
    ordenesIds: number[];
}

export interface MpsSemanalOrdenProduccionListItemDTO {
    ordenId: number;
    productoId: string | null;
    productoNombre: string | null;
    loteAsignado: string | null;
    cantidadProducir: number;
    fechaLanzamiento: string | null;
    fechaFinalPlanificada: string | null;
    estadoOrden: number;
    mpsLotePlanificadoId: number | null;
    mpsItemId: number | null;
    mpsLoteOrdinal: number | null;
}

export type MpsSemanalObservacionEstado = "ABIERTA" | "ATENDIDA" | "CERRADA";
export type MpsSemanalObservacionTipo = "BLOQUEANTE" | "ADVERTENCIA" | "INFORMATIVA" | "OTRO";

export interface MpsSemanalObservacionDTO {
    observacionId: number;
    mpsId: number;
    weekStartDate: string;
    semanaMpsCodigo: string | null;
    revisionMps: number;
    autorUsername: string;
    mensaje: string;
    tipo: MpsSemanalObservacionTipo;
    estado: MpsSemanalObservacionEstado;
    respuestaCorreccion: string | null;
    atendidaPorUsername: string | null;
    fechaAtencion: string | null;
    cerradaPorUsername: string | null;
    fechaCierre: string | null;
    fechaCreacion: string;
}

export interface CrearMpsSemanalObservacionRequestDTO {
    weekStartDate: string;
    tipo: MpsSemanalObservacionTipo;
    mensaje: string;
}

export interface AtenderMpsSemanalObservacionRequestDTO {
    respuestaCorreccion: string;
}

export function getTotalUnidadesMpsSemanal(mps: MpsSemanalDraftDTO | MpsSemanalListItemDTO): number {
    if (!("dias" in mps)) {
        return 0;
    }
    return mps.dias
        .flatMap((dia) => dia.items ?? [])
        .reduce((total, item) => total + (Number.isFinite(item.cantidadTotal) ? item.cantidadTotal : 0), 0);
}

export function getMpsOdpsGeneradasCompletas(mps: MpsSemanalDraftDTO | MpsSemanalListItemDTO): boolean {
    return mps.totalLotesPlanificados > 0
        && mps.totalOdpsGeneradas >= mps.totalLotesPlanificados;
}

export async function GuardarBorradorProgramacionSemanal(
    payload: GuardarProgramacionProduccionSemanalRequestDTO,
): Promise<MpsSemanalDraftDTO> {
    const endPoints = new EndPointsURL();
    const response = await axios.post<MpsSemanalDraftDTO>(
        endPoints.programacion_mps_semanal_borrador_directo,
        payload,
    );
    return response.data;
}

export async function EditarMpsSemanalAprobadoItem(
    itemId: number,
    payload: EditarMpsSemanalAprobadoItemRequestDTO,
): Promise<MpsSemanalDraftDTO> {
    const endPoints = new EndPointsURL();
    const response = await axios.patch<MpsSemanalDraftDTO>(
        `${endPoints.programacion_mps_semanal}/items/${itemId}/edicion-aprobada`,
        payload,
    );
    return response.data;
}

export async function ListarSemanasMps(
    anioSemana: number,
): Promise<SemanaMPSDTO[]> {
    const endPoints = new EndPointsURL();
    const response = await axios.get<SemanaMPSDTO[]>(
        endPoints.programacion_mps_semanal_semanas,
        {
            params: { anioSemana },
        },
    );
    return response.data;
}

export async function ObtenerBorradorMpsSemanal(
    weekStartDate: string,
): Promise<MpsSemanalDraftDTO> {
    const endPoints = new EndPointsURL();
    const response = await axios.get<MpsSemanalDraftDTO>(
        endPoints.programacion_mps_semanal_borrador,
        {
            params: { weekStartDate },
        },
    );
    return response.data;
}

export async function ObtenerMpsSemanal(
    weekStartDate: string,
): Promise<MpsSemanalDraftDTO> {
    const endPoints = new EndPointsURL();
    const response = await axios.get<MpsSemanalDraftDTO>(
        endPoints.programacion_mps_semanal,
        {
            params: { weekStartDate },
        },
    );
    return response.data;
}

export async function ListarMpsSemanales(
    estado?: MpsEstado,
): Promise<MpsSemanalListItemDTO[]> {
    const endPoints = new EndPointsURL();
    const response = await axios.get<MpsSemanalListItemDTO[]>(
        endPoints.programacion_mps_semanal_list,
        {
            params: estado ? { estado } : undefined,
        },
    );
    return response.data;
}

export async function AprobarMpsSemanal(
    payload: AprobarMpsSemanalRequestDTO,
): Promise<MpsSemanalDraftDTO> {
    const endPoints = new EndPointsURL();
    const response = await axios.post<MpsSemanalDraftDTO>(
        endPoints.programacion_mps_semanal_aprobar,
        payload,
    );
    return response.data;
}

export async function GenerarOdpDesdeMps(
    payload: GenerarOdpDesdeMpsRequestDTO,
): Promise<GenerarOdpDesdeMpsResponseDTO> {
    const endPoints = new EndPointsURL();
    const response = await axios.post<GenerarOdpDesdeMpsResponseDTO>(
        endPoints.programacion_mps_semanal_generar_odps,
        payload,
    );
    return response.data;
}

export async function ObtenerOdpsDesdeMpsSemanal(
    weekStartDate: string,
): Promise<MpsSemanalOrdenProduccionListItemDTO[]> {
    const endPoints = new EndPointsURL();
    const response = await axios.get<MpsSemanalOrdenProduccionListItemDTO[]>(
        endPoints.programacion_mps_semanal_odps,
        {
            params: { weekStartDate },
        },
    );
    return response.data;
}

export async function ListarObservacionesMpsSemanal(
    weekStartDate: string,
): Promise<MpsSemanalObservacionDTO[]> {
    const endPoints = new EndPointsURL();
    const response = await axios.get<MpsSemanalObservacionDTO[]>(
        endPoints.programacion_mps_semanal_observaciones,
        {
            params: { weekStartDate },
        },
    );
    return response.data;
}

export async function CrearObservacionMpsSemanal(
    payload: CrearMpsSemanalObservacionRequestDTO,
): Promise<MpsSemanalObservacionDTO> {
    const endPoints = new EndPointsURL();
    const response = await axios.post<MpsSemanalObservacionDTO>(
        endPoints.programacion_mps_semanal_observaciones,
        payload,
    );
    return response.data;
}

export async function AtenderObservacionMpsSemanal(
    observacionId: number,
    payload: AtenderMpsSemanalObservacionRequestDTO,
): Promise<MpsSemanalObservacionDTO> {
    const endPoints = new EndPointsURL();
    const response = await axios.post<MpsSemanalObservacionDTO>(
        `${endPoints.programacion_mps_semanal_observaciones}/${observacionId}/atender`,
        payload,
    );
    return response.data;
}

export async function CerrarObservacionMpsSemanal(
    observacionId: number,
): Promise<MpsSemanalObservacionDTO> {
    const endPoints = new EndPointsURL();
    const response = await axios.post<MpsSemanalObservacionDTO>(
        `${endPoints.programacion_mps_semanal_observaciones}/${observacionId}/cerrar`,
    );
    return response.data;
}
