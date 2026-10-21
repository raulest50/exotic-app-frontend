import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import type { UnidadMedidaProducto } from "./types";

const endpoints = new EndPointsURL();

/** Catálogo persistido en backend. compatibleCon filtra por la magnitud de ese código. */
export async function listarUnidadesMedidaProducto(
    { compatibleCon, signal }: { compatibleCon?: string; signal?: AbortSignal } = {},
): Promise<UnidadMedidaProducto[]> {
    const response = await axios.get<UnidadMedidaProducto[]>(endpoints.unidades_medida_producto, {
        withCredentials: true,
        params: { compatibleCon },
        signal,
    });
    return response.data;
}

/** Only conversions within a magnitude; never infer density or package content. */
export function unidadesCompatibles(catalog: UnidadMedidaProducto[], code: string): UnidadMedidaProducto[] {
    const origin = catalog.find(unit => unit.codigo === code);
    return origin ? catalog.filter(unit => unit.magnitud === origin.magnitud) : [];
}
