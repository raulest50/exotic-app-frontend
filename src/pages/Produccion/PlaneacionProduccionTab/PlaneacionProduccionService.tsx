/**
 * PlaneacionProduccionService.tsx
 * Contiene la lógica de negocio para planeación de producción,
 * separada de los componentes de UI.
 */

import ExcelJS from "exceljs";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type { ValidationResult } from "../../../components/FileChooserWithValidation/FileChooserWithValidation";

export interface Terminado {
    // --- campos heredados de Producto ---
    productoId: string;
    nombre: string;
    observaciones?: string;
    costo?: number;
    ivaPercentual?: number;
    fechaCreacion?: string;
    tipoUnidades: string;
    cantidadUnidad: number;
    tipo_producto: string;
    stockMinimo?: number;
    inventareable: boolean;

    // --- campos propios de Terminado ---
    status: number;
    insumos?: any[];
    procesoProduccionCompleto?: any;
    categoria: any;
    fotoUrl?: string;
    casePack?: any;
    prefijoLote?: string;
}

/**
 * representa cada fila del excel de informe detallado de ventas.
 * solo se modelan por ahora las celdas relevantes
 */
export interface fila_inf_ventas {
    codigo: string; // representa el codigo de un producto terminado
    cantidad_vendida: number;
    valor_total: number;
}

/**
 * Asocia un producto terminado con sus datos de ventas unificados.
 */
export interface TerminadoConVentas {
    terminado: Terminado;
    cantidad_vendida: number;
    valor_total: number;
    porcentaje_participacion: number; // porcentaje sobre el total (cantidad o valor según el modo)
}

export type ModoDistribucion = "valor" | "cantidad";

const COL_CODIGO = 11;           // Columna K
const COL_CANTIDAD_VENDIDA = 13; // Columna M
const COL_VALOR_TOTAL = 16;      // Columna P

const EXPECTED_HEADERS: string[] = [
    "FECHA", "PREFIJO", "FACTURA", "RETE FUENTE", "RETE IVA", "RETE ICA",
    "RETE OTROS", "DESCUENTO ENC.", "IDENT. CLIENTE", "NOMBRE CLIENTE",
    "CODIGO", "DESCRIPCION", "CANTIDAD VENDIDA", "VALOR SIN IVA", "VALOR IVA",
    "VALOR TOTAL", "COSTO", "DESCUENTO", "GANANCIA", "% GANANCIA", "%IVA",
    "GANANCIA BRUTA", "% GANANCIA BRUTA", "VENDEDOR", "DEPARTAMENTO",
    "MUNICIPIO", "UBICACION", "OBSERVACION", "CLASE CLIENTE", "ZONA",
    "FECHACAD", "LOTE", "TIPO PAGO", "DIRECCION", "TELEFONO", "CELULAR",
    "CONTACTO", "UBICACION", "CANTIDAD INVENTARIO", "OBRA/SEDE", "OBSERVACION",
    "NOTA OCULTA", "CUENTA", "SEGUIMIENTO", "CATEGORIA", "GUIA ENVIO",
    "RANGO PRECIO", "FLETE", "ENVIO GRATIS",
];

const MIN_DATA_ROWS = 2;

/**
 * Verifica que la estructura del archivo Excel de informe de ventas
 * sea válida: columnas esperadas en la fila 1 y al menos 2 filas de datos.
 * @param file Archivo Excel seleccionado por el usuario
 * @returns ValidationResult con valid=true si pasa, o valid=false con errores descriptivos
 */
export const VerificarEstructuraInformeVentas = async (file: File): Promise<ValidationResult> => {
    console.log("[VerificarEstructura] Inicio - archivo:", file.name, "tamaño:", file.size, "bytes");
    const errors: string[] = [];

    console.log("[VerificarEstructura] Leyendo arrayBuffer...");
    const data = await file.arrayBuffer();
    console.log("[VerificarEstructura] arrayBuffer leído, byteLength:", data.byteLength);

    const workbook = new ExcelJS.Workbook();
    console.log("[VerificarEstructura] Cargando workbook con ExcelJS...");
    await workbook.xlsx.load(data);
    console.log("[VerificarEstructura] Workbook cargado, hojas:", workbook.worksheets.length, workbook.worksheets.map(ws => ws.name));

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        console.error("[VerificarEstructura] No se encontró ninguna hoja en el archivo.");
        errors.push("No se encontró ninguna hoja en el archivo.");
        return { valid: false, errors };
    }

    console.log("[VerificarEstructura] Hoja seleccionada:", worksheet.name, "| rowCount:", worksheet.rowCount, "| columnCount:", worksheet.columnCount);

    const dataRows = worksheet.rowCount - 1;
    if (worksheet.rowCount < 1 + MIN_DATA_ROWS) {
        console.warn("[VerificarEstructura] Filas insuficientes. rowCount:", worksheet.rowCount, "mínimo requerido:", 1 + MIN_DATA_ROWS);
        errors.push(
            `El archivo debe contener al menos ${MIN_DATA_ROWS} filas de datos. Se encontraron ${dataRows < 0 ? 0 : dataRows}.`
        );
        return { valid: false, errors };
    }

    const headerRow = worksheet.getRow(1);
    console.log("[VerificarEstructura] Verificando headers (esperados:", EXPECTED_HEADERS.length, "columnas)...");
    for (let col = 1; col <= EXPECTED_HEADERS.length; col++) {
        const cellValue = headerRow.getCell(col).value?.toString()?.trim().toUpperCase() ?? "";
        const expected = EXPECTED_HEADERS[col - 1];
        if (cellValue !== expected) {
            console.warn(`[VerificarEstructura] Header mismatch col ${col}: esperado="${expected}" encontrado="${cellValue || "(vacía)"}"`);
            errors.push(
                `Columna ${col}: se esperaba "${expected}", se encontró "${cellValue || "(vacía)"}"`,
            );
        }
    }

    const result: ValidationResult = { valid: errors.length === 0, errors };
    console.log("[VerificarEstructura] Resultado:", result.valid ? "VÁLIDO" : "INVÁLIDO", "| errores:", errors.length);
    return result;
};

