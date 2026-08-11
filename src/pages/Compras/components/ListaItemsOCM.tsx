// src/components/OrdenCompraItems.tsx
import React from 'react';
import {
    Table,
    Input,
    Button,
    Box,
    Switch,
    Flex,
    Text,
} from '@chakra-ui/react';
import { ItemOrdenCompra } from '../types';
import { formatCOP } from '../../../utils/formatters';

interface OrdenCompraItemsProps {
    items: ItemOrdenCompra[];
    onRemoveItem: (index: number) => void;
    onUpdateItem: (
        index: number,
        field: 'cantidad' | 'precioUnitario',
        value: number
    ) => void;
    ivaEnabled: boolean;
    onToggleIva: (enabled: boolean) => void;
    currency?: string; // Nueva propiedad para la divisa
}

const ListaItemsOCM: React.FC<OrdenCompraItemsProps> = ({
                                                               items,
                                                               onRemoveItem,
                                                               onUpdateItem,
                                                               ivaEnabled,
                                                               onToggleIva,
                                                               currency = 'COP',
                                                           }) => {
    // Calculate totals based on the items array.
    const totalSubTotal = items.reduce(
        (sum, item) => sum + item.subTotal,
        0
    );
    const totalIVA = items.reduce(
        (sum, item) => sum + item.ivaCOP,
        0
    );
    const totalPagar = totalSubTotal + totalIVA;

    return (
        <Box overflowX="auto" mt={4}>
            <Table.Root variant="line">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>ID Materia Prima</Table.ColumnHeader>
                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Precio Unitario ({currency})</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>IVA %</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>
                            <Flex alignItems="center" justifyContent="flex-end">
                                <Text mr={2}>IVA ({currency})</Text>
                                <Switch.Root
                                    checked={ivaEnabled} 
                                    onCheckedChange={({ checked }) => onToggleIva(checked)}
                                    colorPalette="teal"
                                >
                                    <Switch.HiddenInput />
                                    <Switch.Control>
                                        <Switch.Thumb />
                                    </Switch.Control>
                                </Switch.Root>
                            </Flex>
                        </Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Subtotal ({currency})</Table.ColumnHeader>
                        <Table.ColumnHeader>Acciones</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {items.map((item, index) => {
                        return (
                            <Table.Row key={index}>
                                <Table.Cell>{item.material.productoId}</Table.Cell>
                                <Table.Cell>{item.material.nombre} ({item.material.tipoUnidades}) </Table.Cell>
                                <Table.Cell textAlign='end'>
                                    <Input
                                        size="sm"
                                        type="number"
                                        value={item.cantidad}
                                        onChange={(e) =>
                                            onUpdateItem(
                                                index,
                                                'cantidad',
                                                parseFloat(e.target.value)
                                            )
                                        }
                                    />
                                </Table.Cell>
                                <Table.Cell textAlign='end'>
                                    <Input
                                        size="sm"
                                        type="number"
                                        value={item.precioUnitario}
                                        onChange={(e) =>
                                            onUpdateItem(
                                                index,
                                                'precioUnitario',
                                                parseFloat(e.target.value)
                                            )
                                        }
                                    />
                                </Table.Cell>
                                <Table.Cell textAlign='end'>{item.material.ivaPercentual}%</Table.Cell>
                                <Table.Cell textAlign='end'>{formatCOP(item.ivaCOP)}</Table.Cell>
                                <Table.Cell textAlign='end'>{formatCOP(item.subTotal)}</Table.Cell>
                                <Table.Cell>
                                    <Button
                                        colorPalette="red"
                                        size="sm"
                                        onClick={() => onRemoveItem(index)}
                                    >
                                        Eliminar
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
                <Table.Footer>
                    <Table.Row>
                        <Table.Cell colSpan={5} textAlign="right">
                            <strong>SubTotal:</strong>
                        </Table.Cell>
                        <Table.Cell colSpan={3} textAlign='end'>
                            {formatCOP(totalSubTotal)}
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell colSpan={5} textAlign="right">
                            <strong>IVA Total:</strong>
                        </Table.Cell>
                        <Table.Cell colSpan={3} textAlign='end'>
                            {formatCOP(totalIVA)}
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell colSpan={5} textAlign="right">
                            <strong>Total a Pagar:</strong>
                        </Table.Cell>
                        <Table.Cell colSpan={3} textAlign='end'>
                            {formatCOP(totalPagar)}
                        </Table.Cell>
                    </Table.Row>
                </Table.Footer>
            </Table.Root>
        </Box>
    );
};

export default ListaItemsOCM;
