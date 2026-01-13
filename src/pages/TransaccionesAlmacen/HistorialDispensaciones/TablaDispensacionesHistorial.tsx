import { useState } from 'react';
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
    Collapse,
    IconButton,
    Badge,
    TableContainer,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import axios from 'axios';
import MyPagination from '../../../../src/components/MyPagination';
import { TransaccionAlmacen, MovimientoDetalle } from '../types.tsx';
import EndPointsURL from '../../../../src/api/EndPointsURL';
import { useToast } from '@chakra-ui/react';

interface PageResponse {
    content: TransaccionAlmacen[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

interface TablaDispensacionesHistorialProps {
    resultados: PageResponse | null;
    loading: boolean;
    onPageChange: (page: number) => void;
}

export function TablaDispensacionesHistorial({ resultados, loading, onPageChange }: TablaDispensacionesHistorialProps) {
    const [expandedTransacciones, setExpandedTransacciones] = useState<Set<number>>(new Set());
    const [movimientosPorTransaccion, setMovimientosPorTransaccion] = useState<Map<number, MovimientoDetalle[]>>(new Map());
    const [loadingMovimientos, setLoadingMovimientos] = useState<Set<number>>(new Set());
    const toast = useToast();
    const endpoints = new EndPointsURL();

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

    const toggleTransaccion = async (transaccionId: number) => {
        const isExpanded = expandedTransacciones.has(transaccionId);
        
        if (isExpanded) {
            // Colapsar
            setExpandedTransacciones(prev => {
                const newSet = new Set(prev);
                newSet.delete(transaccionId);
                return newSet;
            });
        } else {
            // Expandir - cargar movimientos si no están cargados
            setExpandedTransacciones(prev => new Set(prev).add(transaccionId));
            
            if (!movimientosPorTransaccion.has(transaccionId)) {
                await fetchMovimientosPorTransaccion(transaccionId);
            }
        }
    };

    const fetchMovimientosPorTransaccion = async (transaccionId: number) => {
        setLoadingMovimientos(prev => new Set(prev).add(transaccionId));
        try {
            const url = endpoints.movimientos_transaccion.replace('{transaccionId}', String(transaccionId));
            const response = await axios.get<MovimientoDetalle[]>(url, {
                withCredentials: true
            });
            
            setMovimientosPorTransaccion(prev => {
                const newMap = new Map(prev);
                newMap.set(transaccionId, response.data || []);
                return newMap;
            });
        } catch (error: any) {
            console.error('Error fetching movimientos:', error);
            toast({
                title: 'Error al cargar movimientos',
                description: 'No se pudieron cargar los movimientos de la transacción',
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

    if (loading && !resultados) {
        return (
            <Flex justify="center" align="center" p={8}>
                <Spinner size="xl" color="teal.500" />
            </Flex>
        );
    }

    if (!resultados || resultados.content.length === 0) {
        return (
            <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="md">
                <Text color="gray.600" textAlign="center">
                    No se encontraron dispensaciones con los filtros seleccionados.
                </Text>
            </Box>
        );
    }

    return (
        <Flex direction="column" gap={4} w="full">
            <Heading size="md" fontFamily="Comfortaa Variable">
                Resultados de Búsqueda ({resultados.totalElements} dispensaciones encontradas)
            </Heading>

            <TableContainer w="full" bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
                <Table size="sm" variant="simple">
                    <Thead bg="gray.50">
                        <Tr>
                            <Th>ID Dispensación</Th>
                            <Th>ID ODP Relacionada</Th>
                            <Th>Fecha Transacción</Th>
                            <Th>Estado Contable</Th>
                            <Th># Movimientos</Th>
                            <Th>Observaciones</Th>
                            <Th textAlign="center">Acción</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {resultados.content.map((transaccion) => {
                            const transaccionId = transaccion.transaccionId || 0;
                            const isExpanded = expandedTransacciones.has(transaccionId);
                            const movimientos = movimientosPorTransaccion.get(transaccionId) || [];
                            const isLoadingMov = loadingMovimientos.has(transaccionId);
                            
                            return (
                                <>
                                    <Tr key={transaccionId}>
                                        <Td fontWeight="semibold">
                                            {transaccionId}
                                        </Td>
                                        <Td>
                                            {transaccion.idEntidadCausante || '-'}
                                        </Td>
                                        <Td>{formatDate(transaccion.fechaTransaccion)}</Td>
                                        <Td>
                                            <Badge
                                                colorScheme={
                                                    transaccion.estadoContable === 'CONTABILIZADA'
                                                        ? 'green'
                                                        : transaccion.estadoContable === 'PENDIENTE'
                                                        ? 'yellow'
                                                        : 'gray'
                                                }
                                                fontSize="xs"
                                                px={2}
                                                py={1}
                                                borderRadius="md"
                                            >
                                                {transaccion.estadoContable || 'N/A'}
                                            </Badge>
                                        </Td>
                                        <Td>{transaccion.movimientosTransaccion?.length || 0}</Td>
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
                                            <Td colSpan={7} p={0}>
                                                <Collapse in={isExpanded} animateOpacity>
                                                    <Box p={4} bg="gray.50" borderTopWidth="1px">
                                                        {isLoadingMov ? (
                                                            <Flex justify="center" align="center" py={4}>
                                                                <Spinner size="md" />
                                                            </Flex>
                                                        ) : movimientos.length === 0 ? (
                                                            <Text fontSize="sm" color="gray.600" textAlign="center" py={4}>
                                                                No hay movimientos registrados para esta transacción
                                                            </Text>
                                                        ) : (
                                                            <>
                                                                <Text fontWeight="bold" mb={3} fontSize="sm">
                                                                    Materiales Dispensados en esta Transacción
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
                                                                                    {Math.abs(movimiento.cantidad)} {movimiento.tipoUnidades || ''}
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
                                </>
                            );
                        })}
                    </Tbody>
                </Table>
            </TableContainer>

            {resultados.totalPages > 1 && (
                <MyPagination
                    page={resultados.number}
                    totalPages={resultados.totalPages}
                    loading={loading}
                    handlePageChange={onPageChange}
                />
            )}
        </Flex>
    );
}

