import React, {useState} from 'react';
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Flex,
    Heading,
    IconButton,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    Tag,
} from '@chakra-ui/react';
import {DeleteIcon} from '@chakra-ui/icons';
import {ItemPendienteReposicion, LoteSeleccionado} from '../types';
import {LotePickerDispensacion} from './AsistenteDispensacionComponents/LotePickerDispensacion';

interface SeccionReposicionAveriasProps {
    itemsPendientes: ItemPendienteReposicion[];
    lotesPorReposicionAveria: Map<string, LoteSeleccionado[]>;
    setLotesPorReposicionAveria: (lotes: Map<string, LoteSeleccionado[]>) => void;
}

export default function SeccionReposicionAverias({
    itemsPendientes,
    lotesPorReposicionAveria,
    setLotesPorReposicionAveria,
}: SeccionReposicionAveriasProps) {
    const [modalAbierto, setModalAbierto] = useState<{
        productoId: string;
        productoNombre: string;
        cantidadPendiente: number;
    } | null>(null);

    if (!itemsPendientes || itemsPendientes.length === 0) {
        return null;
    }

    const handleAbrirModal = (item: ItemPendienteReposicion) => {
        const lotesYaSeleccionados = lotesPorReposicionAveria.get(item.productoId) || [];
        const totalYaSeleccionado = lotesYaSeleccionados.reduce((sum, l) => sum + l.cantidad, 0);
        const cantidadDisponible = item.cantidadPendiente - totalYaSeleccionado;

        setModalAbierto({
            productoId: item.productoId,
            productoNombre: item.productoNombre,
            cantidadPendiente: Math.max(cantidadDisponible, 0),
        });
    };

    const handleAceptarLotes = (productoId: string, lotes: LoteSeleccionado[]) => {
        const nuevoMap = new Map(lotesPorReposicionAveria);
        const existentes = nuevoMap.get(productoId) || [];
        nuevoMap.set(productoId, [...existentes, ...lotes]);
        setLotesPorReposicionAveria(nuevoMap);
    };

    const handleRemoveLote = (productoId: string, loteId: number) => {
        const nuevoMap = new Map(lotesPorReposicionAveria);
        const actuales = nuevoMap.get(productoId) || [];
        nuevoMap.set(productoId, actuales.filter(lote => lote.loteId !== loteId));
        setLotesPorReposicionAveria(nuevoMap);
    };

    const getTotalSeleccionado = (productoId: string): number => {
        const lotes = lotesPorReposicionAveria.get(productoId) || [];
        return lotes.reduce((sum, l) => sum + l.cantidad, 0);
    };

    return (
        <>
            <Box mt={6} p={4} bg='orange.50' borderRadius='md' borderWidth='2px' borderColor='orange.300'>
                <Flex direction='column' gap={4} align='center'>
                    <Flex align='center' gap={2}>
                        <Heading fontFamily='Comfortaa Variable' size='md' color='orange.700'>
                            Reposición de Material por Averías
                        </Heading>
                        <Tag colorScheme='orange' size='sm'>Reposición</Tag>
                    </Flex>
                    <Text fontFamily='Comfortaa Variable' fontSize='sm' color='gray.600' textAlign='center'>
                        Los siguientes materiales tienen averías reportadas pendientes de reposición.
                        Puede definir lotes para dispensar material de reposición sin requerir privilegios especiales.
                    </Text>

                    <Alert status='info' variant='left-accent' borderRadius='md' w='full'>
                        <AlertIcon />
                        <Text fontSize='sm'>
                            La cantidad máxima dispensable por reposición se limita automáticamente a lo reportado como avería.
                        </Text>
                    </Alert>

                    <Box w='full' overflowX='auto'>
                        <Table size='sm' variant='simple'>
                            <Thead>
                                <Tr bg='orange.100'>
                                    <Th>Producto</Th>
                                    <Th>Unidad</Th>
                                    <Th isNumeric>Averiado</Th>
                                    <Th isNumeric>Ya Repuesto</Th>
                                    <Th isNumeric>Pendiente</Th>
                                    <Th isNumeric>Seleccionado</Th>
                                    <Th textAlign='center'>Acción</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {itemsPendientes.map((item) => {
                                    const totalSel = getTotalSeleccionado(item.productoId);
                                    const lotesSeleccionados = lotesPorReposicionAveria.get(item.productoId) || [];
                                    const completo = totalSel >= item.cantidadPendiente - 0.01;

                                    return (
                                        <React.Fragment key={item.productoId}>
                                            <Tr>
                                                <Td>
                                                    <Text fontSize='sm' fontWeight='semibold'>{item.productoNombre}</Text>
                                                    <Text fontSize='xs' color='gray.500'>{item.productoId}</Text>
                                                </Td>
                                                <Td>{item.tipoUnidades}</Td>
                                                <Td isNumeric color='red.600' fontWeight='semibold'>
                                                    {item.cantidadAveriada.toFixed(2)}
                                                </Td>
                                                <Td isNumeric color='green.600'>
                                                    {item.cantidadRepuesta.toFixed(2)}
                                                </Td>
                                                <Td isNumeric fontWeight='bold' color='orange.600'>
                                                    {item.cantidadPendiente.toFixed(2)}
                                                </Td>
                                                <Td isNumeric color={completo ? 'green.600' : 'gray.600'}>
                                                    {totalSel.toFixed(2)}
                                                </Td>
                                                <Td textAlign='center'>
                                                    <Button
                                                        size='xs'
                                                        colorScheme='orange'
                                                        onClick={() => handleAbrirModal(item)}
                                                        isDisabled={completo}
                                                    >
                                                        Definir Lote
                                                    </Button>
                                                </Td>
                                            </Tr>
                                            {lotesSeleccionados.map((lote) => (
                                                <Tr key={`${item.productoId}-lote-${lote.loteId}`} bg='orange.50'>
                                                    <Td colSpan={2} pl={8}>
                                                        <Text fontSize='xs' color='gray.600'>
                                                            Lote: <strong>{lote.batchNumber}</strong>
                                                        </Text>
                                                    </Td>
                                                    <Td colSpan={2}>
                                                        <Text fontSize='xs' color='gray.600'>
                                                            {lote.expirationDate ? `Vence: ${lote.expirationDate}` : ''}
                                                        </Text>
                                                    </Td>
                                                    <Td isNumeric>
                                                        <Text fontSize='xs' fontWeight='semibold'>
                                                            {lote.cantidad.toFixed(2)}
                                                        </Text>
                                                    </Td>
                                                    <Td />
                                                    <Td textAlign='center'>
                                                        <IconButton
                                                            aria-label='Eliminar lote'
                                                            icon={<DeleteIcon />}
                                                            size='xs'
                                                            colorScheme='red'
                                                            variant='ghost'
                                                            onClick={() => handleRemoveLote(item.productoId, lote.loteId)}
                                                        />
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </Tbody>
                        </Table>
                    </Box>
                </Flex>
            </Box>

            {modalAbierto && (
                <LotePickerDispensacion
                    isOpen={true}
                    onClose={() => setModalAbierto(null)}
                    onAccept={(lotes) => {
                        handleAceptarLotes(modalAbierto.productoId, lotes);
                        setModalAbierto(null);
                    }}
                    productoId={modalAbierto.productoId}
                    productoNombre={modalAbierto.productoNombre}
                    cantidadRequerida={modalAbierto.cantidadPendiente}
                />
            )}
        </>
    );
}