/**
 * Extrae el valor numérico de una celda de ExcelJS.
 * Maneja celdas con resultado de fórmula y valores directos.
 */
function extraerNumero(cellValue: ExcelJS.CellValue): number {
    if (cellValue === null || cellValue === undefined) return 0;
    if (typeof cellValue === "number") return cellValue;
    if (typeof cellValue === "object" && "result" in cellValue) {
        return typeof cellValue.result === "number" ? cellValue.result : Number(cellValue.result) || 0;
    }
    const parsed = Number(String(cellValue).replace(/,/g, ""));
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Carga los datos de las filas del Excel de informe de ventas
 * y los transforma al formato fila_inf_ventas[].
 * @param file Archivo .xlsx previamente validado
 * @returns Array de filas procesadas del informe de ventas
 */
export const CargarDatosFilas = async (file: File): Promise<fila_inf_ventas[]> => {
    console.log("[CargarDatosFilas] Inicio - archivo:", file.name);

    const data = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        console.error("[CargarDatosFilas] No se encontró ninguna hoja.");
        return [];
    }

    const filas: fila_inf_ventas[] = [];

    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        const primeraCelda = row.getCell(1).value?.toString()?.trim().toUpperCase() ?? "";
        if (primeraCelda === "TOTALES") continue;

        const codigo = row.getCell(COL_CODIGO).value?.toString()?.trim() ?? "";
        if (!codigo) continue;

        const cantidad_vendida = extraerNumero(row.getCell(COL_CANTIDAD_VENDIDA).value);
        const valor_total = extraerNumero(row.getCell(COL_VALOR_TOTAL).value);

        filas.push({ codigo, cantidad_vendida, valor_total });
    }

    console.log("[CargarDatosFilas] Filas extraídas:", filas.length);
    return filas;
};


/**
 * despues de ejecutar funcion CargarDatosFilas, van haber codigos repetidos, pues cada fila es una
 * venta a un cliente diferente, cada codigo representa un producto terminado y es posible que se
 * haya vendido el mismo producto a clientes diferentes. este metodo unifica para que se sumen
 * todos los cantidad_vendida y valor_total con un mismo codigo y se unifique
 */
export const UnificarDatosFilas = (filas: fila_inf_ventas[]): fila_inf_ventas[] => {
    const mapa = new Map<string, fila_inf_ventas>();

    for (const fila of filas) {
        const existente = mapa.get(fila.codigo);
        if (existente) {
            existente.cantidad_vendida += fila.cantidad_vendida;
            existente.valor_total += fila.valor_total;
        } else {
            mapa.set(fila.codigo, { ...fila });
        }
    }

    const unificadas = Array.from(mapa.values());
    console.log("[UnificarDatosFilas] Filas originales:", filas.length, "| Filas unificadas:", unificadas.length);
    return unificadas;
};


/** Forma del DTO que devuelve el backend (camelCase por Jackson) */
interface TerminadoConVentasDTO {
    terminado: Terminado;
    cantidadVendida: number;
    valorTotal: number;
}

/**
 * Envía la lista unificada de ventas al backend para asociar cada código
 * con su producto terminado correspondiente.
 * @param filasUnificadas filas ya agrupadas por código
 * @returns lista de TerminadoConVentas con la info del producto + ventas
 */
export const AsociarTerminados = async (
    filasUnificadas: fila_inf_ventas[]
): Promise<TerminadoConVentas[]> => {
    const endPoints = new EndPointsURL();
    const payload = filasUnificadas.map(f => ({
        codigo: f.codigo,
        cantidadVendida: f.cantidad_vendida,
        valorTotal: f.valor_total,
    }));

    console.log("[AsociarTerminados] Enviando", payload.length, "filas unificadas al backend...");
    const response = await axios.post<TerminadoConVentasDTO[]>(
        endPoints.planeacion_asociar_terminados, payload
    );

    const resultado: TerminadoConVentas[] = response.data.map(item => ({
        terminado: item.terminado,
        cantidad_vendida: item.cantidadVendida,
        valor_total: item.valorTotal,
        porcentaje_participacion: 0,
    }));

    console.log("[AsociarTerminados] Recibidos", resultado.length, "terminados asociados");
    return resultado;
};

/**
 * Calcula la distribución de ventas: ordena de mayor a menor según el modo
 * seleccionado y asigna el porcentaje de participación de cada terminado.
 * @param items lista de TerminadoConVentas (sin porcentaje calculado)
 * @param modo "valor" ordena por valor_total, "cantidad" ordena por cantidad_vendida
 * @returns copia ordenada con porcentaje_participacion calculado
 */
export const CalcularDistribucionVentas = (
    items: TerminadoConVentas[],
    modo: ModoDistribucion,
): TerminadoConVentas[] => {
    const metrica = (item: TerminadoConVentas) =>
        modo === "valor" ? item.valor_total : item.cantidad_vendida;

    const total = items.reduce((sum, item) => sum + metrica(item), 0);

    const ordenados = [...items].sort((a, b) => metrica(b) - metrica(a));

    return ordenados.map(item => ({
        ...item,
        porcentaje_participacion: total > 0 ? (metrica(item) / total) * 100 : 0,
    }));
};
