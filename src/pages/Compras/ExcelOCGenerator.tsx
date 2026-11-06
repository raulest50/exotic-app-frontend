// ExcelOCGenerator.ts
import ExcelJS from 'exceljs';
import { deploymentPath } from '../../utils/deploymentPaths';
import {getCondicionPagoText, getRegimenTributario, ItemOrdenCompra, OrdenCompraMateriales} from './types';

export class ExcelOCGenerator {
    /**
     * Generates an Excel file for the given OrdenCompra.
     * @param orden the order data to populate the file with.
     * @returns a Promise that resolves to a Uint8Array containing the Excel file.
     */
    public async generateExcel(orden: OrdenCompraMateriales): Promise<Uint8Array> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Orden Compra');

        // === Example: Header Section ===
        // Merge cells E1 to I3 and set the title "ORDEN DE COMPRA"
        worksheet.mergeCells('A1:B7'); // logo
        worksheet.getColumn('A').width = 21;
        worksheet.getColumn('B').width = 21;
        worksheet.getColumn('C').width = 12;
        worksheet.getColumn('D').width = 9;
        worksheet.getColumn('E').width = 14;
        worksheet.getColumn('F').width = 14;
        worksheet.getColumn('G').width = 14;
        worksheet.getColumn('H').width = 14;
        worksheet.getColumn('I').width = 32;


        const response = await fetch(deploymentPath('/logo_exotic.png'));
        const blob = await response.blob();
        const base64PNG = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject('Conversion to base64 failed');
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        const imageId = workbook.addImage({
            base64: base64PNG,
            extension: 'png',
        });
        worksheet.addImage(imageId, {
            tl: { col: 0.5, row: 0 }, // Position A1 (col: 0, row: 0)
            ext: { width: 170, height: 130 } // Set image dimensions
        });


        worksheet.mergeCells('A8:B8'); // napolitana razon social
        this.setPjuFormat(worksheet.getCell('A8'), "Napolitana J.P S.A.S.");

        worksheet.mergeCells('A9:B9'); // napolitana nit
        this.setPjuFormat(worksheet.getCell('A9'), "Nit: 901751897-1");


        worksheet.mergeCells('A10:B10'); // napolitana tel
        this.setPjuFormat(worksheet.getCell('A10'), "Tel: 301 711 51 81");

        worksheet.mergeCells('A11:B11'); // napolitana email
        this.setPjuFormat(worksheet.getCell('A11'), "jorgerafaelpereiraosorio1@gmail.com");


        worksheet.mergeCells('E1:I3');
        const headerCell = worksheet.getCell('E1');
        headerCell.value = 'ORDEN DE COMPRA';
        headerCell.font = {
            name: 'Artifakt Element Medium',
            size: 24,
            bold: true,
            color: { argb: 'FFE7268D' }
        };
        headerCell.alignment = { horizontal: 'center', vertical: 'middle' };


        // Write the order fecha emision in cell I4
        worksheet.mergeCells('F4:H4');
        this.setNormalFormat(worksheet.getCell('F4'), "FECHA EMISION ORDEN DE COMPRA");
        this.setNormalFormat(worksheet.getCell('I4'), orden.fechaEmision?.toString());

        // Write the order ID in cell I5
        worksheet.mergeCells('F5:H5');
        this.setNormalFormat(worksheet.getCell('F5'), "NUMERO DE ORDEN DE COMPRA");
        this.setNormalFormat(worksheet.getCell('I5'), orden.ordenCompraId);

        worksheet.mergeCells('F6:H6');
        this.setNormalFormat(worksheet.getCell('F6'), "FECHA DE VENCIMIENTO DE LA ORDEN");
        this.setNormalFormat(worksheet.getCell('I6'), orden.fechaVencimiento?.toString());

        //LUGAR DE ENTREGA Y CONDICIONES DE PAGO
        worksheet.mergeCells('F13:I13');
        this.setHeaderFormat(worksheet.getCell('F13'), "LUGAR DE ENTREGA Y CONDICIONES DE PAGO");
        worksheet.mergeCells('F14:I14');
        this.setNormalFormat(worksheet.getCell('F14'), "Empresa: Napolitana JP S.A.S - EXOTIC EXPERT");
        worksheet.mergeCells('F15:I15');
        this.setNormalFormat(worksheet.getCell('F15'), "Direccion : vía 11, Juan Mina #4 100");
        worksheet.mergeCells('F16:I16');
        this.setNormalFormat(worksheet.getCell('F16'), "Barranquilla, Atlántico");
        worksheet.mergeCells('F17:I17');
        this.setNormalFormat(worksheet.getCell('F17'), "[TELEFONO PLANTA EXOTIC]");
        worksheet.mergeCells('F18:I18');
        this.setNormalFormat(worksheet.getCell('F18'), getCondicionPagoText(orden.condicionPago));
        worksheet.mergeCells('F19:I19');
        this.setNormalFormat(worksheet.getCell('F19'), `PLAZO PAGO ${orden.plazoPago} DIAS`);
        worksheet.mergeCells('F20:I20');
        this.setNormalFormat(worksheet.getCell('F20'), `PLAZO ENTREGA ${orden.tiempoEntrega} DIAS`);
        worksheet.mergeCells('F21:I21');
        this.setNormalFormat(worksheet.getCell('F21'), `CONDICION ENTREGA: PUESTA EN PLANTA`);


