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
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
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
    const toast = useAppToast();

    const itemKey = (item: AveriaAlmacenItem) => `${item.productoId}|${item.loteId}`;

    const handleSelectItem = (pickerItem: MaterialByLoteItem) => {
        const newItem: AveriaAlmacenItem = {
            productoId: pickerItem.productoId,
            productoNombre: pickerItem.productoNombre,
            tipoUnidades: pickerItem.tipoUnidades,
            loteId: pickerItem.loteId,
            batchNumber: pickerItem.batchNumber,
            cantidadDisponible: pickerItem.cantidadDisponible,
            cantidadAveria: 0,
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

            <VStack gap={4} align="stretch">
                <Box>
                    <Button colorPalette="teal" onClick={() => setIsPickerOpen(true)}>
                        Agregar Material
                    </Button>
                </Box>

                <Box w="full" overflowX="auto">
                    {selectedItems.length > 0 ? (
                        <Table.Root variant="simple" size="sm">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>Código</Table.ColumnHeader>
                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                    <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Cantidad Disponible</Table.ColumnHeader>
                                    <Table.ColumnHeader w="50px"></Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {selectedItems.map((item) => {
                                    const key = itemKey(item);
                                    return (
                                        <Table.Row key={key}>
                                            <Table.Cell>{item.productoId}</Table.Cell>
                                            <Table.Cell>{item.productoNombre}</Table.Cell>
                                            <Table.Cell>{item.batchNumber}</Table.Cell>
                                            <Table.Cell textAlign='end'>
                                                {item.cantidadDisponible.toFixed(2)} {item.tipoUnidades}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <IconButton
                                                    aria-label="Eliminar"
                                                    size="sm"
                                                    colorPalette="red"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveItem(key)}><FiX /></IconButton>
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                })}
                            </Table.Body>
                        </Table.Root>
                    ) : (
                        <Text textAlign="center" color="app.textSubtle" py={8}>
                            No hay materiales seleccionados. Use el botón "Agregar Material" para buscar por lote.
                        </Text>
                    )}
                </Box>

                <Flex gap={4} pt={2}>
                    <Button
                        colorPalette="blue"
                        onClick={handleSiguiente}
                        disabled={selectedItems.length === 0}
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
