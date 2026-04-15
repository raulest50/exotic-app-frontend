/**
 * PlaneacionProduccionService.tsx
 * Contiene la logica de negocio para planeacion de produccion,
 * separada de los componentes de UI.
 */

import ExcelJS from "exceljs";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type { ValidationResult } from "../../../components/FileChooserWithValidation/FileChooserWithValidation";

export interface Terminado {
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
    status: number;
    insumos?: any[];
    procesoProduccionCompleto?: any;
    categoria: any;
    fotoUrl?: string;
    casePack?: any;
    prefijoLote?: string;
}

export interface fila_inf_ventas {
    codigo: string;
    cantidad_vendida: number;
    valor_total: number;
}

export interface TerminadoConVentas {
    terminado: Terminado;
    cantidad_vendida: number;
    valor_total: number;
    porcentaje_participacion: number;
    stockActualConsolidado: number;
}

export type ModoDistribucion = "valor" | "cantidad";

interface PlaneacionExcelDebugResponseDTO {
    debugId: string;
    message: string;
    sheetCount: number;
    detectedPrimarySheet: string | null;
    headerMismatchCount: number;
}

interface PlaneacionTerminadosDebugResponseDTO {
    debugId: string;
    message: string;
    sheetCount: number;
    detectedPrimarySheet: string | null;
    inputCodeCount: number;
    matchedCodeCount: number;
    unmatchedCodeCount: number;
}

interface VerificarEstructuraOptions {
    enableBackendDebug?: boolean;
}

export interface DiagnosticoAsociacionContext {
    totalFilasLeidas: number;
    totalFilasUnificadas: number;
    totalAsociadoFinal: number;
    triggerReason: string;
    uiMessage: string;
}

export interface ProcesamientoInformeDetallado {
    terminados: TerminadoConVentas[];
    totalFilasLeidas: number;
    totalFilasUnificadas: number;
}

export interface PropuestaMpsSemanalItemRequestDTO {
    productoId: string;
    necesidadManual: number;
    porcentajeParticipacion: number;
    cantidadVendida: number;
    valorTotal: number;
}

export interface PropuestaMpsSemanalRequestDTO {
    weekStartDate: string;
    items: PropuestaMpsSemanalItemRequestDTO[];
}

export interface PropuestaMpsSemanalSummaryDTO {
    totalTerminadosEvaluados: number;
    totalPlanificables: number;
    totalNoPlanificablesPorFaltaLoteSize: number;
    totalLotesPropuestos: number;
    totalUnidadesPropuestas: number;
}

export interface PropuestaMpsSemanalItemDTO {
    productoId: string;
    productoNombre: string;
    categoriaNombre: string | null;
    loteSize: number;
    tiempoDiasFabricacion: number;
    stockActual: number;
    necesidadManual: number;
    necesidadNeta: number;
    lotesPropuestos: number;
    cantidadPropuesta: number;
    deltaVsNecesidad: number;
    porcentajeParticipacion: number;
    cantidadVendida: number;
    valorTotal: number;
    fechaLanzamientoSugerida: string | null;
    fechaFinalPlanificadaSugerida: string | null;
    desbordaSemana: boolean;
    planificable: boolean;
    warning: string | null;
}

export interface PropuestaMpsSemanalDTO {
    weekStartDate: string;
    weekEndDate: string;
    summary: PropuestaMpsSemanalSummaryDTO;
    items: PropuestaMpsSemanalItemDTO[];
}

interface ProcesamientoInformeCache {
    fileKey: string | null;
    promise: Promise<ProcesamientoInformeDetallado> | null;
    result: ProcesamientoInformeDetallado | null;
}

interface DiagnosticoAsociacionCache {
    debugKey: string | null;
    promise: Promise<PlaneacionTerminadosDebugResponseDTO | null> | null;
    result: PlaneacionTerminadosDebugResponseDTO | null;
}

const EXPECTED_HEADERS_VERSION = "planeacion-produccion-step0-v1";

const COL_CODIGO = 11;
const COL_CANTIDAD_VENDIDA = 13;
const COL_VALOR_TOTAL = 16;

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

const procesamientoInformeCache: ProcesamientoInformeCache = {
    fileKey: null,
    promise: null,
    result: null,
};

const diagnosticoAsociacionCache: DiagnosticoAsociacionCache = {
    debugKey: null,
    promise: null,
    result: null,
};

function construirClaveArchivo(file: File): string {
    return `${file.name}::${file.size}::${file.lastModified}`;
}

