import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import type {
    DespejeAreaConfiguracion,
    DespejeAreaConfiguracionWrite,
    EjecucionDespeje,
    EjecucionDespejeWrite,
    FamiliaDespeje,
    FamiliaDespejeWrite,
    PlantillaDespeje,
    PlantillaDespejeWrite,
    PreparacionDespeje,
    PrepararDespejeRequest,
} from "./types";

const base = `${EndPointsURL.getDomain()}/api/despejes`;
const options = { withCredentials: true };

export function despejeError(error: unknown, fallback = "No fue posible completar la operación de despeje."): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string; bloqueos?: string[] } | undefined;
        return [data?.message || data?.error || error.message || fallback, ...(data?.bloqueos ?? [])].join(" ");
    }
    return error instanceof Error ? error.message : fallback;
}

export async function consultarConfigDespeje(areaId: number): Promise<DespejeAreaConfiguracion> {
    return (await axios.get<DespejeAreaConfiguracion>(`${base}/areas/${areaId}/config`, options)).data;
}

export async function guardarConfigDespeje(areaId: number, request: DespejeAreaConfiguracionWrite): Promise<DespejeAreaConfiguracion> {
    return (await axios.put<DespejeAreaConfiguracion>(`${base}/areas/${areaId}/config`, request, options)).data;
}

export async function consultarPlantillasDespeje(areaId: number): Promise<PlantillaDespeje[]> {
    return (await axios.get<PlantillaDespeje[]>(`${base}/areas/${areaId}/plantillas`, options)).data;
}

export async function consultarFamiliasDespeje(areaId: number): Promise<FamiliaDespeje[]> {
    return (await axios.get<FamiliaDespeje[]>(`${base}/areas/${areaId}/familias`, options)).data;
}

export async function crearFamiliaDespeje(areaId: number, request: FamiliaDespejeWrite): Promise<FamiliaDespeje> {
    return (await axios.post<FamiliaDespeje>(`${base}/areas/${areaId}/familias`, request, options)).data;
}

export async function guardarPlantillaDespeje(areaId: number, request: PlantillaDespejeWrite): Promise<PlantillaDespeje> {
    return (await axios.post<PlantillaDespeje>(`${base}/areas/${areaId}/plantillas`, request, options)).data;
}

export async function publicarPlantillaDespeje(id: number): Promise<PlantillaDespeje> {
    return (await axios.post<PlantillaDespeje>(`${base}/plantillas/${id}/publicar`, null, options)).data;
}

export async function retirarPlantillaDespeje(id: number): Promise<PlantillaDespeje> {
    return (await axios.post<PlantillaDespeje>(`${base}/plantillas/${id}/retirar`, null, options)).data;
}

export async function prepararDespeje(request: PrepararDespejeRequest): Promise<PreparacionDespeje> {
    const { data } = await axios.post<PreparacionDespeje>(`${base}/ejecuciones/preparar`, request, options);
    if (!Array.isArray(data.requisitos) || !Array.isArray(data.avisos)) {
        throw new Error("El servidor no devolvió el conjunto de formularios de despeje. Actualice la aplicación y verifique la versión del servicio.");
    }
    return data;
}

export async function consultarDespeje(id: number): Promise<EjecucionDespeje> {
    return (await axios.get<EjecucionDespeje>(`${base}/ejecuciones/${id}`, options)).data;
}

export async function guardarDespeje(id: number, request: EjecucionDespejeWrite): Promise<EjecucionDespeje> {
    return (await axios.put<EjecucionDespeje>(`${base}/ejecuciones/${id}`, request, options)).data;
}

export async function enviarDespeje(id: number, version: number): Promise<EjecucionDespeje> {
    return (await axios.post<EjecucionDespeje>(`${base}/ejecuciones/${id}/enviar`, { version }, options)).data;
}

export async function revisarDespeje(id: number, version: number, aprobar: boolean, motivo: string): Promise<EjecucionDespeje> {
    return (await axios.post<EjecucionDespeje>(`${base}/ejecuciones/${id}/revisar`, { version, aprobar, motivo }, options)).data;
}
