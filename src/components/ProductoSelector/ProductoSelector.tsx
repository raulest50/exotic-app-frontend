import React, { useEffect, useMemo, useState } from 'react';
import {
  Steps,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  NativeSelect,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Field,
  Dialog,
  Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
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
  const toast = useAppToast();

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
    <Dialog.Root open={isOpen} size='xl' onOpenChange={e => {
      if (!e.open) {
        onClose();
      }
    }}>
      <Portal>

        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>{title}</Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Field.Root>
                  <Field.Label>Buscar producto</Field.Label>
                  <HStack>
                    <Input
                      value={searchText}
                      onValueChange={(e) => setSearchText(e.target.value)}
                      onKeyDown={onKeyPressBuscar}
                      placeholder="Ingrese nombre o ID"
                      disabled={isLoading}
                    />
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={tipoBusqueda}
                        onValueChange={(e) => setTipoBusqueda(e.target.value as TipoBusqueda)}
                        width="150px"
                        disabled={isLoading}>
                        <option value="NOMBRE">Nombre</option>
                        <option value="ID">ID</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Button
                      onClick={() => {
                        setPage(0);
                        handleSearch(0);
                      }}
                      loading={isLoading}
                      loadingText="Buscando"
                      colorPalette="blue"
                    >
                      Buscar
                    </Button>
                  </HStack>
                </Field.Root>

                <Box w="full" overflowX="auto">
                  {items.length > 0 ? (
                    <>
                      <Table.Root variant="simple" size="sm">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeader>ID</Table.ColumnHeader>
                            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                            <Table.ColumnHeader>UOM</Table.ColumnHeader>
                            <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Stock</Table.ColumnHeader>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {items.map((row) => {
                            const p = row.producto;
                            const isSelected = selectedProductoId === p.productoId;
                            return (
                              <Table.Row
                                key={String(p.productoId)}
                                onClick={() => setSelectedProductoId(p.productoId)}
                                bg={isSelected ? 'blue.100' : 'transparent'}
                                _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                              >
                                <Table.Cell>{p.productoId}</Table.Cell>
                                <Table.Cell>{p.nombre}</Table.Cell>
                                <Table.Cell>{p.tipoUnidades ?? ''}</Table.Cell>
                                <Table.Cell>{p.tipo_producto ?? ''}</Table.Cell>
                                <Table.Cell textAlign='end'>{row.stock ?? 0}</Table.Cell>
                              </Table.Row>
                            );
                          })}
                        </Table.Body>
                      </Table.Root>

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
            </Dialog.Body>

            <Dialog.Footer>
              <Button colorPalette="blue" mr={3} onClick={handleConfirm} disabled={!selectedProducto}>
                Confirmar
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>

      </Portal>
    </Dialog.Root>
  );
}

