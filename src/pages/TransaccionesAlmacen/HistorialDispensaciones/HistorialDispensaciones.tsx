import { useState } from 'react';
import { Flex, Text, Alert, AlertIcon } from '@chakra-ui/react';
import { FiltroHistorialDispensaciones } from './FiltroHistorialDispensaciones.tsx';
import TablaDispensaciones from './TablaDispensaciones.tsx';
import BetterPagination from '../../../components/BetterPagination.tsx';
import { TransaccionAlmacen, PaginatedResponse, FiltroHistDispensacionDTO } from './types';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import { useToast } from '@chakra-ui/react';

const endpoints = new EndPointsURL();

export function HistorialDispensaciones() {
    const toast = useToast();
    const [dispensaciones, setDispensaciones] = useState<TransaccionAlmacen[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [size, setSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [filtroActual, setFiltroActual] = useState<FiltroHistDispensacionDTO | null>(null);

    const buscarDispensaciones = async (filtro: FiltroHistDispensacionDTO, pagina: number = 0, tamanoPagina: number = size) => {
        setLoading(true);
        setError(null);

        try {
            const filtroConPagina = {
                ...filtro,
                page: pagina,
                size: tamanoPagina,
            };

            const response = await axios.post<PaginatedResponse<TransaccionAlmacen>>(
                endpoints.historial_dispensacion_filter,
                filtroConPagina,
                { withCredentials: true }
            );

            setDispensaciones(response.data.content ?? []);
            setTotalPages(response.data.totalPages ?? 0);
            setPage(pagina);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Error al buscar dispensaciones';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            setDispensaciones([]);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    };

    const handleBuscar = (filtro: FiltroHistDispensacionDTO) => {
        setFiltroActual(filtro);
        buscarDispensaciones(filtro, 0);
    };

    const handleLimpiar = () => {
        setDispensaciones([]);
        setTotalPages(0);
        setPage(0);
        setError(null);
        setFiltroActual(null);
    };

    const handlePageChange = (newPage: number) => {
        if (filtroActual) {
            buscarDispensaciones(filtroActual, newPage);
        }
    };

    const handleSizeChange = (newSize: number) => {
        setSize(newSize);
        if (filtroActual) {
            buscarDispensaciones(filtroActual, 0, newSize); // Reset to first page with new size
        }
    };

    const handleDispensacionAdicional = (transaccionId: number, ordenProduccionId: number) => {
        // TODO: Implementar funcionalidad de dispensación adicional
        toast({
            title: 'Funcionalidad futura',
            description: `Dispensación adicional para transacción ${transaccionId} y orden ${ordenProduccionId}`,
            status: 'info',
            duration: 3000,
            isClosable: true,
        });
        console.log('Dispensación adicional:', { transaccionId, ordenProduccionId });
    };

    return (
        <Flex direction="column" p={4} gap={4}>
            <FiltroHistorialDispensaciones
                onBuscar={handleBuscar}
                onLimpiar={handleLimpiar}
            />

            {error && (
                <Alert status="error">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {dispensaciones.length > 0 || loading ? (
                <>
                    <TablaDispensaciones
                        dispensaciones={dispensaciones}
                        loading={loading}
                        onDispensacionAdicional={handleDispensacionAdicional}
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
                    No se encontraron dispensaciones con los filtros seleccionados.
                </Text>
            ) : null}
        </Flex>
    );
}
