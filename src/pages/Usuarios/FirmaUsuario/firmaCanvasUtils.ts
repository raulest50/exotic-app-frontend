import type { FirmaVisualSeleccionada } from "./firmaUsuario.types";

export const FIRMA_MAX_FILE_SIZE_BYTES = 1_048_576;
export const FIRMA_MIN_WIDTH_PX = 50;
export const FIRMA_MIN_HEIGHT_PX = 20;
export const FIRMA_MAX_WIDTH_PX = 2000;
export const FIRMA_MAX_HEIGHT_PX = 1000;

const FIRMA_ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);

export async function validarFirmaImagen(file: File): Promise<FirmaVisualSeleccionada> {
    if (!FIRMA_ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
        throw new Error("La firma visual debe ser un archivo PNG o JPG/JPEG.");
    }
    if (file.size <= 0 || file.size > FIRMA_MAX_FILE_SIZE_BYTES) {
        throw new Error("La firma visual debe pesar como máximo 1 MB.");
    }

    const dataUrl = await fileToDataUrl(file);
    const dimensions = await imageDimensions(dataUrl);
    if (dimensions.width < FIRMA_MIN_WIDTH_PX || dimensions.height < FIRMA_MIN_HEIGHT_PX) {
        throw new Error("La firma visual debe medir al menos 50 x 20 px.");
    }
    if (dimensions.width > FIRMA_MAX_WIDTH_PX || dimensions.height > FIRMA_MAX_HEIGHT_PX) {
        throw new Error("La firma visual no puede superar 2000 x 1000 px.");
    }

    return {
        file,
        dataUrl,
        anchoPx: dimensions.width,
        altoPx: dimensions.height,
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
