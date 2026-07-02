import { useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardBody,
    FormControl,
    FormHelperText,
    FormLabel,
    Input,
    Select,
    Text,
    VStack,
    useToast,
} from "@chakra-ui/react";
import axios from "axios";
import EndPointsURL, { type ExcelDecimalSeparator, type ExcelExportMode } from "../../../api/EndPointsURL.tsx";
import ExcelDecimalSeparatorSelector, {
    DEFAULT_EXCEL_DECIMAL_SEPARATOR,
} from "../../../components/ExcelDecimalSeparatorSelector.tsx";

type TipoReporteAlmacen = "ingreso_materiales" | "dispensacion_materiales" | "ingreso_terminado";
type ModoFechaInforme = "fecha_unica" | "rango";

export default function InformeDiarioAlmacenPanel() {
    const toast = useToast();
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
        <Card variant="outline">
            <CardBody>
                <Text fontWeight="semibold" mb={4}>
                    Informe diario de almacén
                </Text>
                <VStack align="stretch" spacing={4} maxW="md">
                    <FormControl>
                        <FormLabel>Tipo de reporte</FormLabel>
                        <Select
                            value={tipoReporte}
                            onChange={(e) => setTipoReporte(e.target.value as TipoReporteAlmacen)}
                        >
                            <option value="ingreso_materiales">Ingreso materiales</option>
                            <option value="dispensacion_materiales">Dispensación materiales</option>
                            <option value="ingreso_terminado">Ingreso producto terminado</option>
                        </Select>
                    </FormControl>
                    <FormControl>
                        <FormLabel>Modo de fechas</FormLabel>
                        <Select
                            value={modoFecha}
                            onChange={(e) => setModoFecha(e.target.value as ModoFechaInforme)}
                        >
                            <option value="fecha_unica">Fecha única</option>
                            <option value="rango">Rango de fechas</option>
                        </Select>
                    </FormControl>
                    {modoFecha === "fecha_unica" ? (
                        <FormControl>
                            <FormLabel>Fecha del informe</FormLabel>
                            <Input
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                            />
                        </FormControl>
                    ) : (
                        <>
                            <FormControl>
                                <FormLabel>Fecha desde</FormLabel>
                                <Input
                                    type="date"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                />
                            </FormControl>
                            <FormControl isInvalid={rangeInvalid}>
                                <FormLabel>Fecha hasta</FormLabel>
                                <Input
                                    type="date"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                />
                                {rangeInvalid ? (
                                    <FormHelperText color="red.500">
                                        &quot;Desde&quot; no puede ser posterior a &quot;hasta&quot;.
                                    </FormHelperText>
                                ) : null}
                            </FormControl>
                        </>
                    )}
                    <ExcelDecimalSeparatorSelector
                        value={decimalSeparator}
                        onChange={setDecimalSeparator}
                    />
                    <Box>
                        <Button
                            colorScheme="blue"
                            onClick={() => handleDownload("NUMERIC")}
                            isDisabled={!canDownload}
                            isLoading={downloadingMode === "NUMERIC"}
                            mr={3}
                        >
                            Descargar Excel funcional
                        </Button>
                        <Button
                            colorScheme="green"
                            variant="outline"
                            onClick={() => handleDownload("TEXT_DETERMINISTIC")}
                            isDisabled={!canDownload}
                            isLoading={downloadingMode === "TEXT_DETERMINISTIC"}
                        >
                            Descargar Excel para copiar
                        </Button>
                    </Box>
                </VStack>
            </CardBody>
        </Card>
    );
}
