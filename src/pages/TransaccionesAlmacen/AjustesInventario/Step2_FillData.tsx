import {
    Box,
    Button,
    Input,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Textarea,
    Th,
    Thead,
    Tr,
} from "@chakra-ui/react";
import type { Producto } from "../../Productos/types.tsx";
import type { AjusteLoteAsignado } from "./types";

interface Step2FillDataProps {
    selectedProducts: Producto[];
    quantities: Record<string, number | "">;
    stockByProduct: Record<string, number | null>;
    lotAssignments: Record<string, AjusteLoteAsignado[]>;
    onChangeQuantity: (productoId: string, value: number | "") => void;
    onOpenPositivePicker: (producto: Producto) => void;
    onOpenNegativePicker: (producto: Producto) => void;
    observaciones: string;
    onChangeObservaciones: (value: string) => void;
}

const DECIMAL_TOLERANCE = 0.0001;

export default function AjustesInventarioStep1SpecifyQuantities({
    selectedProducts,
    quantities,
    stockByProduct,
    lotAssignments,
    onChangeQuantity,
    onOpenPositivePicker,
    onOpenNegativePicker,
    observaciones,
    onChangeObservaciones,
}: Step2FillDataProps) {
    const renderAssignmentSummary = (productoId: string, quantity: number | "") => {
        if (quantity === "" || typeof quantity !== "number" || Number.isNaN(quantity) || quantity === 0) {
            return <Text color="gray.500">Define primero la cantidad del ajuste.</Text>;
        }

        const assignments = lotAssignments[productoId] ?? [];
        if (assignments.length === 0) {
            return <Text color="orange.500">Falta asignar lote.</Text>;
        }

        if (quantity > 0) {
            const lote = assignments[0];
            return (
                <Stack spacing={1}>
                    <Text fontWeight="semibold">{lote.batchNumber}</Text>
                    <Text fontSize="sm" color="gray.600">
                        Ajuste al lote seleccionado: {quantity.toFixed(4)}
                    </Text>
                </Stack>
            );
        }

        const totalAsignado = assignments.reduce((acc, item) => acc + item.cantidadAsignada, 0);
        const exacto = Math.abs(totalAsignado - Math.abs(quantity)) <= DECIMAL_TOLERANCE;

        return (
            <Stack spacing={1}>
                {assignments.map((assignment) => (
                    <Text key={assignment.loteId} fontSize="sm">
                        {assignment.batchNumber}: {assignment.cantidadAsignada.toFixed(4)}
                    </Text>
                ))}
                <Text fontSize="sm" color={exacto ? "green.600" : "orange.500"}>
                    Total asignado: {totalAsignado.toFixed(4)} / requerido: {Math.abs(quantity).toFixed(4)}
                </Text>
            </Stack>
        );
    };

    const renderAssignmentButton = (producto: Producto, quantity: number | "") => {
        if (quantity === "" || typeof quantity !== "number" || Number.isNaN(quantity) || quantity === 0) {
            return (
                <Button size="sm" isDisabled>
                    Define cantidad
                </Button>
            );
        }

        if (quantity > 0) {
            return (
                <Button size="sm" colorScheme="teal" onClick={() => onOpenPositivePicker(producto)}>
                    Seleccionar lote
                </Button>
            );
        }

        return (
            <Button size="sm" colorScheme="blue" onClick={() => onOpenNegativePicker(producto)}>
                Definir lotes
            </Button>
        );
    };

    return (
        <Stack spacing={4}>
            <Box p={4} borderWidth="1px" borderRadius="md" borderColor="gray.200" w="full">
                <Text fontSize="lg" fontWeight="semibold" mb={3}>
                    Ajustar inventario por lote
                </Text>
                {selectedProducts.length > 0 ? (
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Nombre</Th>
                                <Th>Tipo</Th>
                                <Th>Stock actual en GENERAL</Th>
                                <Th>Unidades de ajuste</Th>
                                <Th>Asignación de lote(s)</Th>
                                <Th>Acción</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {selectedProducts.map((producto) => {
                                const quantityValue = quantities[producto.productoId];
                                const stock = stockByProduct[producto.productoId];
                                const isInvalidQuantity =
                                    quantityValue === "" ||
                                    typeof quantityValue !== "number" ||
                                    Number.isNaN(quantityValue) ||
                                    quantityValue === 0;

                                return (
                                    <Tr key={producto.productoId}>
                                        <Td>{producto.productoId}</Td>
                                        <Td>{producto.nombre}</Td>
                                        <Td textTransform="capitalize">{producto.tipo_producto}</Td>
                                        <Td>{stock === null || stock === undefined ? "Cargando..." : stock.toFixed(4)}</Td>
                                        <Td>
                                            <Input
                                                type="number"
                                                step="0.0001"
                                                value={quantityValue ?? ""}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    onChangeQuantity(
                                                        producto.productoId,
                                                        value === "" ? "" : Number(value)
                                                    );
                                                }}
                                                size="sm"
                                                width="130px"
                                                placeholder="0.0000"
                                                isInvalid={isInvalidQuantity}
                                            />
                                        </Td>
                                        <Td minW="260px">
                                            {renderAssignmentSummary(producto.productoId, quantityValue)}
                                        </Td>
                                        <Td>{renderAssignmentButton(producto, quantityValue)}</Td>
                                    </Tr>
                                );
                            })}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color="gray.500">Selecciona productos para ajustar su inventario.</Text>
                )}
            </Box>

            <Box p={4} borderWidth="1px" borderRadius="md" borderColor="gray.200" w="full">
                <Text fontSize="md" fontWeight="semibold" mb={2}>
                    Observaciones
                </Text>
                <Textarea
                    placeholder="Escribe cualquier detalle relevante para este ajuste"
                    value={observaciones}
                    onChange={(e) => onChangeObservaciones(e.target.value)}
                />
            </Box>
        </Stack>
    );
}
