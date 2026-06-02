import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MpsSemanalDraftDTO } from "../../PlaneacionProduccionTab/PlaneacionProduccionService";
import {
    MPS_WEEK_DAY_LABELS,
    buildMpsCalendarPdfRows,
    buildMpsSemanalPdfFileName,
    formatMpsEstadoLabel,
    formatMpsPdfDate,
    formatMpsPdfDateTime,
} from "./mpsSemanalPdf.utils";

interface AutoTableProperties {
    finalY: number;
}

interface JsPdfWithAutoTable extends jsPDF {
    lastAutoTable?: AutoTableProperties;
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
        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }) as JsPdfWithAutoTable;
        const margin = 12;
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = margin;

        const logoBase64 = await this.getImageBase64("/logo_exotic.png");
        if (logoBase64) {
            doc.addImage(logoBase64, "PNG", margin, currentY, 25, 20);
        }

        const titleX = logoBase64 ? margin + 32 : margin;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("Programacion Produccion (Semanal) - MPS", titleX, currentY + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Generado: ${formatMpsPdfDateTime()}`, titleX, currentY + 12);
        doc.text(`Semana: ${formatMpsPdfDate(mps.weekStartDate)} a ${formatMpsPdfDate(mps.weekEndDate)}`, titleX, currentY + 17);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`MPS #${mps.mpsId}`, pageWidth - margin, currentY + 6, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Estado: ${formatMpsEstadoLabel(mps.estado)}`, pageWidth - margin, currentY + 12, { align: "right" });
        doc.text(`ODPs: ${mps.fechaGeneracionOdps ? "Generadas" : "No generadas"}`, pageWidth - margin, currentY + 17, { align: "right" });

        currentY += 26;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Calendario semanal", margin, currentY);
        currentY += 4;

        const head = [["Categoria / Pool", ...MPS_WEEK_DAY_LABELS]];
        const body = buildMpsCalendarPdfRows(mps);

        autoTable(doc, {
            startY: currentY,
            head,
            body,
            theme: "grid",
            margin: { left: margin, right: margin },
            styles: { fontSize: 6.5, valign: "top", cellPadding: 1.6 },
            headStyles: { fillColor: [31, 151, 148], textColor: 255, halign: "center" },
            columnStyles: {
                0: { cellWidth: 34, fontStyle: "bold" },
                1: { cellWidth: 38 },
                2: { cellWidth: 38 },
                3: { cellWidth: 38 },
                4: { cellWidth: 38 },
                5: { cellWidth: 38 },
                6: { cellWidth: 38 },
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

    private async getImageBase64(url: string): Promise<string | null> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                return null;
            }
            const blob = await response.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch {
            return null;
        }
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
