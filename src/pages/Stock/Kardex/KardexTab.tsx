import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';
import { format } from 'date-fns';
import EndPointsURL from '../../../api/EndPointsURL';
import MyDatePicker from '../../../components/MyDatePicker';
import DateRangePicker from '../../../components/DateRangePicker';
import BetterPagination from '../../../components/BetterPagination/BetterPagination';
import ProductoSelector, { ProductoMin } from '../../../components/ProductoSelector/ProductoSelector';

const endPoints = new EndPointsURL();

type Props = {};

type ModoFecha = 'UNICA' | 'RANGO';

interface KardexMovimientoRowDTO {
  movimientoId: number;
  cantidad: number;
  entrada: number;
  salida: number;
  batchNumber?: string | null;
  tipoMovimiento: string;
  almacen: string;
  fechaMovimiento: string;
  saldo: number;
}

interface KardexMovimientosPageDTO {
  productoId: string;
  productoNombre: string;
  tipoUnidades: string;
  saldoInicial: number;
  content: KardexMovimientoRowDTO[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export function KardexTab(_: Props) {
  const toast = useToast();
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const [isProductoSelectorOpen, setIsProductoSelectorOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<ProductoMin | null>(null);

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
      startDate,
      endDate,
      page,
      size,
    };
  }, [selectedProducto, startDate, endDate, page, size]);

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
  }, [selectedProducto?.productoId, startDate, endDate, modoFecha]);

  return (
    <VStack w="full" align="stretch" spacing={4}>
      {/* Cabezote de búsqueda */}
      <Box p={4} borderWidth="1px" borderRadius="md">
        <VStack align="stretch" spacing={4}>
          <HStack spacing={3} align="flex-end" flexWrap="wrap">
            <FormControl>
              <FormLabel>Producto</FormLabel>
              <HStack>
                <Button onClick={() => setIsProductoSelectorOpen(true)}>Seleccionar</Button>
                <Text>
                  {selectedProducto ? `${selectedProducto.productoId} - ${selectedProducto.nombre}` : 'Sin selección'}
                </Text>
              </HStack>
            </FormControl>

            <FormControl maxW="220px">
              <FormLabel>Filtro de fecha</FormLabel>
              <Select value={modoFecha} onChange={(e) => setModoFecha(e.target.value as ModoFecha)}>
                <option value="UNICA">Fecha única</option>
                <option value="RANGO">Rango de fechas</option>
              </Select>
            </FormControl>

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
              <Button onClick={fetchKardex} isDisabled={!canQuery} isLoading={loading} loadingText="Cargando">
                Consultar
              </Button>
              <Button colorScheme="teal" onClick={exportExcel} isDisabled={!canQuery}>
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
              <Text color="gray.600">No hay movimientos para los parámetros de búsqueda especificados.</Text>
            </Box>
          ) : (
            <Box borderWidth="1px" borderRadius="md" overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Fecha</Th>
                    <Th>Tipo</Th>
                    <Th>Almacén</Th>
                    <Th>Lote</Th>
                    <Th isNumeric>Entrada</Th>
                    <Th isNumeric>Salida</Th>
                    <Th isNumeric>Saldo</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.content.map((row) => (
                    <Tr key={row.movimientoId}>
                      <Td>{row.fechaMovimiento}</Td>
                      <Td>{row.tipoMovimiento}</Td>
                      <Td>{row.almacen}</Td>
                      <Td>{row.batchNumber ?? ''}</Td>
                      <Td isNumeric>{row.entrada}</Td>
                      <Td isNumeric>{row.salida}</Td>
                      <Td isNumeric>{row.saldo}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
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
