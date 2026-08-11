// src/components/AreaPickerGeneric/AreaPickerGeneric.stories.tsx

import React, { useState } from 'react';
import AreaPickerGeneric from './AreaPickerGeneric.tsx';
import { Steps, Button, Box, Text, VStack } from '@chakra-ui/react';

// Interface for AreaProduccion based on the backend model
interface AreaProduccion {
    areaId: number;
    nombre: string;
    descripcion: string;
    responsableArea?: any;
}

export const Default = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaProduccion | null>(null);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);
  
  const handleSelectArea = (area: AreaProduccion) => {
    setSelectedArea(area);
    console.log('Selected area:', area);
  };

  return (
    <VStack gap={4} align="start" p={5}>
      <Button colorPalette="blue" onClick={handleOpen}>
        Abrir Selector de Área
      </Button>

      {selectedArea && (
        <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" width="100%">
          <Text fontWeight="bold">Área Seleccionada:</Text>
          <Text>ID: {selectedArea.areaId}</Text>
          <Text>Nombre: {selectedArea.nombre}</Text>
          <Text>Descripción: {selectedArea.descripcion}</Text>
        </Box>
      )}

      <AreaPickerGeneric
        isOpen={isOpen}
        onClose={handleClose}
        onSelectArea={handleSelectArea}
      />
    </VStack>
  );
};

export default {
  title: 'Components/AreaPickerGeneric',
  component: AreaPickerGeneric,
};