import {
    Box,
    Button,
    Flex,
    Text,
    useToast,
    VStack,
    Alert,
    AlertIcon,
    AlertDescription,
    AlertTitle,
    Spinner,
    Heading,
} from "@chakra-ui/react";
import { useState } from "react";
import axios, { AxiosError } from "axios";
import { useMemo } from "react";
import EndPointsURL from "../../../../api/EndPointsURL";
import { ImCheckboxChecked } from "react-icons/im";
import { RiSave3Fill } from "react-icons/ri";
import { keyframes } from "@emotion/react";

interface CargaMasivaStep2EjecutarProps {
    setActiveStep: (step: number) => void;
    excelFile: File | null;
    onSuccess?: () => void;
}

export default function CargaMasivaStep2Ejecutar({
    setActiveStep,
    excelFile,
    onSuccess,
}: CargaMasivaStep2EjecutarProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionSuccess, setExecutionSuccess] = useState(false);
    const [executionError, setExecutionError] = useState<string | null>(null);

    const colorAnimation = keyframes`
        0% { color: #68D391; }
        50% { color: #22d3ee; }
        100% { color: #68D391; }
    `;

    const handleExecute = async () => {
        if (!excelFile) {
            toast({
                title: "Error",
                description: "No hay archivo Excel para procesar",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        setIsExecuting(true);
        setExecutionError(null);
        setExecutionSuccess(false);

        try {
            const formData = new FormData();
            formData.append("file", excelFile);

            const response = await axios.post(endpoints.carga_masiva_ejecutar, formData, {
                withCredentials: true,
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                responseType: "blob",
            });

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const contentDisposition = response.headers["content-disposition"];
            let filename = "reporte_carga_masiva.xlsx";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match && match[1]) filename = match[1].trim();
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setExecutionSuccess(true);
            toast({
                title: "Carga masiva completada",
                description: "Se ha generado un reporte con los resultados. Descargando...",
                status: "success",
                duration: 5000,
                isClosable: true,
            });

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            const err = error as AxiosError;
            let errorMessage = "Error al ejecutar la carga masiva";
            if (axios.isAxiosError(err)) {
                errorMessage = err.response?.data?.message || err.message || errorMessage;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            setExecutionError(errorMessage);
            toast({
                title: "Error en la ejecución",
                description: errorMessage,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsExecuting(false);
        }
    };

    if (executionSuccess) {
        return (
            <Flex
                p="1em"
                direction="column"
                backgroundColor="green.50"
                gap={8}
                alignItems="center"
                textAlign="center"
            >
                <Flex alignItems="center" gap={3}>
                    <Heading fontFamily="Comfortaa Variable" color="green.800">
                        Carga masiva completada
                    </Heading>
                    <ImCheckboxChecked style={{ width: "3em", height: "3em", color: "#48BB78" }} />
                </Flex>
                <Text fontFamily="Comfortaa Variable" color="green.900">
                    La carga masiva se ejecutó correctamente. Se ha descargado un reporte con los resultados.
                </Text>
                <RiSave3Fill
                    style={{
                        width: "10em",
                        height: "10em",
                        color: "#68D391",
                        animation: `${colorAnimation} 3s infinite ease-in-out`,
                    }}
                />
                <Button
                    variant="solid"
                    colorScheme="green"
                    onClick={() => {
                        setExecutionSuccess(false);
                        setActiveStep(0);
                        if (onSuccess) onSuccess();
                    }}
                >
                    Iniciar nueva carga masiva
                </Button>
            </Flex>
        );
    }

    return (
        <Box p={4}>
            <VStack align="stretch" spacing={6}>
                <Text fontSize="lg" fontWeight="semibold">
                    Ejecutar carga masiva
                </Text>

                <Box p={5} borderWidth="1px" borderRadius="lg">
                    <Text mb={4}>
                        Se procesará el archivo Excel y se actualizarán los materiales con los cambios de inventario
                        y/o costo especificados.
                    </Text>

                    {executionError && (
                        <Alert status="error" mb={4}>
                            <AlertIcon />
                            <Box>
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{executionError}</AlertDescription>
                            </Box>
                        </Alert>
                    )}

                    {isExecuting && (
                        <Flex direction="column" align="center" gap={4} py={4}>
                            <Spinner size="xl" color="teal.500" />
                            <Text>Procesando carga masiva...</Text>
                        </Flex>
                    )}

                    <Flex gap={4} justify="flex-end" mt={4}>
                        <Button variant="outline" onClick={() => setActiveStep(1)} isDisabled={isExecuting}>
                            Atrás
                        </Button>
                        <Button
                            colorScheme="teal"
                            onClick={handleExecute}
                            isLoading={isExecuting}
                            loadingText="Ejecutando..."
                            isDisabled={isExecuting || !excelFile}
                        >
                            Ejecutar carga masiva
                        </Button>
                    </Flex>
                </Box>
            </VStack>
        </Box>
    );
}
