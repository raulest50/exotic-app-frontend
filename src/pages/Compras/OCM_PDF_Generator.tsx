import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    getCondicionPagoText,
    getRegimenTributario,
    OrdenCompraMateriales,
    ItemOrdenCompra,
    DIVISAS,
} from "./types";
import { formatCOP, formatCurrency } from "../../utils/formatters";
import { OrdenCompraActivo, ItemOrdenCompraActivo } from "../ActivosFijos/types";
import {
    getEmpresaIdentidadLegalVigente,
    type EmpresaIdentidadLegalVersion,
} from "../../api/EmpresaIdentidadLegalApi";

// Extend jsPDF with properties added by jsPDF-AutoTable
interface AutoTableProperties {
    finalY: number;
}

interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable?: AutoTableProperties;
}

export default class OCM_PDF_Generator {
    /**
     * Generates the PDF file for the given OrdenCompra-Materiales (OCM) and triggers its download.
     * @param orden the order data to populate the PDF with.
     */
    private async generatePDF_OCM(
        orden: OrdenCompraMateriales,
        empresaIdentidadLegal?: EmpresaIdentidadLegalVersion
    ): Promise<jsPDFWithAutoTable> {
        const identidadLegal = await this.resolveEmpresaIdentidadLegal(orden, empresaIdentidadLegal);
        // Create a new jsPDF instance (A4 size, mm units) and cast to our extended interface
        const doc = new jsPDF({ unit: "mm", format: "a4" }) as jsPDFWithAutoTable;
        const margin = 10;
        let currentY = margin;

        // --- Logo Section ---
        // Fetch logo image as base64 and add it at top-left
        let logoBase64: string | null = null;
        try {
            logoBase64 = await this.getImageBase64("/logo_exotic.png");
        } catch (error) {
            console.error("Error fetching logo image", error);
        }
        if (logoBase64) {
            // Reduce the size of the logo; here it is set to half the original size (25mm x 20mm)
            doc.addImage(logoBase64, "PNG", margin, currentY, 25, 20);
        }

        // --- Header Title ---
        // Place "ORDEN DE COMPRA" in a prominent position
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14); // Reduced font size
        // Center the title (adjust x and y as needed)
        doc.text("ORDEN DE COMPRA NUMERO: ", 90, currentY + 6, { align: "center" });
        doc.text(orden.ordenCompraId ? orden.ordenCompraId.toString() : "", 130, currentY + 6);


