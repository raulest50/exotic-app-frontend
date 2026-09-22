import { expect, test } from "bun:test";
import { PlanCodeAvailabilityCheck } from "../src/features/controles/planCodeAvailability";
import type { CodigoPlanDisponibilidad } from "../src/features/controles/types";

function pendingResponse() {
    let resolve!: (value: CodigoPlanDisponibilidad) => void;
    let reject!: (reason: Error) => void;
    const promise = new Promise<CodigoPlanDisponibilidad>((accept, fail) => { resolve = accept; reject = fail; });
    return { promise, resolve, reject };
}

test("pulsaciones repetidas hacen una sola consulta y conservan la respuesta ocupada", async () => {
    const check = new PlanCodeAvailabilityCheck();
    const response = pendingResponse();
    let calls = 0;
    const fetch = () => { calls++; return response.promise; };
    const first = check.check(fetch, "PLAN-1");
    expect(await check.check(fetch, "PLAN-1")).toBeNull();
    response.resolve({ codigoNormalizado: "PLAN-1", disponible: false });
    expect((await first)?.disponible).toBe(false);
    expect(calls).toBe(1);
    expect(check.pending).toBe(false);
});

test("cerrar o cambiar de código descarta respuestas tardías sin cancelar la nueva consulta", async () => {
    const check = new PlanCodeAvailabilityCheck();
    const oldResponse = pendingResponse();
    const nextResponse = pendingResponse();
    let oldSignal: AbortSignal | undefined;
    const first = check.check((_, signal) => { oldSignal = signal; return oldResponse.promise; }, "ANTERIOR");
    check.cancel();
    expect(oldSignal?.aborted).toBe(true);
    const next = check.check(() => nextResponse.promise, "NUEVO");
    oldResponse.resolve({ codigoNormalizado: "ANTERIOR", disponible: true });
    expect(await first).toBeNull();
    expect(check.pending).toBe(true);
    nextResponse.resolve({ codigoNormalizado: "NUEVO", disponible: true });
    expect((await next)?.codigoNormalizado).toBe("NUEVO");
});

test("fallos de red permiten reintentar y los errores cancelados no se muestran", async () => {
    const check = new PlanCodeAvailabilityCheck();
    await expect(check.check(async () => { throw new Error("Sin red"); }, "PLAN-1")).rejects.toThrow("Sin red");
    expect(check.pending).toBe(false);
    expect(await check.check(async () => ({ codigoNormalizado: "PLAN-1", disponible: true }), "plan-1"))
        .toEqual({ codigoNormalizado: "PLAN-1", disponible: true });
    const response = pendingResponse();
    const cancelled = check.check(() => response.promise, "PLAN-2");
    check.cancel();
    response.reject(new Error("Petición abortada"));
    expect(await cancelled).toBeNull();
});
