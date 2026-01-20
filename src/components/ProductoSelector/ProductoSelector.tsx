import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
  VStack,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../api/EndPointsURL';
import BetterPagination from '../BetterPagination/BetterPagination';

const endPoints = new EndPointsURL();

type TipoBusqueda = 'NOMBRE' | 'ID';

export interface ProductoMin {
  productoId: string | number;
  nombre: string;
  tipoUnidades?: string;
  tipo_producto?: string; // 'M' | 'S' | 'T'
}

interface ProductoStockDTO {
  producto: ProductoMin;
  stock: number;
}

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

interface ProductoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProducto: (producto: ProductoMin) => void;
  title?: string;
}

export default function ProductoSelector({
  isOpen,
  onClose,
  onSelectProducto,
  title = 'Seleccionar Producto',
}: ProductoSelectorProps) {
  const toast = useToast();

  const [searchText, setSearchText] = useState('');
  const [tipoBusqueda, setTipoBusqueda] = useState<TipoBusqueda>('NOMBRE');
  const [isLoading, setIsLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [items, setItems] = useState<ProductoStockDTO[]>([]);

  const [selectedProductoId, setSelectedProductoId] = useState<string | number | null>(null);

  const selectedProducto = useMemo(() => {
    if (selectedProductoId == null) return null;
    return items.find((x) => x.producto?.productoId === selectedProductoId)?.producto ?? null;
  }, [items, selectedProductoId]);

  const handleSearch = async (pageParam?: number, sizeParam?: number) => {
    setIsLoading(true);
    try {
      const pageToUse = pageParam ?? page;
      const sizeToUse = sizeParam ?? size;

      const resp = await axios.get<PageResponse<ProductoStockDTO>>(endPoints.search_products_with_stock, {
        params: {
          searchTerm: searchText,
          tipoBusqueda,
          page: pageToUse,
          size: sizeToUse,
        },
      });

      setItems(resp.data.content ?? []);
      setTotalPages(resp.data.totalPages ?? 0);
      setPage(resp.data.number ?? pageToUse);
      setSize(resp.data.size ?? sizeToUse);
      setSelectedProductoId(null);
    } catch (e) {
      console.error('Error searching productos:', e);
      toast({
        title: 'Error',
        description: 'No se pudo buscar productos.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyPressBuscar = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      setPage(0);
      handleSearch(0);
    }
  };

  const handleConfirm = () => {
    if (selectedProducto) {
      onSelectProducto(selectedProducto);
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    // cargar una primera página (similar a otros pickers) para que el modal no esté “vacío”
    setPage(0);
    handleSearch(0, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Buscar producto</FormLabel>
              <HStack>
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={onKeyPressBuscar}
                  placeholder="Ingrese nombre o ID"
                  isDisabled={isLoading}
                />
                <Select
                  value={tipoBusqueda}
                  onChange={(e) => setTipoBusqueda(e.target.value as TipoBusqueda)}
                  width="150px"
                  isDisabled={isLoading}
                >
                  <option value="NOMBRE">Nombre</option>
                  <option value="ID">ID</option>
                </Select>
                <Button
                  onClick={() => {
                    setPage(0);
                    handleSearch(0);
                  }}
                  isLoading={isLoading}
                  loadingText="Buscando"
                  colorScheme="blue"
                >
                  Buscar
                </Button>
              </HStack>
            </FormControl>

            <Box w="full" overflowX="auto">
              {items.length > 0 ? (
                <>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>ID</Th>
                        <Th>Nombre</Th>
                        <Th>UOM</Th>
                        <Th>Tipo</Th>
                        <Th isNumeric>Stock</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {items.map((row) => {
                        const p = row.producto;
                        const isSelected = selectedProductoId === p.productoId;
                        return (
                          <Tr
                            key={String(p.productoId)}
                            onClick={() => setSelectedProductoId(p.productoId)}
                            bg={isSelected ? 'blue.100' : 'transparent'}
                            _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                          >
                            <Td>{p.productoId}</Td>
                            <Td>{p.nombre}</Td>
                            <Td>{p.tipoUnidades ?? ''}</Td>
                            <Td>{p.tipo_producto ?? ''}</Td>
                            <Td isNumeric>{row.stock ?? 0}</Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>

                  <Flex justify="center" mt={4}>
                    <BetterPagination
                      page={page}
                      size={size}
                      totalPages={totalPages}
                      loading={isLoading}
                      onPageChange={(newPage) => {
                        setPage(newPage);
                        handleSearch(newPage, size);
                      }}
                      onSizeChange={(newSize) => {
                        setSize(newSize);
                        setPage(0);
                        handleSearch(0, newSize);
                      }}
                    />
                  </Flex>
                </>
              ) : (
                <Text textAlign="center">No hay productos para mostrar</Text>
              )}
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleConfirm} isDisabled={!selectedProducto}>
            Confirmar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

