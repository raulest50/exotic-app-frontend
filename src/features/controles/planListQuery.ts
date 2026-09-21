import type { PlanVersionFilter } from "./planVersionView";
import type { PageResponse, PlanControlResumen, PlanesResumenFilters } from "./types";

export interface PlanListQuery {
    search: string;
    filter: PlanVersionFilter;
    page: number;
    size: number;
}

export const INITIAL_PLAN_QUERY: PlanListQuery = { search: "", filter: "TODAS", page: 0, size: 10 };

export async function fetchPlanListPage(
    fetchPage: (params: PlanesResumenFilters) => Promise<PageResponse<PlanControlResumen>>,
    query: PlanListQuery,
    isCurrent: () => boolean,
) {
    const params: PlanesResumenFilters = {
        search: query.search || undefined,
        estado: query.filter === "TODAS" ? undefined : query.filter,
        page: query.page,
        size: query.size,
    };
    let response = await fetchPage(params);
    if (!isCurrent()) return null;
    // A publication/retirement can remove the last plan on the last page.
    const lastPage = Math.max(0, response.totalPages - 1);
    if (query.page > lastPage) {
        response = await fetchPage({ ...params, page: lastPage });
    }
    return isCurrent() ? response : null;
}
