import { useCallback, useEffect, useRef, useState } from "react";
import { useAppToast } from "../../components/ui/use-app-toast";
import { apiFailureDetail, type ControlDomainApi } from "./api";
import { fetchPlanListPage, INITIAL_PLAN_QUERY, type PlanListQuery } from "./planListQuery";
import type { PageResponse, PlanControlResumen } from "./types";

export default function usePlanControlList(api: ControlDomainApi) {
    const toast = useAppToast();
    const [query, setQuery] = useState(INITIAL_PLAN_QUERY);
    const [result, setResult] = useState<PageResponse<PlanControlResumen> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestId = useRef(0);

    const load = useCallback(async (next: PlanListQuery) => {
        const request = ++requestId.current;
        setQuery(next);
        setResult(null);
        setLoading(true);
        setError(null);
        try {
            const response = await fetchPlanListPage(api.listPlanesResumen, next, () => request === requestId.current);
            if (!response) return;
            setResult(response);
            setQuery({ ...next, page: response.number });
        } catch (failure) {
            if (request !== requestId.current) return;
            const message = apiFailureDetail(failure, "Error de consulta.").message;
            setError(message);
            toast({ title: "No fue posible cargar los planes", description: message, status: "error" });
        } finally {
            if (request === requestId.current) setLoading(false);
        }
    }, [api, toast]);

    useEffect(() => {
        void load(INITIAL_PLAN_QUERY);
        return () => { requestId.current += 1; };
    }, [load]);

    return { query, result, loading, error, load };
}
