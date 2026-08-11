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
    Badge,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import { TransaccionAlmacen } from './types';
import { MovimientoDetalle } from '../types';
import { causaAjusteLabel } from '../AjustesInventario/causasAjuste';

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
    const toast = useAppToast();
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
                            {transaccion.tipoEntidadCausante === 'OAA'
                                ? 'Detalle de ajuste de inventario'
                                : 'Detalle de Dispensación'}
                        </Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack align="stretch" gap={4}>
                                {/* Información de la transacción */}
                                <Box>
                                    <Text fontWeight="bold" mb={2} fontSize="md">Información de la Transacción</Text>
                                    <HStack gap={4} flexWrap="wrap">
                                        <Box>
                                            <Text fontSize="sm" color="app.textMuted">ID Transacción:</Text>
                                            <Text fontSize="md" fontWeight="semibold">{transaccion.transaccionId}</Text>
                                        </Box>
                                        {(transaccion.tipoEntidadCausante === 'OD' || transaccion.tipoEntidadCausante === 'OP') && transaccion.idEntidadCausante > 0 && (
                                            <Box>
                                                <Text fontSize="sm" color="app.textMuted">ID Orden de Producción:</Text>
                                                <Text fontSize="md" fontWeight="semibold">{transaccion.idEntidadCausante}</Text>
                                            </Box>
                                        )}
                                        {transaccion.loteAsignado && (
                                            <Box>
                                                <Text fontSize="sm" color="app.textMuted">Lote de Producción:</Text>
                                                <Text fontSize="md" fontWeight="semibold">{transaccion.loteAsignado}</Text>
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

                                {/* Tabla de movimientos */}
                                <Box>
                                    <Text fontWeight="bold" mb={2} fontSize="md">
                                        {transaccion.tipoEntidadCausante === 'OAA'
                                            ? 'Movimientos del ajuste'
                                            : 'Materiales Dispensados'}
                                    </Text>
                                    {loading ? (
                                        <Flex justify="center" py={6}>
                                            <Spinner />
                                        </Flex>
                                    ) : error ? (
                                        <Box p={4} bg="red.50" borderRadius="md">
                                            <Text color="red.600">{error}</Text>
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
                                                        <Table.ColumnHeader>Área destino</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Modalidad</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Lote (Batch)</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Fecha Vencimiento</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {movimientos.map((mov) => (
                                                        <Table.Row key={mov.movimientoId}>
                                                            <Table.Cell>{mov.productoId || 'N/A'}</Table.Cell>
                                                            <Table.Cell>{mov.productoNombre || 'N/A'}</Table.Cell>
                                                            <Table.Cell>{mov.areaOperativaNombre || '-'}</Table.Cell>
                                                            <Table.Cell>{mov.cantidad.toFixed(2)}</Table.Cell>
                                                            <Table.Cell>{mov.tipoUnidades || 'N/A'}</Table.Cell>
                                                            <Table.Cell>
                                                                {mov.afectaInventario === false || mov.tipoMovimiento === 'CONSUMO' ? (
                                                                    <Badge colorPalette="purple">Consumo directo</Badge>
                                                                ) : (
                                                                    <Badge colorPalette="blue">Salida física</Badge>
                                                                )}
                                                            </Table.Cell>
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
