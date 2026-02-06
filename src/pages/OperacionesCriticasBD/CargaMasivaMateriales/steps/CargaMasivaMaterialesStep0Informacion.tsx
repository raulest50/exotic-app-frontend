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

interface CargaMasivaMaterialesStep0InformacionProps {
    setActiveStep: (step: number) => void;
}

export default function CargaMasivaMaterialesStep0Informacion({ setActiveStep }: CargaMasivaMaterialesStep0InformacionProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadTemplate = async () => {
        setIsDownloading(true);
        try {
            const response = await axios.get(endpoints.carga_masiva_materiales_template, {
                withCredentials: true,
                responseType: "blob",
            });

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const contentDisposition = response.headers["content-disposition"];
            let filename = "plantilla_carga_masiva_materiales.xlsx";
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
                description: "Complete las columnas y suba el archivo en el siguiente paso.",
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
                    Se descargará una plantilla Excel vacía para registrar materiales (ROH) en bloque.
                    Columnas: <strong>producto_id</strong>, <strong>nombre</strong>, <strong>observaciones</strong>, <strong>costo</strong>, <strong>iva_percentual</strong>, <strong>tipo_unidades</strong> (L, KG, U), <strong>cantidad_unidad</strong>, <strong>stock_minimo</strong>, <strong>inventareable</strong> (true/false), <strong>ficha_tecnica_url</strong>, <strong>tipo_material</strong> (1=Materia Prima, 2=Material de Empaque), <strong>punto_reorden</strong> (-1 para ignorar alertas).
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