        // --- Napolitana Company Info ---
        // Reduce vertical spacing and font sizes in this section
        currentY += 25; // reduced spacing below the logo
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7); // smaller font size
        doc.text(identidadLegal.razonSocial, margin, currentY);
        currentY += 4;
        doc.text(this.formatIdentificacion(identidadLegal), margin, currentY);
        currentY += 4;
        doc.text(`Tel: ${identidadLegal.telefonoPrincipal}`, margin, currentY);
        currentY += 4;
        doc.text(identidadLegal.emailPrincipal, margin, currentY);

        // --- Order Details ---
        const detailX = 140; // starting x for details on the right side
        let detailY = margin + 5 ; // starting y for details; reduced spacing
        doc.setFontSize(6);
        doc.text("FECHA EMISION:", detailX, detailY-10);
        doc.text(
            orden.fechaEmision ? orden.fechaEmision.toString().split("T")[0] : "",
            detailX + 30,
            detailY - 10
        );
        detailY += 3;
        doc.text("FECHA DE VENCIMIENTO:", detailX, detailY-10);
        doc.text(
            orden.fechaVencimiento ? orden.fechaVencimiento.toString().split("T")[0] : "",
            detailX + 30,
            detailY - 10
        );

        // detailY += 3;
        // doc.text("NUMERO DE ORDEN DE COMPRA:", detailX, detailY);
        // doc.text(
        //     orden.ordenCompraId ? orden.ordenCompraId.toString() : "",
        //     detailX + 40,
        //     detailY
        // );

        // --- Lugar de Entrega y Condiciones de Pago ---
        let entregaY = detailY + 7;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("LUGAR DE ENTREGA Y CONDICIONES DE PAGO", detailX, entregaY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        entregaY += 4;
        doc.text(`Empresa: ${identidadLegal.razonSocial} - ${identidadLegal.nombreComercial}`, detailX, entregaY);
        entregaY += 3;
        doc.text("Direccion: vía 11, Juan Mina #4 100", detailX, entregaY);
        entregaY += 3;
        doc.text("Barranquilla, Atlántico", detailX, entregaY);
        entregaY += 3;
        doc.text(`CONDICION PAGO: ${getCondicionPagoText(orden.condicionPago)}`, detailX, entregaY);
        entregaY += 3;
        doc.text(`PLAZO PAGO ${orden.plazoPago} DIAS`, detailX, entregaY);
        entregaY += 3;
        doc.text(`PLAZO ENTREGA ${orden.tiempoEntrega} DIAS`, detailX, entregaY);
        entregaY += 3;
        if (orden.divisas && orden.divisas !== DIVISAS.COP) {
            const trmText = orden.trm ? ` - TRM: ${formatCurrency(orden.trm, DIVISAS.COP, 2)}` : '';
            doc.text(`DIVISA: ${orden.divisas}${trmText}`, detailX, entregaY);
            entregaY += 3;
        }
        doc.text("CONDICION ENTREGA: PUESTA EN PLANTA", detailX, entregaY);



        // --- Proveedor Information ---
        let proveedorY = currentY + 10 - 32; // start a bit lower than the Napolitana info
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

        // --- Items Table ---
        // Determine the starting y-coordinate for the table
        //const tableStartY = Math.max(detailY, entregaY, proveedorY) + 5;
        let topNotesStartY = Math.max(detailY, entregaY, proveedorY) + 10;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("INFORMACION IMPORTANTE:", 10, topNotesStartY);
        doc.setFont("helvetica", "normal");
        topNotesStartY += 4;
        doc.text("- los materiales entregados estarán sujetos a inspección y verificación por parte del Personal designado de la empresa antes de ser aceptados.", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- los matriales deben ser entregados en la direcccion vía 11, Juan Mina #4 100", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- Horario de entrega: lunes a viernes de 9:00 a 11:00. y de 14:00 a 15:30", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- Cualquier material que no cumpla con las especificaciones será rechazado.", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- El proveedor será responsablede los costos de devolucion", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- No se aceptarán entregas parciales", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- El proveedor debe notificar el horario de entrega de los materiales solicitados  y enviar la guía de despacho correspondiente", 10, topNotesStartY);


        const tableStartY = topNotesStartY + 10;

        // const topNote = "los materiales entregados estarán sujetos a inspección y verificación por parte del Personal designado de la empresa antes de ser aceptados.";
        // let topNotesTotalsY = 5;
        // const topNoteLines = doc.splitTextToSize(topNote, 190);
        // doc.text(topNoteLines, margin, topNotesTotalsY);
        // topNotesTotalsY += topNoteLines.length * 4;



        const tableColumns = ["CODIGO", "DESCRIPCION", "CANTIDAD", "PRECIO UNITARIO", "SUBTOTAL"];
        const currency = orden.divisas ?? DIVISAS.COP;
        const tableRows = orden.itemsOrdenCompra.map((item: ItemOrdenCompra) => [
            item.material.productoId,
            item.material.nombre,
            item.cantidad,
            formatCurrency(item.precioUnitario, currency, 2),
            formatCurrency(item.subTotal, currency)
        ]);
        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: tableStartY,
            styles: {
                fontSize: 9,
                halign: 'center',
                valign: 'middle',
            },
            headStyles: { fillColor: [255, 192, 203] }, // Soft pink header fill
            theme: "grid",
        });

        // --- Totals ---
        const finalY = doc.lastAutoTable?.finalY ?? tableStartY;
        let totalsY = finalY + 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Sub Total: ${formatCurrency(orden.subTotal, currency)}`, margin, totalsY);
        totalsY += 5;
        doc.text(`IVA: ${formatCurrency(orden.ivaCOP, currency)}`, margin, totalsY);
        totalsY += 5;
        doc.text(`Total Pagar: ${formatCurrency(orden.totalPagar, currency)}`, margin, totalsY);


        // --- Leyenda ---
        const leyenda =
            "SEÑOR PROVEEDOR CUANDO ENTREGUE LOS MATERIALES SOLICITADOS ESTOS DEBEN IR ACOMPAÑADOS DE UN DOCUMENTO QUE INDIQUE EL NUMERO DE ESTA ORDEN. LAS CANTIDADES SOLICITADAS Y PRECIOS SON LOS QUE HAN SIDO APROBADOS Y DESCRITOS EN ESE DOCUMENTO. SEÑOR PROVEEDOR, POR FAVOR ENVIAR, JUNTO CON LA MERCANCÍA DESPACHADA, EL CERTIFICADO DE ANÁLISIS CORRESPONDIENTE A CADA LOTE RECIBIDO.";
        totalsY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const leyendaLines = doc.splitTextToSize(leyenda, 190);
        doc.text(leyendaLines, margin, totalsY);
        totalsY += leyendaLines.length * 4;

        // --- Observaciones ---
        doc.setFont("helvetica", "bold");
        doc.text("OBSERVACIONES", margin, totalsY);
        totalsY += 5;
        doc.setFont("helvetica", "normal");
        const obs = orden.observaciones ? orden.observaciones : "";
        const obsLines = doc.splitTextToSize(obs, 190);
        doc.text(obsLines, margin, totalsY);
        totalsY += obsLines.length * 4;

        // --- Trigger Download ---
        //doc.save(`orden-compra-${orden.ordenCompraId}.pdf`);
        //return doc.output("blob");
        return doc;
    }

    /**
     * hace trigger de descarga del pdf de OCM
     * @param orden
     */
    public async downloadPDF_OCM(
        orden:OrdenCompraMateriales,
        empresaIdentidadLegal?: EmpresaIdentidadLegalVersion
    ):Promise<void>{
        const doc = await this.generatePDF_OCM(orden, empresaIdentidadLegal);
        doc.save(`orden-compra-${orden.ordenCompraId}.pdf`);
    }

    /**
     * genera un Blob del OCMpdf para enviar a backend para
     * ser adjuntado a correo proveedor.
     * @param orden
     */
    public async getOCMpdf_Blob(
        orden:OrdenCompraMateriales,
        empresaIdentidadLegal?: EmpresaIdentidadLegalVersion
    ):Promise<Blob>{
        const doc = await this.generatePDF_OCM(orden, empresaIdentidadLegal);
        return doc.output("blob");
    }

    private async resolveEmpresaIdentidadLegal(
        orden: OrdenCompraMateriales,
        empresaIdentidadLegal?: EmpresaIdentidadLegalVersion
    ): Promise<EmpresaIdentidadLegalVersion> {
        if (empresaIdentidadLegal) {
            return empresaIdentidadLegal;
        }
        if (orden.empresaIdentidadLegalVersion) {
            return orden.empresaIdentidadLegalVersion;
        }
        return getEmpresaIdentidadLegalVigente();
    }

    private formatIdentificacion(identidadLegal: EmpresaIdentidadLegalVersion): string {
        const digitoVerificacion = identidadLegal.digitoVerificacion?.trim();
        const numero = digitoVerificacion
            ? `${identidadLegal.numeroIdentificacion}-${digitoVerificacion}`
            : identidadLegal.numeroIdentificacion;
        return `${identidadLegal.tipoIdentificacion}: ${numero}`;
    }

    /**
     * Genera un PDF para una orden de compra de activos fijos
     * @param orden La orden de compra de activos fijos
     */
    public async generatePDF_OCA(orden: OrdenCompraActivo): Promise<void> {
        // Create a new jsPDF instance (A4 size, mm units) and cast to our extended interface
        const doc = new jsPDF({ unit: "mm", format: "a4" }) as jsPDFWithAutoTable;
        const margin = 10;
        let currentY = margin;

        // --- Logo Section ---
        // Fetch logo image as base64 and add it at top-left
        let logoBase64: string | null = null;
        try {
            logoBase64 = await this.getImageBase64("/logo_exotic.png");
        } catch (error) {
            console.error("Error fetching logo image", error);
        }
        if (logoBase64) {
            // Reduce the size of the logo; here it is set to half the original size (25mm x 20mm)
            doc.addImage(logoBase64, "PNG", margin, currentY, 25, 20);
        }

        // --- Header Title ---
        // Place "ORDEN DE COMPRA" in a prominent position
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14); // Reduced font size
        // Center the title (adjust x and y as needed)
        doc.text("ORDEN DE COMPRA NUMERO: ", 90, currentY + 6, { align: "center" });
        doc.text(orden.ordenCompraActivoId ? orden.ordenCompraActivoId.toString() : "", 130, currentY + 6);


        // --- Napolitana Company Info ---
        // Reduce vertical spacing and font sizes in this section
        currentY += 25; // reduced spacing below the logo
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7); // smaller font size
        doc.text("Napolitana J.P S.A.S.", margin, currentY);
        currentY += 4;
        doc.text("Nit: 901751897-1", margin, currentY);
        currentY += 4;
        doc.text("Tel: 301 711 51 81", margin, currentY);
        currentY += 4;
        doc.text("produccion.exotic@gmail.com", margin, currentY);

        // --- Order Details ---
        const detailX = 140; // starting x for details on the right side
        let detailY = margin + 5 ; // starting y for details; reduced spacing
        doc.setFontSize(6);
        doc.text("FECHA EMISION:", detailX, detailY-10);
        doc.text(
            orden.fechaEmision ? orden.fechaEmision.toString().split("T")[0] : "",
            detailX + 30,
            detailY - 10
        );
        detailY += 3;
        doc.text("FECHA DE VENCIMIENTO:", detailX, detailY-10);
        doc.text(
            orden.fechaVencimiento ? orden.fechaVencimiento.toString().split("T")[0] : "",
            detailX + 30,
            detailY - 10
        );

        // detailY += 3;
        // doc.text("NUMERO DE ORDEN DE COMPRA:", detailX, detailY);
        // doc.text(
        //     orden.ordenCompraId ? orden.ordenCompraId.toString() : "",
        //     detailX + 40,
        //     detailY
        // );

        // --- Lugar de Entrega y Condiciones de Pago ---
        let entregaY = detailY + 7;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("LUGAR DE ENTREGA Y CONDICIONES DE PAGO", detailX, entregaY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        entregaY += 4;
        doc.text("Empresa: Napolitana JP S.A.S - EXOTIC EXPERT", detailX, entregaY);
        entregaY += 3;
        doc.text("Direccion: vía 11, Juan Mina #4 100", detailX, entregaY);
        entregaY += 3;
        doc.text("Barranquilla, Atlántico", detailX, entregaY);
        entregaY += 3;
        doc.text(`CONDICION PAGO: ${getCondicionPagoText(orden.condicionPago)}`, detailX, entregaY);
        entregaY += 3;
        doc.text(`PLAZO PAGO: ${orden.plazoPago} DIAS`, detailX, entregaY);
        entregaY += 3;
        doc.text(`PLAZO ENTREGA: ${orden.tiempoEntrega} DIAS`, detailX, entregaY);
        entregaY += 3;
        doc.text(`DIVISA: ${orden.divisa}${orden.divisa === 'USD' ? ` - TRM: ${formatCOP(orden.trm, 2)}` : ''}`, detailX, entregaY);
        entregaY += 3;
        doc.text("CONDICION ENTREGA: PUESTA EN PLANTA", detailX, entregaY);



        // --- Proveedor Information ---
        let proveedorY = currentY + 10 - 32; // start a bit lower than the Napolitana info
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

        // --- Items Table ---
        // Determine the starting y-coordinate for the table
        //const tableStartY = Math.max(detailY, entregaY, proveedorY) + 5;
        let topNotesStartY = Math.max(detailY, entregaY, proveedorY) + 10;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("INFORMACION IMPORTANTE:", 10, topNotesStartY);
        doc.setFont("helvetica", "normal");
        topNotesStartY += 4;
        doc.text("- los materiales entregados estarán sujetos a inspección y verificación por parte del Personal designado de la empresa antes de ser aceptados.", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- los matriales deben ser entregados en la direcccion vía 11, Juan Mina #4 100", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- Horario de entrega: lunes a viernes de 9:00 a 11:00. y de 14:00 a 15:30", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- Cualquier material que no cumpla con las especificaciones será rechazado.", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- El proveedor será responsablede los costos de devolucion", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- No se aceptarán entregas parciales", 10, topNotesStartY);
        topNotesStartY += 4;
        doc.text("- El proveedor debe notificar el horario de entrega de los materiales solicitados  y enviar la guía de despacho correspondiente", 10, topNotesStartY);


        const tableStartY = topNotesStartY + 10;

        // const topNote = "los materiales entregados estarán sujetos a inspección y verificación por parte del Personal designado de la empresa antes de ser aceptados.";
        // let topNotesTotalsY = 5;
        // const topNoteLines = doc.splitTextToSize(topNote, 190);
        // doc.text(topNoteLines, margin, topNotesTotalsY);
        // topNotesTotalsY += topNoteLines.length * 4;



        const tableColumns = ["CODIGO", "DESCRIPCION", "CANTIDAD", "PRECIO UNITARIO", "SUBTOTAL"];
        const tableRows = orden.itemsOrdenCompra.map((item: ItemOrdenCompraActivo) => [
            item.itemOrdenId?.toString() || "",
            item.nombre,
            item.cantidad,
            formatCOP(item.precioUnitario, 2),
            formatCOP(item.subTotal)
        ]);
        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: tableStartY,
            styles: {
                fontSize: 9,
                halign: 'center',
                valign: 'middle',
            },
            headStyles: { fillColor: [255, 192, 203] }, // Soft pink header fill
            theme: "grid",
        });

        // --- Totals ---
        const finalY = doc.lastAutoTable?.finalY ?? tableStartY;
        let totalsY = finalY + 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Sub Total: ${formatCOP(orden.subTotal)}`, margin, totalsY);
        totalsY += 5;
        doc.text(`IVA: ${formatCOP(orden.iva)}`, margin, totalsY);
        totalsY += 5;
        doc.text(`Total Pagar: ${formatCOP(orden.totalPagar)}`, margin, totalsY);


        // --- Leyenda ---
        const leyenda =
            "SEÑOR PROVEEDOR CUANDO ENTREGUE LOS MATERIALES SOLICITADOS ESTOS DEBEN IR ACOMPAÑADOS DE UN DOCUMENTO QUE INDIQUE EL NUMERO DE ESTA ORDEN. LAS CANTIDADES SOLICITDAS Y PRECIOS SON LOS QUE HAN SIDO APROBADOS Y DESCRITOS EN ESE DOCUMENTO.";
        totalsY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const leyendaLines = doc.splitTextToSize(leyenda, 190);
        doc.text(leyendaLines, margin, totalsY);
        totalsY += leyendaLines.length * 4;

        // --- Observaciones ---
        doc.setFont("helvetica", "bold");
        doc.text("OBSERVACIONES", margin, totalsY);
        totalsY += 5;
        doc.setFont("helvetica", "normal");
        const obs = orden.observaciones ? orden.observaciones : "";
        const obsLines = doc.splitTextToSize(obs, 190);
        doc.text(obsLines, margin, totalsY);
        totalsY += obsLines.length * 4;

        // --- Trigger Download ---
        doc.save(`orden-compra-${orden.ordenCompraActivoId}.pdf`);
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
