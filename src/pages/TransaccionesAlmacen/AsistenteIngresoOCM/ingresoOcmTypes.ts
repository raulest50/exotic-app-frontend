import {
    ConsolidadoOCMResponse,
    ItemOrdenCompra,
    MovimientoDetalle,
    OcmLotePreviewCandidate,
    TransaccionAlmacen,
} from "../types";

export interface IngresoOcmDraftLoteRow {
    lineKey: string;
    productionDate: string;
    expirationDate: string;
    cantidad: number;
}

export type IngresoOcmDraftLoteField = "productionDate" | "expirationDate" | "cantidad";

export interface IngresoOcmDraftItem {
    itemIndex: number;
    item: ItemOrdenCompra;
    excluded: boolean;
    lotes: IngresoOcmDraftLoteRow[];
}

export interface IngresoOcmValidationResult {
    isValid: boolean;
    receivedItemsCount: number;
    excludedItemsCount: number;
    errors: string[];
}

export interface LotePreviewState {
    previewsByLineKey: Record<string, string>;
    loading: boolean;
    error: string | null;
}

export interface OcmReceptionDataState {
    transacciones: TransaccionAlmacen[];
    loadingTransacciones: boolean;
    transaccionesError: string | null;
    consolidado: ConsolidadoOCMResponse | null;
    loadingConsolidado: boolean;
    consolidadoError: string | null;
    recibidoPorProducto: Map<string, number>;
    refresh: () => void;
}

export interface FetchOrdenesPendientesParams {
    page: number;
    size: number;
    ordenCompraId?: number;
    fechaInicio: string | null;
    fechaFin: string | null;
    proveedorId?: string;
}

export type OcmPreviewRequestItem = Pick<OcmLotePreviewCandidate, "lineKey" | "productoId">;

export interface ListaTransaccionesDataProps {
    transacciones?: TransaccionAlmacen[];
    loading?: boolean;
    error?: string | null;
}

export interface ListaConsolidadoDataProps {
    consolidado?: ConsolidadoOCMResponse | null;
    loading?: boolean;
    error?: string | null;
}

export type MovimientosPorTransaccion = Map<number, MovimientoDetalle[]>;
