import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    Box,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    HStack,
    Spinner,
    Flex,
    useToast,
} from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import { TransaccionAlmacen } from './types';
import { MovimientoDetalle } from '../types';

interface DetalleDispensacionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaccion: TransaccionAlmacen | null;
}

const formatFecha = (fecha?: string) => {
    if (!fecha) return 'N/A';
    try {
        const parsed = new Date(fecha);
        return isNaN(parsed.getTime()) ? fecha : parsed.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return fecha;
    }
};

const formatEstadoContable = (estado?: string) => {
    if (!estado) return 'N/A';
    const estados: Record<string, string> = {
        'PENDIENTE': 'Pendiente',
        'CONTABILIZADA': 'Contabilizada',
        'NO_APLICA': 'No Aplica',
    };
    return estados[estado] || estado;
};

export default function DetalleDispensacionDialog({
    isOpen,
    onClose,
    transaccion,
}: DetalleDispensacionDialogProps) {
    const [movimientos, setMovimientos] = useState<MovimientoDetalle[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);

    useEffect(() => {
        const fetchMovimientos = async () => {
            if (!transaccion || !isOpen) {
                setMovimientos([]);
                setError(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const url = endpoints.movimientos_transaccion.replace(
                    '{transaccionId}',
                    transaccion.transaccionId.toString()
                );
                const response = await axios.get<MovimientoDetalle[]>(url, { withCredentials: true });
                setMovimientos(response.data || []);
            } catch (err: any) {
                const errorMessage = err.response?.data?.message || err.message || 'Error al cargar movimientos';
                setError(errorMessage);
                toast({
                    title: 'Error',
                    description: errorMessage,
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
                setMovimientos([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMovimientos();
    }, [transaccion, isOpen]); // Solo transaccion e isOpen como dependencias

    if (!transaccion) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader fontFamily="Comfortaa Variable">
                    Detalle de Dispensación
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        {/* Información de la transacción */}
                        <Box>
                            <Text fontWeight="bold" mb={2} fontSize="md">Información de la Transacción</Text>
                            <HStack spacing={4} flexWrap="wrap">
                                <Box>
                                    <Text fontSize="sm" color="gray.600">ID Transacción:</Text>
                                    <Text fontSize="md" fontWeight="semibold">{transaccion.transaccionId}</Text>
                                </Box>
                                {(transaccion.tipoEntidadCausante === 'OD' || transaccion.tipoEntidadCausante === 'OP') && transaccion.idEntidadCausante > 0 && (
                                    <Box>
                                        <Text fontSize="sm" color="gray.600">ID Orden de Producción:</Text>
                                        <Text fontSize="md" fontWeight="semibold">{transaccion.idEntidadCausante}</Text>
                                    </Box>
                                )}
                                <Box>
                                    <Text fontSize="sm" color="gray.600">Fecha:</Text>
                                    <Text fontSize="md" fontWeight="semibold">{formatFecha(transaccion.fechaTransaccion)}</Text>
                                </Box>
                                <Box>
                                    <Text fontSize="sm" color="gray.600">Estado Contable:</Text>
                                    <Text fontSize="md" fontWeight="semibold">{formatEstadoContable(transaccion.estadoContable)}</Text>
                                </Box>
                            </HStack>
                            {transaccion.observaciones && (
                                <Box mt={2}>
                                    <Text fontSize="sm" color="gray.600">Observaciones:</Text>
                                    <Text fontSize="sm">{transaccion.observaciones}</Text>
                                </Box>
                            )}
                            {transaccion.usuarioAprobador && (
                                <Box mt={2}>
                                    <Text fontSize="sm" color="gray.600">Usuario Aprobador:</Text>
                                    <Text fontSize="sm">{transaccion.usuarioAprobador.nombre || `ID: ${transaccion.usuarioAprobador.userId}`}</Text>
                                </Box>
                            )}
                        </Box>

                        {/* Tabla de movimientos */}
                        <Box>
                            <Text fontWeight="bold" mb={2} fontSize="md">Materiales Dispensados</Text>
                            {loading ? (
                                <Flex justify="center" py={6}>
                                    <Spinner />
                                </Flex>
                            ) : error ? (
                                <Box p={4} bg="red.50" borderRadius="md">
                                    <Text color="red.600">{error}</Text>
                                </Box>
                            ) : movimientos.length === 0 ? (
                                <Text fontSize="sm" color="gray.500" py={4}>
                                    No hay movimientos registrados para esta transacción.
                                </Text>
                            ) : (
                                <Box bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
                                    <Table size="sm" variant="striped">
                                        <Thead>
                                            <Tr>
                                                <Th>Producto ID</Th>
                                                <Th>Nombre</Th>
                                                <Th>Cantidad</Th>
                                                <Th>Unidad</Th>
                                                <Th>Lote (Batch)</Th>
                                                <Th>Fecha Vencimiento</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {movimientos.map((mov) => (
                                                <Tr key={mov.movimientoId}>
                                                    <Td>{mov.productoId || 'N/A'}</Td>
                                                    <Td>{mov.productoNombre || 'N/A'}</Td>
                                                    <Td>{mov.cantidad.toFixed(2)}</Td>
                                                    <Td>{mov.tipoUnidades || 'N/A'}</Td>
                                                    <Td>{mov.batchNumber || '-'}</Td>
                                                    <Td>
                                                        {mov.expirationDate
                                                            ? new Date(mov.expirationDate).toLocaleDateString('es-ES')
                                                            : '-'}
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </Box>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>
                        Cerrar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
