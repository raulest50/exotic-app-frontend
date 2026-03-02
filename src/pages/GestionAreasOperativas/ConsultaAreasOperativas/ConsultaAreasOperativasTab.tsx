import { useState } from 'react';
import { VStack, Alert, AlertIcon, Text } from '@chakra-ui/react';
import { useToast } from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import BetterPagination from '../../../components/BetterPagination/BetterPagination.tsx';
import FiltroAreasOperativas from './FiltroAreasOperativas.tsx';
import TablaAreasOperativas from './TablaAreasOperativas.tsx';
import DetalleAreaOperativaDialog from './DetalleAreaOperativaDialog.tsx';
import { AreaOperativa, SearchAreaOperativaDTO, PaginatedResponse } from './types';

const endpoints = new EndPointsURL();

export default function ConsultaAreasOperativasTab() {
    const toast = useToast();
    const [areas, setAreas] = useState<AreaOperativa[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [filtroActual, setFiltroActual] = useState<SearchAreaOperativaDTO | null>(null);

    const [areaSeleccionada, setAreaSeleccionada] = useState<AreaOperativa | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const buscarAreas = async (
        filtro: SearchAreaOperativaDTO,
        pagina: number = 0,
        tamanoPagina: number = size,
    ) => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post<PaginatedResponse<AreaOperativa>>(
                endpoints.search_areas_operativas,
                filtro,
                {
                    params: { page: pagina, size: tamanoPagina },
                    withCredentials: true,
                },
            );

            setAreas(response.data.content ?? []);
            setTotalPages(response.data.totalPages ?? 0);
            setPage(pagina);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Error al buscar áreas operativas';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            setAreas([]);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    };

    const handleBuscar = (filtro: SearchAreaOperativaDTO) => {
        setFiltroActual(filtro);
        buscarAreas(filtro, 0);
    };

    const handlePageChange = (newPage: number) => {
        if (filtroActual) {
            buscarAreas(filtroActual, newPage);
        }
    };

    const handleSizeChange = (newSize: number) => {
        setSize(newSize);
        if (filtroActual) {
            buscarAreas(filtroActual, 0, newSize);
        }
    };

    const handleVerDetalle = (area: AreaOperativa) => {
        setAreaSeleccionada(area);
        setIsDialogOpen(true);
    };

    const handleCerrarDialog = () => {
        setIsDialogOpen(false);
        setAreaSeleccionada(null);
    };

    return (
        <VStack w="full" spacing={4} align="stretch">
            <FiltroAreasOperativas
                onBuscar={handleBuscar}
                loading={loading}
            />

            {error && (
                <Alert status="error">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {areas.length > 0 || loading ? (
                <>
                    <TablaAreasOperativas
                        areas={areas}
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
                    No se encontraron áreas operativas con los filtros seleccionados.
                </Text>
            ) : null}

            <DetalleAreaOperativaDialog
                isOpen={isDialogOpen}
                onClose={handleCerrarDialog}
                area={areaSeleccionada}
            />
        </VStack>
    );
}
