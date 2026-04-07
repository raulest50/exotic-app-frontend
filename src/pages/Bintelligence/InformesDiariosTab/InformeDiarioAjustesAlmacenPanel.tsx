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
import EndPointsURL from "../../../api/EndPointsURL.tsx";

type SentidoAjuste = "ENTRADAS" | "SALIDAS" | "MIXTA";

export default function InformeDiarioAjustesAlmacenPanel() {
    const toast = useToast();
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [sentido, setSentido] = useState<SentidoAjuste>("MIXTA");
    const [downloading, setDownloading] = useState(false);

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

    const handleDownload = async () => {
        if (!canDownload) return;
        setDownloading(true);
        try {
            const url = endPoints.informesDiariosAlmacenAjustesExcel(fechaDesde, fechaHasta, sentido);
            const response = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
            const filename = `informe_ajustes_almacen_${sentido}_${fechaDesde}_${fechaHasta}.xlsx`;
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
            setDownloading(false);
        }
    };

    return (
        <Card variant="outline">
            <CardBody>
                <Text fontWeight="semibold" mb={4}>
                    Ajustes almacén
                </Text>
                <VStack align="stretch" spacing={4} maxW="md">
                    <FormControl>
                        <FormLabel>Fecha desde</FormLabel>
                        <Input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                        />
                        <FormHelperText>
                            Para un solo día, use la misma fecha en desde y hasta.
                        </FormHelperText>
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
                    <FormControl>
                        <FormLabel>Tipo de movimientos</FormLabel>
                        <Select
                            value={sentido}
                            onChange={(e) => setSentido(e.target.value as SentidoAjuste)}
                        >
                            <option value="ENTRADAS">Entradas (ajuste positivo)</option>
                            <option value="SALIDAS">Salidas (ajuste negativo)</option>
                            <option value="MIXTA">Mixta (entradas y salidas)</option>
                        </Select>
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
