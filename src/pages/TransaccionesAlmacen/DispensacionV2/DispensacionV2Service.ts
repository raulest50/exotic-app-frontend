import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type {
    DispensacionV2AsignacionLotesRequestDTO,
    DispensacionV2LotesDisponiblesResponseDTO,
    DispensacionV2MaterialDTO,
    DispensacionV2MaterialesRecetaRequestDTO,
    DispensacionV2MaterialesRecetaResponseDTO,
    DispensacionV2OrdenSeleccionada,
    DispensacionV2PreparacionRequestDTO,
    DispensacionV2PreparacionResponseDTO,
} from "./DispensacionV2Types";

const endpoints = new EndPointsURL();

export async function prepararDispensacionV2(
    areaId: number,
    ordenes: DispensacionV2OrdenSeleccionada[],
): Promise<DispensacionV2PreparacionResponseDTO> {
    const payload: DispensacionV2PreparacionRequestDTO = {
        areaId,
        ordenes: ordenes.map((orden) => ({
            ordenProduccionId: orden.ordenProduccionId,
            mpsLotePlanificadoId: orden.mpsLotePlanificadoId,
            mpsItemId: orden.mpsItemId,
        })),
    };

    const response = await axios.post<DispensacionV2PreparacionResponseDTO>(
        endpoints.dispensacion_v2_preparacion,
        payload,
        { withCredentials: true },
    );
    return response.data;
}

export async function prepararMaterialesRecetaDispensacionV2(
    areaId: number,
    productoId: string,
    cantidadBase: number,
): Promise<DispensacionV2MaterialesRecetaResponseDTO> {
    const payload: DispensacionV2MaterialesRecetaRequestDTO = {
        areaId,
        productoId,
        cantidadBase,
    };

    const response = await axios.post<DispensacionV2MaterialesRecetaResponseDTO>(
        endpoints.dispensacion_v2_materiales_receta,
        payload,
        { withCredentials: true },
    );
    return response.data;
}

export async function asignarLotesDispensacionV2(
    areaId: number,
    preparacion: DispensacionV2PreparacionResponseDTO,
): Promise<DispensacionV2PreparacionResponseDTO> {
    const payload: DispensacionV2AsignacionLotesRequestDTO = {
        areaId,
        ordenes: preparacion.ordenes.map((orden) => ({
            ordenProduccionId: orden.ordenProduccionId,
            mpsLotePlanificadoId: orden.mpsLotePlanificadoId,
            mpsItemId: orden.mpsItemId,
            materiales: orden.materiales.map((material) => ({
                productoId: material.productoId,
                checked: material.checked,
                cantidadADispensar: material.cantidadADispensar,
            })),
        })),
    };

    const response = await axios.post<DispensacionV2PreparacionResponseDTO>(
        endpoints.dispensacion_v2_asignacion_lotes,
        payload,
        { withCredentials: true },
    );
    return response.data;
}

export async function asignarLotesDispensacionV2DesdeMateriales(
    areaId: number,
    ordenes: DispensacionV2OrdenSeleccionada[],
    materiales: DispensacionV2MaterialDTO[],
): Promise<DispensacionV2PreparacionResponseDTO> {
    const payload: DispensacionV2AsignacionLotesRequestDTO = {
        areaId,
        ordenes: ordenes.map((orden) => ({
            ordenProduccionId: orden.ordenProduccionId,
            mpsLotePlanificadoId: orden.mpsLotePlanificadoId,
            mpsItemId: orden.mpsItemId,
            materiales: materiales.map((material) => ({
                productoId: material.productoId,
                checked: material.checked,
                cantidadADispensar: material.cantidadADispensar,
            })),
        })),
    };

    const response = await axios.post<DispensacionV2PreparacionResponseDTO>(
        endpoints.dispensacion_v2_asignacion_lotes,
        payload,
        { withCredentials: true },
    );
    return response.data;
}

export async function getLotesDisponiblesDispensacionV2(
    productoId: string,
    page = 0,
    size = 50,
): Promise<DispensacionV2LotesDisponiblesResponseDTO> {
    const endpoint = endpoints.dispensacion_v2_lotes_disponibles
        .replace("{productoId}", encodeURIComponent(productoId));
    const response = await axios.get<DispensacionV2LotesDisponiblesResponseDTO>(
        endpoint,
        {
            params: { page, size },
            withCredentials: true,
        },
    );
    return response.data;
}
