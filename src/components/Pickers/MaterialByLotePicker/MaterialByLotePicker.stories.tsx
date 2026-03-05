import React, { useState } from 'react';
import MaterialByLotePicker, { MaterialByLoteItem } from './MaterialByLotePicker.tsx';
import { Button, Box, Text, VStack } from '@chakra-ui/react';

export const Default = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MaterialByLoteItem | null>(null);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleSelectItem = (item: MaterialByLoteItem) => {
        setSelectedItem(item);
        console.log('Selected material by lote:', item);
    };

    return (
        <VStack spacing={4} align="start" p={5}>
            <Button colorScheme="blue" onClick={handleOpen}>
                Buscar Material por Lote
            </Button>

            {selectedItem && (
                <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" width="100%">
                    <Text fontWeight="bold">Material Seleccionado:</Text>
                    <Text>Código: {selectedItem.productoId}</Text>
                    <Text>Nombre: {selectedItem.productoNombre}</Text>
                    <Text>Lote: {selectedItem.batchNumber}</Text>
                    <Text>Unidades: {selectedItem.tipoUnidades}</Text>
                    <Text>Cantidad Disponible: {selectedItem.cantidadDisponible.toFixed(2)}</Text>
                </Box>
            )}

            <MaterialByLotePicker
                isOpen={isOpen}
                onClose={handleClose}
                onSelectItem={handleSelectItem}
            />
        </VStack>
    );
};

export default {
    title: 'Components/MaterialByLotePicker',
    component: MaterialByLotePicker,
};
