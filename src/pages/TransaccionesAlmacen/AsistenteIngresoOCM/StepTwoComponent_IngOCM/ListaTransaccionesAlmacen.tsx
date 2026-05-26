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
                <Box p={4} bg="red.50" borderRadius="md">
                    <Text color="red.600">{error}</Text>
                </Box>
            ) : transacciones.length === 0 ? (
                <Box p={4} bg="gray.50" borderRadius="md">
                    <Text color="gray.600" textAlign="center">
                        No se han registrado transacciones de almacen para esta orden de compra.
                    </Text>
                </Box>
            ) : (
                <Box w="full" bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
                    <Table size="sm" variant="simple">
                        <Thead bg="gray.50">
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
                                                            ? 'green.100'
                                                            : transaccion.estadoContable === 'PENDIENTE'
                                                                ? 'yellow.100'
                                                                : 'gray.100'
                                                    }
                                                    color={
                                                        transaccion.estadoContable === 'CONTABILIZADA'
                                                            ? 'green.800'
                                                            : transaccion.estadoContable === 'PENDIENTE'
                                                                ? 'yellow.800'
                                                                : 'gray.800'
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
                                                        <Box p={4} bg="gray.50" borderTopWidth="1px">
                                                            {isLoadingMov ? (
                                                                <Flex justify="center" align="center" py={4}>
                                                                    <Spinner size="md" />
                                                                </Flex>
                                                            ) : movimientos.length === 0 ? (
                                                                <Text fontSize="sm" color="gray.600" textAlign="center" py={4}>
                                                                    No hay movimientos registrados para esta transaccion
                                                                </Text>
                                                            ) : (
                                                                <>
                                                                    <Text fontWeight="bold" mb={3} fontSize="sm">
                                                                        Materiales Recibidos en esta Transaccion
                                                                    </Text>
                                                                    <Table size="sm" variant="simple" bg="white">
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
