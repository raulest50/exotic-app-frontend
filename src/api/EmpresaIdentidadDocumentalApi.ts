import axios from "axios";
import EndPointsURL from "./EndPointsURL";

export interface EmpresaIdentidadDocumento {
    id: number;
    version: number;
    razonSocial: string;
    nombreComercial: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    digitoVerificacion: string;
    telefonoPrincipal: string;
    emailPrincipal: string;
}

export interface EmpresaLogoDocumento {
    id: number;
    version: number;
    sha256: string;
    contentType: string;
    tamanoBytes: number;
    anchoPx: number;
    altoPx: number;
    imagenUrl: string;
}

export interface EmpresaIdentidadDocumentalVigente {
    revision: string;
    identidadLegal: EmpresaIdentidadDocumento;
    logo: EmpresaLogoDocumento;
}

export interface EmpresaBrandingDocumental {
    revision: string;
    identidadLegal: EmpresaIdentidadDocumento;
    logo: EmpresaLogoDocumento;
    logoDataUrl: string;
}

const endPoints = new EndPointsURL();
const logoDataUrlCache = new Map<number, Promise<string>>();

/**
 * Obtiene la pareja vigente. El endpoint usa ETag/no-cache, por lo que cada
 * generacion revalida la revision sin volver a transferir el JSON si no cambio.
 */
export async function getEmpresaIdentidadDocumentalVigente(): Promise<EmpresaIdentidadDocumentalVigente> {
    try {
        const response = await axios.get<EmpresaIdentidadDocumentalVigente>(
            endPoints.empresa_identidad_documental_vigente
        );
        return response.data;
    } catch (error) {
        throw documentalError(
            error,
            "No se pudo obtener la identidad documental vigente. No se genero el PDF."
        );
    }
}

/**
 * Resuelve la identidad vigente y su imagen inmutable. La imagen se deduplica
 * por id durante la sesion; una nueva version usa otro id y se descarga de
 * inmediato.
 */
export async function getEmpresaBrandingDocumentalVigente(): Promise<EmpresaBrandingDocumental> {
    const vigente = await getEmpresaIdentidadDocumentalVigente();
    const logoDataUrl = await getEmpresaLogoDocumentoDataUrl(vigente.logo);
    return { ...vigente, logoDataUrl };
}

export async function getEmpresaLogoDocumentoDataUrl(
    logo: Pick<EmpresaLogoDocumento, "id" | "imagenUrl">
): Promise<string> {
    const cached = logoDataUrlCache.get(logo.id);
    if (cached) {
        return cached;
    }

    const pending = fetchLogoDataUrl(resolveBackendUrl(logo.imagenUrl));
    logoDataUrlCache.set(logo.id, pending);

    try {
        return await pending;
    } catch (error) {
        logoDataUrlCache.delete(logo.id);
        throw error;
    }
}

export async function getEmpresaLogoVersionDataUrl(logoVersionId: number): Promise<string> {
    return getEmpresaLogoDocumentoDataUrl({
        id: logoVersionId,
        imagenUrl: `/api/empresa-logo-documental/versiones/${logoVersionId}/imagen`,
    });
}

export function formatEmpresaIdentificacion(identidad: EmpresaIdentidadDocumento): string {
    const digitoVerificacion = identidad.digitoVerificacion?.trim();
    const numero = digitoVerificacion
        ? `${identidad.numeroIdentificacion}-${digitoVerificacion}`
        : identidad.numeroIdentificacion;
    return `${identidad.tipoIdentificacion}: ${numero}`;
}

async function fetchLogoDataUrl(url: string): Promise<string> {
    try {
        const response = await axios.get<Blob>(url, { responseType: "blob" });
        return blobToDataUrl(response.data);
    } catch (error) {
        throw documentalError(
            error,
            "No se pudo descargar el logo documental. No se genero el PDF."
        );
    }
}

function resolveBackendUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }
    return `${EndPointsURL.getDomain()}${path.startsWith("/") ? path : `/${path}`}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("No se pudo convertir el logo documental a data URL."));
            }
        };
        reader.onerror = () => reject(new Error("No se pudo leer el logo documental."));
        reader.readAsDataURL(blob);
    });
}

function documentalError(error: unknown, fallback: string): Error {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        if (responseData && typeof responseData === "object" && !(responseData instanceof Blob)) {
            const detail = [responseData.detail, responseData.message, responseData.error]
                .find((value): value is string => typeof value === "string" && value.trim().length > 0);
            if (detail) {
                return new Error(detail);
            }
        }
    }
    return error instanceof Error && error.message ? new Error(`${fallback} ${error.message}`) : new Error(fallback);
}
