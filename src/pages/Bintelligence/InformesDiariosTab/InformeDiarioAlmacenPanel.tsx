import { useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardBody,
    FormControl,
    FormLabel,
    Input,
    Select,
    Text,
    VStack,
    useToast,
} from "@chakra-ui/react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";

type TipoReporteAlmacen = "ingreso_materiales" | "dispensacion_materiales" | "ingreso_terminado";

export default function InformeDiarioAlmacenPanel() {
    const toast = useToast();
    const [tipoReporte, setTipoReporte] = useState<TipoReporteAlmacen>("ingreso_materiales");
    const [fecha, setFecha] = useState("");
    const [downloading, setDownloading] = useState(false);

    const endPoints = useMemo(() => new EndPointsURL(), []);

    const canDownload =
        fecha.length > 0 &&
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

    const handleDownload = async () => {
        if (!canDownload) return;
        setDownloading(true);
        try {
            let url: string;
            let filename: string;
            if (tipoReporte === "ingreso_materiales") {
                url = endPoints.informesDiariosAlmacenIngresoMaterialesExcel(fecha);
                filename = `informe_ingreso_materiales_${fecha}.xlsx`;
            } else if (tipoReporte === "dispensacion_materiales") {
                url = endPoints.informesDiariosAlmacenDispensacionMaterialesExcel(fecha);
                filename = `informe_dispensacion_materiales_${fecha}.xlsx`;
            } else {
                url = endPoints.informesDiariosAlmacenIngresoTerminadosExcel(fecha);
                filename = `informe_ingreso_terminados_${fecha}.xlsx`;
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
            setDownloading(false);
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
                        <FormLabel>Fecha del informe</FormLabel>
                        <Input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                        />
                    </FormControl>
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
