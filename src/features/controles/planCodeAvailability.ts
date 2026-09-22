import type { CodigoPlanDisponibilidad } from "./types";

/** Una sola consulta activa por editor; cancelar invalida incluso respuestas que ignoren AbortSignal. */
export class PlanCodeAvailabilityCheck {
    private request: AbortController | null = null;

    get pending() { return this.request != null; }

    cancel() {
        this.request?.abort();
        this.request = null;
    }

    async check(
        fetch: (codigo: string, signal: AbortSignal) => Promise<CodigoPlanDisponibilidad>, codigo: string,
    ): Promise<CodigoPlanDisponibilidad | null> {
        if (this.pending) return null;
        const request = new AbortController();
        this.request = request;
        try {
            const result = await fetch(codigo, request.signal);
            return this.request === request && !request.signal.aborted ? result : null;
        } catch (error) {
            if (this.request !== request || request.signal.aborted) return null;
            throw error;
        } finally {
            if (this.request === request) this.request = null;
        }
    }
}
