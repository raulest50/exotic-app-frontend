import { Fragment, useEffect, useState } from 'react';
import {
    Box,
    Flex,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    Heading,
    Spinner,
    useToast,
    Collapse,
    IconButton,
    Badge,
    useColorModeValue,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';

import { MovimientoDetalle, TransaccionAlmacen } from '../../types';
import { ListaTransaccionesDataProps } from '../ingresoOcmTypes';
import { fetchMovimientosTransaccion, fetchTransaccionesOcm } from '../ocmIngresoApi';

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
    const toast = useToast();
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
                    <Table size="sm" variant="simple">
                        <Thead bg="app.tableHeader">
                            <Tr>
                                <Th>ID Transaccion</Th>
                                <Th>Fecha</Th>
                                <Th># Movimientos</Th>
                                <Th>Estado Contable</Th>
                                <Th>Observaciones</Th>
                                <Th textAlign="center">Accion</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {transacciones.map((transaccion) => {
                                const transaccionId = transaccion.transaccionId || 0;
                                const isExpanded = expandedTransacciones.has(transaccionId);
                                const movimientos = movimientosPorTransaccion.get(transaccionId) || [];
                                const isLoadingMov = loadingMovimientos.has(transaccionId);

                                return (
                                    <Fragment key={transaccionId}>
                                        <Tr>
                                            <Td fontWeight="semibold">
                                                {transaccionId}
                                            </Td>
                                            <Td>{formatDate(transaccion.fechaTransaccion)}</Td>
                                            <Td>{transaccion.movimientosTransaccion?.length || 0}</Td>
                                            <Td>
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
                                            </Td>
                                            <Td>
                                                <Text
                                                    fontSize="sm"
                                                    noOfLines={2}
                                                    maxW="300px"
                                                >
                                                    {transaccion.observaciones || '-'}
                                                </Text>
                                            </Td>
                                            <Td textAlign="center">
                                                <IconButton
                                                    aria-label={isExpanded ? "Ocultar detalles" : "Mostrar detalles"}
                                                    icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => toggleTransaccion(transaccionId)}
                                                    isLoading={isLoadingMov}
                                                />
                                            </Td>
                                        </Tr>
                                        {isExpanded && (
                                            <Tr>
                                                <Td colSpan={6} p={0}>
                                                    <Collapse in={isExpanded} animateOpacity>
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
                                                                    <Table size="sm" variant="simple" bg="app.surface">
                                                                        <Thead>
                                                                            <Tr>
                                                                                <Th>Material</Th>
                                                                                <Th>ID Producto</Th>
                                                                                <Th>Lote (Batch)</Th>
                                                                                <Th>Cantidad</Th>
                                                                                <Th>Fecha Vencimiento</Th>
                                                                            </Tr>
                                                                        </Thead>
                                                                        <Tbody>
                                                                            {movimientos.map((movimiento, idx) => (
                                                                                <Tr key={movimiento.movimientoId || idx}>
                                                                                    <Td>{movimiento.productoNombre || '-'}</Td>
                                                                                    <Td>{movimiento.productoId || '-'}</Td>
                                                                                    <Td>
                                                                                        {movimiento.batchNumber ? (
                                                                                            <Badge colorScheme="teal" fontSize="xs">
                                                                                                {movimiento.batchNumber}
                                                                                            </Badge>
                                                                                        ) : (
                                                                                            <Badge colorScheme="gray" fontSize="xs">
                                                                                                Sin lote
                                                                                            </Badge>
                                                                                        )}
                                                                                    </Td>
                                                                                    <Td>
                                                                                        {movimiento.cantidad} {movimiento.tipoUnidades || ''}
                                                                                    </Td>
                                                                                    <Td>
                                                                                        {movimiento.expirationDate
                                                                                            ? formatDateShort(movimiento.expirationDate)
                                                                                            : '-'}
                                                                                    </Td>
                                                                                </Tr>
                                                                            ))}
                                                                        </Tbody>
                                                                    </Table>
                                                                </>
                                                            )}
                                                        </Box>
                                                    </Collapse>
                                                </Td>
                                            </Tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </Tbody>
                    </Table>
                </Box>
            )}
        </Flex>
    );
}
