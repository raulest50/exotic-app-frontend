import { Steps, Box, Button, Flex, Table, Thead, Tbody, Tr, Th, Td, Text, VStack } from '@chakra-ui/react';
import CustomDecimalInput from '../../../../../components/CustomDecimalInput/CustomDecimalInput';
import { AveriaAlmacenItem } from '../WizardAveriaAlmacen';

interface AveriaAlmacenStep1QuantitiesProps {
    setActiveStep: (step: number) => void;
    selectedItems: AveriaAlmacenItem[];
    setSelectedItems: (items: AveriaAlmacenItem[]) => void;
}

export default function AveriaAlmacenStep1Quantities({
    setActiveStep,
    selectedItems,
    setSelectedItems,
}: AveriaAlmacenStep1QuantitiesProps) {
    const itemKey = (item: AveriaAlmacenItem) => `${item.productoId}|${item.loteId}`;

    const handleCantidadChange = (key: string, value: number) => {
        setSelectedItems(
            selectedItems.map((item) =>
                itemKey(item) === key ? { ...item, cantidadAveria: value } : item,
            ),
        );
    };

    const isItemValid = (item: AveriaAlmacenItem): boolean => {
        return item.cantidadAveria > 0 && item.cantidadAveria <= item.cantidadDisponible;
    };

    const allItemsValid = selectedItems.length > 0 && selectedItems.every(isItemValid);

    const handleSiguiente = () => {
        if (allItemsValid) {
            setActiveStep(2);
        }
    };

    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 2: Especificar Cantidades Averiadas
            </Text>

            <VStack gap={4} align="stretch">
                <Box w="full" overflowX="auto">
                    <Table.Root variant="simple" size="sm">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Código</Table.ColumnHeader>
                                <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Disponible</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Cantidad Avería</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {selectedItems.map((item) => {
                                const key = itemKey(item);
                                const exceedsMax = item.cantidadAveria > item.cantidadDisponible;
                                return (
                                    <Table.Row key={key}>
                                        <Table.Cell>{item.productoId}</Table.Cell>
                                        <Table.Cell>{item.productoNombre}</Table.Cell>
                                        <Table.Cell>{item.batchNumber}</Table.Cell>
                                        <Table.Cell textAlign='end'>
                                            {item.cantidadDisponible.toFixed(2)} {item.tipoUnidades}
                                        </Table.Cell>
                                        <Table.Cell textAlign='end'>
                                            <Box>
                                                <CustomDecimalInput
                                                    value={item.cantidadAveria}
                                                    onChange={(val) => handleCantidadChange(key, val)}
                                                    min={0}
                                                    maxDecimals={4}
                                                    size="sm"
                                                    width="130px"
                                                    placeholder="0.00"
                                                />
                                                {exceedsMax && (
                                                    <Text fontSize="xs" color="red.500" mt={1}>
                                                        Máx: {item.cantidadDisponible.toFixed(2)}
                                                    </Text>
                                                )}
                                            </Box>
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            })}
                        </Table.Body>
                    </Table.Root>
                </Box>

                {!allItemsValid && selectedItems.some((i) => i.cantidadAveria > 0) && (
                    <Text fontSize="sm" color="orange.600">
                        Todas las cantidades deben ser mayores a 0 y no exceder la cantidad disponible.
                    </Text>
                )}

                <Flex gap={4} pt={2}>
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Anterior
                    </Button>
                    <Button
                        colorPalette="blue"
                        onClick={handleSiguiente}
                        disabled={!allItemsValid}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
