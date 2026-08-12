import jsPDF from "jspdf";
import { autoTable, type Table } from "jspdf-autotable";
import {
    formatEmpresaIdentificacion,
    getEmpresaBrandingDocumentalVigente,
    getEmpresaLogoVersionDataUrl,
    type EmpresaIdentidadDocumento,
} from "../../api/EmpresaIdentidadDocumentalApi";
import { addContainedPng } from "../../utils/pdfBranding";
import { formatCOP } from "../../utils/formatters";
import { getCondicionPagoText, getRegimenTributario } from "../Compras/types";
import type { ItemOrdenCompraActivo, OrdenCompraActivo } from "./types";

interface JsPdfWithAutoTable extends jsPDF {
    lastAutoTable?: Table;
}

export interface OcafPdfOptions {
    logoDataUrl?: string;
    logoVersionId?: number;
    downloadFileName?: string;
}

export default class OCAF_PDF_Generator {
    public async downloadPDF_OCAF(
        orden: OrdenCompraActivo,
        empresaIdentidadLegal?: EmpresaIdentidadDocumento,
        options: OcafPdfOptions = {}
    ): Promise<void> {
        const doc = await this.generatePDF_OCAF(orden, empresaIdentidadLegal, options);
        doc.save(
            options.downloadFileName
            ?? `orden-compra-activo-${orden.ordenCompraActivoId}.pdf`
        );
    }

    public async getOCAFpdf_Blob(
        orden: OrdenCompraActivo,
        empresaIdentidadLegal?: EmpresaIdentidadDocumento,
        options: OcafPdfOptions = {}
    ): Promise<Blob> {
        const doc = await this.generatePDF_OCAF(orden, empresaIdentidadLegal, options);
        return doc.output("blob");
    }

    private async generatePDF_OCAF(
        orden: OrdenCompraActivo,
        empresaIdentidadLegal?: EmpresaIdentidadDocumento,
        options: OcafPdfOptions = {}
    ): Promise<JsPdfWithAutoTable> {
        const branding = await this.resolveBranding(orden, empresaIdentidadLegal, options);
        const identidadLegal = branding.identidadLegal;
        const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPdfWithAutoTable;
        const margin = 10;
        let currentY = margin;

        addContainedPng(doc, branding.logoDataUrl, margin, currentY, 25, 20);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("ORDEN DE COMPRA NUMERO: ", 90, currentY + 6, { align: "center" });
        doc.text(orden.ordenCompraActivoId?.toString() ?? "", 130, currentY + 6);

        currentY += 25;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(identidadLegal.razonSocial, margin, currentY);
        currentY += 4;
        doc.text(formatEmpresaIdentificacion(identidadLegal), margin, currentY);
        currentY += 4;
        doc.text(`Tel: ${identidadLegal.telefonoPrincipal}`, margin, currentY);
        currentY += 4;
        doc.text(identidadLegal.emailPrincipal, margin, currentY);

        const detailX = 140;
        let detailY = margin + 5;
        doc.setFontSize(6);
        doc.text("FECHA EMISION:", detailX, detailY - 10);
        doc.text(
            orden.fechaEmision ? orden.fechaEmision.toString().split("T")[0] : "",
            detailX + 30,
            detailY - 10
        );
        detailY += 3;
        doc.text("FECHA DE VENCIMIENTO:", detailX, detailY - 10);
        doc.text(
            orden.fechaVencimiento ? orden.fechaVencimiento.toString().split("T")[0] : "",
            detailX + 30,
            detailY - 10
        );

        let entregaY = detailY + 7;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("LUGAR DE ENTREGA Y CONDICIONES DE PAGO", detailX, entregaY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        entregaY += 4;
        doc.text(
            `Empresa: ${identidadLegal.razonSocial} - ${identidadLegal.nombreComercial}`,
            detailX,
            entregaY
        );
        entregaY += 3;
        doc.text("Direccion: vía 11, Juan Mina #4 100", detailX, entregaY);
        entregaY += 3;
        doc.text("Barranquilla, Atlántico", detailX, entregaY);
        entregaY += 3;
        doc.text(`CONDICION PAGO: ${getCondicionPagoText(orden.condicionPago) ?? ""}`, detailX, entregaY);
        entregaY += 3;
        doc.text(`PLAZO PAGO: ${orden.plazoPago} DIAS`, detailX, entregaY);
        entregaY += 3;
        doc.text(`PLAZO ENTREGA: ${orden.tiempoEntrega} DIAS`, detailX, entregaY);
        entregaY += 3;
        doc.text(
            `DIVISA: ${orden.divisa}${orden.divisa === "USD" ? ` - TRM: ${formatCOP(orden.trm, 2)}` : ""}`,
            detailX,
            entregaY
        );
        entregaY += 3;
        doc.text("CONDICION ENTREGA: PUESTA EN PLANTA", detailX, entregaY);

        let proveedorY = currentY - 22;
        const proveedorX = margin + 50;
        doc.setFont("helvetica", "bold");
        doc.text("INFORMACION PROVEEDOR", proveedorX, proveedorY);
        doc.setFont("helvetica", "normal");
        proveedorY += 3;
        doc.text(orden.proveedor.nombre, proveedorX, proveedorY);
        proveedorY += 3;
        doc.text(`NIT: ${orden.proveedor.id}`, proveedorX, proveedorY);
        proveedorY += 3;
        doc.text(orden.proveedor.departamento, proveedorX, proveedorY);
        proveedorY += 3;
        doc.text(orden.proveedor.direccion, proveedorX, proveedorY);
        proveedorY += 3;
        doc.text(orden.proveedor.ciudad, proveedorX, proveedorY);
        proveedorY += 3;
        doc.text(getRegimenTributario(orden.proveedor.regimenTributario) ?? "", proveedorX, proveedorY);

        let topNotesStartY = Math.max(detailY, entregaY, proveedorY) + 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("INFORMACION IMPORTANTE:", margin, topNotesStartY);
        doc.setFont("helvetica", "normal");

        const importantNotes = [
            "Los materiales entregados estarán sujetos a inspección y verificación antes de ser aceptados.",
            "Los materiales deben ser entregados en la dirección vía 11, Juan Mina #4 100.",
            "Horario de entrega: lunes a viernes de 9:00 a 11:00 y de 14:00 a 15:30.",
            "Cualquier material que no cumpla con las especificaciones será rechazado.",
            "El proveedor será responsable de los costos de devolución.",
            "No se aceptarán entregas parciales.",
            "El proveedor debe notificar el horario de entrega y enviar la guía de despacho correspondiente.",
        ];
        importantNotes.forEach((note) => {
            topNotesStartY += 4;
            doc.text(`- ${note}`, margin, topNotesStartY);
        });

        const tableStartY = topNotesStartY + 10;
        const tableColumns = ["CODIGO", "DESCRIPCION", "CANTIDAD", "PRECIO UNITARIO", "SUBTOTAL"];
        const tableRows = orden.itemsOrdenCompra.map((item: ItemOrdenCompraActivo) => [
            item.itemOrdenId?.toString() ?? "",
            item.nombre,
            item.cantidad,
            formatCOP(item.precioUnitario, 2),
            formatCOP(item.subTotal),
        ]);
        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: tableStartY,
            styles: {
                fontSize: 9,
                halign: "center",
                valign: "middle",
            },
            headStyles: { fillColor: [255, 192, 203] },
            theme: "grid",
        });

