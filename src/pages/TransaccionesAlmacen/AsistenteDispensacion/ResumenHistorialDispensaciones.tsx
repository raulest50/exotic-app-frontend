import {
    Box,
    Button,
    Collapsible,
    Flex,
    Heading,
    Spinner,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from '@chakra-ui/react';
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
                <Text fontSize="sm" color="app.textMuted">
                    No hay dispensaciones registradas para esta orden.
                </Text>
            ) : (
                <Box bg="app.surface" borderRadius="md" boxShadow="sm" overflowX="auto">
                    <Table.Root size="sm">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>ID Transacción</Table.ColumnHeader>
                                <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                                <Table.ColumnHeader>Observaciones</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right">Acciones</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {dispensacionesState.map((disp) => (
                                <Fragment key={disp.transaccionId}>
                                    <Table.Row key={disp.transaccionId}>
                                        <Table.Cell>{disp.transaccionId}</Table.Cell>
                                        <Table.Cell>{new Date(disp.fechaTransaccion).toLocaleString('es-ES')}</Table.Cell>
                                        <Table.Cell>{disp.observaciones || '-'}</Table.Cell>
                                        <Table.Cell textAlign="right">
                                            <Button size="xs" onClick={() => toggleExpanded(disp.transaccionId)}>
                                                {expanded[disp.transaccionId] ? 'Ocultar' : 'Ver items'}
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell colSpan={4} p={0}>
                                            <Collapsible.Root open={!!expanded[disp.transaccionId]}>
                                                <Collapsible.Content>
                                                    <Box p={3} bg="app.surfaceSubtle">
                                                        <Table.Root size="xs">
                                                            <Table.Header>
                                                                <Table.Row>
                                                                    <Table.ColumnHeader>Producto</Table.ColumnHeader>
                                                                    <Table.ColumnHeader>Área destino</Table.ColumnHeader>
                                                                    <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                                                    <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                                                                    <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                                                </Table.Row>
                                                            </Table.Header>
                                                            <Table.Body>
                                                                {(movimientosPorTransaccion[disp.transaccionId] ?? []).map((mov) => (
                                                                    <Table.Row key={`${disp.transaccionId}-${mov.movimientoId}`}>
                                                                        <Table.Cell>{mov.productoNombre || mov.productoId}</Table.Cell>
                                                                        <Table.Cell>{mov.areaOperativaNombre || '-'}</Table.Cell>
                                                                        <Table.Cell>{mov.cantidad.toFixed(2)}</Table.Cell>
                                                                        <Table.Cell>{mov.tipoUnidades}</Table.Cell>
                                                                        <Table.Cell>{mov.batchNumber || '-'}</Table.Cell>
                                                                    </Table.Row>
                                                                ))}
                                                                {(movimientosPorTransaccion[disp.transaccionId] ?? []).length === 0 && (
                                                                    <Table.Row>
                                                                        <Table.Cell colSpan={5}>
                                                                            <Text fontSize="xs" color="app.textSubtle">
                                                                                No hay items para esta transacción.
                                                                            </Text>
                                                                        </Table.Cell>
                                                                    </Table.Row>
                                                                )}
                                                            </Table.Body>
                                                        </Table.Root>
                                                    </Box>
                                                </Collapsible.Content>
                                            </Collapsible.Root>
                                        </Table.Cell>
                                    </Table.Row>
                                </Fragment>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Box>
            )}
        </Box>
    );
}

