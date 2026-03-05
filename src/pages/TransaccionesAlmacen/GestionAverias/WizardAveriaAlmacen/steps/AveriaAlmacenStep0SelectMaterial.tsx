import { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    IconButton,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    VStack,
    useToast,
} from '@chakra-ui/react';
import { FiX } from 'react-icons/fi';
import MaterialByLotePicker, {
    MaterialByLoteItem,
} from '../../../../../components/Pickers/MaterialByLotePicker/MaterialByLotePicker';
import { AveriaAlmacenItem } from '../WizardAveriaAlmacen';

interface AveriaAlmacenStep0SelectMaterialProps {
    setActiveStep: (step: number) => void;
    selectedItems: AveriaAlmacenItem[];
    setSelectedItems: (items: AveriaAlmacenItem[]) => void;
}

export default function AveriaAlmacenStep0SelectMaterial({
    setActiveStep,
    selectedItems,
    setSelectedItems,
}: AveriaAlmacenStep0SelectMaterialProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const toast = useToast();

    const itemKey = (item: AveriaAlmacenItem) => `${item.productoId}|${item.loteId}`;

    const handleSelectItem = (pickerItem: MaterialByLoteItem) => {
        const newItem: AveriaAlmacenItem = {
            productoId: pickerItem.productoId,
            productoNombre: pickerItem.productoNombre,
            tipoUnidades: pickerItem.tipoUnidades,
            loteId: pickerItem.loteId,
            batchNumber: pickerItem.batchNumber,
            cantidadDisponible: pickerItem.cantidadDisponible,
        };

        const exists = selectedItems.some(
            (i) => i.productoId === newItem.productoId && i.loteId === newItem.loteId,
        );

        if (exists) {
            toast({
                title: 'Duplicado',
                description: 'Este material con ese lote ya fue agregado.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setSelectedItems([...selectedItems, newItem]);
    };

    const handleRemoveItem = (key: string) => {
        setSelectedItems(selectedItems.filter((i) => itemKey(i) !== key));
    };

    const handleSiguiente = () => {
        if (selectedItems.length > 0) {
            setActiveStep(1);
        }
    };

    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 1: Selección de Materiales por Lote
            </Text>

            <VStack spacing={4} align="stretch">
                <Box>
                    <Button colorScheme="teal" onClick={() => setIsPickerOpen(true)}>
                        Agregar Material
                    </Button>
                </Box>

                <Box w="full" overflowX="auto">
                    {selectedItems.length > 0 ? (
                        <Table variant="simple" size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Código</Th>
                                    <Th>Nombre</Th>
                                    <Th>Lote</Th>
                                    <Th isNumeric>Cantidad Disponible</Th>
                                    <Th w="50px"></Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {selectedItems.map((item) => {
                                    const key = itemKey(item);
                                    return (
                                        <Tr key={key}>
                                            <Td>{item.productoId}</Td>
                                            <Td>{item.productoNombre}</Td>
                                            <Td>{item.batchNumber}</Td>
                                            <Td isNumeric>
                                                {item.cantidadDisponible.toFixed(2)} {item.tipoUnidades}
                                            </Td>
                                            <Td>
                                                <IconButton
                                                    aria-label="Eliminar"
                                                    icon={<FiX />}
                                                    size="sm"
                                                    colorScheme="red"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveItem(key)}
                                                />
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </Tbody>
                        </Table>
                    ) : (
                        <Text textAlign="center" color="gray.500" py={8}>
                            No hay materiales seleccionados. Use el botón "Agregar Material" para buscar por lote.
                        </Text>
                    )}
                </Box>

                <Flex gap={4} pt={2}>
                    <Button
                        colorScheme="blue"
                        onClick={handleSiguiente}
                        isDisabled={selectedItems.length === 0}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>

            <MaterialByLotePicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelectItem={handleSelectItem}
            />
        </Box>
    );
}
