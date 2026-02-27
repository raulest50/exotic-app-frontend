import { useState } from 'react';
import { Text, Alert, AlertIcon, VStack } from '@chakra-ui/react';
import FiltroTranAlmacenSearch, { FiltroHistorialTransaccionesDTO } from './FiltroTranAlmacenSearch.tsx';
import BetterPagination from '../../../components/BetterPagination/BetterPagination.tsx';
import DetalleTransaccionDialog from './DetalleTransaccionDialog.tsx';
import { TransaccionAlmacen, PaginatedResponse } from '../../TransaccionesAlmacen/HistorialDispensaciones/types';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import { useToast } from '@chakra-ui/react';
import TablaTranAlmacen from "./TablaTranAlmacen.tsx";

const endpoints = new EndPointsURL();

function HistorialTransaccionesAlmacenTab() {
    const toast = useToast();
    const [transacciones, setTransacciones] = useState<TransaccionAlmacen[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [size, setSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [filtroActual, setFiltroActual] = useState<FiltroHistorialTransaccionesDTO | null>(null);

    const [transaccionSeleccionada, setTransaccionSeleccionada] = useState<TransaccionAlmacen | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    const buscarTransacciones = async (
        filtro: FiltroHistorialTransaccionesDTO,
        pagina: number = 0,
        tamanoPagina: number = size
    ) => {
        setLoading(true);
        setError(null);

        try {
            const filtroConPagina = {
                ...filtro,
                page: pagina,
                size: tamanoPagina,
            };

            const response = await axios.post<PaginatedResponse<TransaccionAlmacen>>(
                endpoints.historial_transacciones_filter,
                filtroConPagina,
                { withCredentials: true }
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

    const handleBuscar = (filtro: FiltroHistorialTransaccionesDTO) => {
        setFiltroActual(filtro);
        buscarTransacciones(filtro, 0);
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

    const handleVerDetalle = (transaccion: TransaccionAlmacen) => {
        setTransaccionSeleccionada(transaccion);
        setIsDialogOpen(true);
    };

    const handleCerrarDialog = () => {
        setIsDialogOpen(false);
        setTransaccionSeleccionada(null);
    };

    return (
        <VStack w="full" spacing={4} align="stretch">
            <FiltroTranAlmacenSearch
                onBuscar={handleBuscar}
                loading={loading}
            />

            {error && (
                <Alert status="error">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {transacciones.length > 0 || loading ? (
                <>
                    <TablaTranAlmacen
                        transacciones={transacciones}
                        loading={loading}
                        onVerDetalle={handleVerDetalle}
                    />

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

            <DetalleTransaccionDialog
                isOpen={isDialogOpen}
                onClose={handleCerrarDialog}
                transaccion={transaccionSeleccionada}
            />
        </VStack>
    );
}

export default HistorialTransaccionesAlmacenTab;
