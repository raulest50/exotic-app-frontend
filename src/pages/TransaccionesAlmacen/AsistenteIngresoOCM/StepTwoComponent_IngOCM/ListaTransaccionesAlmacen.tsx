import { Fragment, useEffect, useState } from 'react';
import { useColorModeValue } from "../../../../components/ui/color-mode";
import { Box, Flex, Table, Text, Heading, Spinner, Collapsible, IconButton, Badge } from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import { MovimientoDetalle, TransaccionAlmacen } from '../../types';

import { ListaTransaccionesDataProps } from '../ingresoOcmTypes';
import { fetchMovimientosTransaccion, fetchTransaccionesOcm } from '../ocmIngresoApi';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';

interface ListaTransaccionesAlmacenProps extends ListaTransaccionesDataProps {
    ordenCompraId: number | undefined;
}

export function ListaTransaccionesAlmacen({
    ordenCompraId,
    transacciones: transaccionesProp,
    loading: loadingProp,
    error: errorProp,
}: ListaTransaccionesAlmacenProps) {
    const [localTransacciones, setLocalTransacciones] = useState<TransaccionAlmacen[]>([]);
    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [expandedTransacciones, setExpandedTransacciones] = useState<Set<number>>(new Set());
    const [movimientosPorTransaccion, setMovimientosPorTransaccion] = useState<Map<number, MovimientoDetalle[]>>(new Map());
    const [loadingMovimientos, setLoadingMovimientos] = useState<Set<number>>(new Set());
    const toast = useAppToast();
    const usingExternalData = transaccionesProp !== undefined;
    const transacciones = usingExternalData ? transaccionesProp : localTransacciones;
    const loading = usingExternalData ? Boolean(loadingProp) : localLoading;
    const error = usingExternalData ? errorProp ?? null : localError;
    const errorBg = useColorModeValue('red.50', 'red.900');
    const errorColor = useColorModeValue('red.600', 'red.200');
    const contabilizadaBg = useColorModeValue('green.100', 'green.900');
    const contabilizadaColor = useColorModeValue('green.800', 'green.100');
    const pendienteBg = useColorModeValue('yellow.100', 'yellow.900');
    const pendienteColor = useColorModeValue('yellow.800', 'yellow.100');
    const estadoDefaultBg = useColorModeValue('gray.100', 'whiteAlpha.200');
    const estadoDefaultColor = useColorModeValue('gray.800', 'gray.100');

    useEffect(() => {
        if (usingExternalData) {
            return;
        }

        if (!ordenCompraId) {
            setLocalTransacciones([]);
            return;
        }

        const fetchTransacciones = async () => {
            setLocalLoading(true);
            setLocalError(null);
            try {
                setLocalTransacciones(await fetchTransaccionesOcm(ordenCompraId));
            } catch (error: any) {
                console.error('Error fetching transacciones:', error);
                const errorMessage = error.response?.data?.message ||
                    error.message ||
                    'No se pudieron cargar las transacciones';
                setLocalError(errorMessage);

                if (error.response?.status === 405) {
                    toast({
                        title: 'Funcionalidad no disponible',
                        description: 'El endpoint para consultar transacciones aun no esta implementado en el backend.',
                        status: 'info',
                        duration: 5000,
                        isClosable: true,
                    });
                } else {
                    toast({
                        title: 'Error al cargar transacciones',
                        description: errorMessage,
                        status: 'error',
                        duration: 4000,
                        isClosable: true,
                    });
                }
            } finally {
                setLocalLoading(false);
            }
        };

        fetchTransacciones();
    }, [ordenCompraId, toast, usingExternalData]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    const formatDateShort = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('es-CO');
        } catch {
            return dateString;
        }
    };

    const fetchMovimientosPorTransaccion = async (transaccionId: number) => {
        setLoadingMovimientos(prev => new Set(prev).add(transaccionId));
        try {
            const movimientos = await fetchMovimientosTransaccion(transaccionId);
            setMovimientosPorTransaccion(prev => {
                const newMap = new Map(prev);
                newMap.set(transaccionId, movimientos);
                return newMap;
            });
        } catch (error: any) {
            console.error('Error fetching movimientos:', error);
            toast({
                title: 'Error al cargar movimientos',
                description: 'No se pudieron cargar los movimientos de la transaccion',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        } finally {
            setLoadingMovimientos(prev => {
                const newSet = new Set(prev);
                newSet.delete(transaccionId);
                return newSet;
            });
        }
    };

    const toggleTransaccion = async (transaccionId: number) => {
        const isExpanded = expandedTransacciones.has(transaccionId);

        if (isExpanded) {
            setExpandedTransacciones(prev => {
                const newSet = new Set(prev);
                newSet.delete(transaccionId);
                return newSet;
            });
            return;
        }

        setExpandedTransacciones(prev => new Set(prev).add(transaccionId));
        if (!movimientosPorTransaccion.has(transaccionId)) {
            await fetchMovimientosPorTransaccion(transaccionId);
        }
    };

    if (!ordenCompraId) {
        return null;
    }

    return (
        <Flex direction="column" gap={4} mt={6} w="full">
            <Heading size="md" fontFamily="Comfortaa Variable">
                Transacciones de Almacen Registradas
            </Heading>

            {loading ? (
                <Flex justify="center" align="center" p={8}>
                    <Spinner size="xl" color="teal.500" />
                </Flex>
            ) : error ? (
                <Box p={4} bg={errorBg} borderRadius="md">
                    <Text color={errorColor}>{error}</Text>
                </Box>
            ) : transacciones.length === 0 ? (
                <Box p={4} bg="app.surfaceSubtle" borderRadius="md">
                    <Text color="app.textMuted" textAlign="center">
                        No se han registrado transacciones de almacen para esta orden de compra.
                    </Text>
                </Box>
            ) : (
                <Box w="full" bg="app.surface" borderRadius="md" boxShadow="sm" overflowX="auto">
                    <Table.Root size="sm" variant="line">
                        <Table.Header bg="app.tableHeader">
                            <Table.Row>
                                <Table.ColumnHeader>ID Transaccion</Table.ColumnHeader>
                                <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                                <Table.ColumnHeader># Movimientos</Table.ColumnHeader>
                                <Table.ColumnHeader>Estado Contable</Table.ColumnHeader>
                                <Table.ColumnHeader>Observaciones</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="center">Accion</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {transacciones.map((transaccion) => {
                                const transaccionId = transaccion.transaccionId || 0;
                                const isExpanded = expandedTransacciones.has(transaccionId);
                                const movimientos = movimientosPorTransaccion.get(transaccionId) || [];
                                const isLoadingMov = loadingMovimientos.has(transaccionId);

                                return (
                                    <Fragment key={transaccionId}>
                                        <Table.Row>
                                            <Table.Cell fontWeight="semibold">
                                                {transaccionId}
                                            </Table.Cell>
                                            <Table.Cell>{formatDate(transaccion.fechaTransaccion)}</Table.Cell>
                                            <Table.Cell>{transaccion.movimientosTransaccion?.length || 0}</Table.Cell>
                                            <Table.Cell>
                                                <Text
                                                    fontSize="xs"
                                                    px={2}
                                                    py={1}
                                                    borderRadius="md"
                                                    display="inline-block"
                                                    bg={
                                                        transaccion.estadoContable === 'CONTABILIZADA'
                                                            ? contabilizadaBg
                                                            : transaccion.estadoContable === 'PENDIENTE'
                                                                ? pendienteBg
                                                                : estadoDefaultBg
                                                    }
                                                    color={
                                                        transaccion.estadoContable === 'CONTABILIZADA'
                                                            ? contabilizadaColor
                                                            : transaccion.estadoContable === 'PENDIENTE'
                                                                ? pendienteColor
                                                                : estadoDefaultColor
                                                    }
                                                >
                                                    {transaccion.estadoContable || 'N/A'}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Text
                                                    fontSize="sm"
                                                    lineClamp={2}
                                                    maxW="300px"
                                                >
                                                    {transaccion.observaciones || '-'}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell textAlign="center">
                                                <IconButton
                                                    aria-label={isExpanded ? "Ocultar detalles" : "Mostrar detalles"}
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => toggleTransaccion(transaccionId)}
                                                    loading={isLoadingMov}>{isExpanded ? <LuChevronUp /> : <LuChevronDown />}</IconButton>
                                            </Table.Cell>
                                        </Table.Row>
                                        {isExpanded && (
                                            <Table.Row>
                                                <Table.Cell colSpan={6} p={0}>
                                                    <Collapsible.Root open={isExpanded}>
                                                        <Collapsible.Content>
                                                            <Box p={4} bg="app.surfaceSubtle" borderTopWidth="1px">
                                                                {isLoadingMov ? (
                                                                    <Flex justify="center" align="center" py={4}>
                                                                        <Spinner size="md" />
                                                                    </Flex>
                                                                ) : movimientos.length === 0 ? (
                                                                    <Text fontSize="sm" color="app.textMuted" textAlign="center" py={4}>
                                                                        No hay movimientos registrados para esta transaccion
                                                                    </Text>
                                                                ) : (
                                                                    <>
                                                                        <Text fontWeight="bold" mb={3} fontSize="sm">
                                                                            Materiales Recibidos en esta Transaccion
                                                                        </Text>
                                                                        <Table.Root size="sm" variant="line" bg="app.surface">
                                                                            <Table.Header>
                                                                                <Table.Row>
                                                                                    <Table.ColumnHeader>Material</Table.ColumnHeader>
                                                                                    <Table.ColumnHeader>ID Producto</Table.ColumnHeader>
                                                                                    <Table.ColumnHeader>Lote (Batch)</Table.ColumnHeader>
                                                                                    <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                                                                    <Table.ColumnHeader>Fecha Vencimiento</Table.ColumnHeader>
                                                                                </Table.Row>
                                                                            </Table.Header>
                                                                            <Table.Body>
                                                                                {movimientos.map((movimiento, idx) => (
                                                                                    <Table.Row key={movimiento.movimientoId || idx}>
                                                                                        <Table.Cell>{movimiento.productoNombre || '-'}</Table.Cell>
                                                                                        <Table.Cell>{movimiento.productoId || '-'}</Table.Cell>
                                                                                        <Table.Cell>
                                                                                            {movimiento.batchNumber ? (
                                                                                                <Badge colorPalette="teal" fontSize="xs">
                                                                                                    {movimiento.batchNumber}
                                                                                                </Badge>
                                                                                            ) : (
                                                                                                <Badge colorPalette="gray" fontSize="xs">
                                                                                                    Sin lote
                                                                                                </Badge>
                                                                                            )}
                                                                                        </Table.Cell>
                                                                                        <Table.Cell>
                                                                                            {movimiento.cantidad} {movimiento.tipoUnidades || ''}
                                                                                        </Table.Cell>
                                                                                        <Table.Cell>
                                                                                            {movimiento.expirationDate
                                                                                                ? formatDateShort(movimiento.expirationDate)
                                                                                                : '-'}
                                                                                        </Table.Cell>
                                                                                    </Table.Row>
                                                                                ))}
                                                                            </Table.Body>
                                                                        </Table.Root>
                                                                    </>
                                                                )}
                                                            </Box>
                                                        </Collapsible.Content>
                                                    </Collapsible.Root>
                                                </Table.Cell>
                                            </Table.Row>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </Table.Body>
                    </Table.Root>
                </Box>
            )}
        </Flex>
    );
}
