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
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match && match[1]) filename = match[1].trim();
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(objectUrl);
    document.body.removeChild(a);
}
