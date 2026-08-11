import React, { useEffect, useState } from 'react';
import {
    Steps,
    Button,
    Text,
    Input,
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Tfoot,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL';
import { OrdenCompraActivo, getEstadoOCAFText } from '../../types';
import { formatCOP } from '../../../../utils/formatters';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    orden: OrdenCompraActivo;
    onOrdenCancelada?: () => void;
}

const DialogCancelarOCAF: React.FC<Props> = ({ isOpen, onClose, orden, onOrdenCancelada }) => {
    const [randomCode, setRandomCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const toast = useAppToast();
    const endpoints = new EndPointsURL();

    useEffect(() => {
        if (isOpen) {
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            setRandomCode(code);
            setInputCode('');
        }
    }, [isOpen]);

    const handleCancelar = async () => {
        if (inputCode !== randomCode) {
            toast({
                title: 'Código incorrecto',
                description: 'El código ingresado no coincide.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        try {
            await axios.put(
                endpoints.cancel_orden_compra_activo.replace('{ordenCompraActivoId}', String(orden.ordenCompraActivoId))
            );
            toast({
                title: 'Orden cancelada',
                description: 'La orden de compra fue cancelada correctamente.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            if (onOrdenCancelada) onOrdenCancelada();
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error',
                description: 'No se pudo cancelar la orden.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            onClose();
        }
    };

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
                        <Dialog.Header>Confirmar Cancelación</Dialog.Header>
                        <Dialog.Body>
                            {/* Detalles de la orden */}
                            <Box mb={4}>
                                <Text><strong>ID:</strong> {orden.ordenCompraActivoId}</Text>
                                <Text><strong>Fecha Emisión:</strong> {orden.fechaEmision ? new Date(orden.fechaEmision).toLocaleString() : '-'}</Text>
                                <Text><strong>Fecha Vencimiento:</strong> {orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString() : '-'}</Text>
                                <Text><strong>Proveedor:</strong> {orden.proveedor?.nombre ?? '-'}</Text>
                                <Text><strong>Total a Pagar:</strong> {formatCOP(orden.totalPagar)}</Text>
                                <Text><strong>Estado:</strong> {getEstadoOCAFText(orden.estado)}</Text>
                            </Box>

                            {/* Tabla de items */}
                            {orden.itemsOrdenCompra && orden.itemsOrdenCompra.length > 0 ? (
                                <Table.Root variant='simple' size='sm' mb={4}>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>Precio Unitario</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>Subtotal</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {orden.itemsOrdenCompra.map(item => (
                                            <Table.Row key={item.itemOrdenId}>
                                                <Table.Cell>{item.nombre}</Table.Cell>
                                                <Table.Cell textAlign='end'>{item.cantidad}</Table.Cell>
                                                <Table.Cell textAlign='end'>{formatCOP(item.precioUnitario)}</Table.Cell>
                                                <Table.Cell textAlign='end'>{formatCOP(item.subTotal)}</Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                    <Table.Footer>
                                        <Table.Row>
                                            <Table.Cell colSpan={3} textAlign='right'><strong>Total a Pagar:</strong></Table.Cell>
                                            <Table.Cell textAlign='end'>{formatCOP(orden.totalPagar)}</Table.Cell>
                                        </Table.Row>
                                    </Table.Footer>
                                </Table.Root>
                            ) : (
                                <Text mb={4}>No hay items en esta orden.</Text>
                            )}

                            {/* Confirmación de cancelación */}
                            <Text mb={4}>
                                Para confirmar la cancelación de la orden de compra, digite los 4 dígitos que ve a continuación y presione "Cancelar Orden".
                            </Text>
                            <Text fontWeight="bold" mb={4}>Código: {randomCode}</Text>
                            <Input
                                placeholder="Ingrese el código"
                                value={inputCode}
                                onValueChange={(e) => setInputCode(e.target.value)}
                            />
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button colorPalette='red' mr={3} onClick={handleCancelar}>
                                Cancelar Orden
                            </Button>
                            <Button variant='ghost' onClick={onClose}>Atrás</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default DialogCancelarOCAF;
