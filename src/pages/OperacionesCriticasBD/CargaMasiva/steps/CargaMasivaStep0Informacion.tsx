import {
    Box,
    Button,
    Flex,
    Text,
    useToast,
    VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../../api/EndPointsURL";

interface CargaMasivaStep0InformacionProps {
    setActiveStep: (step: number) => void;
}

export default function CargaMasivaStep0Informacion({ setActiveStep }: CargaMasivaStep0InformacionProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadTemplate = async () => {
        setIsDownloading(true);
        try {
            const response = await axios.get(endpoints.carga_masiva_template_inventario, {
                withCredentials: true,
                responseType: "blob",
            });

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const contentDisposition = response.headers["content-disposition"];
            let filename = "plantilla_carga_masiva_inventario.xlsx";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match && match[1]) filename = match[1].trim();
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Plantilla descargada",
                description: "Complete las columnas nuevo_valor_absoluto y nuevo_costo y suba el archivo en el siguiente paso.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : (error as Error).message;
            toast({
                title: "Error al descargar plantilla",
                description: message,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Box p={4}>
            <VStack align="stretch" spacing={6}>
                <Text>
                    Se descargará una plantilla Excel con todos los materiales inventariables (no incluye semiterminados ni terminados).
                    Las columnas son: <strong>productoid</strong>, <strong>nombre</strong>, <strong>costo</strong>, <strong>cantidad_consolidada</strong>,
                    y dos columnas para completar: <strong>nuevo_valor_absoluto</strong> (nuevo valor consolidado deseado) y <strong>nuevo_costo</strong> (esta última viene precargada con el costo actual).
                </Text>
                <Flex gap={4} wrap="wrap">
                    <Button
                        colorScheme="teal"
                        onClick={handleDownloadTemplate}
                        isLoading={isDownloading}
                        loadingText="Descargando…"
                    >
                        Descargar plantilla Excel
                    </Button>
                    <Button colorScheme="blue" onClick={() => setActiveStep(1)}>
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
