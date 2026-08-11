import React from 'react';
import { Box, Button, IconButton, Table, Tbody, Td, Text, Th, Thead, Tr, Tag } from '@chakra-ui/react';
import {InsumoDesglosado, LoteSeleccionado} from '../types';
import { LuTrash2 } from 'react-icons/lu';

interface Props {
    insumosEmpaque: InsumoDesglosado[];
    lotesPorMaterialEmpaque: Map<string, LoteSeleccionado[]>;
    getCantidadEmpaque: (insumo: InsumoDesglosado) => number;
    onDefinirLotesEmpaque: (insumo: InsumoDesglosado, cantidadEmpaque: number) => void;
    historicoPorProducto?: Map<string, LoteSeleccionado[]>;
    onRemoveLoteEmpaque: (productoId: string, loteId: number) => void;
}

export default function TablaDispensacionInsumosEmpaque({
    insumosEmpaque,
    lotesPorMaterialEmpaque,
    getCantidadEmpaque,
    onDefinirLotesEmpaque,
    historicoPorProducto,
    onRemoveLoteEmpaque
}: Props) {
    const formatDate = (date: string | null | undefined): string => {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleDateString('es-ES');
        } catch {
            return 'N/A';
        }
    };

    const esInventariable = (insumo: InsumoDesglosado): boolean => {
        return insumo.inventareable !== false;
    };

    const renderInsumoEmpaque = (insumo: InsumoDesglosado) => {
        const lotesSeleccionados = lotesPorMaterialEmpaque.get(insumo.productoId) || [];
        const esInvent = esInventariable(insumo);
        const cantidadEmpaque = getCantidadEmpaque(insumo);
        const historico = historicoPorProducto?.get(insumo.productoId) || [];

        return (
            <React.Fragment key={insumo.productoId}>
                <Table.Row>
                    <Table.Cell>{insumo.productoId}</Table.Cell>
                    <Table.Cell fontWeight="medium">
                        {insumo.productoNombre}
                        <Tag.Root ml={2} size="sm" colorPalette="blue" variant="outline">
                            Empaque
                        </Tag.Root>
                        {insumo.consumoDirecto === true && (
                            <Tag.Root ml={2} size="sm" colorPalette="purple">
                                Consumo directo
                            </Tag.Root>
                        )}
                    </Table.Cell>
                    <Table.Cell>{cantidadEmpaque.toFixed(2)}</Table.Cell>
                    <Table.Cell>{insumo.tipoUnidades}</Table.Cell>
                    <Table.Cell>
                        {esInvent ? (
                            <Button
                                size='sm'
                                colorPalette='blue'
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDefinirLotesEmpaque(insumo, cantidadEmpaque);
                                }}
                            >
                                Definir Lotes
                            </Button>
                        ) : (
                            <Text fontSize='xs' color='app.textSubtle' fontStyle='italic'>
                                {insumo.consumoDirecto ? 'Sin lote; se registra contra la OP' : 'No participa'}
                            </Text>
                        )}
                    </Table.Cell>
                </Table.Row>
                {esInvent && lotesSeleccionados.length > 0 && lotesSeleccionados.map((lote) => (
                    <Table.Row key={`${insumo.productoId}-lote-${lote.loteId}`} bg='app.surfaceSubtle'>
                        <Table.Cell></Table.Cell>
                        <Table.Cell pl={8} fontSize='xs' color='app.textMuted'>
                            └─ Lote: {lote.batchNumber}
                        </Table.Cell>
                        <Table.Cell fontSize='xs' color='app.textMuted'>
                            {Math.abs(lote.cantidad).toFixed(2)}
                        </Table.Cell>
                        <Table.Cell fontSize='xs' color='app.textMuted'>
                            {formatDate(lote.expirationDate)}
                        </Table.Cell>
                        <Table.Cell>
                            <IconButton
                                aria-label="Eliminar lote"
                                size="xs"
                                colorPalette="red"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveLoteEmpaque(insumo.productoId, lote.loteId);
                                }}><LuTrash2 /></IconButton>
                        </Table.Cell>
                    </Table.Row>
                ))}
                {esInvent && historico.length > 0 && historico.map((lote) => (
                    <Table.Row key={`${insumo.productoId}-hist-${lote.batchNumber}-${lote.loteId}`} bg='app.surfaceMuted'>
                        <Table.Cell></Table.Cell>
                        <Table.Cell pl={8} fontSize='xs' color='app.textMuted'>
                            └─ Histórico: {lote.batchNumber}
                        </Table.Cell>
                        <Table.Cell fontSize='xs' color='app.textMuted'>
                            {lote.cantidad.toFixed(2)}
                        </Table.Cell>
                        <Table.Cell fontSize='xs' color='app.textMuted'>
                            {formatDate(lote.expirationDate)}
                        </Table.Cell>
                        <Table.Cell></Table.Cell>
                    </Table.Row>
                ))}
            </React.Fragment>
        );
    };

    return (
        <Box bg='app.surface' borderRadius='md' boxShadow='sm' overflowX='auto' w='full' maxW='1200px'>
            <Table.Root size='sm'>
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>ID Producto</Table.ColumnHeader>
                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                        <Table.ColumnHeader>Cantidad Requerida</Table.ColumnHeader>
                        <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                        <Table.ColumnHeader>Acción</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {insumosEmpaque.map((insumo) => renderInsumoEmpaque(insumo))}
                </Table.Body>
            </Table.Root>
        </Box>
    );
}
