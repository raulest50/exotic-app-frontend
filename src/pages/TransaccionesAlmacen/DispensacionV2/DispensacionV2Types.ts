import type { MpsReadonlyItemContext } from "../../Produccion/ProgProdSemanalTab/MpsReadonlyReviewPanel";
import type { MpsSemanalItemDTO } from "../../Produccion/ProgProdSemanalTab/MpsSemanalService";

export interface DispensacionV2MpsItemSeleccionado {
    item: MpsSemanalItemDTO;
    context: MpsReadonlyItemContext;
    weekStartDate: string;
    weekEndDate: string;
    semanaMpsCodigo: string | null;
}

export interface DispensacionV2OrdenSeleccionada {
    ordenProduccionId: number;
    mpsItemId: number;
    mpsLotePlanificadoId: number;
    mpsLoteOrdinal: number;
    loteAsignado: string | null;
    cantidadPlanificada: number;
    productoId: string | null;
    productoNombre: string;
    categoriaNombre: string | null;
    weekStartDate: string;
    weekEndDate: string;
    semanaMpsCodigo: string | null;
    areaId: number;
    areaNombre: string;
    fechaEntregaPlanificada: string;
}

export interface DispensacionV2PreparacionRequestDTO {
    areaId: number;
    ordenes: Array<{
        ordenProduccionId: number;
        mpsLotePlanificadoId?: number;
        mpsItemId?: number;
    }>;
}

export interface DispensacionV2MaterialesRecetaRequestDTO {
    areaId: number;
    productoId: string;
    cantidadBase: number;
}

export interface DispensacionV2AsignacionLotesRequestDTO {
    areaId: number;
    ordenes: Array<{
        ordenProduccionId: number;
        mpsLotePlanificadoId?: number | null;
        mpsItemId?: number | null;
        materiales: Array<{
            productoId: string;
            checked: boolean;
            cantidadADispensar: number;
        }>;
    }>;
}

export interface DispensacionV2AreaDTO {
    areaId: number;
    nombre: string;
}

export interface DispensacionV2LoteOrigenDTO {
    loteId: number;
    batchNumber: string;
    productionDate?: string | null;
    expirationDate?: string | null;
    cantidadDisponible: number;
    cantidadAsignada: number;
    sugerido: boolean;
}

export interface DispensacionV2MaterialDTO {
    productoId: string;
    productoNombre: string;
    tipoUnidades: string;
    tipoProducto: string;
    inventareable: boolean;
    checked: boolean;
    cantidadReceta: number;
    cantidadADispensar: number;
    cantidadHistorica: number;
    totalConHistorico: number;
    excedeReceta: boolean;
    warning?: string | null;
    lotesOrigen: DispensacionV2LoteOrigenDTO[];
}

export interface DispensacionV2OrdenDTO {
    ordenProduccionId: number;
    loteAsignado?: string | null;
    productoTerminadoId: string;
    productoTerminadoNombre: string;
    cantidadProducir: number;
    mpsLotePlanificadoId?: number | null;
    mpsItemId?: number | null;
    area: DispensacionV2AreaDTO;
    materiales: DispensacionV2MaterialDTO[];
    warnings: string[];
}

export interface DispensacionV2TotalMaterialDTO {
    productoId: string;
    productoNombre: string;
    tipoUnidades: string;
    cantidadRecetaTotal: number;
    cantidadADispensarTotal: number;
    cantidadHistoricaTotal: number;
    totalConHistorico: number;
    excedeReceta: boolean;
    warning?: string | null;
}

export interface DispensacionV2PreparacionResponseDTO {
    area: DispensacionV2AreaDTO;
    ordenes: DispensacionV2OrdenDTO[];
    totalesMateriales: DispensacionV2TotalMaterialDTO[];
    warnings: string[];
}

export interface DispensacionV2MaterialesRecetaResponseDTO {
    area: DispensacionV2AreaDTO;
    productoId: string;
    productoNombre: string;
    cantidadBase: number;
    materiales: DispensacionV2MaterialDTO[];
    warnings: string[];
}

export interface DispensacionV2LoteDisponibleDTO {
    loteId: number;
    batchNumber: string;
    productionDate?: string | null;
    expirationDate?: string | null;
    cantidadDisponible: number;
    cantidadRecomendada: number;
}

export interface DispensacionV2LotesDisponiblesResponseDTO {
    productoId: string;
    nombreProducto: string;
    lotesDisponibles: DispensacionV2LoteDisponibleDTO[];
    totalPages: number;
    totalElements: number;
    currentPage: number;
    size: number;
}

export function formatDispensacionV2Number(value: number | null | undefined, maxDecimals = 4): string {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return safeValue.toLocaleString("es-CO", {
        minimumFractionDigits: safeValue % 1 === 0 ? 0 : 2,
        maximumFractionDigits: maxDecimals,
    });
}
