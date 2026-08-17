import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type { BatchRecordDetail, BatchRecordListItem, PageResponse } from "./types";

const endpoints = new EndPointsURL();
const options = { withCredentials: true };

export async function buscarBatchRecords(params: {
    ordenProduccionId?: number;
    lote?: string;
    page?: number;
    size?: number;
}): Promise<PageResponse<BatchRecordListItem>> {
    const response = await axios.get<PageResponse<BatchRecordListItem>>(
        endpoints.produccion_batch_records,
        { ...options, params },
    );
    return response.data;
}

export async function detalleBatchRecord(id: number): Promise<BatchRecordDetail> {
    const response = await axios.get<BatchRecordDetail>(
        `${endpoints.produccion_batch_records}/${id}`,
        options,
    );
    return response.data;
}

export async function descargarPdfBatchRecord(
    id: number,
    revision?: number,
    actual = false,
): Promise<{ blob: Blob; filename: string }> {
    const response = await axios.get<Blob>(
        `${endpoints.produccion_batch_records}/${id}/pdf`,
        {
            ...options,
            params: {
                ...(revision == null ? {} : { revision }),
                ...(actual ? { actual: true } : {}),
            },
            responseType: "blob",
        },
    );
    const disposition = response.headers["content-disposition"] as string | undefined;
    const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1]
        ?? `batch-record-${id}.pdf`;
    return { blob: response.data, filename };
}
