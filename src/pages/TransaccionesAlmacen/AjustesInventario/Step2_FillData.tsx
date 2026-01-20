import {
    Box,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    Input,
    Textarea,
    Stack,
} from "@chakra-ui/react";
import { Producto } from "../../Productos/types.tsx";

interface Step2FillDataProps {
    selectedProducts: Producto[];
    quantities: Record<string, number | "">;
    onChangeQuantity: (productoId: string, value: string) => void;
    lotIds: Record<string, number | "">;
    onChangeLotId: (productoId: string, value: string) => void;
    observaciones: string;
    onChangeObservaciones: (value: string) => void;
    // TODO: inject stock values via a dedicated map prop once the inventory API/dataset is available
    // to avoid coupling this component to a specific Producto shape.
}

export default function AjustesInventarioStep1SpecifyQuantities({
    selectedProducts,
    quantities,
    onChangeQuantity,
    lotIds,
    onChangeLotId,
    observaciones,
    onChangeObservaciones,
}: Step2FillDataProps) {
    return (
        <Stack spacing={4}>
            <Box p={4} borderWidth={"1px"} borderRadius={"md"} borderColor={"gray.200"} w={"full"}>
                <Text fontSize={"lg"} fontWeight={"semibold"} mb={3}>
                    Ajustar unidades
                </Text>
                {selectedProducts.length > 0 ? (
                    <Table size={"sm"} variant={"simple"}>
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Nombre</Th>
                                <Th>Tipo</Th>
                                <Th>Stock actual</Th>
                                <Th>Unidades de ajuste</Th>
                                <Th>ID de lote</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {selectedProducts.map((producto) => (
                                <Tr key={producto.productoId}>
                                    <Td>{producto.productoId}</Td>
                                    <Td>{producto.nombre}</Td>
                                    <Td textTransform={"capitalize"}>{producto.tipo_producto}</Td>
                                    <Td>
                                        {/* TODO: render stock for producto.productoId when inventory data is provided */}
                                    </Td>
                                    <Td>
                                        {(() => {
                                            const quantityValue = quantities[producto.productoId];
                                            const isInvalidQuantity =
                                                quantityValue === undefined ||
                                                typeof quantityValue !== "number" ||
                                                Number.isNaN(quantityValue);

                                            return (
                                                <Input
                                                    type={"number"}
                                                    value={quantityValue ?? ""}
                                                    onChange={(e) =>
                                                        onChangeQuantity(producto.productoId, e.target.value)
                                                    }
                                                    isInvalid={isInvalidQuantity}
                                                />
                                            );
                                        })()}
                                    </Td>
                                    <Td>
                                        {(() => {
                                            const lotIdValue = lotIds[producto.productoId] ?? "";
                                            /*
                                            const isInvalidLotId =
                                                lotIdValue !== "" &&
                                                (typeof lotIdValue !== "number" || Number.isNaN(lotIdValue));
                                            */
                                            return (
                                                <Input
                                                    type={"number"}
                                                    value={lotIdValue}
                                                    onChange={(e) =>
                                                        onChangeLotId(producto.productoId, e.target.value)
                                                    }
                                                    placeholder={"Opcional"}
                                                    //isInvalid={isInvalidLotId}
                                                />
                                            );
                                        })()}
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color={"gray.500"}>Selecciona productos para ajustar su inventario.</Text>
                )}
            </Box>

            <Box p={4} borderWidth={"1px"} borderRadius={"md"} borderColor={"gray.200"} w={"full"}>
                <Text fontSize={"md"} fontWeight={"semibold"} mb={2}>
                    Observaciones
                </Text>
                <Textarea
                    placeholder={"Escribe cualquier detalle relevante para este ajuste"}
                    value={observaciones}
                    onChange={(e) => onChangeObservaciones(e.target.value)}
                />
            </Box>
        </Stack>
    );
}
