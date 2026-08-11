import React, {useState} from 'react';
import {
    Alert,
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
import {ItemPendienteReposicion, LoteSeleccionado} from '../types';
import {LotePickerDispensacion} from './AsistenteDispensacionComponents/LotePickerDispensacion';
import { LuTrash2 } from 'react-icons/lu';

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
                        <Tag.Root colorPalette='orange' size='sm'>Reposición</Tag.Root>
                    </Flex>
                    <Text fontFamily='Comfortaa Variable' fontSize='sm' color='app.textMuted' textAlign='center'>
                        Los siguientes materiales tienen averías reportadas pendientes de reposición.
                        Puede definir lotes para dispensar material de reposición sin requerir privilegios especiales.
                    </Text>

                    <Alert.Root
                        status='info'
                        variant='subtle'
                        borderRadius='md'
                        w='full'
                        borderStartWidth='3px'
                        borderStartColor='colorPalette.solid'>
                        <Alert.Indicator />
                        <Text fontSize='sm'>
                            La cantidad máxima dispensable por reposición se limita automáticamente a lo reportado como avería.
                        </Text>
                    </Alert.Root>

                    <Box w='full' overflowX='auto'>
                        <Table.Root size='sm' variant='simple'>
                            <Table.Header>
                                <Table.Row bg='orange.100'>
                                    <Table.ColumnHeader>Producto</Table.ColumnHeader>
                                    <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Averiado</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Ya Repuesto</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Pendiente</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Seleccionado</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='center'>Acción</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {itemsPendientes.map((item) => {
                                    const totalSel = getTotalSeleccionado(item.productoId);
                                    const lotesSeleccionados = lotesPorReposicionAveria.get(item.productoId) || [];
                                    const completo = totalSel >= item.cantidadPendiente - 0.01;

                                    return (
                                        <React.Fragment key={item.productoId}>
                                            <Table.Row>
                                                <Table.Cell>
                                                    <Text fontSize='sm' fontWeight='semibold'>{item.productoNombre}</Text>
                                                    <Text fontSize='xs' color='app.textSubtle'>{item.productoId}</Text>
                                                </Table.Cell>
                                                <Table.Cell>{item.tipoUnidades}</Table.Cell>
                                                <Table.Cell color='red.600' fontWeight='semibold' textAlign='end'>
                                                    {item.cantidadAveriada.toFixed(2)}
                                                </Table.Cell>
                                                <Table.Cell color='green.600' textAlign='end'>
                                                    {item.cantidadRepuesta.toFixed(2)}
                                                </Table.Cell>
                                                <Table.Cell fontWeight='bold' color='orange.600' textAlign='end'>
                                                    {item.cantidadPendiente.toFixed(2)}
                                                </Table.Cell>
                                                <Table.Cell color={completo ? 'green.600' : 'app.textMuted'} textAlign='end'>
                                                    {totalSel.toFixed(2)}
                                                </Table.Cell>
                                                <Table.Cell textAlign='center'>
                                                    <Button
                                                        size='xs'
                                                        colorPalette='orange'
                                                        onClick={() => handleAbrirModal(item)}
                                                        disabled={completo}
                                                    >
                                                        Definir Lote
                                                    </Button>
                                                </Table.Cell>
                                            </Table.Row>
                                            {lotesSeleccionados.map((lote) => (
                                                <Table.Row key={`${item.productoId}-lote-${lote.loteId}`} bg='orange.50'>
                                                    <Table.Cell colSpan={2} pl={8}>
                                                        <Text fontSize='xs' color='app.textMuted'>
                                                            Lote: <strong>{lote.batchNumber}</strong>
                                                        </Text>
                                                    </Table.Cell>
                                                    <Table.Cell colSpan={2}>
                                                        <Text fontSize='xs' color='app.textMuted'>
                                                            {lote.expirationDate ? `Vence: ${lote.expirationDate}` : ''}
                                                        </Text>
                                                    </Table.Cell>
                                                    <Table.Cell textAlign='end'>
                                                        <Text fontSize='xs' fontWeight='semibold'>
                                                            {lote.cantidad.toFixed(2)}
                                                        </Text>
                                                    </Table.Cell>
                                                    <Table.Cell />
                                                    <Table.Cell textAlign='center'>
                                                        <IconButton
                                                            aria-label='Eliminar lote'
                                                            size='xs'
                                                            colorPalette='red'
                                                            variant='ghost'
                                                            onClick={() => handleRemoveLote(item.productoId, lote.loteId)}><LuTrash2 /></IconButton>
                                                    </Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </Table.Body>
                        </Table.Root>
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
