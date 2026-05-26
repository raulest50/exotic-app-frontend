import axios from "axios";
import { useEffect, useMemo, useState } from "react";

import { OcmLotePreviewCandidate } from "../types";
import { LotePreviewState, OcmPreviewRequestItem } from "./ingresoOcmTypes";
import { previewLotesOcm } from "./ocmIngresoApi";

const PREVIEW_DEBOUNCE_MS = 250;

function toPreviewKey(candidates: OcmLotePreviewCandidate[]) {
    return JSON.stringify(
        candidates.map(({ lineKey, productoId }) => ({
            lineKey,
            productoId,
        }))
    );
}

function keepOnlyActivePreviews(
    previewsByLineKey: Record<string, string>,
    activeLineKeys: Set<string>
) {
    return Object.fromEntries(
        Object.entries(previewsByLineKey).filter(([lineKey]) => activeLineKeys.has(lineKey))
    );
}

export function useOcmLotePreview(
    ordenCompraId: number | undefined,
    candidates: OcmLotePreviewCandidate[]
): LotePreviewState {
    const [previewsByLineKey, setPreviewsByLineKey] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const previewKey = useMemo(() => toPreviewKey(candidates), [candidates]);
    const requestItems = useMemo<OcmPreviewRequestItem[]>(
        () => JSON.parse(previewKey) as OcmPreviewRequestItem[],
        [previewKey]
    );
    const activeLineKeys = useMemo(
        () => new Set(requestItems.map(candidate => candidate.lineKey)),
        [requestItems]
    );

    useEffect(() => {
        setPreviewsByLineKey({});
        setLoading(false);
        setError(null);
    }, [ordenCompraId]);

    useEffect(() => {
        setPreviewsByLineKey(prev => keepOnlyActivePreviews(prev, activeLineKeys));

        if (!ordenCompraId || requestItems.length === 0) {
            setLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        const timeoutId = window.setTimeout(async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await previewLotesOcm(
                    ordenCompraId,
                    requestItems
                );

                if (cancelled) {
                    return;
                }

                const nextPreviews: Record<string, string> = {};
                (response.items ?? []).forEach(item => {
                    nextPreviews[item.lineKey] = item.batchNumber;
                });
                setPreviewsByLineKey(nextPreviews);
            } catch (previewError) {
                if (cancelled) {
                    return;
                }

                const responseData = axios.isAxiosError(previewError)
                    ? previewError.response?.data
                    : undefined;
                const responseMessage = typeof responseData === "object" && responseData !== null
                    ? (responseData as { error?: string; message?: string }).error
                        ?? (responseData as { error?: string; message?: string }).message
                    : undefined;
                const message = responseMessage
                    || (axios.isAxiosError(previewError) && previewError.message)
                    || (previewError instanceof Error ? previewError.message : String(previewError));
                setError(message);
                setPreviewsByLineKey({});
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }, PREVIEW_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [activeLineKeys, ordenCompraId, requestItems]);

    return {
        previewsByLineKey,
        loading,
        error,
    };
}
