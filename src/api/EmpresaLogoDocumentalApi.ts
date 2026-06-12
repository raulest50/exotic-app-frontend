import axios from "axios";
import EndPointsURL from "./EndPointsURL";

export type EmpresaLogoDocumentalEstado = "VIGENTE" | "RETIRADA";

export interface EmpresaLogoDocumentalVersion {
    id: number;
    version: number;
    estado: EmpresaLogoDocumentalEstado;
    nombreArchivoOriginal: string;
    contentType: string;
    tamanoBytes: number;
    anchoPx: number;
    altoPx: number;
    sha256: string;
    vigenteDesde: string;
    vigenteHasta?: string | null;
    creadoEn: string;
    creadoPor?: string | null;
    motivoCambio?: string | null;
}

const endPoints = new EndPointsURL();

export async function getEmpresaLogoDocumentalVigente(): Promise<EmpresaLogoDocumentalVersion> {
    const response = await axios.get<EmpresaLogoDocumentalVersion>(endPoints.empresa_logo_documental_vigente);
    return response.data;
}

export async function getEmpresaLogoDocumentalVersiones(): Promise<EmpresaLogoDocumentalVersion[]> {
    const response = await axios.get<EmpresaLogoDocumentalVersion[]>(endPoints.empresa_logo_documental_versiones);
    return response.data;
}

export async function getEmpresaLogoDocumentalImagenVigente(): Promise<string> {
    return getImageDataUrl(endPoints.empresa_logo_documental_vigente_imagen);
}

export async function getEmpresaLogoDocumentalImagenVersion(id: number): Promise<string> {
    return getImageDataUrl(endPoints.empresa_logo_documental_version_imagen.replace("{id}", id.toString()));
}

export async function createEmpresaLogoDocumentalVersion(
    logo: File,
    motivoCambio: string
): Promise<EmpresaLogoDocumentalVersion> {
    const formData = new FormData();
    formData.append("logo", logo);
    formData.append("motivoCambio", motivoCambio);

    const response = await axios.post<EmpresaLogoDocumentalVersion>(
        endPoints.empresa_logo_documental_versiones,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
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
                reject(new Error("No se pudo convertir la imagen a data URL."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
