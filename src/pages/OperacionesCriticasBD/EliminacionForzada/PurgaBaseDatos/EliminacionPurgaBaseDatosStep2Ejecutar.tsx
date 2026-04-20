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
    const toast = useToast();

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
        <VStack align="stretch" spacing={6}>
            <Heading size="md" color="red.700">
                Ejecutar Purga Total Base de Datos
            </Heading>

            {!hasResult && (
                <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                        Al ejecutar esta accion se intentara vaciar toda la base de datos y el
                        backend devolvera un resumen con el resultado final o el motivo del bloqueo.
                    </AlertDescription>
                </Alert>
            )}

            {hasResult && (
                <Alert status={!resultPurgaBaseDatos.permitted ? "error" : resultPurgaBaseDatos.executed ? "success" : "warning"}>
                    <AlertIcon />
                    <AlertDescription>{resultPurgaBaseDatos.message}</AlertDescription>
                </Alert>
            )}

            {hasResult && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Resumen de ejecucion
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
                                <Td>{resultPurgaBaseDatos.permitted ? "Si" : "No"}</Td>
                            </Tr>
                            <Tr>
                                <Td>Ejecutado</Td>
                                <Td>{resultPurgaBaseDatos.executed ? "Si" : "No"}</Td>
                            </Tr>
                            <Tr>
                                <Td>Entorno</Td>
                                <Td>{resultPurgaBaseDatos.environment}</Td>
                            </Tr>
                            <Tr>
                                <Td>Tablas truncadas</Td>
                                <Td>{resultPurgaBaseDatos.truncatedTablesCount}</Td>
                            </Tr>
                        </Tbody>
                    </Table>
                </Box>
            )}

            {hasResult && resultPurgaBaseDatos.truncatedTables.length > 0 && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Tablas truncadas
                    </Heading>
                    <Text color="gray.600" fontSize="sm">
                        {resultPurgaBaseDatos.truncatedTables.join(", ")}
                    </Text>
                </Box>
            )}

            {hasResult && resultPurgaBaseDatos.preservedTables.length > 0 && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Tablas preservadas
                    </Heading>
                    <Text color="gray.600" fontSize="sm">
                        {resultPurgaBaseDatos.preservedTables.join(", ")}
                    </Text>
                </Box>
            )}

            {hasResult && resultPurgaBaseDatos.preservedUsers.length > 0 && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Usuarios preservados
                    </Heading>
                    <Text color="gray.600" fontSize="sm">
                        {resultPurgaBaseDatos.preservedUsers.join(", ")}
                    </Text>
                </Box>
            )}

            {!hasResult && (
                <Text color="gray.600">
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
                        colorScheme="red"
                        onClick={handleEjecutarPurga}
                        isLoading={isExecuting}
                        loadingText="Ejecutando..."
                    >
                        Ejecutar purga total
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
