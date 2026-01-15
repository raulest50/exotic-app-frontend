import React from 'react';
import {Box, Button, Table, Tbody, Td, Text, Th, Thead, Tr, Tag} from '@chakra-ui/react';
import {InsumoDesglosado, LoteSeleccionado} from '../types';

interface Props {
    insumosEmpaque: InsumoDesglosado[];
    lotesPorMaterialEmpaque: Map<string, LoteSeleccionado[]>;
    getCantidadEmpaque: (insumo: InsumoDesglosado) => number;
    onDefinirLotesEmpaque: (insumo: InsumoDesglosado, cantidadEmpaque: number) => void;
}

export default function TablaDispensacionInsumosEmpaque({
    insumosEmpaque,
    lotesPorMaterialEmpaque,
    getCantidadEmpaque,
    onDefinirLotesEmpaque
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

        return (
            <React.Fragment key={insumo.productoId}>
                <Tr>
                    <Td>{insumo.productoId}</Td>
                    <Td fontWeight="medium">
                        {insumo.productoNombre}
                        {!esInvent && (
                            <Tag ml={2} size="sm" colorScheme="gray" variant="outline">
                                No inventariable
                            </Tag>
                        )}
                        <Tag ml={2} size="sm" colorScheme="blue" variant="outline">
                            Empaque
                        </Tag>
                    </Td>
                    <Td>{cantidadEmpaque.toFixed(2)}</Td>
                    <Td>{insumo.tipoUnidades}</Td>
                    <Td>
                        {esInvent ? (
                            <Button
                                size='sm'
                                colorScheme='blue'
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDefinirLotesEmpaque(insumo, cantidadEmpaque);
                                }}
                            >
                                Definir Lotes
                            </Button>
                        ) : (
                            <Text fontSize='xs' color='gray.500' fontStyle='italic'>
                                No requiere lote
                            </Text>
                        )}
                    </Td>
                </Tr>
                {esInvent && lotesSeleccionados.length > 0 && lotesSeleccionados.map((lote) => (
                    <Tr key={`${insumo.productoId}-lote-${lote.loteId}`} bg='gray.50'>
                        <Td></Td>
                        <Td pl={8} fontSize='xs' color='gray.600'>
                            └─ Lote: {lote.batchNumber}
                        </Td>
                        <Td fontSize='xs' color='gray.600'>
                            {lote.cantidad.toFixed(2)}
                        </Td>
                        <Td fontSize='xs' color='gray.600'>
                            {formatDate(lote.expirationDate)}
                        </Td>
                        <Td></Td>
                    </Tr>
                ))}
            </React.Fragment>
        );
    };

    return (
        <Box bg='white' borderRadius='md' boxShadow='sm' overflowX='auto' w='full' maxW='1200px'>
            <Table size='sm'>
                <Thead>
                    <Tr>
                        <Th>ID Producto</Th>
                        <Th>Nombre</Th>
                        <Th>Cantidad Requerida</Th>
                        <Th>Unidad</Th>
                        <Th>Acción</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {insumosEmpaque.map((insumo) => renderInsumoEmpaque(insumo))}
                </Tbody>
            </Table>
        </Box>
    );
}

