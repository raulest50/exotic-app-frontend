import React, { useState } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import BetterPagination from './BetterPagination.tsx';

export const Default = () => {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const totalPages = 5;

  return (
    <Box p={8} maxW="800px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Paginación Básica</Text>
        <BetterPagination
          page={page}
          size={size}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
        <Text fontSize="sm" color="gray.600">
          Página actual: {page + 1} de {totalPages}, Tamaño: {size}
        </Text>
      </VStack>
    </Box>
  );
};

export const WithLoading = () => {
  const [page, setPage] = useState(2);
  const [size, setSize] = useState(10);
  const totalPages = 5;

  return (
    <Box p={8} maxW="800px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Con Estado de Carga</Text>
        <BetterPagination
          page={page}
          size={size}
          totalPages={totalPages}
          loading={true}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
        <Text fontSize="sm" color="gray.600">
          Los botones están deshabilitados durante la carga
        </Text>
      </VStack>
    </Box>
  );
};

export const FirstPage = () => {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const totalPages = 5;

  return (
    <Box p={8} maxW="800px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Primera Página</Text>
        <BetterPagination
          page={page}
          size={size}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
        <Text fontSize="sm" color="gray.600">
          Botón "Anterior" deshabilitado en la primera página
        </Text>
      </VStack>
    </Box>
  );
};

export const LastPage = () => {
  const [page, setPage] = useState(4);
  const [size, setSize] = useState(10);
  const totalPages = 5;

  return (
    <Box p={8} maxW="800px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Última Página</Text>
        <BetterPagination
          page={page}
          size={size}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
        <Text fontSize="sm" color="gray.600">
          Botón "Siguiente" deshabilitado en la última página
        </Text>
      </VStack>
    </Box>
  );
};

export const SinglePage = () => {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const totalPages = 1;

  return (
    <Box p={8} maxW="800px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Solo Una Página</Text>
        <BetterPagination
          page={page}
          size={size}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
        <Text fontSize="sm" color="gray.600">
          Ambos botones están deshabilitados cuando solo hay una página
        </Text>
      </VStack>
    </Box>
  );
};

export const EmptyResults = () => {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const totalPages = 0;

  return (
    <Box p={8} maxW="800px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Sin Resultados</Text>
        <BetterPagination
          page={page}
          size={size}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
        <Text fontSize="sm" color="gray.600">
          Cuando no hay resultados, muestra "Pagina 0 de 0"
        </Text>
      </VStack>
    </Box>
  );
};

