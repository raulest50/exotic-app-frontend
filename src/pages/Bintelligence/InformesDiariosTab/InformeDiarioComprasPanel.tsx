import { useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardBody,
    FormControl,
    FormLabel,
    Input,
    Text,
    VStack,
    useToast,
} from "@chakra-ui/react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";

export default function InformeDiarioComprasPanel() {
    const toast = useToast();
    const [fecha, setFecha] = useState("");
    const [downloading, setDownloading] = useState(false);

    const endPoints = useMemo(() => new EndPointsURL(), []);

    const canDownload = fecha.length > 0;

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
            const url = endPoints.informesDiariosComprasExcel(fecha);
            const response = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
            triggerFileDownload(response.data, `informe_compras_ocm_${fecha}.xlsx`);
        } catch (e) {
            toast({
                title: "No se pudo descargar el informe",
                description: axios.isAxiosError(e)
                    ? e.response?.status === 401
                        ? "SesiÃ³n expirada o no autorizado."
                        : `Error ${e.response?.status ?? ""}`.trim()
                    : "Comprueba la conexiÃ³n y vuelve a intentar.",
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
