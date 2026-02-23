import { useState } from 'react';
import {
    Flex,
    Text,
    Alert,
    AlertIcon,
    Box,
    Table,
    TableContainer,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    Button,
    Spinner,
    VStack,
} from '@chakra-ui/react';
import axios from 'axios';
import { useToast } from '@chakra-ui/react';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import BetterPagination from '../../../components/BetterPagination/BetterPagination.tsx';
import FiltroTranAlmacenSearch from './FiltroTranAlmacenSearch.tsx';
import DetalleTransaccionAlmacenDialog from './DetalleTransaccionAlmacenDialog.tsx';
import {
    TransaccionAlmacenRow,
    PaginatedResponse,
    FiltroHistorialTransaccionAlmacenDTO,
    TIPO_ENTIDAD_CAUSANTE_LABELS,
} from './types';

const endpoints = new EndPointsURL();

const formatFecha = (fecha?: string) => {
    if (!fecha) return 'N/A';
    try {
        const parsed = new Date(fecha);
        return isNaN(parsed.getTime()) ? fecha : parsed.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return fecha;
    }
};

const formatEstadoContable = (estado?: string) => {
    if (!estado) return 'N/A';
    const estados: Record<string, string> = {
        'PENDIENTE': 'Pendiente',
        'CONTABILIZADA': 'Contabilizada',
        'NO_APLICA': 'No Aplica',
    };
    return estados[estado] || estado;
};

const truncarTexto = (texto: string | undefined, maxLength: number = 50) => {
    if (!texto) return '-';
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
};

export default function HistorialTransaccionesAlmacenTab() {
    const toast = useToast();
    const [transacciones, setTransacciones] = useState<TransaccionAlmacenRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [size, setSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [filtroActual, setFiltroActual] = useState<FiltroHistorialTransaccionAlmacenDTO | null>(null);

    const [transaccionSeleccionada, setTransaccionSeleccionada] = useState<TransaccionAlmacenRow | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    const buscarTransacciones = async (
        filtro: FiltroHistorialTransaccionAlmacenDTO,
        pagina: number = 0,
        tamanoPagina: number = size,
    ) => {
        setLoading(true);
        setError(null);

        try {
            const filtroConPagina = {
                ...filtro,
                page: pagina,
                size: tamanoPagina,
            };

            const response = await axios.post<PaginatedResponse<TransaccionAlmacenRow>>(
                endpoints.historial_transacciones_almacen,
                filtroConPagina,
                { withCredentials: true },
            );

            setTransacciones(response.data.content ?? []);
            setTotalPages(response.data.totalPages ?? 0);
            setPage(pagina);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Error al buscar transacciones';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            setTransacciones([]);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    };

    const handleBuscar = (filtro: FiltroHistorialTransaccionAlmacenDTO) => {
        setFiltroActual(filtro);
        buscarTransacciones(filtro, 0);
    };

    const handleLimpiar = () => {
        setTransacciones([]);
        setTotalPages(0);
        setPage(0);
        setError(null);
        setFiltroActual(null);
    };

    const handlePageChange = (newPage: number) => {
        if (filtroActual) {
            buscarTransacciones(filtroActual, newPage);
        }
    };

    const handleSizeChange = (newSize: number) => {
        setSize(newSize);
        if (filtroActual) {
            buscarTransacciones(filtroActual, 0, newSize);
        }
    };

    const handleVerDetalle = (transaccion: TransaccionAlmacenRow) => {
        setTransaccionSeleccionada(transaccion);
        setIsDialogOpen(true);
    };

    const handleCerrarDialog = () => {
        setIsDialogOpen(false);
        setTransaccionSeleccionada(null);
    };

    return (
        <VStack spacing={4} align="stretch">
            <FiltroTranAlmacenSearch
                onBuscar={handleBuscar}
                onLimpiar={handleLimpiar}
            />

            {error && (
                <Alert status="error">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {transacciones.length > 0 || loading ? (
                <>
                    {loading ? (
                        <Flex justify="center" align="center" py={8}>
                            <Spinner size="xl" />
                        </Flex>
                    ) : (
                        <Box bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
                            <TableContainer>
                                <Table variant="simple" size="sm">
                                    <Thead>
                                        <Tr>
                                            <Th>ID Transacción</Th>
                                            <Th>Tipo</Th>
                                            <Th>ID Entidad Causante</Th>
                                            <Th>Fecha</Th>
                                            <Th>Estado Contable</Th>
                                            <Th>Observaciones</Th>
                                            <Th textAlign="center">Acciones</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {transacciones.map((t) => (
                                            <Tr key={t.transaccionId}>
                                                <Td>{t.transaccionId}</Td>
                                                <Td>
                                                    {TIPO_ENTIDAD_CAUSANTE_LABELS[t.tipoEntidadCausante] || t.tipoEntidadCausante}
                                                </Td>
                                                <Td>{t.idEntidadCausante}</Td>
                                                <Td>{formatFecha(t.fechaTransaccion)}</Td>
                                                <Td>{formatEstadoContable(t.estadoContable)}</Td>
                                                <Td>
                                                    <Text fontSize="sm">{truncarTexto(t.observaciones)}</Text>
                                                </Td>
                                                <Td>
                                                    <Flex justify="center">
                                                        <Button
                                                            colorScheme="teal"
                                                            size="sm"
                                                            onClick={() => handleVerDetalle(t)}
                                                        >
                                                            Ver detalle
                                                        </Button>
                                                    </Flex>
                                                </Td>
                                            </Tr>
                                        ))}
                                        {transacciones.length === 0 && (
                                            <Tr>
                                                <Td colSpan={7}>
                                                    <Text textAlign="center" py={4}>
                                                        No hay transacciones disponibles.
                                                    </Text>
                                                </Td>
                                            </Tr>
                                        )}
                                    </Tbody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {totalPages > 0 && (
                        <BetterPagination
                            page={page}
                            size={size}
                            totalPages={totalPages}
                            loading={loading}
                            onPageChange={handlePageChange}
                            onSizeChange={handleSizeChange}
                        />
                    )}
                </>
            ) : filtroActual && !loading ? (
                <Text textAlign="center" py={8} color="gray.500">
                    No se encontraron transacciones con los filtros seleccionados.
                </Text>
            ) : null}

            <DetalleTransaccionAlmacenDialog
                isOpen={isDialogOpen}
                onClose={handleCerrarDialog}
                transaccion={transaccionSeleccionada}
            />
        </VStack>
    );
}
