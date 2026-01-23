import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF with properties added by jsPDF-AutoTable
interface AutoTableProperties {
    finalY: number;
}

interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable?: AutoTableProperties;
}

/**
 * Clase para encapsular los métodos necesarios para generar cualquier
 * documento PDF necesario en el tab de dispensación en el módulo de
 * transacciones de almacén.
 */
export default class DispensacionPDF_Generator {
    /**
     * Genera el PDF de una dispensación de materiales.
     * 
     * @param ordenProduccionId ID de la orden de producción
     * @param ordenProduccionInfo Información básica de la orden (producto, fecha)
     * @param items Lista de items a dispensar
     * @param usuariosRealizadores Lista de usuarios que realizan la dispensación
     * @param usuarioAprobador Usuario que aprueba la dispensación (puede ser null)
     * @param observaciones Observaciones adicionales (opcional)
     * @param esBorrador Si es true, añade marca de agua "BORRADOR" al PDF (opcional)
     * @returns Promise con el documento PDF generado
     */
    public async generatePDF_Dispensacion(
        ordenProduccionId: number,
        ordenProduccionInfo: { productoNombre?: string; fechaCreacion?: string },
        items: Array<{
            productoId: string;
            productoNombre: string;
            loteBatch?: string;
            cantidad: number;
            unidad: string;
            fechaVencimiento?: string;
        }>,
        usuariosRealizadores: Array<{ id: number; nombreCompleto?: string; username: string }>,
        usuarioAprobador: { id: number; nombreCompleto?: string; username: string } | null,
        observaciones?: string,
        esBorrador?: boolean
    ): Promise<jsPDFWithAutoTable> {
        // Create a new jsPDF instance (A4 size, mm units)
        const doc = new jsPDF({ unit: "mm", format: "a4" }) as jsPDFWithAutoTable;
        const margin = 10;
        let currentY = margin;

        // --- Logo Section ---
        let logoBase64: string | null = null;
        try {
            logoBase64 = await this.getImageBase64("/logo_exotic.png");
        } catch (error) {
            console.error("Error fetching logo image", error);
        }
        if (logoBase64) {
            doc.addImage(logoBase64, "PNG", margin, currentY, 25, 20);
        }

        // --- Header Title ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("DISPENSACIÓN DE MATERIALES", 105, currentY + 25, { align: "center" });
        
        // --- Borrador annotation in header if esBorrador is true ---
        if (esBorrador === true) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.setTextColor(255, 0, 0); // Red color
            doc.text("BORRADOR", 105, currentY + 35, { align: "center" });
            doc.setTextColor(0, 0, 0); // Reset to black
        }
        
        currentY += 28; // Título en Y=35, espacio 8, siguiente sección en Y=43

        // --- Company Info ---
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("Napolitana J.P S.A.S.", margin, currentY);
        currentY += 4;
        doc.text("Nit: 901751897-1", margin, currentY);
        currentY += 4;
        doc.text("Tel: 301 711 51 81", margin, currentY);
        currentY += 4;
        doc.text("produccion.exotic@gmail.com", margin, currentY);
        currentY += 8;

        // --- Order Information ---
        const detailX = 140;
        let detailY = currentY; // Alineado con info empresa (43mm)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("INFORMACIÓN DE LA ORDEN", detailX, detailY);
        detailY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Orden de Producción ID:", detailX, detailY);
        doc.text(ordenProduccionId.toString(), detailX + 45, detailY);
        detailY += 5;
        if (ordenProduccionInfo.productoNombre) {
            doc.text("Producto:", detailX, detailY);
            doc.text(ordenProduccionInfo.productoNombre, detailX + 20, detailY);
            detailY += 5;
        }
        if (ordenProduccionInfo.fechaCreacion) {
            const fecha = new Date(ordenProduccionInfo.fechaCreacion).toLocaleDateString('es-CO');
            doc.text("Fecha:", detailX, detailY);
            doc.text(fecha, detailX + 15, detailY);
        }

        // --- Table of Items ---
        currentY = Math.max(currentY, detailY) + 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("MATERIALES A DISPENSAR", margin, currentY);
        currentY += 5;

        // Prepare table data
        const tableData = items.map(item => [
            item.productoId,
            item.productoNombre || 'N/A',
            item.loteBatch || 'N/A',
            item.cantidad.toFixed(2),
            item.unidad,
            item.fechaVencimiento ? new Date(item.fechaVencimiento).toLocaleDateString('es-CO') : 'N/A'
        ]);

