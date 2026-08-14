import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type {
    FirmaVisualUsuarioActual,
    FirmaVisualUsuarioVersion,
} from "./firmaUsuario.types";

const domain = new EndPointsURL().domain;

function baseUrl(usuarioId: number): string {
    return `${domain}/usuarios/${usuarioId}/firma-visual`;
}

export async function getFirmaVisualActual(usuarioId: number): Promise<FirmaVisualUsuarioActual> {
    const response = await axios.get<FirmaVisualUsuarioActual>(baseUrl(usuarioId));
    return response.data;
}

export async function getFirmaVisualVersiones(
    usuarioId: number
): Promise<FirmaVisualUsuarioVersion[]> {
    const response = await axios.get<FirmaVisualUsuarioVersion[]>(`${baseUrl(usuarioId)}/versiones`);
    return response.data;
}

export async function getFirmaVisualImagenVigente(usuarioId: number): Promise<string> {
    return getImageDataUrl(`${baseUrl(usuarioId)}/imagen`);
}

export async function getFirmaVisualImagenVersion(
    usuarioId: number,
    versionId: number
): Promise<string> {
    return getImageDataUrl(`${baseUrl(usuarioId)}/versiones/${versionId}/imagen`);
}

export async function crearFirmaVisualVersion(
    usuarioId: number,
    firma: File,
    motivoCambio: string
): Promise<FirmaVisualUsuarioVersion> {
    const formData = new FormData();
    formData.append("firma", firma);
    formData.append("motivoCambio", motivoCambio);
    const response = await axios.post<FirmaVisualUsuarioVersion>(
        `${baseUrl(usuarioId)}/versiones`,
        formData
    );
    return response.data;
}

export async function retirarFirmaVisual(
    usuarioId: number,
    motivo: string
): Promise<FirmaVisualUsuarioVersion> {
    const response = await axios.post<FirmaVisualUsuarioVersion>(
        `${baseUrl(usuarioId)}/retirar`,
        { motivo }
    );
    return response.data;
}

export function firmaApiErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { detail?: unknown; message?: unknown } | undefined;
        const detail = data?.detail;
        if (typeof detail === "string" && detail.trim()) {
            return detail;
        }
        const message = data?.message;
        if (typeof message === "string" && message.trim()) {
            return message;
        }
    }
    return error instanceof Error && error.message ? error.message : fallback;
}

async function getImageDataUrl(url: string): Promise<string> {
    const response = await axios.get<Blob>(url, { responseType: "blob" });
    return blobToDataUrl(response.data);
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("No se pudo convertir la imagen de firma."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
