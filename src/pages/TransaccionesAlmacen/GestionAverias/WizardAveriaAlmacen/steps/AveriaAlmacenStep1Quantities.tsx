import {
    Box,
    Button,
    Flex,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    VStack,
} from '@chakra-ui/react';
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

            <VStack spacing={4} align="stretch">
                <Box w="full" overflowX="auto">
                    <Table variant="simple" size="sm">
                        <Thead>
                            <Tr>
                                <Th>Código</Th>
                                <Th>Nombre</Th>
                                <Th>Lote</Th>
                                <Th isNumeric>Disponible</Th>
                                <Th isNumeric>Cantidad Avería</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {selectedItems.map((item) => {
                                const key = itemKey(item);
                                const exceedsMax = item.cantidadAveria > item.cantidadDisponible;
                                return (
                                    <Tr key={key}>
                                        <Td>{item.productoId}</Td>
                                        <Td>{item.productoNombre}</Td>
                                        <Td>{item.batchNumber}</Td>
                                        <Td isNumeric>
                                            {item.cantidadDisponible.toFixed(2)} {item.tipoUnidades}
                                        </Td>
                                        <Td isNumeric>
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
                                        </Td>
                                    </Tr>
                                );
                            })}
                        </Tbody>
                    </Table>
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
                        colorScheme="blue"
                        onClick={handleSiguiente}
                        isDisabled={!allItemsValid}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
