import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";

export interface ModelMetadata { productoId: string; contentLength: number; sha256: string; updatedAt: string; etag: string }
const endpoints = new EndPointsURL();
const modelUrl = (productoId: string) => endpoints.get_producto_manufacturing.replace("/manufacturing/{productoId}", `/terminados/${encodeURIComponent(productoId)}/modelo-3d`);

export async function loadModel(productoId: string, signal: AbortSignal): Promise<{ metadata: ModelMetadata; glb: Blob } | null> {
    try {
        const { data: metadata } = await axios.get<ModelMetadata>(modelUrl(productoId) + "/metadata", { signal, withCredentials: true });
        const { data: glb, headers } = await axios.get<Blob>(modelUrl(productoId), { signal, withCredentials: true, responseType: "blob" });
        if (headers.etag && headers.etag !== metadata.etag) throw new Error("El modelo cambió mientras se descargaba. Recarga el modelo guardado.");
        return { metadata, glb };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
    }
}

export async function saveModel(productoId: string, glb: Blob, etag: string | null, signal: AbortSignal): Promise<ModelMetadata> {
    try {
        const { data } = await axios.put<ModelMetadata>(modelUrl(productoId), glb, {
            signal, withCredentials: true,
            headers: { "Content-Type": "model/gltf-binary", ...(etag ? { "If-Match": etag } : { "If-None-Match": "*" }) },
        });
        return data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 412) throw Object.assign(new Error("Otra sesión modificó el modelo. Tu resultado se conserva: recarga la versión guardada antes de reemplazarla."), { cause: error });
            if (error.response?.status === 401) throw Object.assign(new Error("La sesión expiró. Vuelve a iniciar sesión para guardar el modelo."), { cause: error });
            const detail = error.response?.data?.error;
            if (typeof detail === "string") throw Object.assign(new Error(detail), { cause: error });
        }
        throw Object.assign(new Error("No se pudo confirmar el guardado del modelo. El terminado y tu resultado se conservan; puedes reintentar."), { cause: error });
    }
}

export async function deleteModel(productoId: string, etag: string, signal: AbortSignal): Promise<void> {
    await axios.delete(modelUrl(productoId), { signal, withCredentials: true, headers: { "If-Match": etag } });
}
