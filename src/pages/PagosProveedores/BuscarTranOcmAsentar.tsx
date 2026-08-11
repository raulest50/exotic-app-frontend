import {useState} from 'react';
import {
  Steps,
  Flex,
  Input,
  NativeSelect,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../api/EndPointsURL.tsx';
import MyPagination from '../../components/MyPagination.tsx';
import {
  EstadoContable,
  TransaccionAlmacen,
  DTO_SearchTransaccionAlmacen,
  PaginatedResponse
} from './types.tsx';

const endPoints = new EndPointsURL();

export default function BuscarTranOcmAsentar() {
  const [estadoContable, setEstadoContable] = useState<EstadoContable>(EstadoContable.PENDIENTE);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [transacciones, setTransacciones] = useState<TransaccionAlmacen[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const toast = useAppToast();
  const pageSize = 10;

  const handleSearch = async (pageNumber = 0) => {
    setLoading(true);
    setPage(pageNumber);
    try {
      const dto: DTO_SearchTransaccionAlmacen = {
        estadoContable,
        fechaInicio: fechaInicio ? `${fechaInicio}T00:00:00` : undefined,
        fechaFin: fechaFin ? `${fechaFin}T23:59:59` : undefined,
        page: pageNumber,
        size: pageSize,
      };
      const resp = await axios.post<PaginatedResponse<TransaccionAlmacen>>(endPoints.search_transacciones_almacen, dto);
      setTransacciones(resp.data.content);
      setTotalPages(resp.data.totalPages);
    } catch (e) {
      toast({
        title: 'Error al buscar transacciones',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      setTransacciones([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" w="full" gap={4}>
      <Flex wrap="wrap" gap={4}>
        <Field.Root w={["100%","200px"]}>
          <Field.Label>Estado contable</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={estadoContable}
              onValueChange={e => setEstadoContable(e.target.value as EstadoContable)}>
              <option value={EstadoContable.PENDIENTE}>Pendiente</option>
              <option value={EstadoContable.CONTABILIZADA}>Contabilizada</option>
              <option value={EstadoContable.NO_APLICA}>No aplica</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
        <Field.Root w={["100%","200px"]}>
          <Field.Label>Fecha inicio</Field.Label>
          <Input type="date" value={fechaInicio} onValueChange={e => setFechaInicio(e.target.value)} />
        </Field.Root>
        <Field.Root w={["100%","200px"]}>
          <Field.Label>Fecha fin</Field.Label>
          <Input type="date" value={fechaFin} onValueChange={e => setFechaFin(e.target.value)} />
        </Field.Root>
        <Flex alignItems="flex-end">
          <Button colorPalette="blue" onClick={() => handleSearch(0)} loading={loading}>
            Buscar
          </Button>
        </Flex>
      </Flex>

      <Flex direction="column" w="full">
        <Table.Root variant="simple" size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>ID</Table.ColumnHeader>
              <Table.ColumnHeader>Fecha</Table.ColumnHeader>
              <Table.ColumnHeader>Estado</Table.ColumnHeader>
              <Table.ColumnHeader>Entidad</Table.ColumnHeader>
              <Table.ColumnHeader>ID Entidad</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading && (
              <Table.Row>
                <Table.Cell colSpan={5} textAlign="center">
                  <Spinner />
                </Table.Cell>
              </Table.Row>
            )}
            {!loading && transacciones.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={5} textAlign="center">
                  No hay resultados
                </Table.Cell>
              </Table.Row>
            )}
            {transacciones.map(tran => (
              <Table.Row key={tran.transaccionId}>
                <Table.Cell>{tran.transaccionId}</Table.Cell>
                <Table.Cell>{new Date(tran.fechaTransaccion).toLocaleString()}</Table.Cell>
                <Table.Cell>{tran.estadoContable}</Table.Cell>
                <Table.Cell>{tran.tipoEntidadCausante}</Table.Cell>
                <Table.Cell>{tran.idEntidadCausante}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        <MyPagination page={page} totalPages={totalPages} loading={loading} handlePageChange={handleSearch} />
      </Flex>
    </Flex>
  );
}
