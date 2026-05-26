import { useCallback, useEffect, useReducer, useRef } from "react";

import { OrdenCompra } from "../types";
import {
    IngresoOcmDraftItem,
    IngresoOcmDraftLoteField,
    IngresoOcmDraftLoteRow,
} from "./ingresoOcmTypes";

const MAX_LOTES_POR_MATERIAL = 3;

interface IngresoOcmDraftState {
    ordenCompraId?: number;
    items: IngresoOcmDraftItem[];
    nextLineSequenceByItem: Record<number, number>;
}

type IngresoOcmDraftAction =
    | { type: "initialize"; orden: OrdenCompra | null }
    | { type: "changeLote"; itemIndex: number; lineKey: string; field: IngresoOcmDraftLoteField; value: string | number }
    | { type: "addLote"; itemIndex: number }
    | { type: "removeLote"; itemIndex: number; lineKey: string }
    | { type: "toggleExcluded"; itemIndex: number; excluded: boolean };

const initialState: IngresoOcmDraftState = {
    items: [],
    nextLineSequenceByItem: {},
};

function createLineKey(itemIndex: number, sequence: number) {
    return `${itemIndex}:${sequence}`;
}

function getTodayInputDateValue() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
}

function createLoteRow(itemIndex: number, sequence: number, cantidad: number): IngresoOcmDraftLoteRow {
    return {
        lineKey: createLineKey(itemIndex, sequence),
        productionDate: getTodayInputDateValue(),
        expirationDate: "",
        cantidad,
    };
}

function initializeDraft(orden: OrdenCompra | null): IngresoOcmDraftState {
    if (!orden?.ordenCompraId || !orden.itemsOrdenCompra) {
        return initialState;
    }

    const nextLineSequenceByItem: Record<number, number> = {};
    const items = orden.itemsOrdenCompra.map((item, itemIndex) => {
        nextLineSequenceByItem[itemIndex] = 1;
        return {
            itemIndex,
            item,
            excluded: false,
            lotes: [createLoteRow(itemIndex, 0, item.cantidad)],
        };
    });

    return {
        ordenCompraId: orden.ordenCompraId,
        items,
        nextLineSequenceByItem,
    };
}

function draftReducer(state: IngresoOcmDraftState, action: IngresoOcmDraftAction): IngresoOcmDraftState {
    switch (action.type) {
        case "initialize":
            return initializeDraft(action.orden);

        case "changeLote":
            return {
                ...state,
                items: state.items.map(draftItem => {
                    if (draftItem.itemIndex !== action.itemIndex) {
                        return draftItem;
                    }

                    return {
                        ...draftItem,
                        lotes: draftItem.lotes.map(lote => {
                            if (lote.lineKey !== action.lineKey) {
                                return lote;
                            }

                            return {
                                ...lote,
                                [action.field]: action.value,
                            };
                        }),
                    };
                }),
            };

        case "addLote": {
            let added = false;
            const items = state.items.map(draftItem => {
                if (
                    draftItem.itemIndex !== action.itemIndex ||
                    draftItem.lotes.length >= MAX_LOTES_POR_MATERIAL
                ) {
                    return draftItem;
                }

                const nextSequence = state.nextLineSequenceByItem[action.itemIndex] ?? draftItem.lotes.length;
                added = true;
                return {
                    ...draftItem,
                    lotes: [
                        ...draftItem.lotes,
                        createLoteRow(action.itemIndex, nextSequence, 0),
                    ],
                };
            });

            if (!added) {
                return {
                    ...state,
                    items,
                };
            }

            return {
                ...state,
                items,
                nextLineSequenceByItem: {
                    ...state.nextLineSequenceByItem,
                    [action.itemIndex]: (state.nextLineSequenceByItem[action.itemIndex] ?? 0) + 1,
                },
            };
        }

        case "removeLote":
            return {
                ...state,
                items: state.items.map(draftItem => {
                    if (draftItem.itemIndex !== action.itemIndex || draftItem.lotes.length <= 1) {
                        return draftItem;
                    }

                    return {
                        ...draftItem,
                        lotes: draftItem.lotes.filter(lote => lote.lineKey !== action.lineKey),
                    };
                }),
            };

        case "toggleExcluded":
            return {
                ...state,
                items: state.items.map(draftItem => {
                    if (draftItem.itemIndex !== action.itemIndex) {
                        return draftItem;
                    }

                    const nextSequence = state.nextLineSequenceByItem[action.itemIndex] ?? 1;
                    return {
                        ...draftItem,
                        excluded: action.excluded,
                        lotes: action.excluded
                            ? [createLoteRow(action.itemIndex, nextSequence, 0)]
                            : [createLoteRow(action.itemIndex, nextSequence, draftItem.item.cantidad)],
                    };
                }),
                nextLineSequenceByItem: {
                    ...state.nextLineSequenceByItem,
                    [action.itemIndex]: (state.nextLineSequenceByItem[action.itemIndex] ?? 0) + 1,
                },
            };

        default:
            return state;
    }
}

export function useIngresoOcmDraft(orden: OrdenCompra | null) {
    const [state, dispatch] = useReducer(draftReducer, initialState);
    const ordenRef = useRef<OrdenCompra | null>(orden);

    useEffect(() => {
        ordenRef.current = orden;
    }, [orden]);

    useEffect(() => {
        dispatch({ type: "initialize", orden: ordenRef.current });
    }, [orden?.ordenCompraId]);

    const changeLote = useCallback((
        itemIndex: number,
        lineKey: string,
        field: IngresoOcmDraftLoteField,
        value: string | number
    ) => {
        dispatch({ type: "changeLote", itemIndex, lineKey, field, value });
    }, []);

    const addLote = useCallback((itemIndex: number) => {
        dispatch({ type: "addLote", itemIndex });
    }, []);

    const removeLote = useCallback((itemIndex: number, lineKey: string) => {
        dispatch({ type: "removeLote", itemIndex, lineKey });
    }, []);

    const toggleExcluded = useCallback((itemIndex: number, excluded: boolean) => {
        dispatch({ type: "toggleExcluded", itemIndex, excluded });
    }, []);

    return {
        draftItems: state.items,
        maxLotesPorMaterial: MAX_LOTES_POR_MATERIAL,
        changeLote,
        addLote,
        removeLote,
        toggleExcluded,
    };
}