        // INFORMACION PROVEEDOR
        worksheet.mergeCells('A13:B13');
        this.setHeaderFormat(worksheet.getCell('A13'), "PROVEEDOR");
        worksheet.mergeCells('A14:B14');
        this.setNormalFormat(worksheet.getCell('A14'), orden.proveedor.nombre);
        worksheet.mergeCells('A15:B15');
        this.setNormalFormat(worksheet.getCell('A15'), `NIT: ${orden.proveedor.id}`);
        worksheet.mergeCells('A16:B16');
        this.setNormalFormat(worksheet.getCell('A16'), orden.proveedor.departamento);
        worksheet.mergeCells('A17:B17');
        this.setNormalFormat(worksheet.getCell('F17'), orden.proveedor.direccion);
        worksheet.mergeCells('A18:B18');
        this.setNormalFormat(worksheet.getCell('A18'), orden.proveedor.ciudad);
        worksheet.mergeCells('A19:B19');
        this.setNormalFormat(worksheet.getCell('A19'), orden.proveedor.contactos[0].cel);
        worksheet.mergeCells('A20:B20');
        this.setNormalFormat(worksheet.getCell('A20'), getRegimenTributario(orden.proveedor.regimenTributario));
        worksheet.mergeCells('A21:B21');
        this.setNormalFormat(worksheet.getCell('A21'), orden.proveedor.contactos[0].email);

        this.setHeaderFormat(worksheet.getCell('A25'), "CODIGO");
        worksheet.mergeCells('B25:D25');
        this.setHeaderFormat(worksheet.getCell('B25'), "DESCRIPCION");
        this.setHeaderFormat(worksheet.getCell('E25'), "CANTIDAD");
        worksheet.mergeCells('F25:G25');
        this.setHeaderFormat(worksheet.getCell('F25'), "PRECIO UNITARIO");
        worksheet.mergeCells('H25:I25');
        this.setHeaderFormat(worksheet.getCell('H25'), "SUBTOTAL");


        for(let n = 0; n < orden.itemsOrdenCompra.length; n++){
            this.insertItem( 26 + n, orden.itemsOrdenCompra[n], worksheet);
        }

        const N = orden.itemsOrdenCompra.length;

        worksheet.mergeCells(`F${29+N}:G${29+N}`);
        this.setNormalFormat(worksheet.getCell(`F${29+N}`), "Sub Total");

        worksheet.mergeCells(`F${30+N}:G${30+N}`);
        this.setNormalFormat(worksheet.getCell(`F${30+N}`), "Iva 19%");

        worksheet.mergeCells(`F${31+N}:G${31+N}`);
        this.setNormalFormat(worksheet.getCell(`F${31+N}`), "Total Pagar");

        worksheet.mergeCells(`H${29+N}:I${29+N}`);
        this.setNormalFormat(worksheet.getCell(`H${29+N}`), orden.subTotal);

        worksheet.mergeCells(`H${30+N}:I${30+N}`);
        this.setNormalFormat(worksheet.getCell(`H${30+N}`), orden.ivaCOP);

        worksheet.mergeCells(`H${31+N}:I${31+N}`);
        this.setNormalFormat(worksheet.getCell(`H${31+N}`), orden.totalPagar);


        worksheet.mergeCells(`A${31+N}:D${31+N}`);
        this.setHeaderFormat(worksheet.getCell(`A${31+N}`), "OBSERVACIONES");
        worksheet.mergeCells(`A${32+N}:D${39+N}`);

        // Convert the workbook buffer (an ArrayBuffer) into a Uint8Array
        const arrayBuffer = await workbook.xlsx.writeBuffer();
        return new Uint8Array(arrayBuffer);
    }

    private insertItem(row: number, item:ItemOrdenCompra, worksheet: ExcelJS.Worksheet) {
        worksheet.mergeCells(`B${row}:D${row}`);
        worksheet.mergeCells(`F${row}:G${row}`);
        worksheet.mergeCells(`H${row}:I${row}`);
        this.setNormalFormat(worksheet.getCell(`A${row}`), item.material.productoId);
        this.setNormalFormat(worksheet.getCell(`B${row}`), item.material.nombre);
        this.setNormalFormat(worksheet.getCell(`E${row}`), item.cantidad);
        this.setNormalFormat(worksheet.getCell(`F${row}`), item.precioUnitario);
        this.setNormalFormat(worksheet.getCell(`H${row}`), item.subTotal);
    }

    private setNormalFormat(cell: ExcelJS.Cell, value: string | (number|undefined)){
        cell.value = value;
        cell.font = { name: 'Artifakt Element Medium', size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
    }

    private setPjuFormat(cell: ExcelJS.Cell, value: string | (number|undefined)){
        cell.value = value;
        cell.font = { name: 'Artifakt Element Medium', size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
    }

    private setHeaderFormat(cell: ExcelJS.Cell, value: string | (number|undefined)){
        cell.value = value;
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2DCDB' }
        };
        cell.font = { name: 'Artifakt Element Medium', size: 14, color: { argb: 'FF353434' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
    }

    /**
     * Generates the Excel file and triggers a download in the browser.
     * @param orden the order data to populate the file with.
     */
    public async downloadExcel(orden: OrdenCompraMateriales): Promise<void> {
        try {
            const buffer = await this.generateExcel(orden);
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orden-compra-${orden.ordenCompraId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating Excel file:', error);
            throw error;
        }
    }
}
