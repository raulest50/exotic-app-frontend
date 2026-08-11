import React from 'react';
import { Box, Button, Collapsible, IconButton, Table, Text, Tag } from '@chakra-ui/react';
import {FaChevronDown, FaChevronUp} from 'react-icons/fa';
import {InsumoDesglosado, LoteSeleccionado} from '../types';
import { LuTrash2 } from 'react-icons/lu';

interface Props {
    insumos: InsumoDesglosado[];
    lotesPorMaterial: Map<string, LoteSeleccionado[]>;
    onDefinirLotes: (insumo: InsumoDesglosado) => void;
    expandedSemiterminados: Record<string, boolean>;
    onToggleSemiterminado: (productoId: string) => void;
    historicoPorProducto?: Map<string, LoteSeleccionado[]>;
    getInsumoKey: (insumo: InsumoDesglosado) => string;
    onRemoveLote: (insumoKey: string, loteId: number) => void;
}

export default function TablaDispensacionInsumos({
    insumos,
    lotesPorMaterial,
    onDefinirLotes,
    expandedSemiterminados,
    onToggleSemiterminado,
    historicoPorProducto,
    getInsumoKey,
    onRemoveLote
}: Props) {
    const formatDate = (date: string | null | undefined): string => {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleDateString('es-ES');
        } catch {
            return 'N/A';
        }
    };

    const esSemiterminado = (insumo: InsumoDesglosado): boolean => {
        return insumo.tipo_producto === 'S' || insumo.tipoProducto === 'SEMITERMINADO';
    };

    const esInventariable = (insumo: InsumoDesglosado): boolean => {
        return insumo.inventareable !== false;
    };

    const renderInsumoRecursivo = (insumo: InsumoDesglosado, nivel: number = 0, parentId: string = '') => {
        const insumoKey = getInsumoKey(insumo);
        const reactKey = `${parentId}-${insumoKey}`;
        const esSemi = esSemiterminado(insumo);
        const tieneSubInsumos = insumo.subInsumos && insumo.subInsumos.length > 0;
        const isExpanded = expandedSemiterminados[insumo.productoId] || false;
        const lotesSeleccionados = lotesPorMaterial.get(insumoKey) || [];
        const historico = historicoPorProducto?.get(insumo.productoId) || [];
        const esMaterial = !esSemi && !tieneSubInsumos;
        const esInvent = esInventariable(insumo);

        const elements = [];

        elements.push(
            <Table.Row 
                key={`row-${reactKey}`}
                bg={esSemi ? `purple.${50 + nivel * 10}` : undefined}
                borderLeftWidth={esSemi ? "4px" : "0"}
                borderLeftColor="purple.400"
                cursor={(esSemi && tieneSubInsumos) ? "pointer" : "default"}
                _hover={(esSemi && tieneSubInsumos) ? { bg: "app.rowSelectedPurple" } : { bg: "app.rowHoverStrong" }}
                onClick={() => {
                    if (esSemi && tieneSubInsumos) {
                        onToggleSemiterminado(insumo.productoId);
                    }
                }}
            >
                <Table.Cell>{insumo.productoId}</Table.Cell>
                <Table.Cell fontWeight="medium">
                    {nivel > 0 && <Box as="span" ml={`${nivel * 0.5}rem`} />}
                    {insumo.productoNombre}
                    {esSemi && (
                        <Tag.Root ml={2} size="sm" colorPalette="purple">
                            Semiterminado
                        </Tag.Root>
                    )}
                    {esMaterial && insumo.consumoDirecto === true && (
                        <Tag.Root ml={2} size="sm" colorPalette="purple">
                            Consumo directo
                        </Tag.Root>
                    )}
                </Table.Cell>
                <Table.Cell>{insumo.cantidadTotalRequerida.toFixed(2)}</Table.Cell>
                <Table.Cell>{insumo.tipoUnidades}</Table.Cell>
                <Table.Cell>
                    {esMaterial && esInvent ? (
                        <Button
                            size='sm'
                            colorPalette='teal'
                            onClick={(e) => {
                                e.stopPropagation();
                                onDefinirLotes(insumo);
                            }}
                        >
                            Definir Lotes
                        </Button>
                    ) : esMaterial && !esInvent ? (
                        <Text fontSize='xs' color='app.textSubtle' fontStyle='italic'>
                            {insumo.consumoDirecto ? 'Sin lote; se registra contra la OP' : 'No participa'}
                        </Text>
                    ) : (
                        esSemi && tieneSubInsumos && (
                            <Box color="purple.500" display="inline-flex" alignItems="center">
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            </Box>
                        )
                    )}
                </Table.Cell>
            </Table.Row>
        );

        if (esMaterial && lotesSeleccionados.length > 0) {
            lotesSeleccionados.forEach((lote) => {
                elements.push(
                    <Table.Row key={`${insumoKey}-lote-${lote.loteId}`} bg='app.surfaceSubtle'>
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
                                    onRemoveLote(insumoKey, lote.loteId);
                                }}><LuTrash2 /></IconButton>
                        </Table.Cell>
                    </Table.Row>
                );
            });
        }

        if (esMaterial && historico.length > 0) {
            historico.forEach((lote) => {
                elements.push(
                    <Table.Row key={`${insumoKey}-hist-${lote.batchNumber}-${lote.loteId}`} bg='app.surfaceMuted'>
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
                );
            });
        }

        if (tieneSubInsumos && isExpanded) {
            elements.push(
                <Table.Row key={`subrow-${reactKey}`}>
                    <Table.Cell colSpan={5} p={0}>
                        <Collapsible.Root open={isExpanded}>
                            <Collapsible.Content>
                                <Box 
                                    p={4} 
                                    bg="app.surfaceSubtle"
                                    borderWidth="1px" 
                                    borderColor="purple.200"
                                    borderRadius="md"
                                    m={2}
                                >
                                    <Table.Root variant="line" size="sm" colorPalette="purple">
                                        <Table.Header bg="app.rowSelectedPurple">
                                            <Table.Row>
                                                <Table.ColumnHeader>ID Producto</Table.ColumnHeader>
                                                <Table.ColumnHeader>Componente</Table.ColumnHeader>
                                                <Table.ColumnHeader>Cantidad Requerida</Table.ColumnHeader>
                                                <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                                                <Table.ColumnHeader>Acción</Table.ColumnHeader>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {insumo.subInsumos?.map(subInsumo => 
                                                renderInsumoRecursivo(subInsumo, nivel + 1, insumo.productoId)
                                            )}
                                        </Table.Body>
                                    </Table.Root>
                                </Box>
                            </Collapsible.Content>
                        </Collapsible.Root>
                    </Table.Cell>
                </Table.Row>
            );
        }

        return <React.Fragment key={`frag-${reactKey}`}>{elements}</React.Fragment>;
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
                    {insumos.length === 0 ? (
                        <Table.Row>
                            <Table.Cell colSpan={5} textAlign='center' py={4}>
                                <Text>No hay materiales registrados</Text>
                            </Table.Cell>
                        </Table.Row>
                    ) : (
                        insumos.map((insumo) => renderInsumoRecursivo(insumo))
                    )}
                </Table.Body>
            </Table.Root>
        </Box>
    );
}
