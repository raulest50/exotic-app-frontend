import { Button, useToast } from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../api/EndPointsURL";
import { IngresoTerminadoValidado } from "./types";

interface ReporteHyLButtonProps {
    ingresosValidados: IngresoTerminadoValidado[];
}

interface TerminadoBackend {
    productoId: string;
    costo?: number;
}

interface PageResponse<T> {
    content?: T[];
}

interface ReporteHyLRow {
    codigo: string;
    nombre: string;
    cantidad: number;
    costo: number;
}

const HYL_HEADERS = ["codigo", "nombre", "precio1", "precio2", "precio3", "precio4", "cantidad", "costo"];

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function numberForXml(value: number): string {
    return Number.isFinite(value) ? String(value) : "0";
}

function buildCell(value: string | number, type: "String" | "Number" = "String"): string {
    if (type === "Number") {
        return `<Cell><Data ss:Type="Number">${numberForXml(Number(value))}</Data></Cell>`;
    }
    return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

function buildEmptyCell(): string {
    return '<Cell><Data ss:Type="String"></Data></Cell>';
}

function consolidateProducedRows(ingresos: IngresoTerminadoValidado[]): IngresoTerminadoValidado[] {
    const byProductoId = new Map<string, IngresoTerminadoValidado>();

    for (const ingreso of ingresos) {
        if (ingreso.cantidadProducida <= 0) continue;

        const current = byProductoId.get(ingreso.productoId);
        if (!current) {
            byProductoId.set(ingreso.productoId, { ...ingreso });
            continue;
        }

        byProductoId.set(ingreso.productoId, {
            ...current,
            cantidadProducida: current.cantidadProducida + ingreso.cantidadProducida,
        });
    }

    return Array.from(byProductoId.values());
}

function buildHyLXml(rows: ReporteHyLRow[]): string {
    const headerRow = `<Row>${HYL_HEADERS.map((header) => buildCell(header)).join("")}</Row>`;
    const dataRows = rows.map((row) => (
        `<Row>` +
        buildCell(row.codigo) +
        buildCell(row.nombre) +
        buildEmptyCell() +
        buildEmptyCell() +
        buildEmptyCell() +
        buildEmptyCell() +
        buildCell(row.cantidad, "Number") +
        buildCell(row.costo, "Number") +
        `</Row>`
    )).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Reporte HyL">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

function downloadXml(xml: string, filename: string) {
    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default function ReporteHyLButton({ ingresosValidados }: ReporteHyLButtonProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [isGenerating, setIsGenerating] = useState(false);

    const productosProducidos = useMemo(
        () => consolidateProducedRows(ingresosValidados),
        [ingresosValidados]
    );

    const fetchCostoTerminado = async (productoId: string): Promise<number> => {
        const response = await axios.post<PageResponse<TerminadoBackend>>(
            endpoints.search_terminados_picker,
            {
                searchTerm: productoId,
                tipoBusqueda: "ID",
                page: 0,
                size: 1,
            },
            { withCredentials: true }
        );

        const terminado = response.data.content?.[0];
        if (!terminado) {
            throw new Error(`No se encontro el producto terminado ${productoId} en el catalogo.`);
        }

        return typeof terminado.costo === "number" && Number.isFinite(terminado.costo)
            ? terminado.costo
            : 0;
    };

    const handleDownloadHyL = async () => {
        if (productosProducidos.length === 0) {
            toast({
                title: "Sin produccion reportada",
                description: "El reporte HyL solo incluye terminados con cantidad producida mayor que cero.",
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        setIsGenerating(true);
        try {
            const rows = await Promise.all(productosProducidos.map(async (ingreso) => ({
                codigo: ingreso.productoId,
                nombre: ingreso.productoNombre,
                cantidad: ingreso.cantidadProducida,
                costo: await fetchCostoTerminado(ingreso.productoId),
            })));

            const xml = buildHyLXml(rows);
            const fechaReporte = productosProducidos[0]?.fechaReporte ?? new Date().toISOString().slice(0, 10);
            downloadXml(xml, `reporte_hyl_${fechaReporte.replace(/-/g, "")}.xls`);

            toast({
                title: "Reporte HyL generado",
                description: `${rows.length} producto(s) terminado(s) incluidos.`,
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo generar el reporte HyL.";
            toast({
                title: "Error generando reporte HyL",
                description: message,
                status: "error",
                duration: 7000,
                isClosable: true,
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            leftIcon={<DownloadIcon />}
            colorScheme="teal"
            size="lg"
            minH="72px"
            onClick={handleDownloadHyL}
            isLoading={isGenerating}
            loadingText="Generando..."
            isDisabled={productosProducidos.length === 0}
        >
            Descargar Reporte HyL
        </Button>
    );
}
