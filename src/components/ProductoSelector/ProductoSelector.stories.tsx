import React, { useState } from 'react';
import { Box, Button, Text, VStack } from '@chakra-ui/react';
import ProductoSelector, { ProductoMin } from './ProductoSelector';

export const Default = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [selected, setSelected] = useState<ProductoMin | null>(null);

  return (
    <Box p={6} maxW="900px">
      <VStack align="stretch" spacing={4}>
        <Button onClick={() => setIsOpen(true)}>Abrir selector</Button>
        <Text>
          Seleccionado: {selected ? `${selected.productoId} - ${selected.nombre}` : '(ninguno)'}
        </Text>
      </VStack>

      <ProductoSelector
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectProducto={(p) => setSelected(p)}
      />
    </Box>
  );
};