        // Generate table using autoTable
        autoTable(doc, {
            startY: currentY,
            head: [['ID Material', 'Nombre Material', 'Lote (Batch)', 'Cantidad', 'Unidad', 'Fecha Vencimiento']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 128, 128], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 20 },  // ID Material (reducido para que quepa)
                1: { cellWidth: 45 },  // Nombre Material (reducido)
                2: { cellWidth: 25 },  // Lote (reducido)
                3: { cellWidth: 20, halign: 'right' },  // Cantidad
                4: { cellWidth: 18 },  // Unidad (reducido)
                5: { cellWidth: 25 }   // Fecha Vencimiento (reducido)
            },
            margin: { left: margin, right: margin }
        });

        const finalY = doc.lastAutoTable?.finalY ?? currentY;
        currentY = finalY + 10;

        // --- Users Section ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("USUARIOS", margin, currentY);
        currentY += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        if (usuariosRealizadores && usuariosRealizadores.length > 0) {
            doc.text("Realizado por:", margin, currentY);
            currentY += 5;
            usuariosRealizadores.forEach(usuario => {
                const nombre = usuario.nombreCompleto || usuario.username;
                doc.text(`  • ${nombre} (${usuario.username})`, margin + 5, currentY);
                currentY += 4;
            });
            currentY += 2;
        }

        if (usuarioAprobador) {
            const nombreAprobador = usuarioAprobador.nombreCompleto || usuarioAprobador.username;
            doc.text("Aprobado por:", margin, currentY);
            currentY += 5;
            doc.text(`  ${nombreAprobador} (${usuarioAprobador.username})`, margin + 5, currentY);
            currentY += 6;
        }

        // --- Observaciones ---
        if (observaciones) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("OBSERVACIONES", margin, currentY);
            currentY += 5;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            const obsLines = doc.splitTextToSize(observaciones, 190);
            doc.text(obsLines, margin, currentY);
            currentY += obsLines.length * 4;
        }

        // --- Footer: Date and Time ---
        const now = new Date();
        const fechaHora = now.toLocaleString('es-CO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        currentY = 280; // Near bottom of page
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.text(`Documento generado el: ${fechaHora}`, margin, currentY, { align: "left" });

        // --- Watermark "BORRADOR" if esBorrador is true ---
        if (esBorrador === true) {
            // Draw watermark text in center of page (diagonal effect using multiple text calls)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(50);
            
            // Use a light gray color for watermark (simulating transparency)
            doc.setTextColor(200, 200, 200);
            
            // Calculate center of page (A4 = 210mm x 297mm)
            const centerX = 105;
            const centerY = 148.5;
            
            // Draw "BORRADOR" text centered (will appear as watermark)
            // Note: jsPDF doesn't support rotation directly, so we use centered text
            // For a more visible watermark, we can draw it multiple times slightly offset
            doc.text("BORRADOR", centerX, centerY, { align: "center" });
            
            // Draw additional text slightly offset for better visibility
            doc.text("BORRADOR", centerX, centerY + 5, { align: "center" });
            doc.text("BORRADOR", centerX, centerY - 5, { align: "center" });
            
            // Reset to black for any subsequent text
            doc.setTextColor(0, 0, 0);
        }

        return doc;
    }

    /**
     * Genera y descarga el PDF de una dispensación.
     * 
     * @param ordenProduccionId ID de la orden de producción
     * @param ordenProduccionInfo Información básica de la orden
     * @param items Lista de items a dispensar
     * @param usuariosRealizadores Lista de usuarios que realizan la dispensación
     * @param usuarioAprobador Usuario que aprueba la dispensación
     * @param observaciones Observaciones adicionales
     * @param esBorrador Si es true, añade marca de agua "BORRADOR" al PDF (opcional)
     */
    public async downloadPDF_Dispensacion(
        ordenProduccionId: number,
        ordenProduccionInfo: { productoNombre?: string; fechaCreacion?: string },
        items: Array<{
            productoId: string;
            productoNombre: string;
            loteBatch?: string;
            cantidad: number;
            unidad: string;
            fechaVencimiento?: string;
        }>,
        usuariosRealizadores: Array<{ id: number; nombreCompleto?: string; username: string }>,
        usuarioAprobador: { id: number; nombreCompleto?: string; username: string } | null,
        observaciones?: string,
        esBorrador?: boolean
    ): Promise<void> {
        const doc = await this.generatePDF_Dispensacion(
            ordenProduccionId,
            ordenProduccionInfo,
            items,
            usuariosRealizadores,
            usuarioAprobador,
            observaciones,
            esBorrador
        );
        const fecha = new Date().toISOString().split('T')[0];
        const suffix = esBorrador === true ? '-borrador' : '';
        doc.save(`dispensacion-op-${ordenProduccionId}-${fecha}${suffix}.pdf`);
    }

    /**
     * Helper method to fetch an image from a URL and convert it to a base64 string.
     * @param url the URL of the image.
     * @returns a Promise that resolves with the base64 string.
     */
    private async getImageBase64(url: string): Promise<string> {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === "string") {
                    resolve(reader.result);
                } else {
                    reject("Error converting image to base64.");
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}