        const finalY = doc.lastAutoTable?.finalY ?? tableStartY;
        let totalsY = finalY + 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Sub Total: ${formatCOP(orden.subTotal)}`, margin, totalsY);
        totalsY += 5;
        doc.text(`IVA: ${formatCOP(orden.iva)}`, margin, totalsY);
        totalsY += 5;
        doc.text(`Total Pagar: ${formatCOP(orden.totalPagar)}`, margin, totalsY);

        const leyenda =
            "SEÑOR PROVEEDOR: CUANDO ENTREGUE LOS MATERIALES SOLICITADOS, ESTOS DEBEN IR ACOMPAÑADOS DE UN DOCUMENTO QUE INDIQUE EL NÚMERO DE ESTA ORDEN. LAS CANTIDADES Y PRECIOS APROBADOS SON LOS DESCRITOS EN ESTE DOCUMENTO.";
        totalsY += 5;
        const leyendaLines = doc.splitTextToSize(leyenda, 190);
        doc.text(leyendaLines, margin, totalsY);
        totalsY += leyendaLines.length * 4;

        doc.setFont("helvetica", "bold");
        doc.text("OBSERVACIONES", margin, totalsY);
        totalsY += 5;
        doc.setFont("helvetica", "normal");
        const obsLines = doc.splitTextToSize(orden.observaciones ?? "", 190);
        doc.text(obsLines, margin, totalsY);

        return doc;
    }

    private async resolveBranding(
        orden: OrdenCompraActivo,
        empresaIdentidadLegal: EmpresaIdentidadDocumento | undefined,
        options: OcafPdfOptions
    ): Promise<{ identidadLegal: EmpresaIdentidadDocumento; logoDataUrl: string }> {
        if (options.logoDataUrl) {
            const identidadLegal = empresaIdentidadLegal ?? orden.empresaIdentidadLegalVersion;
            if (!identidadLegal) {
                throw new Error("No se definió la identidad legal para generar la OCA.");
            }
            return { identidadLegal, logoDataUrl: options.logoDataUrl };
        }

        if (options.logoVersionId) {
            const identidadLegal = empresaIdentidadLegal ?? orden.empresaIdentidadLegalVersion;
            if (!identidadLegal) {
                throw new Error("No se definió la identidad legal asociada a la OCA.");
            }
            return {
                identidadLegal,
                logoDataUrl: await getEmpresaLogoVersionDataUrl(options.logoVersionId),
            };
        }

        const identidadHistorica = orden.empresaIdentidadLegalVersion;
        const logoHistorico = orden.empresaLogoDocumentalVersion;
        if (identidadHistorica || logoHistorico) {
            if (!identidadHistorica || !logoHistorico?.id) {
                throw new Error("La OCA tiene una asociación documental histórica incompleta.");
            }
            return {
                identidadLegal: identidadHistorica,
                logoDataUrl: await getEmpresaLogoVersionDataUrl(logoHistorico.id),
            };
        }

        if (orden.estado >= 2) {
            throw new Error("La OCA emitida no tiene una identidad documental histórica asociada.");
        }
        if (orden.estado === -1) {
            throw new Error("No se genera PDF para una OCA cancelada.");
        }

        const vigente = await getEmpresaBrandingDocumentalVigente();
        return {
            identidadLegal: vigente.identidadLegal,
            logoDataUrl: vigente.logoDataUrl,
        };
    }
}
