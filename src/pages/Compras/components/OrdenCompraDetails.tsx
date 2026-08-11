// OrdenCompraDetails.tsx
import React from 'react';
import {
    Button,
    Box,
    Text,
    Table,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import {getCondicionPagoText, getEstadoText, OrdenCompraMateriales} from '../types';
import { formatCOP } from '../../../utils/formatters';

interface OrdenCompraDetailsProps {
    isOpen: boolean;
    onClose: () => void;
    orden: OrdenCompraMateriales;
}

const OrdenCompraDetails: React.FC<OrdenCompraDetailsProps> = ({ isOpen, onClose, orden }) => {
    const historicalValue = 'No registrado (OCM histórica)';
    const creatorUsername = orden.usuarioCreadorUsername?.trim();
    const releaserUsername = orden.usuarioLiberadorUsername?.trim();
    const creatorLabel = creatorUsername || historicalValue;
    const releasePending = orden.estado === 0;
    const canceledBeforeRelease = orden.estado === -1 && Boolean(creatorUsername) && !releaserUsername;
    const releaseFallback = releasePending
        ? 'Pendiente de liberación'
        : canceledBeforeRelease
            ? 'No aplica (OCM cancelada sin liberar)'
            : historicalValue;
    const releaserLabel = releaserUsername || releaseFallback;
    const releaseDateLabel = orden.fechaLiberacion
        ? new Date(orden.fechaLiberacion).toLocaleString()
        : releaseFallback;

    return (
        <Dialog.Root open={isOpen} size='xl' scrollBehavior="inside" onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header><Dialog.Title>Detalles de la Orden de Compra</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <Box mb={4}>
                                <Text><strong>ID:</strong> {orden.ordenCompraId}</Text>
                                <Text>
                                    <strong>Fecha Emisión:</strong>{' '}
                                    {orden.fechaEmision ? new Date(orden.fechaEmision).toLocaleString() : '-'}
                                </Text>
                                <Text><strong>Creada por:</strong> {creatorLabel}</Text>
                                <Text><strong>Liberada por:</strong> {releaserLabel}</Text>
                                <Text><strong>Fecha de liberación:</strong> {releaseDateLabel}</Text>
                                <Text>
                                    <strong>Fecha Vencimiento:</strong>{' '}
                                    {orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString() : '-'}
                                </Text>
                                <Text>
                                    <strong>Proveedor:</strong>{' '}
                                    {orden.proveedor ? orden.proveedor.nombre : '-'}
                                </Text>
                                <Text><strong>Total a Pagar:</strong> {formatCOP(orden.totalPagar)}</Text>
                                <Text><strong>Estado:</strong> {getEstadoText(orden.estado)}</Text>
                                <Text><strong>Condición de Pago:</strong> {getCondicionPagoText(orden.condicionPago)}</Text>
                                <Text><strong>Tiempo de Entrega:</strong> {orden.tiempoEntrega}</Text>
                                <Text><strong>Plazo de Pago:</strong> {orden.plazoPago}</Text>
                                <Text><strong>Observaciones:</strong> {orden.observaciones || '-'}</Text>
                            </Box>
                            <Box>
                                <Text fontWeight="bold" mb={2}>Items de la Orden</Text>
                                {orden.itemsOrdenCompra && orden.itemsOrdenCompra.length > 0 ? (
                                    <Table.Root variant="line" size="sm">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                <Table.ColumnHeader>Materia Prima</Table.ColumnHeader>
                                                <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                                <Table.ColumnHeader>Precio Unitario</Table.ColumnHeader>
                                                <Table.ColumnHeader>IVA</Table.ColumnHeader>
                                                <Table.ColumnHeader>Subtotal</Table.ColumnHeader>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {orden.itemsOrdenCompra.map((item) => (
                                                <Table.Row key={item.itemOrdenId}>
                                                    <Table.Cell>{item.itemOrdenId}</Table.Cell>
                                                    <Table.Cell>{item.material ? `${item.material.productoId} - ${item.material.nombre} - (${item.material.tipoUnidades}) ` : '-'}</Table.Cell>
                                                    <Table.Cell>{item.cantidad}</Table.Cell>
                                                    <Table.Cell>{formatCOP(item.precioUnitario)}</Table.Cell>
                                                    <Table.Cell>{formatCOP(item.ivaCOP)}</Table.Cell>
                                                    <Table.Cell>{formatCOP(item.subTotal)}</Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                        <Table.Footer>
                                            <Table.Row>
                                                <Table.Cell colSpan={4} textAlign="right">
                                                    <strong>SubTotal:</strong>
                                                </Table.Cell>
                                                <Table.Cell colSpan={3} textAlign='end'>
                                                    {formatCOP(orden.subTotal)}
                                                </Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell colSpan={4} textAlign="right">
                                                    <strong>IVA (19%):</strong>
                                                </Table.Cell>
                                                <Table.Cell colSpan={3} textAlign='end'>
                                                    {formatCOP(orden.ivaCOP)}
                                                </Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell colSpan={4} textAlign="right">
                                                    <strong>Total a Pagar:</strong>
                                                </Table.Cell>
                                                <Table.Cell colSpan={3} textAlign='end'>
                                                    {formatCOP(orden.totalPagar)}
                                                </Table.Cell>
                                            </Table.Row>
                                        </Table.Footer>
                                    </Table.Root>
                                ) : (
                                    <Text>No hay items en esta orden.</Text>
                                )}
                            </Box>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button colorPalette="blue" mr={3} onClick={onClose}>
                                Cerrar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default OrdenCompraDetails;
