import { useMemo, useState } from "react";
import {
    Button,
    Card,
    Input,
    NativeSelect,
    Stack,
    Text,
    VStack,
    Field,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import EndPointsURL, { type ExcelDecimalSeparator, type ExcelExportMode } from "../../../api/EndPointsURL.tsx";
import ExcelDecimalSeparatorSelector, {
    DEFAULT_EXCEL_DECIMAL_SEPARATOR,
} from "../../../components/ExcelDecimalSeparatorSelector.tsx";

type SentidoAjuste = "ENTRADAS" | "SALIDAS" | "MIXTA";

export default function InformeDiarioAjustesAlmacenPanel() {
    const toast = useAppToast();
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [sentido, setSentido] = useState<SentidoAjuste>("MIXTA");
    const [decimalSeparator, setDecimalSeparator] = useState<ExcelDecimalSeparator>(DEFAULT_EXCEL_DECIMAL_SEPARATOR);
    const [downloadingMode, setDownloadingMode] = useState<ExcelExportMode | null>(null);

    const endPoints = useMemo(() => new EndPointsURL(), []);

    const rangeInvalid = fechaDesde.length > 0 && fechaHasta.length > 0 && fechaDesde > fechaHasta;
    const canDownload =
        fechaDesde.length > 0 && fechaHasta.length > 0 && !rangeInvalid;

    const triggerFileDownload = (data: ArrayBuffer, filename: string) => {
        const blob = new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const buildCopySuffix = () => decimalSeparator === "COMMA" ? "_para_copiar_coma" : "_para_copiar_punto";

    const handleDownload = async (exportMode: ExcelExportMode) => {
        if (!canDownload) return;
        setDownloadingMode(exportMode);
        try {
            const exportOptions = exportMode === "NUMERIC"
                ? { exportMode }
                : { exportMode, decimalSeparator };
            const url = endPoints.informesDiariosAlmacenAjustesExcel(
                fechaDesde,
                fechaHasta,
                sentido,
                exportOptions
            );
            const response = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
            const modeSuffix = exportMode === "TEXT_DETERMINISTIC" ? buildCopySuffix() : "";
            const filename = `informe_ajustes_almacen_${sentido}_${fechaDesde}_${fechaHasta}${modeSuffix}.xlsx`;
            triggerFileDownload(response.data, filename);
        } catch (e) {
            toast({
                title: "No se pudo descargar el informe",
                description: axios.isAxiosError(e)
                    ? e.response?.status === 400
                        ? "Rango de fechas inválido o parámetros incorrectos."
                        : e.response?.status === 401
                          ? "Sesión expirada o no autorizado."
                          : `Error ${e.response?.status ?? ""}`.trim()
                    : "Comprueba la conexión y vuelve a intentar.",
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setDownloadingMode(null);
        }
    };

    return (
        <Card.Root variant="outline">
            <Card.Body>
                <Text fontWeight="semibold" mb={4}>
                    Ajustes almacén
                </Text>
                <VStack align="stretch" gap={4} maxW={{ base: "full", md: "md" }}>
                    <Field.Root>
                        <Field.Label>Fecha desde</Field.Label>
                        <Input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                        />
                        <Field.HelperText>
                            Para un solo día, use la misma fecha en desde y hasta.
                        </Field.HelperText>
                    </Field.Root>
                    <Field.Root invalid={rangeInvalid}>
                        <Field.Label>Fecha hasta</Field.Label>
                        <Input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                        />
                        {rangeInvalid ? (
                            <Field.HelperText color="red.500">
                                &quot;Desde&quot; no puede ser posterior a &quot;hasta&quot;.
                            </Field.HelperText>
                        ) : null}
                    </Field.Root>
                    <Field.Root>
                        <Field.Label>Tipo de movimientos</Field.Label>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                value={sentido}
                                onChange={(e) => setSentido(e.target.value as SentidoAjuste)}>
                                <option value="ENTRADAS">Entradas (ajuste positivo)</option>
                                <option value="SALIDAS">Salidas (ajuste negativo)</option>
                                <option value="MIXTA">Mixta (entradas y salidas)</option>
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    </Field.Root>
                    <ExcelDecimalSeparatorSelector
                        value={decimalSeparator}
                        onChange={setDecimalSeparator}
                    />
                    <Stack direction={{ base: "column", sm: "row" }} gap={3} align="stretch">
                        <Button
                            colorPalette="blue"
                            onClick={() => handleDownload("NUMERIC")}
                            disabled={!canDownload}
                            loading={downloadingMode === "NUMERIC"}
                            w={{ base: "full", sm: "auto" }}
                        >
                            Descargar Excel funcional
                        </Button>
                        <Button
                            colorPalette="green"
                            variant="outline"
                            onClick={() => handleDownload("TEXT_DETERMINISTIC")}
                            disabled={!canDownload}
                            loading={downloadingMode === "TEXT_DETERMINISTIC"}
                            w={{ base: "full", sm: "auto" }}
                        >
                            Descargar Excel para copiar
                        </Button>
                    </Stack>
                </VStack>
            </Card.Body>
        </Card.Root>
    );
}
