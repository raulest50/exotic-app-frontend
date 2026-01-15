import {Box, Button, Collapse, Flex, Heading, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr} from '@chakra-ui/react';
import {Fragment, useEffect, useMemo, useState} from 'react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import {MovimientoDetalle, TransaccionAlmacenDetalle} from '../types';
import {FiltroHistDispensacionDTO, PaginatedResponse, TransaccionAlmacen} from '../HistorialDispensaciones/types';

interface Props {
    ordenProduccionId?: number | null;
    dispensaciones?: TransaccionAlmacenDetalle[];
}

export default function ResumenHistorialDispensaciones({
    ordenProduccionId,
    dispensaciones
}: Props) {
    const [loading, setLoading] = useState(false);
    const [dispensacionesState, setDispensacionesState] = useState<TransaccionAlmacenDetalle[]>([]);
    const [movimientosPorTransaccion, setMovimientosPorTransaccion] = useState<Record<number, MovimientoDetalle[]>>({});
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    const endpoints = useMemo(() => new EndPointsURL(), []);

    useEffect(() => {
        const fetchHistorial = async () => {
            if (dispensaciones) {
                setDispensacionesState(dispensaciones);
                const movimientosMap: Record<number, MovimientoDetalle[]> = {};
                dispensaciones.forEach((transaccion) => {
                    movimientosMap[transaccion.transaccionId] = transaccion.movimientos ?? [];
                });
                setMovimientosPorTransaccion(movimientosMap);
                return;
            }

            if (!ordenProduccionId) {
                setDispensacionesState([]);
                setMovimientosPorTransaccion({});
                return;
            }
            setLoading(true);
            try {
                const filtro: FiltroHistDispensacionDTO = {
                    tipoFiltroId: 2,
                    ordenProduccionId,
                    tipoFiltroFecha: 0,
                    page: 0,
                    size: 100
                };
                const resp = await axios.post<PaginatedResponse<TransaccionAlmacen>>(
                    endpoints.historial_dispensacion_filter,
                    filtro,
                    {withCredentials: true}
                );
                const transacciones = (resp.data.content ?? []).filter(
                    t => t.tipoEntidadCausante === 'OD' || t.tipoEntidadCausante === 'OP'
                );

                const movimientosEntries = await Promise.all(
                    transacciones.map(async (transaccion) => {
                        const url = endpoints.movimientos_transaccion.replace(
                            '{transaccionId}',
                            transaccion.transaccionId.toString()
                        );
                        try {
                            const movResp = await axios.get<MovimientoDetalle[]>(url, {withCredentials: true});
                            return [transaccion.transaccionId, movResp.data ?? []] as const;
                        } catch {
                            return [transaccion.transaccionId, []] as const;
                        }
                    })
                );
                const movimientosMap: Record<number, MovimientoDetalle[]> = {};
                movimientosEntries.forEach(([transaccionId, movimientos]) => {
                    movimientosMap[transaccionId] = movimientos;
                });
                setMovimientosPorTransaccion(movimientosMap);

                const detalles: TransaccionAlmacenDetalle[] = transacciones.map(transaccion => ({
                    transaccionId: transaccion.transaccionId,
                    fechaTransaccion: transaccion.fechaTransaccion,
                    idEntidadCausante: transaccion.idEntidadCausante,
                    tipoEntidadCausante: transaccion.tipoEntidadCausante,
                    observaciones: transaccion.observaciones,
                    estadoContable: transaccion.estadoContable,
                    usuarioAprobador: transaccion.usuarioAprobador,
                    movimientos: movimientosMap[transaccion.transaccionId] ?? []
                }));
                setDispensacionesState(detalles);
            } finally {
                setLoading(false);
            }
        };

        fetchHistorial();
    }, [ordenProduccionId, endpoints, dispensaciones]);

    const toggleExpanded = (transaccionId: number) => {
        setExpanded(prev => ({
            ...prev,
            [transaccionId]: !prev[transaccionId]
        }));
    };

    return (
        <Box w="full" mt={6}>
            <Heading size="md" mb={2} fontFamily="Comfortaa Variable">
                Historial de Dispensaciones
            </Heading>
            {loading ? (
                <Flex justify="center" py={6}>
                    <Spinner />
                </Flex>
            ) : dispensacionesState.length === 0 ? (
                <Text fontSize="sm" color="gray.600">
                    No hay dispensaciones registradas para esta orden.
                </Text>
            ) : (
                <Box bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th>ID Transacción</Th>
                                <Th>Fecha</Th>
                                <Th>Observaciones</Th>
                                <Th textAlign="right">Acciones</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {dispensacionesState.map((disp) => (
                                <Fragment key={disp.transaccionId}>
                                    <Tr key={disp.transaccionId}>
                                        <Td>{disp.transaccionId}</Td>
                                        <Td>{new Date(disp.fechaTransaccion).toLocaleString('es-ES')}</Td>
                                        <Td>{disp.observaciones || '-'}</Td>
                                        <Td textAlign="right">
                                            <Button size="xs" onClick={() => toggleExpanded(disp.transaccionId)}>
                                                {expanded[disp.transaccionId] ? 'Ocultar' : 'Ver items'}
                                            </Button>
                                        </Td>
                                    </Tr>
                                    <Tr>
                                        <Td colSpan={4} p={0}>
                                            <Collapse in={!!expanded[disp.transaccionId]} animateOpacity>
                                                <Box p={3} bg="gray.50">
                                                    <Table size="xs">
                                                        <Thead>
                                                            <Tr>
                                                                <Th>Producto</Th>
                                                                <Th>Cantidad</Th>
                                                                <Th>Unidad</Th>
                                                                <Th>Lote</Th>
                                                            </Tr>
                                                        </Thead>
                                                        <Tbody>
                                                            {(movimientosPorTransaccion[disp.transaccionId] ?? []).map((mov) => (
                                                                <Tr key={`${disp.transaccionId}-${mov.movimientoId}`}>
                                                                    <Td>{mov.productoNombre || mov.productoId}</Td>
                                                                    <Td>{mov.cantidad.toFixed(2)}</Td>
                                                                    <Td>{mov.tipoUnidades}</Td>
                                                                    <Td>{mov.batchNumber || '-'}</Td>
                                                                </Tr>
                                                            ))}
                                                            {(movimientosPorTransaccion[disp.transaccionId] ?? []).length === 0 && (
                                                                <Tr>
                                                                    <Td colSpan={4}>
                                                                        <Text fontSize="xs" color="gray.500">
                                                                            No hay items para esta transacción.
                                                                        </Text>
                                                                    </Td>
                                                                </Tr>
                                                            )}
                                                        </Tbody>
                                                    </Table>
                                                </Box>
                                            </Collapse>
                                        </Td>
                                    </Tr>
                                </Fragment>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            )}
        </Box>
    );
}