function construirClaveDebugAsociacion(file: File, clientContext: DiagnosticoAsociacionContext): string {
    return `${construirClaveArchivo(file)}::${clientContext.totalFilasLeidas}::${clientContext.totalFilasUnificadas}::${clientContext.totalAsociadoFinal}::${clientContext.triggerReason}`;
}

export const VerificarEstructuraInformeVentas = async (
    file: File,
    options?: VerificarEstructuraOptions,
): Promise<ValidationResult> => {
    const errors: string[] = [];

    try {
        const data = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            errors.push("No se encontro ninguna hoja en el archivo.");
        } else {
            const dataRows = worksheet.rowCount - 1;
            if (worksheet.rowCount < 1 + MIN_DATA_ROWS) {
                errors.push(
                    `El archivo debe contener al menos ${MIN_DATA_ROWS} filas de datos. Se encontraron ${dataRows < 0 ? 0 : dataRows}.`,
                );
            }

            const headerRow = worksheet.getRow(1);
            for (let col = 1; col <= EXPECTED_HEADERS.length; col++) {
                const cellValue = headerRow.getCell(col).value?.toString()?.trim().toUpperCase() ?? "";
                const expected = EXPECTED_HEADERS[col - 1];
                if (cellValue !== expected) {
                    errors.push(
                        `Columna ${col}: se esperaba "${expected}", se encontro "${cellValue || "(vacia)"}"`,
                    );
                }
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[VerificarEstructura] Error inesperado procesando el archivo:", error);
        errors.push(`Ocurrio un error al leer el archivo Excel: ${errorMessage}`);
    }

    const result: ValidationResult = { valid: errors.length === 0, errors };

    if (!result.valid && options?.enableBackendDebug === true) {
        try {
            const debugResult = await enviarDiagnosticoExcelPlaneacion(file, errors);
            if (debugResult?.debugId) {
                errors.unshift(
                    `Diagnostico tecnico generado en backend. debugId=${debugResult.debugId}. Revise planeacion_excel_debug.log.`,
                );
            }
        } catch (error) {
            console.error("[VerificarEstructura] No se pudo generar diagnostico backend:", error);
        }
    }

    return result;
};

async function enviarDiagnosticoExcelPlaneacion(
    file: File,
    clientErrors: string[],
): Promise<PlaneacionExcelDebugResponseDTO | null> {
    if (EndPointsURL.getEnvironment() !== "local") {
        return null;
    }

    const endPoints = new EndPointsURL();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientExpectedHeadersVersion", EXPECTED_HEADERS_VERSION);
    clientErrors.forEach((error) => formData.append("clientErrors", error));

    const response = await axios.post<PlaneacionExcelDebugResponseDTO>(
        endPoints.planeacion_debug_excel_structure,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        },
    );

    return response.data;
}

export async function enviarDiagnosticoAsociacionTerminados(
    file: File,
    clientContext: DiagnosticoAsociacionContext,
): Promise<PlaneacionTerminadosDebugResponseDTO | null> {
    if (EndPointsURL.getEnvironment() !== "local") {
        return null;
    }

    const debugKey = construirClaveDebugAsociacion(file, clientContext);

    if (diagnosticoAsociacionCache.debugKey === debugKey) {
        if (diagnosticoAsociacionCache.result) {
            return diagnosticoAsociacionCache.result;
        }

        if (diagnosticoAsociacionCache.promise) {
            return diagnosticoAsociacionCache.promise;
        }
    } else {
        diagnosticoAsociacionCache.debugKey = debugKey;
        diagnosticoAsociacionCache.promise = null;
        diagnosticoAsociacionCache.result = null;
    }

    const endPoints = new EndPointsURL();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientExpectedHeadersVersion", EXPECTED_HEADERS_VERSION);
    formData.append("clientContext", JSON.stringify(clientContext));

    const promise = axios.post<PlaneacionTerminadosDebugResponseDTO>(
        endPoints.planeacion_debug_asociacion_terminados,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        },
    ).then((response) => response.data);

    diagnosticoAsociacionCache.promise = promise;

    try {
        const result = await promise;
        if (diagnosticoAsociacionCache.debugKey === debugKey) {
            diagnosticoAsociacionCache.result = result;
        }
        return result;
    } finally {
        if (
            diagnosticoAsociacionCache.debugKey === debugKey &&
            diagnosticoAsociacionCache.promise === promise
        ) {
            diagnosticoAsociacionCache.promise = null;
        }
    }
}

