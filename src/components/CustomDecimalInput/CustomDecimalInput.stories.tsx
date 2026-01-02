import React, { useState } from 'react';
import { VStack, HStack, Text, Box } from '@chakra-ui/react';
import CustomDecimalInput from './CustomDecimalInput';

export const Default = () => {
  const [value, setValue] = useState<number>(0);

  return (
    <Box p={8} maxW="400px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Input Decimal Básico</Text>
        <CustomDecimalInput
          value={value}
          onChange={setValue}
          placeholder="0.0000"
          w="150px"
        />
        <Text fontSize="sm" color="gray.600">
          Valor actual: {value > 0 ? value : 'vacío/inválido'}
        </Text>
        <Text fontSize="xs" color="gray.500">
          Intenta: borrar el campo, escribir ".32", escribir "0.32"
        </Text>
      </VStack>
    </Box>
  );
};

export const WithMinValue = () => {
  const [value, setValue] = useState<number>(1.5);

  return (
    <Box p={8} maxW="400px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Con valor mínimo (min=1)</Text>
        <CustomDecimalInput
          value={value}
          onChange={setValue}
          min={1}
          placeholder="1.0000"
          w="150px"
        />
        <Text fontSize="sm" color="gray.600">
          Valor actual: {value}
        </Text>
      </VStack>
    </Box>
  );
};

export const WithMaxDecimals = () => {
  const [value, setValue] = useState<number>(0);

  return (
    <Box p={8} maxW="400px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Con máximo de 2 decimales</Text>
        <CustomDecimalInput
          value={value}
          onChange={setValue}
          maxDecimals={2}
          placeholder="0.00"
          w="150px"
        />
        <Text fontSize="sm" color="gray.600">
          Valor actual: {value > 0 ? value : 'vacío/inválido'}
        </Text>
        <Text fontSize="xs" color="gray.500">
          Intenta escribir más de 2 decimales
        </Text>
      </VStack>
    </Box>
  );
};

export const WithoutEmptyAllowed = () => {
  const [value, setValue] = useState<number>(0.5);

  return (
    <Box p={8} maxW="400px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Sin permitir vacío (allowEmpty=false)</Text>
        <CustomDecimalInput
          value={value}
          onChange={setValue}
          allowEmpty={false}
          min={0.1}
          placeholder="0.1000"
          w="150px"
        />
        <Text fontSize="sm" color="gray.600">
          Valor actual: {value}
        </Text>
        <Text fontSize="xs" color="gray.500">
          Al borrar, se restaura al valor mínimo
        </Text>
      </VStack>
    </Box>
  );
};

export const SmallSize = () => {
  const [value, setValue] = useState<number>(0);

  return (
    <Box p={8} maxW="400px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Tamaño pequeño (size="sm")</Text>
        <CustomDecimalInput
          value={value}
          onChange={setValue}
          size="sm"
          w="88px"
        />
        <Text fontSize="sm" color="gray.600">
          Valor actual: {value > 0 ? value : 'vacío/inválido'}
        </Text>
      </VStack>
    </Box>
  );
};









