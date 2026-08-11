import {
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
    Dialog,
    Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import { useColorModeValue } from "../../../components/ui/color-mode";
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import { TransaccionAlmacen } from '../../TransaccionesAlmacen/HistorialDispensaciones/types';
import { MovimientoDetalle } from '../../TransaccionesAlmacen/types';
import { causaAjusteLabel } from '../../TransaccionesAlmacen/AjustesInventario/causasAjuste';

interface DetalleTransaccionDialogProps {
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

export default function DetalleTransaccionDialog({
    isOpen,
    onClose,
    transaccion,
}: DetalleTransaccionDialogProps) {
    const [movimientos, setMovimientos] = useState<MovimientoDetalle[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const toast = useAppToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const errorBg = useColorModeValue('red.50', 'red.900');
    const errorText = useColorModeValue('red.600', 'red.200');

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
    }, [transaccion, isOpen]);

    if (!transaccion) {
        return null;
    }

    return (
        <Dialog.Root open={isOpen} size='xl' placement='center' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header fontFamily="Comfortaa Variable">
                            Detalle de Transacción
                        </Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack align="stretch" gap={4}>
                                <Box>
                                    <Text fontWeight="bold" mb={2} fontSize="md">Información de la Transacción</Text>
                                    <HStack gap={4} flexWrap="wrap">
                                        <Box>
                                            <Text fontSize="sm" color="app.textMuted">ID Transacción:</Text>
                                            <Text fontSize="md" fontWeight="semibold">{transaccion.transaccionId}</Text>
                                        </Box>
                                        {transaccion.idEntidadCausante > 0 && (
                                            <Box>
                                                <Text fontSize="sm" color="app.textMuted">ID Entidad Causante:</Text>
                                                <Text fontSize="md" fontWeight="semibold">{transaccion.idEntidadCausante}</Text>
                                            </Box>
                                        )}
                                        <Box>
                                            <Text fontSize="sm" color="app.textMuted">Fecha:</Text>
                                            <Text fontSize="md" fontWeight="semibold">{formatFecha(transaccion.fechaTransaccion)}</Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="sm" color="app.textMuted">Estado Contable:</Text>
                                            <Text fontSize="md" fontWeight="semibold">{formatEstadoContable(transaccion.estadoContable)}</Text>
                                        </Box>
                                        {transaccion.tipoEntidadCausante === 'OAA' && (
                                            <Box>
                                                <Text fontSize="sm" color="app.textMuted">Causa del ajuste:</Text>
                                                <Text fontSize="md" fontWeight="semibold">
                                                    {causaAjusteLabel(transaccion.causaAjuste)}
                                                </Text>
                                            </Box>
                                        )}
                                    </HStack>
                                    {transaccion.observaciones && (
                                        <Box mt={2}>
                                            <Text fontSize="sm" color="app.textMuted">Observaciones:</Text>
                                            <Text fontSize="sm">{transaccion.observaciones}</Text>
                                        </Box>
                                    )}
                                    {transaccion.usuarioAprobador && (
                                        <Box mt={2}>
                                            <Text fontSize="sm" color="app.textMuted">Usuario Aprobador:</Text>
                                            <Text fontSize="sm">{transaccion.usuarioAprobador.nombre || `ID: ${transaccion.usuarioAprobador.userId}`}</Text>
                                        </Box>
                                    )}
                                </Box>

                                <Box>
                                    <Text fontWeight="bold" mb={2} fontSize="md">Movimientos</Text>
                                    {loading ? (
                                        <Flex justify="center" py={6}>
                                            <Spinner />
                                        </Flex>
                                    ) : error ? (
                                        <Box p={4} bg={errorBg} borderRadius="md">
                                            <Text color={errorText}>{error}</Text>
                                        </Box>
                                    ) : movimientos.length === 0 ? (
                                        <Text fontSize="sm" color="app.textSubtle" py={4}>
                                            No hay movimientos registrados para esta transacción.
                                        </Text>
                                    ) : (
                                        <Box bg="app.surface" borderRadius="md" boxShadow="sm" overflowX="auto">
                                            <Table.Root size="sm" variant="striped">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>Producto ID</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Tipo Mov.</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Almacén</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Lote (Batch)</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Fecha Venc.</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {movimientos.map((mov) => (
                                                        <Table.Row key={mov.movimientoId}>
                                                            <Table.Cell>{mov.productoId || 'N/A'}</Table.Cell>
                                                            <Table.Cell>{mov.productoNombre || 'N/A'}</Table.Cell>
                                                            <Table.Cell>{mov.cantidad.toFixed(2)}</Table.Cell>
                                                            <Table.Cell>{mov.tipoMovimiento || 'N/A'}</Table.Cell>
                                                            <Table.Cell>{mov.almacen || 'N/A'}</Table.Cell>
                                                            <Table.Cell>{mov.batchNumber || '-'}</Table.Cell>
                                                            <Table.Cell>
                                                                {mov.expirationDate
                                                                    ? new Date(mov.expirationDate).toLocaleDateString('es-ES')
                                                                    : '-'}
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table.Root>
                                        </Box>
                                    )}
                                </Box>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button colorPalette="blue" onClick={onClose}>
                                Cerrar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
