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
import EndPointsURL, { type ExcelDecimalSeparator } from "../../../api/EndPointsURL.tsx";
import ExcelDecimalSeparatorSelector, {
    DEFAULT_EXCEL_DECIMAL_SEPARATOR,
} from "../../../components/ExcelDecimalSeparatorSelector.tsx";

type ModoFechaInforme = "fecha_unica" | "rango";

export default function InformeDiarioComprasPanel() {
    const toast = useToast();
    const [modoFecha, setModoFecha] = useState<ModoFechaInforme>("fecha_unica");
    const [fecha, setFecha] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [decimalSeparator, setDecimalSeparator] = useState<ExcelDecimalSeparator>(DEFAULT_EXCEL_DECIMAL_SEPARATOR);
    const [downloading, setDownloading] = useState(false);

    const endPoints = useMemo(() => new EndPointsURL(), []);

    const rangeInvalid = modoFecha === "rango" && fechaDesde.length > 0 && fechaHasta.length > 0 && fechaDesde > fechaHasta;
    const canDownload =
        modoFecha === "fecha_unica"
            ? fecha.length > 0
            : fechaDesde.length > 0 && fechaHasta.length > 0 && !rangeInvalid;

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

    const handleDownload = async () => {
        if (!canDownload) return;
        setDownloading(true);
        try {
            const isRange = modoFecha === "rango";
            const url = isRange
                ? endPoints.informesDiariosComprasExcelRango(fechaDesde, fechaHasta, decimalSeparator)
                : endPoints.informesDiariosComprasExcel(fecha, decimalSeparator);
            const fileSuffix = buildFileSuffix();
            const response = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
            triggerFileDownload(response.data, `informe_compras_ocm_${fileSuffix}.xlsx`);
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
            setDownloading(false);
        }
    };

    return (
        <Card variant="outline">
            <CardBody>
                <Text fontWeight="semibold" mb={4}>
                    Informe diario de compras (OCM)
                </Text>
                <VStack align="stretch" spacing={4} maxW="md">
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
                            onClick={handleDownload}
                            isDisabled={!canDownload}
                            isLoading={downloading}
                        >
                            Descargar Excel
                        </Button>
                    </Box>
                </VStack>
            </CardBody>
        </Card>
    );
}
