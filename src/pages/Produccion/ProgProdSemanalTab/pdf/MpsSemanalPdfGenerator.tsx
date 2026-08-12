import jsPDF from "jspdf";
import { autoTable, type Table } from "jspdf-autotable";
import { getEmpresaBrandingDocumentalVigente } from "../../../../api/EmpresaIdentidadDocumentalApi";
import { addContainedPng } from "../../../../utils/pdfBranding";
import type { MpsSemanalDraftDTO } from "../MpsSemanalService";
import {
    buildMpsSemanalPdfRows,
    buildMpsSemanalPdfFileName,
    formatMpsPdfNumber,
    formatMpsEstadoLabel,
    formatMpsPdfDate,
    formatMpsPdfDateTime,
    getMpsSemanaPdfLabel,
} from "./mpsSemanalPdf.utils";

interface JsPdfWithAutoTable extends jsPDF {
    lastAutoTable?: Table;
}

class MpsSemanalPdfGenerator {
    public async downloadMpsSemanalPdf(mps: MpsSemanalDraftDTO): Promise<void> {
        const doc = await this.generatePdf(mps);
        doc.save(buildMpsSemanalPdfFileName(mps));
    }

    public async getMpsSemanalPdfBlob(mps: MpsSemanalDraftDTO): Promise<Blob> {
        const doc = await this.generatePdf(mps);
        return doc.output("blob");
    }

    private async generatePdf(mps: MpsSemanalDraftDTO): Promise<JsPdfWithAutoTable> {
        const branding = await getEmpresaBrandingDocumentalVigente();
        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }) as JsPdfWithAutoTable;
        const margin = 12;
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = margin;

        addContainedPng(doc, branding.logoDataUrl, margin, currentY, 25, 20);

        const titleX = margin + 32;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("Programacion Produccion (Semanal) - MPS", titleX, currentY + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Generado: ${formatMpsPdfDateTime()}`, titleX, currentY + 12);
        doc.text(`Semana ${getMpsSemanaPdfLabel(mps)}: ${formatMpsPdfDate(mps.weekStartDate)} a ${formatMpsPdfDate(mps.weekEndDate)}`, titleX, currentY + 17);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`MPS #${mps.mpsId}`, pageWidth - margin, currentY + 6, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Estado: ${formatMpsEstadoLabel(mps.estado)}`, pageWidth - margin, currentY + 12, { align: "right" });
        doc.text(`ODPs: ${formatMpsPdfNumber(mps.totalOdpsGeneradas)} / ${formatMpsPdfNumber(mps.totalLotesPlanificados)}`, pageWidth - margin, currentY + 17, { align: "right" });

        currentY += 26;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Programacion semanal", margin, currentY);
        currentY += 4;

        const head = [["Entrega", "Terminado", "Categoria", "Lotes", "Unidades", "Lanz. / Entrega", "Lotes planificados", "Observacion"]];
        const body = buildMpsSemanalPdfRows(mps);

        autoTable(doc, {
            startY: currentY,
            head,
            body,
            theme: "grid",
            margin: { left: margin, right: margin },
            styles: { fontSize: 6.5, valign: "top", cellPadding: 1.6 },
            headStyles: { fillColor: [31, 151, 148], textColor: 255, halign: "center" },
            columnStyles: {
                0: { cellWidth: 24, fontStyle: "bold" },
                1: { cellWidth: 48 },
                2: { cellWidth: 32 },
                3: { cellWidth: 18, halign: "right" },
                4: { cellWidth: 22, halign: "right" },
                5: { cellWidth: 30 },
                6: { cellWidth: 76 },
                7: { cellWidth: 28 },
            },
            didDrawPage: () => {
                const pageCount = doc.getNumberOfPages();
                const pageHeight = doc.internal.pageSize.getHeight();
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.text(`Pagina ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" });
            },
        });

        return doc;
    }
}

const mpsSemanalPdfGenerator = new MpsSemanalPdfGenerator();

export function downloadMpsSemanalPdf(mps: MpsSemanalDraftDTO): Promise<void> {
    return mpsSemanalPdfGenerator.downloadMpsSemanalPdf(mps);
}

export function getMpsSemanalPdfBlob(mps: MpsSemanalDraftDTO): Promise<Blob> {
    return mpsSemanalPdfGenerator.getMpsSemanalPdfBlob(mps);
}

export default MpsSemanalPdfGenerator;
