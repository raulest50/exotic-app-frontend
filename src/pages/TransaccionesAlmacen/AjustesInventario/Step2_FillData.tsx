import {
    Accordion,
    Box,
    Button,
    Input,
    NativeSelect,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Textarea,
    Th,
    Thead,
    Tr,
    Field,
} from "@chakra-ui/react";
import type { Producto } from "../../Productos/types.tsx";
import type { AjusteLoteAsignado } from "./types";
import {
    CAUSAS_AJUSTE,
    getCausaAjuste,
    type CausaAjusteInventario,
} from "./causasAjuste";

interface Step2FillDataProps {
    selectedProducts: Producto[];
    quantities: Record<string, number | "">;
    stockByProduct: Record<string, number | null>;
    lotAssignments: Record<string, AjusteLoteAsignado[]>;
    onChangeQuantity: (productoId: string, value: number | "") => void;
    onOpenPositivePicker: (producto: Producto) => void;
    onOpenNegativePicker: (producto: Producto) => void;
    causaAjuste: CausaAjusteInventario | "";
    onChangeCausaAjuste: (value: CausaAjusteInventario | "") => void;
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
    causaAjuste,
    onChangeCausaAjuste,
    observaciones,
    onChangeObservaciones,
}: Step2FillDataProps) {
    const selectedCause = causaAjuste
        ? getCausaAjuste(causaAjuste)
        : undefined;
    const hasPositiveQuantity = Object.values(quantities).some(
        (quantity) => typeof quantity === "number" && quantity > 0,
    );
    const causeIsIncompatible = Boolean(
        selectedCause?.onlyNegative && hasPositiveQuantity,
    );
    const observationsAreRequired = Boolean(
        selectedCause?.requiresObservations,
    );
    const observationsAreMissing =
        observationsAreRequired && !observaciones.trim();

    const renderAssignmentSummary = (productoId: string, quantity: number | "") => {
        if (quantity === "" || typeof quantity !== "number" || Number.isNaN(quantity) || quantity === 0) {
            return <Text color="app.textSubtle">Define primero la cantidad del ajuste.</Text>;
        }

        const assignments = lotAssignments[productoId] ?? [];
        if (assignments.length === 0) {
            return <Text color="orange.500">Falta asignar lote.</Text>;
        }

        if (quantity > 0) {
            const lote = assignments[0];
            return (
                <Stack gap={1}>
                    <Text fontWeight="semibold">{lote.batchNumber}</Text>
                    <Text fontSize="sm" color="app.textMuted">
                        Ajuste al lote seleccionado: {quantity.toFixed(4)}
                    </Text>
                </Stack>
            );
        }

        const totalAsignado = assignments.reduce((acc, item) => acc + item.cantidadAsignada, 0);
        const exacto = Math.abs(totalAsignado - Math.abs(quantity)) <= DECIMAL_TOLERANCE;

        return (
            <Stack gap={1}>
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
                <Button size="sm" disabled>Define cantidad
                                    </Button>
            );
        }

        if (quantity > 0) {
            return (
                <Button size="sm" colorPalette="teal" onClick={() => onOpenPositivePicker(producto)}>Seleccionar lote
                                    </Button>
            );
        }

        return (
            <Button size="sm" colorPalette="blue" onClick={() => onOpenNegativePicker(producto)}>Definir lotes
                            </Button>
        );
    };

    return (
        <Stack gap={4}>
            <Box p={4} borderWidth="1px" borderRadius="md" borderColor="app.border" w="full">
                <Text fontSize="lg" fontWeight="semibold" mb={3}>
                    Ajustar inventario por lote
                </Text>
                {selectedProducts.length > 0 ? (
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                <Table.ColumnHeader>Stock actual en GENERAL</Table.ColumnHeader>
                                <Table.ColumnHeader>Unidades de ajuste</Table.ColumnHeader>
                                <Table.ColumnHeader>Asignación de lote(s)</Table.ColumnHeader>
                                <Table.ColumnHeader>Acción</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {selectedProducts.map((producto) => {
                                const quantityValue = quantities[producto.productoId];
                                const stock = stockByProduct[producto.productoId];
                                const isInvalidQuantity =
                                    quantityValue === "" ||
                                    typeof quantityValue !== "number" ||
                                    Number.isNaN(quantityValue) ||
                                    quantityValue === 0;

                                return (
                                    <Table.Row key={producto.productoId}>
                                        <Table.Cell>{producto.productoId}</Table.Cell>
                                        <Table.Cell>{producto.nombre}</Table.Cell>
                                        <Table.Cell textTransform="capitalize">{producto.tipo_producto}</Table.Cell>
                                        <Table.Cell>{stock === null || stock === undefined ? "Cargando..." : stock.toFixed(4)}</Table.Cell>
                                        <Table.Cell>
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
                                                invalid={isInvalidQuantity}
                                            />
                                        </Table.Cell>
                                        <Table.Cell minW="260px">
                                            {renderAssignmentSummary(producto.productoId, quantityValue)}
                                        </Table.Cell>
                                        <Table.Cell>{renderAssignmentButton(producto, quantityValue)}</Table.Cell>
                                    </Table.Row>
                                );
                            })}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Text color="app.textSubtle">Selecciona productos para ajustar su inventario.</Text>
                )}
            </Box>

            <Box p={4} borderWidth="1px" borderRadius="md" borderColor="app.border" w="full">
                <Stack gap={4}>
                    <Field.Root
                        required
                        invalid={!causaAjuste || causeIsIncompatible}
                    >
                        <Field.Label>Causa del ajuste</Field.Label>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                placeholder="Seleccione una causa"
                                value={causaAjuste}
                                onChange={(event) => onChangeCausaAjuste(
                                    event.target.value as CausaAjusteInventario | "",
                                )}>
                                {CAUSAS_AJUSTE.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                        disabled={option.onlyNegative && hasPositiveQuantity}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                        {selectedCause && !causeIsIncompatible ? (
                            <Field.HelperText>{selectedCause.description}</Field.HelperText>
                        ) : null}
                        {!causaAjuste ? (
                            <Field.ErrorText>
                                Seleccione la causa común a toda la transacción.
                            </Field.ErrorText>
                        ) : causeIsIncompatible ? (
                            <Field.ErrorText>
                                Esta causa solo permite cantidades negativas.
                            </Field.ErrorText>
                        ) : null}
                    </Field.Root>

                    <Accordion.Root collapsible>
                        <Accordion.Item border="0" value='item-0'>
                            <Accordion.ItemTrigger
                                px={0}
                                minH="40px"
                                color="app.textMuted"
                            >
                                <Box flex="1" textAlign="left" fontWeight="semibold">
                                    Ver significado de cada opción
                                </Box>
                                <Accordion.ItemIndicator />
                            </Accordion.ItemTrigger>
                            <Accordion.ItemContent px={0} pb={0}><Accordion.ItemBody>
                                    <Stack gap={3}>
                                        {CAUSAS_AJUSTE.map((option) => (
                                            <Box key={option.value}>
                                                <Text fontWeight="semibold" fontSize="sm">
                                                    {option.label}
                                                </Text>
                                                <Text color="app.textMuted" fontSize="sm">
                                                    {option.description}
                                                </Text>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Accordion.ItemBody></Accordion.ItemContent>
                        </Accordion.Item>
                    </Accordion.Root>

                    <Field.Root
                        required={observationsAreRequired}
                        invalid={observationsAreMissing}
                    >
                        <Field.Label>Observaciones</Field.Label>
                        <Textarea
                            placeholder={causaAjuste === "PRODUCCION_CONTINGENCIA"
                                ? "Indique la orden de producción o el motivo de la contingencia"
                                : "Escribe cualquier detalle relevante para este ajuste"}
                            value={observaciones}
                            onChange={(e) => onChangeObservaciones(e.target.value)}
                        />
                        {observationsAreMissing ? (
                            <Field.ErrorText>
                                Las observaciones son obligatorias para esta causa.
                            </Field.ErrorText>
                        ) : null}
                    </Field.Root>
                </Stack>
            </Box>
        </Stack>
    );
}
