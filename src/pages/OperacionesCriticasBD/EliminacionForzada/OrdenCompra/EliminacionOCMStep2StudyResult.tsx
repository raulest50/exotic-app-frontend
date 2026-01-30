import {
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
    if (!studyResult) {
        return (
            <Box>
                <Text color="gray.600">No hay resultado de estudio disponible.</Text>
                <Button mt={4} onClick={() => setActiveStep(1)}>
                    Volver a seleccionar
                </Button>
            </Box>
        );
    }

    const {
        ordenCompraId,
        itemsOrdenCompra,
        lotes,
        transaccionesAlmacen,
        asientosContables,
    } = studyResult;

    return (
        <VStack align="stretch" spacing={6}>
            <Heading size="md">
                Resultado del estudio de eliminación - Orden de compra #{ordenCompraId}
            </Heading>
            <Text color="gray.600">
                Los siguientes registros referencian esta orden y habría que eliminarlos o ajustarlos
                para poder eliminar la orden de compra.
            </Text>

            {/* Items orden compra */}
            <Box>
                <Heading size="sm" mb={2}>
                    Ítems de orden de compra ({itemsOrdenCompra.length})
                </Heading>
                {itemsOrdenCompra.length > 0 ? (
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Item ID</Th>
                                <Th>Producto</Th>
                                <Th>Cantidad</Th>
                                <Th>Precio unit.</Th>
                                <Th>Subtotal</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {itemsOrdenCompra.map((item) => (
                                <Tr key={item.itemOrdenId}>
                                    <Td>{item.itemOrdenId}</Td>
                                    <Td>{item.productId ?? "-"}</Td>
                                    <Td>{item.cantidad}</Td>
                                    <Td>{item.precioUnitario.toLocaleString()}</Td>
                                    <Td>{item.subTotal.toLocaleString()}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color="gray.500">Ningún ítem.</Text>
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
                                    <Td>{lote.productionDate ? formatDate(lote.productionDate) : "-"}</Td>
                                    <Td>{lote.expirationDate ? formatDate(lote.expirationDate) : "-"}</Td>
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
                            <Box key={ta.transaccionId} borderWidth="1px" borderRadius="md" p={3}>
                                <Text fontWeight="medium">
                                    Transacción #{ta.transaccionId} - {formatDate(ta.fechaTransaccion)} -{" "}
                                    {ta.estadoContable ?? "-"}
                                </Text>
                                {ta.observaciones && (
                                    <Text fontSize="sm" color="gray.600">{ta.observaciones}</Text>
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
                                                    <Td>{formatDate(m.fechaMovimiento)}</Td>
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

            <Flex gap={3} mt={4}>
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                    Volver a seleccionar orden
                </Button>
                <Button colorScheme="teal" onClick={onReset}>
                    Iniciar de nuevo
                </Button>
            </Flex>
        </VStack>
    );
}
