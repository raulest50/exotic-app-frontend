import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
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
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import { format } from 'date-fns';
import EndPointsURL from '../../../api/EndPointsURL';
import MyDatePicker from '../../../components/MyDatePicker';
import DateRangePicker from '../../../components/DateRangePicker';
import BetterPagination from '../../../components/BetterPagination/BetterPagination';
import ProductoSelector, { ProductoMin } from '../../../components/ProductoSelector/ProductoSelector';
import { KardexMovimientoRowDTO, KardexMovimientosPageDTO } from './types';

const endPoints = new EndPointsURL();

type Props = {};

type ModoFecha = 'UNICA' | 'RANGO';

export function KardexTab(_: Props) {
  const toast = useAppToast();
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const [isProductoSelectorOpen, setIsProductoSelectorOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<ProductoMin | null>(null);

  const [almacen, setAlmacen] = useState<string>('GENERAL');

  const [modoFecha, setModoFecha] = useState<ModoFecha>('UNICA');
  const [fechaUnica, setFechaUnica] = useState(today);
  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState<KardexMovimientosPageDTO | null>(null);

  const { startDate, endDate } = useMemo(() => {
    if (modoFecha === 'UNICA') {
      return { startDate: fechaUnica, endDate: fechaUnica };
    }
    return { startDate: fechaInicio, endDate: fechaFin };
  }, [modoFecha, fechaUnica, fechaInicio, fechaFin]);

  const isFechaValida = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate <= endDate; // yyyy-MM-dd lexical works
  }, [startDate, endDate]);

  const canQuery = useMemo(() => !!selectedProducto?.productoId && isFechaValida, [selectedProducto, isFechaValida]);

  const requestPayload = useMemo(() => {
    return {
      productoId: String(selectedProducto?.productoId ?? ''),
      almacen,
      startDate,
      endDate,
      page,
      size,
    };
  }, [selectedProducto, almacen, startDate, endDate, page, size]);

  const fetchKardex = async () => {
    if (!canQuery) return;
    setLoading(true);
    try {
      const resp = await axios.post<KardexMovimientosPageDTO>(endPoints.kardex_movimientos, requestPayload);
      setData(resp.data);
      setTotalPages(resp.data.totalPages ?? 0);

      const empty = (resp.data?.totalElements ?? 0) === 0 || (resp.data?.content?.length ?? 0) === 0;
      if (empty) {
        toast({
          title: 'Sin movimientos',
          description: 'No hay movimientos para el producto y fechas seleccionadas.',
          status: 'info',
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (e) {
      console.error('Error cargando kardex:', e);

      let description = 'No se pudo cargar el kardex.';
      if (axios.isAxiosError(e)) {
        const maybeString = e.response?.data;
        if (typeof maybeString === 'string' && maybeString.trim() !== '') {
          description = maybeString;
        } else if (e.code === 'ERR_NETWORK') {
          description = 'No se pudo conectar al backend (error de red / endpoint no disponible).';
        } else if (e.message) {
          description = e.message;
        }
      }

      toast({
        title: 'Error',
        description,
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Refetch cuando cambie paginación, si ya hay resultados cargados
  useEffect(() => {
    if (!data) return;
    fetchKardex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  const exportExcel = async () => {
    if (!canQuery) return;
    try {
      const resp = await axios.post(endPoints.kardex_exportar_excel, {
        productoId: String(selectedProducto?.productoId ?? ''),
        almacen,
        startDate,
        endDate,
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kardex_${selectedProducto?.productoId}_${startDate}_a_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Error exportando excel:', e);
      toast({
        title: 'Error',
        description: 'No se pudo exportar el Excel.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // si cambian los parámetros, reseteamos paginación y resultados
  useEffect(() => {
    setPage(0);
    setData(null);
  }, [selectedProducto?.productoId, almacen, startDate, endDate, modoFecha]);

  return (
    <VStack w="full" align="stretch" gap={4}>
      {/* Cabezote de búsqueda */}
      <Box p={4} borderWidth="1px" borderRadius="md">
        <VStack align="stretch" gap={4}>
          <HStack gap={3} align="flex-end" flexWrap="wrap">
            <Field.Root>
              <Field.Label>Producto</Field.Label>
              <HStack>
                <Button onClick={() => setIsProductoSelectorOpen(true)}>Seleccionar</Button>
                <Text>
                  {selectedProducto ? `${selectedProducto.productoId} - ${selectedProducto.nombre}` : 'Sin selección'}
                </Text>
              </HStack>
            </Field.Root>

            <Field.Root maxW="200px">
              <Field.Label>Almacén</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={almacen} onChange={(e) => setAlmacen(e.target.value)}>
                  <option value="GENERAL">General</option>
                  <option value="AVERIAS">Averías</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root maxW="220px">
              <Field.Label>Filtro de fecha</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={modoFecha}
                  onChange={(e) => setModoFecha(e.target.value as ModoFecha)}>
                  <option value="UNICA">Fecha única</option>
                  <option value="RANGO">Rango de fechas</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Flex flex={1} minW="320px" justify="flex-start">
              {modoFecha === 'UNICA' ? (
                <MyDatePicker
                  date={fechaUnica}
                  setDate={setFechaUnica}
                  defaultDate={today}
                  label="Fecha"
                />
              ) : (
                <DateRangePicker
                  date1={fechaInicio}
                  setDate1={setFechaInicio}
                  date2={fechaFin}
                  setDate2={setFechaFin}
                  flex_direction="row"
                />
              )}
            </Flex>

            <HStack>
              <Button onClick={fetchKardex} disabled={!canQuery} loading={loading} loadingText="Cargando">
                Consultar
              </Button>
              <Button colorPalette="teal" onClick={exportExcel} disabled={!canQuery}>
                Exportar Excel
              </Button>
            </HStack>
          </HStack>

          {!isFechaValida && (
            <Text color="red.500" fontSize="sm">
              Rango de fechas inválido: la fecha final debe ser mayor o igual que la inicial.
            </Text>
          )}
        </VStack>
      </Box>

      {/* Resultados */}
      {data && (
        <Box>
          <Text mb={2}>
            <strong>Saldo inicial:</strong> {data.saldoInicial}
          </Text>

          {data.content.length === 0 ? (
            <Box p={4} borderWidth="1px" borderRadius="md">
              <Text color="app.textMuted">No hay movimientos para los parámetros de búsqueda especificados.</Text>
            </Box>
          ) : (
            <Box borderWidth="1px" borderRadius="md" overflowX="auto">
              <Table.Root size="sm" variant="simple">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                    <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                    <Table.ColumnHeader>Almacén</Table.ColumnHeader>
                    <Table.ColumnHeader>Lote</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign='end'>Entrada</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign='end'>Salida</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign='end'>Saldo</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {data.content.map((row) => (
                    <Table.Row key={row.movimientoId}>
                      <Table.Cell>{format(new Date(row.fechaMovimiento), 'dd/MM/yyyy HH:mm')}</Table.Cell>
                      <Table.Cell>{row.tipoMovimiento}</Table.Cell>
                      <Table.Cell>{row.almacen}</Table.Cell>
                      <Table.Cell>{row.batchNumber ?? ''}</Table.Cell>
                      <Table.Cell textAlign='end'>{row.entrada}</Table.Cell>
                      <Table.Cell textAlign='end'>{row.salida}</Table.Cell>
                      <Table.Cell textAlign='end'>{row.saldo}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}

          {totalPages > 1 && (
            <Box mt={3}>
              <BetterPagination
                page={page}
                size={size}
                totalPages={totalPages}
                loading={loading}
                onPageChange={(newPage) => setPage(newPage)}
                onSizeChange={(newSize) => setSize(newSize)}
              />
            </Box>
          )}
        </Box>
      )}

      {/* Modal selector */}
      <ProductoSelector
        isOpen={isProductoSelectorOpen}
        onClose={() => setIsProductoSelectorOpen(false)}
        onSelectProducto={(p) => setSelectedProducto(p)}
        title="Seleccionar producto (Material / Semi / Terminado)"
      />
    </VStack>
  );
}
