import { Button, Checkbox, VStack } from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../api/EndPointsURL";
import { LuDownload } from 'react-icons/lu';

export interface ReporteHyLItem {
    productoId: string;
    productoNombre: string;
    cantidadProducida: number;
}

interface ReporteHyLButtonProps {
    fechaReporte: string;
    ingresos: ReporteHyLItem[];
    onGenerated?: () => void;
    onInvalidated?: () => void;
}

function consolidateProducedRows(ingresos: ReporteHyLItem[]): ReporteHyLItem[] {
    const byProductoId = new Map<string, ReporteHyLItem>();

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

function triggerFileDownload(data: ArrayBuffer, filename: string) {
    const blob = new Blob([data], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function getArrayBufferErrorMessage(error: unknown): Promise<string> {
    if (!axios.isAxiosError(error)) {
        return error instanceof Error ? error.message : "No se pudo generar el reporte HyL.";
    }

    const data = error.response?.data;
    if (data instanceof ArrayBuffer) {
        const text = new TextDecoder("utf-8").decode(data).trim();
        if (!text) return `Error ${error.response?.status ?? ""}`.trim();
        try {
            const parsed = JSON.parse(text) as { message?: string; error?: string };
            return parsed.message || parsed.error || text;
        } catch {
            return text;
        }
    }

    if (typeof data === "object" && data !== null) {
        const parsed = data as { message?: string; error?: string };
        return parsed.message || parsed.error || error.message;
    }

    return error.message;
}

export default function ReporteHyLButton({
    fechaReporte,
    ingresos,
    onGenerated,
    onInvalidated,
}: ReporteHyLButtonProps) {
    const toast = useAppToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [isGenerating, setIsGenerating] = useState(false);
    const [costosEnCero, setCostosEnCero] = useState(false);

    const productosProducidos = useMemo(
        () => consolidateProducedRows(ingresos),
        [ingresos]
    );

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
            const response = await axios.post<ArrayBuffer>(
                endpoints.ingreso_terminados_reporte_hyl,
                {
                    fechaReporte,
                    costosEnCero,
                    ingresos: productosProducidos.map((ingreso) => ({
                        productoId: ingreso.productoId,
                        productoNombre: ingreso.productoNombre,
                        cantidadProducida: ingreso.cantidadProducida,
                    })),
                },
                {
                    responseType: "arraybuffer",
                    withCredentials: true,
                }
            );

            triggerFileDownload(response.data, `reporte_hyl_${fechaReporte.replace(/-/g, "")}.xls`);
            onGenerated?.();

            toast({
                title: "Reporte HyL generado",
                description: `${productosProducidos.length} producto(s) terminado(s) incluidos.`,
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            const message = await getArrayBufferErrorMessage(error);
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
        <VStack align="stretch" gap={2}>
            <Checkbox.Root
                checked={costosEnCero}
                onCheckedChange={({ checked }) => {
                    setCostosEnCero(checked === true);
                    onInvalidated?.();
                }}
                disabled={isGenerating}
            ><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Generar costo en ceros
                                </Checkbox.Label></Checkbox.Root>
            <Button
                colorPalette="teal"
                size="lg"
                minH="48px"
                onClick={handleDownloadHyL}
                loading={isGenerating}
                loadingText="Generando..."
                disabled={productosProducidos.length === 0}><LuDownload />Descargar Reporte HyL
                            </Button>
        </VStack>
    );
}
