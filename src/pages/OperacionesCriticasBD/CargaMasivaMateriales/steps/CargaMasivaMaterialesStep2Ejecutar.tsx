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
import { useState, useMemo } from "react";
import axios, { AxiosError } from "axios";
import EndPointsURL from "../../../../api/EndPointsURL";
import { ImCheckboxChecked } from "react-icons/im";
import { RiSave3Fill } from "react-icons/ri";
import { keyframes } from "@emotion/react";

interface CargaMasivaMaterialesStep2EjecutarProps {
    setActiveStep: (step: number) => void;
    excelFile: File | null;
    onSuccess?: () => void;
}

interface ValidationResultDTO {
    valid: boolean;
    errors: { rowNumber: number; productoId: string; message: string }[];
    rowCount: number;
}

export default function CargaMasivaMaterialesStep2Ejecutar({
    setActiveStep,
    excelFile,
    onSuccess,
}: CargaMasivaMaterialesStep2EjecutarProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionSuccess, setExecutionSuccess] = useState(false);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [executionErrors, setExecutionErrors] = useState<{ rowNumber: number; productoId: string; message: string }[]>([]);

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
        setExecutionErrors([]);
        setExecutionSuccess(false);

        try {
            const formData = new FormData();
            formData.append("file", excelFile);

            const response = await axios.post<ValidationResultDTO>(endpoints.carga_masiva_materiales_ejecutar, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
            });

            const result = response.data;
            if (!result.valid && result.errors && result.errors.length > 0) {
                setExecutionErrors(result.errors);
                setExecutionError(`${result.errors.length} error(es) al procesar. Ver detalles abajo.`);
                toast({
                    title: "Errores en la ejecución",
                    description: `Se encontraron ${result.errors.length} error(es)`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                const successCount = result.rowCount ?? 0;
                setExecutionSuccess(true);
                toast({
                    title: "Carga masiva completada",
                    description: `Se registraron ${successCount} material(es) correctamente.`,
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                });
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            const err = error as AxiosError<ValidationResultDTO>;
            let errorMessage = "Error al ejecutar la carga masiva";
            if (axios.isAxiosError(err) && err.response?.data) {
                const data = err.response.data;
                if (data.errors?.length) {
                    setExecutionErrors(data.errors);
                    errorMessage = `${data.errors.length} error(es): ${data.errors.map((e) => e.message).join("; ")}`;
                } else {
                    errorMessage = (err.response?.data as { message?: string })?.message || err.message || errorMessage;
                }
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
                    Los materiales se registraron correctamente en la base de datos.
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
                        Se procesará el archivo Excel y se registrarán los materiales en la base de datos (tabla productos).
                    </Text>

                    {executionError && (
                        <Alert status="error" mb={4}>
                            <AlertIcon />
                            <Box>
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    <VStack align="stretch" spacing={1} mt={2}>
                                        <Text>{executionError}</Text>
                                        {executionErrors.slice(0, 10).map((e, idx) => (
                                            <Text key={idx} fontSize="sm">
                                                Fila {e.rowNumber} ({e.productoId}): {e.message}
                                            </Text>
                                        ))}
                                        {executionErrors.length > 10 && (
                                            <Text fontSize="sm" fontStyle="italic">
                                                ... y {executionErrors.length - 10} errores más
                                            </Text>
                                        )}
                                    </VStack>
                                </AlertDescription>
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
