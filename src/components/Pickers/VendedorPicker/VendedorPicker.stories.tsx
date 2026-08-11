// src/components/Pickers/VendedorPicker/VendedorPicker.stories.tsx

import React, { useState } from 'react';
import VendedorPicker from './VendedorPicker.tsx';
import { Button, Box, Text, VStack } from '@chakra-ui/react';

// Interface for Vendedor based on the backend model
interface Vendedor {
    cedula: number;
    nombres: string;
    apellidos: string;
    email: string;
    username?: string;
}

export const Default = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);
  
  const handleSelectVendedor = (vendedor: Vendedor) => {
    setSelectedVendedor(vendedor);
    console.log('Selected vendedor:', vendedor);
  };

  return (
    <VStack gap={4} align="start" p={5}>
      <Button colorPalette="blue" onClick={handleOpen}>
        Abrir Selector de Vendedor
      </Button>

      {selectedVendedor && (
        <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" width="100%">
          <Text fontWeight="bold">Vendedor Seleccionado:</Text>
          <Text>ID: {selectedVendedor.cedula}</Text>
          <Text>Nombre: {`${selectedVendedor.nombres} ${selectedVendedor.apellidos}`}</Text>
          <Text>Email: {selectedVendedor.email}</Text>
          {selectedVendedor.username && <Text>Usuario: {selectedVendedor.username}</Text>}
        </Box>
      )}

      <VendedorPicker
        isOpen={isOpen}
        onClose={handleClose}
        onSelectVendedor={handleSelectVendedor}
      />
    </VStack>
  );
};

export default {
  title: 'Components/VendedorPicker',
  component: VendedorPicker,
};