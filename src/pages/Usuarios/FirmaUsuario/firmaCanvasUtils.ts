import type { FirmaVisualSeleccionada } from "./firmaUsuario.types";

export const FIRMA_MAX_UPLOAD_SIZE_BYTES = 4 * 1_048_576;
export const FIRMA_TARGET_STORED_SIZE_BYTES = 900 * 1024;
export const FIRMA_MIN_WIDTH_PX = 50;
export const FIRMA_MIN_HEIGHT_PX = 20;
export const FIRMA_MAX_SOURCE_SIDE_PX = 8192;
export const FIRMA_MAX_SOURCE_PIXELS = 20_000_000;
export const FIRMA_TARGET_MAX_WIDTH_PX = 1200;
export const FIRMA_TARGET_MAX_HEIGHT_PX = 600;

const FIRMA_ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);

export async function validarFirmaImagen(file: File): Promise<FirmaVisualSeleccionada> {
    if (!FIRMA_ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
        throw new Error("La firma visual debe ser un archivo PNG o JPG/JPEG.");
    }
    if (file.size <= 0 || file.size > FIRMA_MAX_UPLOAD_SIZE_BYTES) {
        throw new Error("La imagen original de la firma debe pesar como máximo 4 MB.");
    }

    const dataUrl = await fileToDataUrl(file);
    const dimensions = await imageDimensions(dataUrl);
    if (dimensions.width < FIRMA_MIN_WIDTH_PX || dimensions.height < FIRMA_MIN_HEIGHT_PX) {
        throw new Error("La firma visual debe medir al menos 50 x 20 px.");
    }
    if (dimensions.width > FIRMA_MAX_SOURCE_SIDE_PX
        || dimensions.height > FIRMA_MAX_SOURCE_SIDE_PX) {
        throw new Error("La imagen original de la firma no puede superar 8192 px por lado.");
    }
    if (dimensions.width * dimensions.height > FIRMA_MAX_SOURCE_PIXELS) {
        throw new Error("La imagen original de la firma no puede superar 20 megapíxeles.");
    }

    return {
        file,
        dataUrl,
        anchoPx: dimensions.width,
        altoPx: dimensions.height,
        requiereOptimizacion: file.size > FIRMA_TARGET_STORED_SIZE_BYTES
            || dimensions.width > FIRMA_TARGET_MAX_WIDTH_PX
            || dimensions.height > FIRMA_TARGET_MAX_HEIGHT_PX,
    };
}

export function canvasToPngFile(
    canvas: HTMLCanvasElement,
    fileName: string = "firma_visual_dibujada.png"
): Promise<File> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("No se pudo preparar la firma dibujada."));
                return;
            }
            resolve(new File([blob], fileName, { type: "image/png" }));
        }, "image/png");
    });
}

function fileToDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("No se pudo leer la imagen seleccionada."));
            }
        };
        reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
        reader.readAsDataURL(file);
    });
}

function imageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("No se pudo decodificar la imagen seleccionada."));
        image.src = dataUrl;
    });
}
