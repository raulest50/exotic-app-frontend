import {
    Almacen,
    IngresoOCM_DTA,
    ItemOrdenCompra,
    Movimiento,
    OcmLotePreviewCandidate,
    OrdenCompra,
    TipoEntidadCausante,
    TipoMovimiento,
} from "../types";
import { IngresoOcmDraftItem, IngresoOcmValidationResult } from "./ingresoOcmTypes";

export function getCantidadYaRecibida(
    item: ItemOrdenCompra,
    recibidoPorProducto: Map<string, number>
): number {
    return recibidoPorProducto.get(String(item.material.productoId)) ?? 0;
}

export function getMaxCantidadPermitida(
    item: ItemOrdenCompra,
    recibidoPorProducto: Map<string, number>
): number {
    return Math.max(item.cantidad - getCantidadYaRecibida(item, recibidoPorProducto), 0);
}

export function buildOcmLotePreviewCandidates(
    draftItems: IngresoOcmDraftItem[]
): OcmLotePreviewCandidate[] {
    return draftItems
        .filter(draftItem => !draftItem.excluded)
        .flatMap(draftItem =>
            draftItem.lotes
                .filter(lote => lote.cantidad > 0)
                .map(lote => ({
                    lineKey: lote.lineKey,
                    productoId: String(draftItem.item.material.productoId),
                    cantidad: lote.cantidad,
                }))
        );
}

export function buildMovimientosFromDraft(
    draftItems: IngresoOcmDraftItem[],
    previewsByLineKey: Record<string, string>
): Movimiento[] {
    return draftItems
        .filter(draftItem => !draftItem.excluded)
        .flatMap(draftItem =>
            draftItem.lotes
                .filter(lote => lote.cantidad > 0 && Boolean(lote.expirationDate))
                .map(lote => ({
                    cantidad: lote.cantidad,
                    producto: draftItem.item.material,
                    tipoMovimiento: TipoMovimiento.COMPRA,
                    almacen: Almacen.GENERAL,
                    lote: {
                        batchNumber: previewsByLineKey[lote.lineKey],
                        productionDate: lote.productionDate,
                        expirationDate: lote.expirationDate,
                    },
                    fechaMovimiento: new Date().toISOString(),
                }))
        );
}

export function validateIngresoOcmDraft(
    orden: OrdenCompra | null,
    draftItems: IngresoOcmDraftItem[],
    recibidoPorProducto: Map<string, number>,
    limiteRecepcionesAlcanzado: boolean
): IngresoOcmValidationResult {
    const errors: string[] = [];

    if (!orden) {
        errors.push("No se ha seleccionado una orden de compra.");
    }

    if (limiteRecepcionesAlcanzado) {
        errors.push("La orden de compra ya alcanzo el limite de recepciones.");
    }

    if (orden && draftItems.length !== orden.itemsOrdenCompra.length) {
        errors.push("La informacion editable de la orden aun no esta inicializada.");
    }

    let receivedItemsCount = 0;
    const excludedItemsCount = draftItems.filter(item => item.excluded).length;

    for (const draftItem of draftItems) {
        if (draftItem.excluded) {
            continue;
        }

        const maxPermitido = getMaxCantidadPermitida(draftItem.item, recibidoPorProducto);
        const totalCantidad = draftItem.lotes.reduce((sum, lote) => sum + lote.cantidad, 0);
        const movimientosValidos = draftItem.lotes.filter(
            lote => lote.cantidad > 0 && Boolean(lote.expirationDate)
        );

        if (movimientosValidos.length === 0) {
            errors.push(`El material ${draftItem.item.material.productoId} no tiene lotes validos.`);
            continue;
        }

        if (totalCantidad <= 0 || totalCantidad > maxPermitido + 0.01) {
            errors.push(`La cantidad del material ${draftItem.item.material.productoId} no es valida.`);
            continue;
        }

        receivedItemsCount++;
    }

    if (draftItems.length > 0 && receivedItemsCount === 0) {
        errors.push("Debe recibir al menos un material.");
    }

    return {
        isValid: errors.length === 0,
        receivedItemsCount,
        excludedItemsCount,
        errors,
    };
}

export function buildIngresoOcmDta(
    orden: OrdenCompra,
    draftItems: IngresoOcmDraftItem[],
    previewsByLineKey: Record<string, string>
): IngresoOCM_DTA {
    return {
        transaccionAlmacen: {
            movimientosTransaccion: buildMovimientosFromDraft(draftItems, previewsByLineKey),
            urlDocSoporte: "",
            tipoEntidadCausante: TipoEntidadCausante.OCM,
            idEntidadCausante: orden.ordenCompraId?.toString() || "",
            observaciones: "",
        },
        ordenCompraMateriales: orden,
        userId: undefined,
        observaciones: "",
    };
}

export function buildIngresoOcmSubmitPayload(
    docIngresoDTA: IngresoOCM_DTA,
    observaciones: string
): { payload: Omit<IngresoOCM_DTA, "file">; file?: File } {
    const { file, ...docData } = docIngresoDTA;
    const itemsOrdenCompra = docData.ordenCompraMateriales.itemsOrdenCompra.map(item => {
        const itemCopy = { ...item } as Record<string, unknown>;
        delete itemCopy.precioUnitarioFinal;
        return itemCopy as ItemOrdenCompra;
    });

    return {
        file,
        payload: {
            ...docData,
            observaciones,
            transaccionAlmacen: {
                ...docData.transaccionAlmacen,
                observaciones,
            },
            ordenCompraMateriales: {
                ...docData.ordenCompraMateriales,
                itemsOrdenCompra,
            },
        },
    };
}
