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

type TipoReporteAlmacen = "ingreso_materiales" | "dispensacion_materiales" | "ingreso_terminado";
type ModoFechaInforme = "fecha_unica" | "rango";

export default function InformeDiarioAlmacenPanel() {
    const toast = useAppToast();
    const [tipoReporte, setTipoReporte] = useState<TipoReporteAlmacen>("ingreso_materiales");
    const [modoFecha, setModoFecha] = useState<ModoFechaInforme>("fecha_unica");
    const [fecha, setFecha] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [decimalSeparator, setDecimalSeparator] = useState<ExcelDecimalSeparator>(DEFAULT_EXCEL_DECIMAL_SEPARATOR);
    const [downloadingMode, setDownloadingMode] = useState<ExcelExportMode | null>(null);

    const endPoints = useMemo(() => new EndPointsURL(), []);

    const rangeInvalid = modoFecha === "rango" && fechaDesde.length > 0 && fechaHasta.length > 0 && fechaDesde > fechaHasta;
    const dateSelectionValid =
        modoFecha === "fecha_unica"
            ? fecha.length > 0
            : fechaDesde.length > 0 && fechaHasta.length > 0 && !rangeInvalid;
    const canDownload =
        dateSelectionValid &&
        (tipoReporte === "ingreso_materiales" ||
            tipoReporte === "dispensacion_materiales" ||
            tipoReporte === "ingreso_terminado");

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

    const buildFileSuffix = () => {
        if (modoFecha === "fecha_unica") return fecha;
        return fechaDesde === fechaHasta ? fechaDesde : `${fechaDesde}_a_${fechaHasta}`;
    };

    const buildCopySuffix = () => decimalSeparator === "COMMA" ? "_para_copiar_coma" : "_para_copiar_punto";

    const handleDownload = async (exportMode: ExcelExportMode) => {
        if (!canDownload) return;
        setDownloadingMode(exportMode);
        try {
            let url: string;
            let filename: string;
            const isRange = modoFecha === "rango";
            const fileSuffix = buildFileSuffix();
            const modeSuffix = exportMode === "TEXT_DETERMINISTIC" ? buildCopySuffix() : "";
            const exportOptions = exportMode === "NUMERIC"
                ? { exportMode }
                : { exportMode, decimalSeparator };
            if (tipoReporte === "ingreso_materiales") {
                url = isRange
                    ? endPoints.informesDiariosAlmacenIngresoMaterialesExcelRango(fechaDesde, fechaHasta, exportOptions)
                    : endPoints.informesDiariosAlmacenIngresoMaterialesExcel(fecha, exportOptions);
                filename = `informe_ingreso_materiales_${fileSuffix}${modeSuffix}.xlsx`;
            } else if (tipoReporte === "dispensacion_materiales") {
                url = isRange
                    ? endPoints.informesDiariosAlmacenDispensacionMaterialesExcelRango(fechaDesde, fechaHasta, exportOptions)
                    : endPoints.informesDiariosAlmacenDispensacionMaterialesExcel(fecha, exportOptions);
                filename = `informe_dispensacion_materiales_${fileSuffix}${modeSuffix}.xlsx`;
            } else {
                url = isRange
                    ? endPoints.informesDiariosAlmacenIngresoTerminadosExcelRango(fechaDesde, fechaHasta, exportOptions)
                    : endPoints.informesDiariosAlmacenIngresoTerminadosExcel(fecha, exportOptions);
                filename = `informe_ingreso_terminados_${fileSuffix}${modeSuffix}.xlsx`;
            }
            const response = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
            triggerFileDownload(response.data, filename);
        } catch (e) {
            toast({
                title: "No se pudo descargar el informe",
                description: axios.isAxiosError(e)
                    ? e.response?.status === 401
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
                    Informe diario de almacén
                </Text>
                <VStack align="stretch" gap={4} maxW={{ base: "full", md: "md" }}>
                    <Field.Root>
                        <Field.Label>Tipo de reporte</Field.Label>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                value={tipoReporte}
                                onChange={(e) => setTipoReporte(e.target.value as TipoReporteAlmacen)}>
                                <option value="ingreso_materiales">Ingreso materiales</option>
                                <option value="dispensacion_materiales">Dispensación materiales</option>
                                <option value="ingreso_terminado">Ingreso producto terminado</option>
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root>
                        <Field.Label>Modo de fechas</Field.Label>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                value={modoFecha}
                                onChange={(e) => setModoFecha(e.target.value as ModoFechaInforme)}>
                                <option value="fecha_unica">Fecha única</option>
                                <option value="rango">Rango de fechas</option>
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    </Field.Root>
                    {modoFecha === "fecha_unica" ? (
                        <Field.Root>
                            <Field.Label>Fecha del informe</Field.Label>
                            <Input
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                            />
                        </Field.Root>
                    ) : (
                        <>
                            <Field.Root>
                                <Field.Label>Fecha desde</Field.Label>
                                <Input
                                    type="date"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                />
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
                        </>
                    )}
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
