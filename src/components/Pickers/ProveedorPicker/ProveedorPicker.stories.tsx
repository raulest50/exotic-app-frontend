import React, { useState } from 'react';
import ProveedorPicker from './ProveedorPicker.tsx';
import { Button, Box, Text, VStack } from '@chakra-ui/react';

interface Proveedor {
    id: string;
    nombre: string;
}

export const Default = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleSelectProveedor = (proveedor: Proveedor) => {
        setSelectedProveedor(proveedor);
        console.log('Selected proveedor:', proveedor);
    };

    return (
        <VStack spacing={4} align="start" p={5}>
            <Button colorScheme="blue" onClick={handleOpen}>
                Abrir Selector de Proveedor
            </Button>

            {selectedProveedor && (
                <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" width="100%">
                    <Text fontWeight="bold">Proveedor Seleccionado:</Text>
                    <Text>NIT: {selectedProveedor.id}</Text>
                    <Text>Nombre: {selectedProveedor.nombre}</Text>
                </Box>
            )}

            <ProveedorPicker
                isOpen={isOpen}
                onClose={handleClose}
                onSelectProveedor={handleSelectProveedor}
            />
        </VStack>
    );
};

export default {
    title: 'Components/ProveedorPicker',
    component: ProveedorPicker,
};
