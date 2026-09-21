import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import { ROUTE_CONTROLS_CHANGED_EVENT, type RouteControlSummary } from "./routeControlSummary";

const endpoints = new EndPointsURL();
const emptyControls: RouteControlSummary[] = [];

export function useRouteControlSummary({ categoriaId, productoId, enabled = true }: {
    categoriaId?: number | null;
    productoId?: string | null;
    enabled?: boolean;
}) {
    const product = productoId?.trim() || null;
    // A product view must honor exclusions even if its category is also known.
    const category = product ? null : categoriaId;
    const key = enabled && (product || category != null) ? `${category ?? ""}:${product ?? ""}` : null;
    const [state, setState] = useState<{
        key: string | null; controls: RouteControlSummary[]; loading: boolean; error: boolean;
    }>({ key: null, controls: emptyControls, loading: false, error: false });
    const [revision, setRevision] = useState(0);
    const refresh = useCallback(() => setRevision((current) => current + 1), []);

    useEffect(() => {
        if (!key) return;
        let controller: AbortController | undefined;
        const refresh = () => {
            controller?.abort();
            const current = new AbortController();
            controller = current;
            setState({ key, controls: emptyControls, loading: true, error: false });
            void axios.get<RouteControlSummary[]>(`${endpoints.domain}/api/controles/ruta`, {
                params: product ? { productoId: product } : { categoriaId: category },
                withCredentials: true, signal: current.signal,
            }).then(({ data }) => {
                if (!current.signal.aborted) setState({ key, controls: data, loading: false, error: false });
            }).catch(() => {
                if (!current.signal.aborted) setState({ key, controls: emptyControls, loading: false, error: true });
            });
        };
        // Debounce product selection consistently with the route picker.
        const timer = window.setTimeout(refresh, product ? 400 : 0);
        window.addEventListener("focus", refresh);
        window.addEventListener(ROUTE_CONTROLS_CHANGED_EVENT, refresh);
        return () => {
            window.clearTimeout(timer);
            controller?.abort();
            window.removeEventListener("focus", refresh);
            window.removeEventListener(ROUTE_CONTROLS_CHANGED_EVENT, refresh);
        };
    }, [category, key, product, revision]);

    if (!key) return { controls: emptyControls, loading: false, error: false, refresh };
    if (state.key !== key) return { controls: emptyControls, loading: true, error: false, refresh };
    return { ...state, refresh };
}
