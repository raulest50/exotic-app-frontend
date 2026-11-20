import jsPDF from "jspdf";
import { autoTable, type Table } from "jspdf-autotable";
import { formatEmpresaIdentificacion, getEmpresaBrandingDocumentalVigente } from "../../../api/EmpresaIdentidadDocumentalApi";
import { addContainedPng } from "../../../utils/pdfBranding";
import type { ResultadoPuntosReorden } from "./types";

interface Documento extends jsPDF { lastAutoTable?: Table }

function numero(value: number | null): string {
    return value === null ? "Sin dato" : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 6 }).format(value);
}

export async function descargarPuntosReordenPdf(resultado: ResultadoPuntosReorden): Promise<void> {
    const branding = await getEmpresaBrandingDocumentalVigente();
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }) as Documento;
    const { calculo } = resultado;
    const { parametros } = calculo;
    const margen = 12;
    const ancho = doc.internal.pageSize.getWidth();
    addContainedPng(doc, branding.logoDataUrl, margen, margen, 25, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Asignación de puntos de reorden", margen + 32, margen + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(branding.identidadLegal.razonSocial, margen + 32, margen + 13);
    doc.text(formatEmpresaIdentificacion(branding.identidadLegal), margen + 32, margen + 18);

    autoTable(doc, {
        startY: 39,
        head: [["Parámetro", "Valor aplicado"]],
        body: [
            ["Operación", resultado.operacionId],
            ["Usuario", resultado.usuario],
            ["Aplicado en Bogotá", new Date(resultado.aplicadoEn).toLocaleString("es-CO", { timeZone: "America/Bogota" })],
            ["Rango inclusivo", `${parametros.fechaDesde} a ${parametros.fechaHasta}`],
            ["Seguridad", `${numero(parametros.porcentajeSeguridad)} % sobre consumo diario × plazo negociado`],
            ["Mínimo de días efectivos", String(calculo.minimoDiasEfectivos)],
            ["Días", `Calendario: ${calculo.diasCalendario}; excluidos: ${calculo.diasExcluidos}; efectivos globales con dispensación: ${calculo.diasEfectivos}`],
            ["Fechas excluidas", parametros.fechasExcluidas.join(", ") || "Ninguna"],
            ["Reglas", "Consumo diario = consumo del rango sin exclusiones / días globales con dispensación. El plazo negociado se expresa en días calendario. PR = consumo diario × plazo negociado + stock de seguridad. Unidades U: redondeo superior al entero; demás: redondeo superior a 6 decimales."],
            ["Proveedor", "Más OCM enviadas o cerradas; empate por compra más reciente e identificador. Los proveedores indicados como manuales se eligieron para esta operación."],
            ["Valores especiales", "Un PR asignado igual a cero deja el material sin umbral definido. Cambiar PR -1 a un valor positivo activa sus alertas de reorden."],
            ["Materiales actualizados", String(resultado.actualizados)],
        ],
        theme: "grid", margin: { left: margen, right: margen },
        styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 46 } },
        headStyles: { fillColor: [25, 115, 110] },
    });
    autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY ?? 150) + 7,
        head: [["ID", "Material", "Unidad", "Proveedor", "LT (días)", "Consumo total", "Consumo diario", "Seguridad", "PR anterior", "PR asignado"]],
        body: calculo.filas.map((fila) => [
            fila.productoId, fila.nombre, fila.unidad,
            `${fila.proveedorNombre ?? "Sin proveedor"}${fila.proveedorId ? ` (${fila.proveedorId})` : ""}${fila.proveedorManual ? " · manual" : ""}`,
            numero(fila.leadTimeNegociado), numero(fila.consumoTotal), numero(fila.consumoDiario),
            numero(fila.stockSeguridad), numero(fila.puntoReordenActual), numero(fila.puntoReordenNuevo),
        ]),
        theme: "grid", margin: { left: margen, right: margen, bottom: 14 },
        styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: [25, 115, 110] },
        columnStyles: { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" } },
    });
    for (let pagina = 1; pagina <= doc.getNumberOfPages(); pagina++) {
        doc.setPage(pagina);
        doc.setFontSize(8);
        doc.text(`Página ${pagina} de ${doc.getNumberOfPages()} · Operación ${resultado.operacionId}`, ancho - margen, doc.internal.pageSize.getHeight() - 6, { align: "right" });
    }
    doc.save(`puntos-reorden-${resultado.operacionId.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
}
