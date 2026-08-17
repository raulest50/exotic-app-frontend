import type { PageResponse } from "../BatchRecords/types";

export interface SemiterminadoOrdenFabricacionOption {
    productoId: string;
    nombre: string;
    unidadMedida: string;
}

export interface OrdenFabricacionRequest {
    semiTerminadoId: string;
    cantidadPlanificada: number;
    lote: string;
    fechaLanzamiento?: string | null;
    fechaFinalPlanificada?: string | null;
    observaciones?: string | null;
}

export interface OrdenFabricacion {
    ordenFabricacionId: number;
    estado: "BORRADOR" | "PLANIFICADA" | "LIBERADA" | "EN_EJECUCION" | "FABRICACION_COMPLETADA" | "CERRADA" | "CANCELADA";
    semiTerminadoId: string;
    semiTerminadoNombre: string;
    manufacturingVersionId: number;
    manufacturingVersionNumber: number;
    cantidadPlanificada: number;
    unidadMedida: string;
    loteId: number;
    lote: string;
    estadoCalidadLote: string;
    batchRecordId: number;
    batchRecordCodigo: string;
    fechaCreacion: string;
    fechaLanzamiento?: string | null;
    fechaFinalPlanificada?: string | null;
    creadaPor: string;
    responsable: string;
    observaciones?: string | null;
}

export type OrdenFabricacionPage = PageResponse<OrdenFabricacion>;
export type SemiterminadoOptionPage = PageResponse<SemiterminadoOrdenFabricacionOption>;
