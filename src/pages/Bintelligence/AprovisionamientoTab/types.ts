import type { Material } from "../../Productos/types.tsx";

export type BiSearchType = "NOMBRE" | "ID";
export type LeadTimeDirection = "asc" | "desc";
export type AprovisionamientoSubView = "lead-times" | "puntos-reorden";

export interface SpringPage<T> {
    content: T[];
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface LeadTimeStatsDTO {
    calculable: boolean;
    reason?: string | null;
    representativeLeadTimeDays?: number | null;
    averageLeadTimeDays?: number | null;
    medianLeadTimeDays?: number | null;
    minLeadTimeDays?: number | null;
    maxLeadTimeDays?: number | null;
    standardDeviationLeadTimeDays?: number | null;
    validObservations?: number | null;
    totalOrdersConsidered?: number | null;
    confidenceScore?: number | null;
    lastReceiptObservedAt?: string | null;
}

export interface LeadTimeProveedorMaterialDTO {
    proveedorId: string;
    proveedorNombre: string;
    materialId: string;
    materialNombre: string;
    fechaCorte: string;
    ventanaDias: number;
    totalOrdersConsidered: number;
    firstReceipt: LeadTimeStatsDTO;
    completeReceipt: LeadTimeStatsDTO;
}

export interface LeadTimeProveedorMaterialPageRowDTO {
    proveedorId: string;
    proveedorNombre: string;
    materialId: string;
    materialNombre: string;
    representativeFirstReceiptLeadTimeDays?: number | null;
    representativeCompleteReceiptLeadTimeDays?: number | null;
    firstReceiptConfidenceScore?: number | null;
    completeReceiptConfidenceScore?: number | null;
    firstReceiptValidObservations?: number | null;
    completeReceiptValidObservations?: number | null;
    totalOrdersConsidered?: number | null;
    adjustedLeadTimeDays?: number | null;
}

export interface ProveedorMaterialLeadTimeMetricDTO {
    proveedorId: string;
    proveedorNombre: string;
    materialId: string;
    materialNombre: string;
    fechaCorte: string;
    ventanaDias: number;
    leadTimeMedianoDias?: number | null;
    observaciones: number;
    ordenesConsideradas: number;
    calculable: boolean;
    reason?: string | null;
    calculadoEn: string;
    observacionesConFechaEnvioProveedor: number;
    observacionesConFallbackFechaEmision: number;
}

export interface PuntoReordenEstimadoDTO {
    materialId: string;
    materialNombre: string;
    fechaCorte: string;
    ventanaDias: number;
    metodoUsado: string;
    reason?: string | null;
    puntoReordenEstimado?: number | null;
    demandaDiariaPromedio?: number | null;
    desviacionEstandarDemandaDiaria?: number | null;
    leadTimeRepresentativoDias?: number | null;
    leadTimePromedioDias?: number | null;
    desviacionEstandarLeadTimeDias?: number | null;
    demandaTotalVentana?: number | null;
    diasVentana: number;
    observacionesLeadTime?: number | null;
    proveedoresObservados?: number | null;
    confianzaGlobal?: number | null;
}

export interface MaterialSearchResponse extends SpringPage<Material> {}
