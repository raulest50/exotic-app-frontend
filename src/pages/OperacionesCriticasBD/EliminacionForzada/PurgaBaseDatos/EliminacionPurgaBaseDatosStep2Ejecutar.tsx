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
import type { PurgaBaseDatosResultDTO } from "../types";

interface EliminacionPurgaBaseDatosStep2EjecutarProps {
    setActiveStep: (step: number) => void;
    resultPurgaBaseDatos: PurgaBaseDatosResultDTO | null;
    setResultPurgaBaseDatos: (result: PurgaBaseDatosResultDTO | null) => void;
    onReset: () => void;
}

function isPurgaBaseDatosResult(value: unknown): value is PurgaBaseDatosResultDTO {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<PurgaBaseDatosResultDTO>;
    return (
        typeof candidate.permitted === "boolean" &&
        typeof candidate.executed === "boolean" &&
        typeof candidate.message === "string" &&
        typeof candidate.environment === "string"
    );
}

export default function EliminacionPurgaBaseDatosStep2Ejecutar({
    setActiveStep,
    resultPurgaBaseDatos,
    setResultPurgaBaseDatos,
    onReset,
}: EliminacionPurgaBaseDatosStep2EjecutarProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useAppToast();

    const handleEjecutarPurga = async () => {
        setIsExecuting(true);
        try {
            const response = await axios.delete<PurgaBaseDatosResultDTO>(
                endpoints.ejecutar_purga_total_base_datos,
                { withCredentials: true }
            );
            setResultPurgaBaseDatos(response.data);
            toast({
                title: response.data.executed ? "Purga total ejecutada" : "Purga total no ejecutada",
                description: response.data.message,
                status: response.data.executed ? "success" : "warning",
                duration: 6000,
                isClosable: true,
            });
        } catch (error: unknown) {
            console.error("Error al ejecutar purga total de base de datos", error);

            if (axios.isAxiosError(error) && isPurgaBaseDatosResult(error.response?.data)) {
                setResultPurgaBaseDatos(error.response.data);
                toast({
                    title: "Operacion bloqueada",
                    description: error.response.data.message,
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: "Error",
                    description: "No se pudo ejecutar la purga total de base de datos.",
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                });
            }
        } finally {
            setIsExecuting(false);
        }
    };

    const hasResult = resultPurgaBaseDatos != null;

    return (
        <VStack align="stretch" gap={6}>
            <Heading size="md" color="red.700">
                Ejecutar Purga Total Base de Datos
            </Heading>

            {!hasResult && (
                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>
                        Al ejecutar esta accion se intentara vaciar toda la base de datos y el
                        backend devolvera un resumen con el resultado final o el motivo del bloqueo.
                    </Alert.Description>
                </Alert.Root>
            )}

            {hasResult && (
                <Alert.Root status={!resultPurgaBaseDatos.permitted ? "error" : resultPurgaBaseDatos.executed ? "success" : "warning"}>
                    <Alert.Indicator />
                    <Alert.Description>{resultPurgaBaseDatos.message}</Alert.Description>
                </Alert.Root>
            )}

            {hasResult && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Resumen de ejecucion
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
                                <Table.Cell>{resultPurgaBaseDatos.permitted ? "Si" : "No"}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Ejecutado</Table.Cell>
                                <Table.Cell>{resultPurgaBaseDatos.executed ? "Si" : "No"}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Entorno</Table.Cell>
                                <Table.Cell>{resultPurgaBaseDatos.environment}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Tablas truncadas</Table.Cell>
                                <Table.Cell>{resultPurgaBaseDatos.truncatedTablesCount}</Table.Cell>
                            </Table.Row>
                        </Table.Body>
                    </Table.Root>
                </Box>
            )}

            {hasResult && resultPurgaBaseDatos.truncatedTables.length > 0 && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Tablas truncadas
                    </Heading>
                    <Text color="app.textMuted" fontSize="sm">
                        {resultPurgaBaseDatos.truncatedTables.join(", ")}
                    </Text>
                </Box>
            )}

            {hasResult && resultPurgaBaseDatos.preservedTables.length > 0 && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Tablas preservadas
                    </Heading>
                    <Text color="app.textMuted" fontSize="sm">
                        {resultPurgaBaseDatos.preservedTables.join(", ")}
                    </Text>
                </Box>
            )}

            {hasResult && resultPurgaBaseDatos.preservedUsers.length > 0 && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Usuarios preservados
                    </Heading>
                    <Text color="app.textMuted" fontSize="sm">
                        {resultPurgaBaseDatos.preservedUsers.join(", ")}
                    </Text>
                </Box>
            )}

            {!hasResult && (
                <Text color="app.textMuted">
                    Revise la advertencia anterior y confirme solo si desea ejecutar la purga
                    total de la base de datos en el entorno actual.
                </Text>
            )}

            <Flex gap={3} w="full" justify="space-between">
                <Button
                    variant="outline"
                    onClick={() => {
                        if (hasResult) {
                            setResultPurgaBaseDatos(null);
                        }
                        setActiveStep(hasResult ? 0 : 1);
                    }}
                >
                    {hasResult ? "Volver al inicio" : "Atras"}
                </Button>

                {!hasResult ? (
                    <Button
                        colorPalette="red"
                        onClick={handleEjecutarPurga}
                        loading={isExecuting}
                        loadingText="Ejecutando..."
                    >
                        Ejecutar purga total
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
