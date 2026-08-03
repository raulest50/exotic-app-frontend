import axios from "axios";
import EndPointsURL from "./EndPointsURL";

export const PROCESO_DOCUMENTO_MAX_BYTES = 2 * 1024 * 1024;

export type ProcesoDocumentoEstado = "VIGENTE" | "RETIRADA";

export interface ProcesoDocumentoVersion {
    id: number;
    procesoId: number;
    version: number;
    estado: ProcesoDocumentoEstado;
    nombreArchivoOriginal: string;
    contentType: string;
    tamanoBytes: number;
    sha256: string;
    vigenteDesde: string;
    vigenteHasta?: string | null;
    creadoEn: string;
    creadoPor?: string | null;
    motivoCambio: string;
}

const endPoints = new EndPointsURL();

export async function getProcesoDocumentoVersiones(
    procesoId: number
): Promise<ProcesoDocumentoVersion[]> {
    const response = await axios.get<ProcesoDocumentoVersion[]>(versionesUrl(procesoId));
    return response.data;
}

export async function createProcesoDocumentoVersion(
    procesoId: number,
    archivo: File,
    motivoCambio?: string
): Promise<ProcesoDocumentoVersion> {
    const formData = new FormData();
    formData.append("archivo", archivo);
    if (motivoCambio?.trim()) {
        formData.append("motivoCambio", motivoCambio.trim());
    }

    const response = await axios.post<ProcesoDocumentoVersion>(
        versionesUrl(procesoId),
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
}

export async function downloadProcesoDocumentoVersion(
    procesoId: number,
    version: ProcesoDocumentoVersion
): Promise<void> {
    const url = endPoints.proceso_produccion_documento_archivo
        .replace("{id}", procesoId.toString())
        .replace("{versionId}", version.id.toString());
    const response = await axios.get<Blob>(url, { responseType: "blob" });
    const objectUrl = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = version.nombreArchivoOriginal;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export async function validateProcesoDocumentoFile(file: File): Promise<void> {
    if (file.size <= 0) {
        throw new Error("El documento no puede estar vacío.");
    }
    if (file.size > PROCESO_DOCUMENTO_MAX_BYTES) {
        throw new Error(`El archivo pesa ${formatBytes(file.size)}; el máximo es 2 MB.`);
    }

    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    if (extension !== ".pdf" && extension !== ".docx") {
        throw new Error("Solo se permiten documentos PDF o Word (.docx).");
    }

    const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (extension === ".pdf") {
        const isPdf = signature.length >= 5
            && signature[0] === 0x25
            && signature[1] === 0x50
            && signature[2] === 0x44
            && signature[3] === 0x46
            && signature[4] === 0x2d;
        if (!isPdf) {
            throw new Error("El archivo seleccionado no contiene un PDF válido.");
        }
    }

    if (extension === ".docx") {
        const isZipPackage = signature.length >= 4
            && signature[0] === 0x50
            && signature[1] === 0x4b
            && signature[2] === 0x03
            && signature[3] === 0x04;
        if (!isZipPackage) {
            throw new Error("El archivo seleccionado no contiene un DOCX válido.");
        }
    }
}

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 bytes";
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function procesoDocumentoErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string; detail?: string } | undefined;
        return data?.message ?? data?.detail ?? error.message;
    }
    return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function versionesUrl(procesoId: number): string {
    return endPoints.proceso_produccion_documentos_versiones
        .replace("{id}", procesoId.toString());
}
