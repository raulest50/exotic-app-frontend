import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type {
    OrdenFabricacion,
    OrdenFabricacionPage,
    OrdenFabricacionRequest,
    SemiterminadoOptionPage,
} from "./types";

const endpoints = new EndPointsURL();
const options = { withCredentials: true };

export async function buscarOrdenesFabricacion(search = "", page = 0): Promise<OrdenFabricacionPage> {
    const response = await axios.get<OrdenFabricacionPage>(endpoints.produccion_ordenes_fabricacion, {
        ...options,
        params: { search: search || undefined, page, size: 20 },
    });
    return response.data;
}

export async function buscarSemiterminadosElegibles(search = ""): Promise<SemiterminadoOptionPage> {
    const response = await axios.get<SemiterminadoOptionPage>(
        `${endpoints.produccion_ordenes_fabricacion}/semiterminados-elegibles`,
        { ...options, params: { search: search || undefined, page: 0, size: 20 } },
    );
    return response.data;
}

export async function crearOrdenFabricacion(request: OrdenFabricacionRequest): Promise<OrdenFabricacion> {
    const response = await axios.post<OrdenFabricacion>(
        endpoints.produccion_ordenes_fabricacion,
        request,
        options,
    );
    return response.data;
}

export async function cancelarOrdenFabricacion(id: number): Promise<OrdenFabricacion> {
    const response = await axios.put<OrdenFabricacion>(
        `${endpoints.produccion_ordenes_fabricacion}/${id}/cancelar`,
        null,
        options,
    );
    return response.data;
}
