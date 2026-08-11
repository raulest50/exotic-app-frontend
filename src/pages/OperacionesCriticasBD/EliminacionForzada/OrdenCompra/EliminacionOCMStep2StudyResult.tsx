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
import type { EstudiarEliminacionOCMResponseDTO } from "../types";

interface EliminacionOCMStep2StudyResultProps {
    setActiveStep: (step: number) => void;
    studyResult: EstudiarEliminacionOCMResponseDTO | null;
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

export default function EliminacionOCMStep2StudyResult({
    setActiveStep,
    studyResult,
    onReset,
}: EliminacionOCMStep2StudyResultProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useAppToast();

    const handleEjecutarEliminacion = async () => {
        if (!studyResult || !studyResult.eliminable) return;
        const ordenCompraId = studyResult.ordenCompraId;
        setIsExecuting(true);
        try {
            const url = `${endpoints.ejecutar_eliminacion_orden_compra}/${ordenCompraId}`;
            await axios.delete(url, { withCredentials: true });
            toast({
                title: "Eliminación ejecutada",
                description: "La orden de compra y sus dependencias se han eliminado correctamente.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            onReset();
        } catch (error: unknown) {
            console.error("Error al ejecutar eliminación", error);
            const message = axios.isAxiosError(error) && error.response?.data?.message
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

    if (!studyResult) {
        return (
            <Box>
                <Text color="app.textMuted">No hay resultado de estudio disponible.</Text>
                <Flex gap={3} mt={4}>
                    <Button variant="outline" onClick={() => setActiveStep(1)}>
                        Atrás
                    </Button>
                </Flex>
            </Box>
        );
    }

    const {
        ordenCompraId,
        eliminable,
        itemsOrdenCompra,
        lotes,
        transaccionesAlmacen,
        asientosContables,
    } = studyResult;

    return (
        <VStack align="stretch" gap={6}>
            <Heading size="md">
                Resultado del estudio de eliminación - Orden de compra #{ordenCompraId}
            </Heading>

            {!eliminable && (
                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>
                        No se puede eliminar esta orden de compra porque tiene transacciones de
                        almacén asociadas (ingresos de mercancía, etc.). Solo se permite eliminación
                        forzada cuando no hay transacciones vinculadas.
                    </Alert.Description>
                </Alert.Root>
            )}

            {eliminable && (
                <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Description>
                        Esta orden no tiene transacciones de almacén. Se puede ejecutar la
                        eliminación (se desvincularán lotes y se eliminarán ítems y la orden).
                    </Alert.Description>
                </Alert.Root>
            )}

            <Text color="app.textMuted">
                Registros asociados a esta orden de compra:
            </Text>

            {/* Items orden compra */}
            <Box>
                <Heading size="sm" mb={2}>
                    Ítems de orden de compra ({itemsOrdenCompra.length})
                </Heading>
                {itemsOrdenCompra.length > 0 ? (
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Item ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Producto</Table.ColumnHeader>
                                <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                <Table.ColumnHeader>Precio unit.</Table.ColumnHeader>
                                <Table.ColumnHeader>Subtotal</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {itemsOrdenCompra.map((item) => (
                                <Table.Row key={item.itemOrdenId}>
                                    <Table.Cell>{item.itemOrdenId}</Table.Cell>
                                    <Table.Cell>{item.productId ?? "-"}</Table.Cell>
                                    <Table.Cell>{item.cantidad}</Table.Cell>
                                    <Table.Cell>{item.precioUnitario.toLocaleString()}</Table.Cell>
                                    <Table.Cell>{item.subTotal.toLocaleString()}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Text color="app.textSubtle">Ningún ítem.</Text>
                )}
            </Box>

            {/* Lotes */}
            <Box>
                <Heading size="sm" mb={2}>
                    Lotes ({lotes.length})
                </Heading>
                {lotes.length > 0 ? (
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Batch</Table.ColumnHeader>
                                <Table.ColumnHeader>Fecha prod.</Table.ColumnHeader>
                                <Table.ColumnHeader>Fecha venc.</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {lotes.map((lote) => (
                                <Table.Row key={lote.id}>
                                    <Table.Cell>{lote.id}</Table.Cell>
                                    <Table.Cell>{lote.batchNumber}</Table.Cell>
                                    <Table.Cell>{lote.productionDate ? formatDate(lote.productionDate) : "-"}</Table.Cell>
                                    <Table.Cell>{lote.expirationDate ? formatDate(lote.expirationDate) : "-"}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Text color="app.textSubtle">Ningún lote.</Text>
                )}
            </Box>

            {/* Transacciones de almacén */}
            <Box>
                <Heading size="sm" mb={2}>
                    Transacciones de almacén ({transaccionesAlmacen.length})
                </Heading>
                {transaccionesAlmacen.length > 0 ? (
                    <VStack align="stretch" gap={3}>
                        {transaccionesAlmacen.map((ta) => (
                            <Box key={ta.transaccionId} borderWidth="1px" borderRadius="md" p={3}>
                                <Text fontWeight="medium">
                                    Transacción #{ta.transaccionId} - {formatDate(ta.fechaTransaccion)} -{" "}
                                    {ta.estadoContable ?? "-"}
                                </Text>
                                {ta.observaciones && (
                                    <Text fontSize="sm" color="app.textMuted">{ta.observaciones}</Text>
                                )}
                                {ta.movimientos && ta.movimientos.length > 0 && (
                                    <Table.Root size="sm" mt={2} variant="simple">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.ColumnHeader>Mov. ID</Table.ColumnHeader>
                                                <Table.ColumnHeader>Producto</Table.ColumnHeader>
                                                <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                                <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                                <Table.ColumnHeader>Almacén</Table.ColumnHeader>
                                                <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {ta.movimientos.map((m) => (
                                                <Table.Row key={m.movimientoId}>
                                                    <Table.Cell>{m.movimientoId}</Table.Cell>
                                                    <Table.Cell>{m.productId ?? "-"}</Table.Cell>
                                                    <Table.Cell>{m.cantidad}</Table.Cell>
                                                    <Table.Cell>{m.tipoMovimiento ?? "-"}</Table.Cell>
                                                    <Table.Cell>{m.almacen ?? "-"}</Table.Cell>
                                                    <Table.Cell>{formatDate(m.fechaMovimiento)}</Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                    </Table.Root>
                                )}
                            </Box>
                        ))}
                    </VStack>
                ) : (
                    <Text color="app.textSubtle">Ninguna transacción.</Text>
                )}
            </Box>

            {/* Asientos contables */}
            <Box>
                <Heading size="sm" mb={2}>
                    Asientos contables ({asientosContables.length})
                </Heading>
                {asientosContables.length > 0 ? (
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                                <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                                <Table.ColumnHeader>Módulo</Table.ColumnHeader>
                                <Table.ColumnHeader>Estado</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {asientosContables.map((a) => (
                                <Table.Row key={a.id}>
                                    <Table.Cell>{a.id}</Table.Cell>
                                    <Table.Cell>{formatDate(a.fecha)}</Table.Cell>
                                    <Table.Cell>{a.descripcion ?? "-"}</Table.Cell>
                                    <Table.Cell>{a.modulo ?? "-"}</Table.Cell>
                                    <Table.Cell>{a.estado ?? "-"}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Text color="app.textSubtle">Ningún asiento contable.</Text>
                )}
            </Box>

            <Flex gap={3} mt={4} w="full" justify="space-between">
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                    Atrás
                </Button>
                {eliminable && (
                    <Button
                        colorPalette="teal"
                        onClick={handleEjecutarEliminacion}
                        loading={isExecuting}
                        loadingText="Ejecutando..."
                    >
                        Ejecutar eliminación
                    </Button>
                )}
            </Flex>
        </VStack>
    );
}
