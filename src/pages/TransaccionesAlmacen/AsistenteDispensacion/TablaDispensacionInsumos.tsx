import React from 'react';
import {Box, Button, Collapse, Table, Tbody, Td, Text, Th, Thead, Tr, Tag} from '@chakra-ui/react';
import {FaChevronDown, FaChevronUp} from 'react-icons/fa';
import {InsumoDesglosado, LoteSeleccionado} from '../types';

interface Props {
    insumos: InsumoDesglosado[];
    lotesPorMaterial: Map<string, LoteSeleccionado[]>;
    onDefinirLotes: (insumo: InsumoDesglosado) => void;
    expandedSemiterminados: Record<string, boolean>;
    onToggleSemiterminado: (productoId: string) => void;
}

export default function TablaDispensacionInsumos({
    insumos,
    lotesPorMaterial,
    onDefinirLotes,
    expandedSemiterminados,
    onToggleSemiterminado
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
        const reactKey = `${parentId}-${insumo.productoId}`;
        const esSemi = esSemiterminado(insumo);
        const tieneSubInsumos = insumo.subInsumos && insumo.subInsumos.length > 0;
        const isExpanded = expandedSemiterminados[insumo.productoId] || false;
        const lotesSeleccionados = lotesPorMaterial.get(insumo.productoId) || [];
        const esMaterial = !esSemi && !tieneSubInsumos;
        const esInvent = esInventariable(insumo);

        const elements = [];

        elements.push(
            <Tr 
                key={`row-${reactKey}`}
                bg={esSemi ? `purple.${50 + nivel * 10}` : undefined}
                borderLeftWidth={esSemi ? "4px" : "0"}
                borderLeftColor="purple.400"
                cursor={(esSemi && tieneSubInsumos) ? "pointer" : "default"}
                _hover={(esSemi && tieneSubInsumos) ? { bg: "purple.100" } : { bg: "gray.100" }}
                onClick={() => {
                    if (esSemi && tieneSubInsumos) {
                        onToggleSemiterminado(insumo.productoId);
                    }
                }}
            >
                <Td>{insumo.productoId}</Td>
                <Td fontWeight="medium">
                    {nivel > 0 && <Box as="span" ml={`${nivel * 0.5}rem`} />}
                    {insumo.productoNombre}
                    {esSemi && (
                        <Tag ml={2} size="sm" colorScheme="purple">
                            Semiterminado
                        </Tag>
                    )}
                    {!esInvent && (
                        <Tag ml={2} size="sm" colorScheme="gray" variant="outline">
                            No inventariable
                        </Tag>
                    )}
                </Td>
                <Td>{insumo.cantidadTotalRequerida.toFixed(2)}</Td>
                <Td>{insumo.tipoUnidades}</Td>
                <Td>
                    {esMaterial && esInvent ? (
                        <Button
                            size='sm'
                            colorScheme='teal'
                            onClick={(e) => {
                                e.stopPropagation();
                                onDefinirLotes(insumo);
                            }}
                        >
                            Definir Lotes
                        </Button>
                    ) : esMaterial && !esInvent ? (
                        <Text fontSize='xs' color='gray.500' fontStyle='italic'>
                            No requiere lote
                        </Text>
                    ) : (
                        esSemi && tieneSubInsumos && (
                            <Box color="purple.500" display="inline-flex" alignItems="center">
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            </Box>
                        )
                    )}
                </Td>
            </Tr>
        );

        if (esMaterial && lotesSeleccionados.length > 0) {
            lotesSeleccionados.forEach((lote) => {
                elements.push(
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
                );
            });
        }

        if (tieneSubInsumos && isExpanded) {
            elements.push(
                <Tr key={`subrow-${reactKey}`}>
                    <Td colSpan={5} p={0}>
                        <Collapse in={isExpanded} animateOpacity>
                            <Box 
                                p={4} 
                                bg="gray.50" 
                                borderWidth="1px" 
                                borderColor="purple.200"
                                borderRadius="md"
                                m={2}
                            >
                                <Table variant="simple" size="sm" colorScheme="purple">
                                    <Thead bg="purple.100">
                                        <Tr>
                                            <Th>ID Producto</Th>
                                            <Th>Componente</Th>
                                            <Th>Cantidad Requerida</Th>
                                            <Th>Unidad</Th>
                                            <Th>Acción</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {insumo.subInsumos?.map(subInsumo => 
                                            renderInsumoRecursivo(subInsumo, nivel + 1, insumo.productoId)
                                        )}
                                    </Tbody>
                                </Table>
                            </Box>
                        </Collapse>
                    </Td>
                </Tr>
            );
        }

        return <React.Fragment key={`frag-${reactKey}`}>{elements}</React.Fragment>;
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
                    {insumos.length === 0 ? (
                        <Tr>
                            <Td colSpan={5} textAlign='center' py={4}>
                                <Text>No hay materiales registrados</Text>
                            </Td>
                        </Tr>
                    ) : (
                        insumos.map((insumo) => renderInsumoRecursivo(insumo))
                    )}
                </Tbody>
            </Table>
        </Box>
    );
}

