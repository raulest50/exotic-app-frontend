import {
    Steps,
    Alert,
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
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
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
    const toast = useAppToast();

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
        <VStack align="stretch" gap={6}>
            <Heading size="md" color="red.700">
                Ejecutar Purga Completa Terminados
            </Heading>

            {!hasResult && (
                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>
                        Al ejecutar esta acción se intentará eliminar todos los
                        terminados existentes. El backend devolverá un resumen de
                        éxitos, fallos parciales o bloqueo por entorno.
                    </Alert.Description>
                </Alert.Root>
            )}

            {hasResult && (
                <Alert.Root status={!resultPurgaTerminados.permitted ? "error" : resultPurgaTerminados.fallidos > 0 ? "warning" : "success"}>
                    <Alert.Indicator />
                    <Alert.Description>{resultPurgaTerminados.message}</Alert.Description>
                </Alert.Root>
            )}

            {hasResult && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Resumen de ejecución
                    </Heading>
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Campo</Table.ColumnHeader>
                                <Table.ColumnHeader>Valor</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            <Table.Row>
                                <Table.Cell>Permitido</Table.Cell>
                                <Table.Cell>{resultPurgaTerminados.permitted ? "Sí" : "No"}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Ejecutado</Table.Cell>
                                <Table.Cell>{resultPurgaTerminados.executed ? "Sí" : "No"}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Total terminados</Table.Cell>
                                <Table.Cell>{resultPurgaTerminados.totalTerminados}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Eliminados</Table.Cell>
                                <Table.Cell>{resultPurgaTerminados.eliminados}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Fallidos</Table.Cell>
                                <Table.Cell>{resultPurgaTerminados.fallidos}</Table.Cell>
                            </Table.Row>
                        </Table.Body>
                    </Table.Root>
                </Box>
            )}

            {hasResult && resultPurgaTerminados.productoIdsProcesados.length > 0 && (
                <Box>
                    <Heading size="sm" mb={2}>
                        IDs procesados
                    </Heading>
                    <Text color="app.textMuted" fontSize="sm">
                        {resultPurgaTerminados.productoIdsProcesados.join(", ")}
                    </Text>
                </Box>
            )}

            {hasResult && resultPurgaTerminados.failures.length > 0 && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Fallos parciales
                    </Heading>
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Producto ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Razón</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {resultPurgaTerminados.failures.map((failure) => (
                                <Table.Row key={`${failure.productoId}-${failure.reason}`}>
                                    <Table.Cell>{failure.productoId}</Table.Cell>
                                    <Table.Cell>{failure.reason}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Box>
            )}

            {!hasResult && (
                <Text color="app.textMuted">
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
                        colorPalette="red"
                        onClick={handleEjecutarPurga}
                        loading={isExecuting}
                        loadingText="Ejecutando..."
                    >
                        Ejecutar purga completa
                    </Button>
                ) : (
                    <Button colorPalette="teal" onClick={onReset}>
                        Reiniciar flujo
                    </Button>
                )}
            </Flex>
        </VStack>
    );
}
