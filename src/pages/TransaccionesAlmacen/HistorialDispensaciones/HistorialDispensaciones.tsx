import { useState } from 'react';
import { Flex, Text, Alert, AlertIcon } from '@chakra-ui/react';
import { FiltroHistorialDispensaciones } from './FiltroHistorialDispensaciones.tsx';
import TablaDispensaciones from './TablaDispensaciones.tsx';
import BetterPagination from '../../../components/BetterPagination/BetterPagination.tsx';
import { TransaccionAlmacen, PaginatedResponse, FiltroHistDispensacionDTO } from './types';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import { useToast } from '@chakra-ui/react';
import DetalleDispensacionDialog from './DetalleDispensacionDialog.tsx';
import DispensacionPDF_Generator_Class from '../AsistenteDispensacion/AsistenteDispensacionComponents/DispensacionPDF_Generator';
import { MovimientoDetalle } from '../types';

const endpoints = new EndPointsURL();
const DispensacionPDF_Generator = new DispensacionPDF_Generator_Class();

export function HistorialDispensaciones() {
    const toast = useToast();
    const [dispensaciones, setDispensaciones] = useState<TransaccionAlmacen[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [size, setSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [filtroActual, setFiltroActual] = useState<FiltroHistDispensacionDTO | null>(null);
    
    // Estados para detalle y PDF
    const [transaccionSeleccionada, setTransaccionSeleccionada] = useState<TransaccionAlmacen | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [generandoPDF, setGenerandoPDF] = useState<boolean>(false);

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

    const handleVerDetalle = (transaccion: TransaccionAlmacen) => {
        setTransaccionSeleccionada(transaccion);
        setIsDialogOpen(true);
    };

    const handleCerrarDialog = () => {
        setIsDialogOpen(false);
        setTransaccionSeleccionada(null);
    };

    const handleGenerarPDF = async (transaccion: TransaccionAlmacen) => {
        // Validar que sea una dispensación (OD o OP)
        if (transaccion.tipoEntidadCausante !== 'OD' && transaccion.tipoEntidadCausante !== 'OP') {
            toast({
                title: 'Error',
                description: 'Solo se puede generar PDF para dispensaciones de órdenes de producción',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (!transaccion.idEntidadCausante || transaccion.idEntidadCausante <= 0) {
            toast({
                title: 'Error',
                description: 'No se puede determinar la orden de producción',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setGenerandoPDF(true);

        try {
            // Obtener movimientos de la transacción
            const url = endpoints.movimientos_transaccion.replace(
                '{transaccionId}',
                transaccion.transaccionId.toString()
            );
            const movimientosResp = await axios.get<MovimientoDetalle[]>(url, { withCredentials: true });
            const movimientos = movimientosResp.data || [];

            if (movimientos.length === 0) {
                toast({
                    title: 'Error',
                    description: 'No se encontraron movimientos para esta transacción',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                return;
            }

            // Construir items para el PDF
            const items = movimientos.map(mov => ({
                productoId: mov.productoId || 'N/A',
                productoNombre: mov.productoNombre || 'N/A',
                loteBatch: mov.batchNumber || undefined,
                cantidad: mov.cantidad,
                unidad: mov.tipoUnidades || 'N/A',
                fechaVencimiento: mov.expirationDate ? mov.expirationDate.toString() : undefined
            }));

            // Construir ordenProduccionInfo
            const ordenProduccionId = transaccion.idEntidadCausante;
            const ordenProduccionInfo = {
                productoNombre: `Orden de producción ${ordenProduccionId}`, // Placeholder hasta tener endpoint
                fechaCreacion: transaccion.fechaTransaccion
            };

            // Usuarios realizadores: no disponibles en el historial, usar array vacío
            const usuariosRealizadores: Array<{ id: number; nombreCompleto?: string; username: string }> = [];

            // Usuario aprobador
            const usuarioAprobador = transaccion.usuarioAprobador ? {
                id: transaccion.usuarioAprobador.userId,
                nombreCompleto: transaccion.usuarioAprobador.nombre,
                username: '' // No disponible en el DTO
            } : null;

            // Generar PDF sin borrador
            await DispensacionPDF_Generator.downloadPDF_Dispensacion(
                ordenProduccionId,
                ordenProduccionInfo,
                items,
                usuariosRealizadores,
                usuarioAprobador,
                transaccion.observaciones,
                false // esBorrador = false para PDF desde historial
            );

            toast({
                title: 'Éxito',
                description: 'PDF generado correctamente',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error: any) {
            console.error('Error al generar PDF:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'No se pudo generar el PDF',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setGenerandoPDF(false);
        }
    };

    // Vista normal del historial
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
                        onGenerarPDF={handleGenerarPDF}
                        onVerDetalle={handleVerDetalle}
                        generandoPDF={generandoPDF}
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

            <DetalleDispensacionDialog
                isOpen={isDialogOpen}
                onClose={handleCerrarDialog}
                transaccion={transaccionSeleccionada}
            />
        </Flex>
    );
}
