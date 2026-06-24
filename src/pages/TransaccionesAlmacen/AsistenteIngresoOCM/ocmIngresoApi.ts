import axios from "axios";

import EndPointsURL from "../../../api/EndPointsURL";
import { PaginatedResponse } from "../HistorialDispensaciones/types";
import {
    ConsolidadoOCMResponse,
    IngresoOCM_DTA,
    MovimientoDetalle,
    OcmLotePreviewResponse,
    OrdenCompra,
    TransaccionAlmacen,
} from "../types";
import { FetchOrdenesPendientesParams, OcmPreviewRequestItem } from "./ingresoOcmTypes";
import { buildIngresoOcmSubmitPayload } from "./ingresoOcmMappers";

const endpoints = new EndPointsURL();

export async function fetchOrdenesPendientesOcm({
    page,
    size,
    ordenCompraId,
    fechaInicio,
    fechaFin,
    proveedorId,
}: FetchOrdenesPendientesParams): Promise<PaginatedResponse<OrdenCompra>> {
    const response = await axios.get<PaginatedResponse<OrdenCompra>>(
        endpoints.consulta_ocm_pendientes,
        {
            withCredentials: true,
            params: {
                page,
                size,
                ordenCompraId,
                fechaInicio,
                fechaFin,
                proveedorId,
            },
        }
    );

    return response.data;
}

export async function fetchTransaccionesOcm(ordenCompraId: number): Promise<TransaccionAlmacen[]> {
    const response = await axios.get<TransaccionAlmacen[]>(
        endpoints.consulta_transacciones_ocm,
        {
            withCredentials: true,
            params: {
                page: 0,
                size: 100,
                ordenCompraId,
            },
        }
    );

    return response.data || [];
}

export async function fetchConsolidadoOcm(ordenCompraId: number): Promise<ConsolidadoOCMResponse> {
    const url = endpoints.consolidado_materiales_ocm.replace(
        "{ordenCompraId}",
        String(ordenCompraId)
    );
    const response = await axios.get<ConsolidadoOCMResponse>(url, {
        withCredentials: true,
    });

    return response.data;
}

export async function fetchMovimientosTransaccion(transaccionId: number): Promise<MovimientoDetalle[]> {
    const url = endpoints.movimientos_transaccion.replace("{transaccionId}", String(transaccionId));
    const response = await axios.get<MovimientoDetalle[]>(url, {
        withCredentials: true,
    });

    return response.data || [];
}

export async function previewLotesOcm(
    ordenCompraId: number,
    items: OcmPreviewRequestItem[]
): Promise<OcmLotePreviewResponse> {
    const url = endpoints.preview_lotes_ingreso_ocm.replace(
        "{ordenCompraId}",
        String(ordenCompraId)
    );
    const response = await axios.post<OcmLotePreviewResponse>(
        url,
        { items },
        { withCredentials: true }
    );

    return response.data;
}

export async function closeOrdenCompraOcm(ordenCompraId: number): Promise<void> {
    const url = endpoints.close_orden_compra.replace("{ordenCompraId}", String(ordenCompraId));
    await axios.put(url, {}, {
        withCredentials: true,
    });
}

export async function submitIngresoOcm(
    docIngresoDTA: IngresoOCM_DTA,
    observaciones: string
): Promise<void> {
    const { payload, file } = buildIngresoOcmSubmitPayload(docIngresoDTA, observaciones);
    const formData = new FormData();
    formData.append(
        "docIngresoDTA",
        new Blob([JSON.stringify(payload)], { type: "application/json" })
    );
    if (file) {
        formData.append("file", file);
    }

    await axios.post(endpoints.save_doc_ingreso_oc, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
}
