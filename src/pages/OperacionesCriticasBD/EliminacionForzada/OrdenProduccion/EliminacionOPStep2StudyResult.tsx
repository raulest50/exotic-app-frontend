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
import type { EstudiarEliminacionOPResponseDTO } from "../types";

interface EliminacionOPStep2StudyResultProps {
    setActiveStep: (step: number) => void;
    studyResultOP: EstudiarEliminacionOPResponseDTO | null;
    onReset: () => void;
}

function formatDate(value: string | null): string {
    if (!value) return "-";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

export default function EliminacionOPStep2StudyResult({
    setActiveStep,
    studyResultOP,
    onReset,
}: EliminacionOPStep2StudyResultProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    const handleEjecutarEliminacion = async () => {
        if (!studyResultOP || !studyResultOP.eliminable) return;
        const ordenProduccionId = studyResultOP.ordenProduccionId;
        setIsExecuting(true);
        try {
            const url = `${endpoints.ejecutar_eliminacion_orden_produccion}/${ordenProduccionId}`;
            await axios.delete(url, { withCredentials: true });
            toast({
                title: "Eliminación ejecutada",
                description:
                    "La orden de producción y sus dependencias se han eliminado correctamente.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            onReset();
        } catch (error: unknown) {
            console.error("Error al ejecutar eliminación OP", error);
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : "No se pudo ejecutar la eliminación.";
            toast({
                title: "Error",
                description: message,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsExecuting(false);
        }
    };

    if (!studyResultOP) {
        return (
            <Box>
                <Text color="gray.600">No hay resultado de estudio disponible.</Text>
                <Flex gap={3} mt={4}>
                    <Button variant="outline" onClick={() => setActiveStep(1)}>
                        Atrás
                    </Button>
                </Flex>
            </Box>
        );
    }

    const {
        ordenProduccionId,
        eliminable,
        ordenesSeguimiento,
        lotes,
        transaccionesAlmacen,
        asientosContables,
    } = studyResultOP;

    return (
        <VStack align="stretch" spacing={6}>
            <Heading size="md">
                Resultado del estudio - Orden de producción #{ordenProduccionId}
            </Heading>

            {!eliminable && (
                <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                        No se puede eliminar esta orden de producción porque tiene
                        transacciones de almacén asociadas (dispensaciones u otras).
                        Solo se permite eliminación forzada cuando no hay
                        transacciones vinculadas.
                    </AlertDescription>
                </Alert>
            )}

            {eliminable && (
                <Alert status="info">
                    <AlertIcon />
                    <AlertDescription>
                        Esta orden no tiene transacciones de almacén. Se puede
                        ejecutar la eliminación (se eliminarán los lotes
                        reservados y la orden con sus seguimientos).
                    </AlertDescription>
                </Alert>
            )}

            <Text color="gray.600">
                Registros asociados a esta orden de producción:
            </Text>

            {/* Órdenes de seguimiento */}
            <Box>
                <Heading size="sm" mb={2}>
                    Órdenes de seguimiento ({ordenesSeguimiento.length})
                </Heading>
                {ordenesSeguimiento.length > 0 ? (
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Seguimiento ID</Th>
                                <Th>Estado</Th>
                                <Th>Producto (insumo)</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {ordenesSeguimiento.map((seg) => (
                                <Tr key={seg.seguimientoId}>
                                    <Td>{seg.seguimientoId}</Td>
                                    <Td>{seg.estado}</Td>
                                    <Td>{seg.productoId ?? "-"}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color="gray.500">Ninguna.</Text>
                )}
            </Box>

            {/* Lotes */}
            <Box>
                <Heading size="sm" mb={2}>
                    Lotes ({lotes.length})
                </Heading>
                {lotes.length > 0 ? (
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Batch</Th>
                                <Th>Fecha prod.</Th>
                                <Th>Fecha venc.</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {lotes.map((lote) => (
                                <Tr key={lote.id}>
                                    <Td>{lote.id}</Td>
                                    <Td>{lote.batchNumber}</Td>
                                    <Td>
                                        {lote.productionDate
                                            ? formatDate(lote.productionDate)
                                            : "-"}
                                    </Td>
                                    <Td>
                                        {lote.expirationDate
                                            ? formatDate(lote.expirationDate)
                                            : "-"}
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color="gray.500">Ningún lote.</Text>
                )}
            </Box>

            {/* Transacciones de almacén */}
            <Box>
                <Heading size="sm" mb={2}>
                    Transacciones de almacén ({transaccionesAlmacen.length})
                </Heading>
                {transaccionesAlmacen.length > 0 ? (
                    <VStack align="stretch" spacing={3}>
                        {transaccionesAlmacen.map((ta) => (
                            <Box
                                key={ta.transaccionId}
                                borderWidth="1px"
                                borderRadius="md"
                                p={3}
                            >
                                <Text fontWeight="medium">
                                    Transacción #{ta.transaccionId} -{" "}
                                    {formatDate(ta.fechaTransaccion)} -{" "}
                                    {ta.estadoContable ?? "-"}
                                </Text>
                                {ta.observaciones && (
                                    <Text fontSize="sm" color="gray.600">
                                        {ta.observaciones}
                                    </Text>
                                )}
                                {ta.movimientos && ta.movimientos.length > 0 && (
                                    <Table size="sm" mt={2} variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Mov. ID</Th>
                                                <Th>Producto</Th>
                                                <Th>Cantidad</Th>
                                                <Th>Tipo</Th>
                                                <Th>Almacén</Th>
                                                <Th>Fecha</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {ta.movimientos.map((m) => (
                                                <Tr key={m.movimientoId}>
                                                    <Td>{m.movimientoId}</Td>
                                                    <Td>{m.productId ?? "-"}</Td>
                                                    <Td>{m.cantidad}</Td>
                                                    <Td>{m.tipoMovimiento ?? "-"}</Td>
                                                    <Td>{m.almacen ?? "-"}</Td>
                                                    <Td>
                                                        {formatDate(m.fechaMovimiento)}
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                )}
                            </Box>
                        ))}
                    </VStack>
                ) : (
                    <Text color="gray.500">Ninguna transacción.</Text>
                )}
            </Box>

            {/* Asientos contables */}
            <Box>
                <Heading size="sm" mb={2}>
                    Asientos contables ({asientosContables.length})
                </Heading>
                {asientosContables.length > 0 ? (
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Fecha</Th>
                                <Th>Descripción</Th>
                                <Th>Módulo</Th>
                                <Th>Estado</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {asientosContables.map((a) => (
                                <Tr key={a.id}>
                                    <Td>{a.id}</Td>
                                    <Td>{formatDate(a.fecha)}</Td>
                                    <Td>{a.descripcion ?? "-"}</Td>
                                    <Td>{a.modulo ?? "-"}</Td>
                                    <Td>{a.estado ?? "-"}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color="gray.500">Ningún asiento contable.</Text>
                )}
            </Box>

            <Flex gap={3} mt={4} w="full" justify="space-between">
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                    Atrás
                </Button>
                {eliminable && (
                    <Button
                        colorScheme="teal"
                        onClick={handleEjecutarEliminacion}
                        isLoading={isExecuting}
                        loadingText="Ejecutando..."
                    >
                        Ejecutar eliminación
                    </Button>
                )}
            </Flex>
        </VStack>
    );
}