function extraerNumero(cellValue: ExcelJS.CellValue): number {
    if (cellValue === null || cellValue === undefined) return 0;
    if (typeof cellValue === "number") return cellValue;
    if (typeof cellValue === "object" && "result" in cellValue) {
        return typeof cellValue.result === "number" ? cellValue.result : Number(cellValue.result) || 0;
    }
    const parsed = Number(String(cellValue).replace(/,/g, ""));
    return isNaN(parsed) ? 0 : parsed;
}

export const CargarDatosFilas = async (file: File): Promise<fila_inf_ventas[]> => {
    const data = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
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

    return filas;
};

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

    return Array.from(mapa.values());
};

interface TerminadoConVentasDTO {
    terminado: Terminado;
    cantidadVendida: number;
    valorTotal: number;
    stockActualConsolidado: number;
}

export const AsociarTerminados = async (
    filasUnificadas: fila_inf_ventas[],
): Promise<TerminadoConVentas[]> => {
    const endPoints = new EndPointsURL();
    const payload = filasUnificadas.map((fila) => ({
        codigo: fila.codigo,
        cantidadVendida: fila.cantidad_vendida,
        valorTotal: fila.valor_total,
    }));

    const response = await axios.post<TerminadoConVentasDTO[]>(
        endPoints.planeacion_asociar_terminados,
        payload,
    );

    return response.data.map((item) => ({
        terminado: item.terminado,
        cantidad_vendida: item.cantidadVendida,
        valor_total: item.valorTotal,
        porcentaje_participacion: 0,
        stockActualConsolidado: item.stockActualConsolidado,
    }));
};

export const ProcesarInformeVentasDetallado = async (
    file: File,
): Promise<ProcesamientoInformeDetallado> => {
    const fileKey = construirClaveArchivo(file);

    if (procesamientoInformeCache.fileKey === fileKey) {
        if (procesamientoInformeCache.result) {
            return procesamientoInformeCache.result;
        }

        if (procesamientoInformeCache.promise) {
            return procesamientoInformeCache.promise;
        }
    } else {
        procesamientoInformeCache.fileKey = fileKey;
        procesamientoInformeCache.promise = null;
        procesamientoInformeCache.result = null;
    }

    const promise = (async () => {
        const filasRaw = await CargarDatosFilas(file);
        const filasUnificadas = UnificarDatosFilas(filasRaw);
        const terminados = await AsociarTerminados(filasUnificadas);

        return {
            terminados,
            totalFilasLeidas: filasRaw.length,
            totalFilasUnificadas: filasUnificadas.length,
        };
    })();

    procesamientoInformeCache.promise = promise;

    try {
        const result = await promise;
        if (procesamientoInformeCache.fileKey === fileKey) {
            procesamientoInformeCache.result = result;
        }
        return result;
    } catch (error) {
        if (procesamientoInformeCache.fileKey === fileKey) {
            procesamientoInformeCache.result = null;
        }
        throw error;
    } finally {
        if (
            procesamientoInformeCache.fileKey === fileKey &&
            procesamientoInformeCache.promise === promise
        ) {
            procesamientoInformeCache.promise = null;
        }
    }
};

export const ProcesarInformeVentas = async (
    file: File,
): Promise<TerminadoConVentas[]> => {
    const result = await ProcesarInformeVentasDetallado(file);
    return result.terminados;
};

export async function GenerarPropuestaMpsSemanal(
    payload: PropuestaMpsSemanalRequestDTO,
): Promise<PropuestaMpsSemanalDTO> {
    const endPoints = new EndPointsURL();
    const response = await axios.post<PropuestaMpsSemanalDTO>(
        endPoints.planeacion_propuesta_mps_semanal,
        payload,
    );
    return response.data;
}

export const CalcularDistribucionVentas = (
    items: TerminadoConVentas[],
    modo: ModoDistribucion,
): TerminadoConVentas[] => {
    const metrica = (item: TerminadoConVentas) =>
        modo === "valor" ? item.valor_total : item.cantidad_vendida;

    const total = items.reduce((sum, item) => sum + metrica(item), 0);
    const ordenados = [...items].sort((a, b) => metrica(b) - metrica(a));

    return ordenados.map((item) => ({
        ...item,
        porcentaje_participacion: total > 0 ? (metrica(item) / total) * 100 : 0,
    }));
};
