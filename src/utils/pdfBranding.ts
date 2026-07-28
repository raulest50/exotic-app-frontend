import type jsPDF from "jspdf";

/**
 * Inserta una imagen dentro de una caja sin alterar su relacion de aspecto.
 */
export function addContainedPng(
    doc: jsPDF,
    logoDataUrl: string,
    x: number,
    y: number,
    boxWidth: number,
    boxHeight: number
): void {
    const properties = doc.getImageProperties(logoDataUrl);
    const imageRatio = properties.width / properties.height;
    const boxRatio = boxWidth / boxHeight;

    const renderWidth = imageRatio > boxRatio ? boxWidth : boxHeight * imageRatio;
    const renderHeight = imageRatio > boxRatio ? boxWidth / imageRatio : boxHeight;
    const renderX = x + (boxWidth - renderWidth) / 2;
    const renderY = y + (boxHeight - renderHeight) / 2;

    doc.addImage(logoDataUrl, "PNG", renderX, renderY, renderWidth, renderHeight);
}
