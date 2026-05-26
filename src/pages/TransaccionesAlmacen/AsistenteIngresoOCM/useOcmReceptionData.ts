import { useCallback, useEffect, useMemo, useState } from "react";

import { ConsolidadoOCMResponse, TransaccionAlmacen } from "../types";
import { OcmReceptionDataState } from "./ingresoOcmTypes";
import { fetchConsolidadoOcm, fetchTransaccionesOcm } from "./ocmIngresoApi";

function resolveErrorMessage(error: unknown, fallback: string) {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
        return response?.data?.message || response?.data?.error || fallback;
    }

    return error instanceof Error ? error.message : fallback;
}

export function useOcmReceptionData(ordenCompraId: number | undefined): OcmReceptionDataState {
    const [transacciones, setTransacciones] = useState<TransaccionAlmacen[]>([]);
    const [loadingTransacciones, setLoadingTransacciones] = useState(false);
    const [transaccionesError, setTransaccionesError] = useState<string | null>(null);
    const [consolidado, setConsolidado] = useState<ConsolidadoOCMResponse | null>(null);
    const [loadingConsolidado, setLoadingConsolidado] = useState(false);
    const [consolidadoError, setConsolidadoError] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState(0);

    const refresh = useCallback(() => {
        setRefreshToken(prev => prev + 1);
    }, []);

    useEffect(() => {
        if (!ordenCompraId) {
            setTransacciones([]);
            setTransaccionesError(null);
            setLoadingTransacciones(false);
            setConsolidado(null);
            setConsolidadoError(null);
            setLoadingConsolidado(false);
            return;
        }

        let cancelled = false;

        const loadTransacciones = async () => {
            setLoadingTransacciones(true);
            setTransaccionesError(null);

            try {
                const data = await fetchTransaccionesOcm(ordenCompraId);
                if (!cancelled) {
                    setTransacciones(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setTransacciones([]);
                    setTransaccionesError(
                        resolveErrorMessage(error, "No se pudieron cargar las transacciones de almacen.")
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingTransacciones(false);
                }
            }
        };

        const loadConsolidado = async () => {
            setLoadingConsolidado(true);
            setConsolidadoError(null);

            try {
                const data = await fetchConsolidadoOcm(ordenCompraId);
                if (!cancelled) {
                    setConsolidado(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setConsolidado(null);
                    setConsolidadoError(
                        resolveErrorMessage(error, "No se pudo cargar el consolidado de materiales.")
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingConsolidado(false);
                }
            }
        };

        loadTransacciones();
        loadConsolidado();

        return () => {
            cancelled = true;
        };
    }, [ordenCompraId, refreshToken]);

    const recibidoPorProducto = useMemo(() => {
        const map = new Map<string, number>();
        (consolidado?.materiales ?? []).forEach(material => {
            map.set(material.productoId, material.cantidadTotal);
        });
        return map;
    }, [consolidado]);

    return {
        transacciones,
        loadingTransacciones,
        transaccionesError,
        consolidado,
        loadingConsolidado,
        consolidadoError,
        recibidoPorProducto,
        refresh,
    };
}
