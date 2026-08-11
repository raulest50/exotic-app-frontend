import React from 'react';
import {
    Button,
    Box,
    Text,
    Table,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import { OrdenCompraActivo, getEstadoOCAFText } from '../types';
import { formatCOP } from '../../../utils/formatters';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    orden: OrdenCompraActivo;
}

const DetailsOCAF: React.FC<Props> = ({ isOpen, onClose, orden }) => {
    return (
        <Dialog.Root open={isOpen} size='xl' scrollBehavior='inside' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header><Dialog.Title>Detalles Orden Compra AF</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <Box mb={4}>
                                <Text><strong>ID:</strong> {orden.ordenCompraActivoId}</Text>
                                <Text><strong>Fecha Emisión:</strong> {orden.fechaEmision ? new Date(orden.fechaEmision).toLocaleString() : '-'}</Text>
                                <Text><strong>Fecha Vencimiento:</strong> {orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString() : '-'}</Text>
                                <Text><strong>Proveedor:</strong> {orden.proveedor?.nombre ?? '-'}</Text>
                                <Text><strong>Total a Pagar:</strong> {formatCOP(orden.totalPagar)}</Text>
                                <Text><strong>Estado:</strong> {getEstadoOCAFText(orden.estado)}</Text>
                                <Text><strong>Condición de Pago:</strong> {orden.condicionPago}</Text>
                                <Text><strong>Tiempo de Entrega:</strong> {orden.tiempoEntrega}</Text>
                                <Text><strong>Plazo de Pago:</strong> {orden.plazoPago}</Text>
                            </Box>
                            {orden.itemsOrdenCompra && orden.itemsOrdenCompra.length > 0 ? (
                                <Table.Root variant='line' size='sm'>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeader>ID</Table.ColumnHeader>
                                            <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>Precio Unitario</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>IVA</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>Subtotal</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {orden.itemsOrdenCompra.map(item => (
                                            <Table.Row key={item.itemOrdenId}>
                                                <Table.Cell>{item.itemOrdenId}</Table.Cell>
                                                <Table.Cell>{item.nombre}</Table.Cell>
                                                <Table.Cell textAlign='end'>{item.cantidad}</Table.Cell>
                                                <Table.Cell textAlign='end'>{formatCOP(item.precioUnitario)}</Table.Cell>
                                                <Table.Cell textAlign='end'>{formatCOP(item.ivaValue)}</Table.Cell>
                                                <Table.Cell textAlign='end'>{formatCOP(item.subTotal)}</Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                    <Table.Footer>
                                        <Table.Row>
                                            <Table.Cell colSpan={4} textAlign='right'><strong>SubTotal:</strong></Table.Cell>
                                            <Table.Cell colSpan={2} textAlign='end'>{formatCOP(orden.subTotal)}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell colSpan={4} textAlign='right'><strong>IVA:</strong></Table.Cell>
                                            <Table.Cell colSpan={2} textAlign='end'>{formatCOP(orden.iva)}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell colSpan={4} textAlign='right'><strong>Total a Pagar:</strong></Table.Cell>
                                            <Table.Cell colSpan={2} textAlign='end'>{formatCOP(orden.totalPagar)}</Table.Cell>
                                        </Table.Row>
                                    </Table.Footer>
                                </Table.Root>
                            ) : (
                                <Text>No hay items en esta orden.</Text>
                            )}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button colorPalette='blue' mr={3} onClick={onClose}>Cerrar</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default DetailsOCAF;
