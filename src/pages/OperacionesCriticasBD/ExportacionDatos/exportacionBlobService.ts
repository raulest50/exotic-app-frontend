import axios from "axios";

export async function descargarArchivoExportacion(
    url: string,
    defaultFilename: string,
    blobMimeType?: string
): Promise<void> {
    const response = await axios.get(url, {
        withCredentials: true,
        responseType: "blob",
    });

    const blob = new Blob([response.data], blobMimeType ? { type: blobMimeType } : {});
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;

    const contentDisposition = response.headers["content-disposition"];
    let filename = defaultFilename;
    if (contentDisposition) {
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        const rawFilename = utf8Match?.[1] ?? basicMatch?.[1];
        if (rawFilename) filename = decodeURIComponent(rawFilename.trim());
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(objectUrl);
    document.body.removeChild(a);
}
