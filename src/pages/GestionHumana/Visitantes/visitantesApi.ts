import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type { PaginaVisitantes, ReciboVisitante, RegistroVisitanteRequest } from "./types";

export async function registrarVisitante(body: RegistroVisitanteRequest): Promise<ReciboVisitante> {
    // Fetch deliberately avoids the authenticated Axios defaults and interceptors.
    const response = await fetch(`${EndPointsURL.getDomain()}/api/public/visitantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
        if (response.status === 400) throw new Error("Revise los datos: cédula y nombre son obligatorios; la edad debe ser un entero entre 0 y 120.");
        if (response.status === 429) throw new Error("Se han recibido varios registros en poco tiempo. Espere un minuto e intente nuevamente.");
        throw new Error("No fue posible confirmar el registro. Intente nuevamente o comuníquese con recepción.");
    }
    return response.json() as Promise<ReciboVisitante>;
}

export async function consultarVisitantes(page: number, signal: AbortSignal): Promise<PaginaVisitantes> {
    return (await axios.get<PaginaVisitantes>(`${EndPointsURL.getDomain()}/gestion-humana/visitantes`, {
        params: { page, size: 20 },
        signal,
    })).data;
}
