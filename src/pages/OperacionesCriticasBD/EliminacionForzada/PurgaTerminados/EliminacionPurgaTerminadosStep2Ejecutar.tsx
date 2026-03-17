import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    Flex,
    Heading,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../../api/EndPointsURL";
import type { EliminacionTerminadosBatchResultDTO } from "../types";

interface EliminacionPurgaTerminadosStep2EjecutarProps {
    setActiveStep: (step: number) => void;
    resultPurgaTerminados: EliminacionTerminadosBatchResultDTO | null;
    setResultPurgaTerminados: (result: EliminacionTerminadosBatchResultDTO | null) => void;
    onReset: () => void;
}

function isBatchResult(value: unknown): value is EliminacionTerminadosBatchResultDTO {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<EliminacionTerminadosBatchResultDTO>;
    return (
        typeof candidate.permitted === "boolean" &&
        typeof candidate.executed === "boolean" &&
        typeof candidate.message === "string"
    );
}

export default function EliminacionPurgaTerminadosStep2Ejecutar({
    setActiveStep,
    resultPurgaTerminados,
    setResultPurgaTerminados,
    onReset,
}: EliminacionPurgaTerminadosStep2EjecutarProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    const handleEjecutarPurga = async () => {
        setIsExecuting(true);
        try {
            const response = await axios.delete<EliminacionTerminadosBatchResultDTO>(
                endpoints.ejecutar_purga_completa_terminados,
                { withCredentials: true }
            );
            setResultPurgaTerminados(response.data);
            toast({
                title: response.data.fallidos > 0 ? "Purga ejecutada con observaciones" : "Purga ejecutada",
                description: response.data.message,
                status: response.data.fallidos > 0 ? "warning" : "success",
                duration: 6000,
                isClosable: true,
            });
        } catch (error: unknown) {
            console.error("Error al ejecutar purga completa de terminados", error);

            if (axios.isAxiosError(error) && isBatchResult(error.response?.data)) {
                setResultPurgaTerminados(error.response.data);
                toast({
                    title: "Operación bloqueada",
                    description: error.response.data.message,
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: "Error",
                    description: "No se pudo ejecutar la purga completa de terminados.",
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                });
            }
        } finally {
            setIsExecuting(false);
        }
    };

    const hasResult = resultPurgaTerminados != null;

    return (
        <VStack align="stretch" spacing={6}>
            <Heading size="md" color="red.700">
                Ejecutar Purga Completa Terminados
            </Heading>

            {!hasResult && (
                <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                        Al ejecutar esta acción se intentará eliminar todos los
                        terminados existentes. El backend devolverá un resumen de
                        éxitos, fallos parciales o bloqueo por entorno.
                    </AlertDescription>
                </Alert>
            )}

            {hasResult && (
                <Alert status={!resultPurgaTerminados.permitted ? "error" : resultPurgaTerminados.fallidos > 0 ? "warning" : "success"}>
                    <AlertIcon />
                    <AlertDescription>{resultPurgaTerminados.message}</AlertDescription>
                </Alert>
            )}

            {hasResult && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Resumen de ejecución
                    </Heading>
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Campo</Th>
                                <Th>Valor</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            <Tr>
                                <Td>Permitido</Td>
                                <Td>{resultPurgaTerminados.permitted ? "Sí" : "No"}</Td>
                            </Tr>
                            <Tr>
                                <Td>Ejecutado</Td>
                                <Td>{resultPurgaTerminados.executed ? "Sí" : "No"}</Td>
                            </Tr>
                            <Tr>
                                <Td>Total terminados</Td>
                                <Td>{resultPurgaTerminados.totalTerminados}</Td>
                            </Tr>
                            <Tr>
                                <Td>Eliminados</Td>
                                <Td>{resultPurgaTerminados.eliminados}</Td>
                            </Tr>
                            <Tr>
                                <Td>Fallidos</Td>
                                <Td>{resultPurgaTerminados.fallidos}</Td>
                            </Tr>
                        </Tbody>
                    </Table>
                </Box>
            )}

            {hasResult && resultPurgaTerminados.productoIdsProcesados.length > 0 && (
                <Box>
                    <Heading size="sm" mb={2}>
                        IDs procesados
                    </Heading>
                    <Text color="gray.600" fontSize="sm">
                        {resultPurgaTerminados.productoIdsProcesados.join(", ")}
                    </Text>
                </Box>
            )}

            {hasResult && resultPurgaTerminados.failures.length > 0 && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Fallos parciales
                    </Heading>
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Producto ID</Th>
                                <Th>Razón</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {resultPurgaTerminados.failures.map((failure) => (
                                <Tr key={`${failure.productoId}-${failure.reason}`}>
                                    <Td>{failure.productoId}</Td>
                                    <Td>{failure.reason}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            )}

            {!hasResult && (
                <Text color="gray.600">
                    Revise la advertencia anterior y confirme solo si desea ejecutar
                    la purga completa de terminados en el entorno actual.
                </Text>
            )}

            <Flex gap={3} w="full" justify="space-between">
                <Button
                    variant="outline"
                    onClick={() => {
                        if (hasResult) {
                            setResultPurgaTerminados(null);
                        }
                        setActiveStep(hasResult ? 0 : 1);
                    }}
                >
                    {hasResult ? "Volver al inicio" : "Atrás"}
                </Button>

                {!hasResult ? (
                    <Button
                        colorScheme="red"
                        onClick={handleEjecutarPurga}
                        isLoading={isExecuting}
                        loadingText="Ejecutando..."
                    >
                        Ejecutar purga completa
                    </Button>
                ) : (
                    <Button colorScheme="teal" onClick={onReset}>
                        Reiniciar flujo
                    </Button>
                )}
            </Flex>
        </VStack>
    );
}
