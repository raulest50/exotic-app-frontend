import {useEffect, useState} from 'react';
import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    Input,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    useToast
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import TerminadoPicker from './TerminadoPicker.tsx';
import {Almacen, Movimiento, Producto, TipoMovimiento} from '../../types.tsx';

interface TerminadoSeleccionado {
    producto: Producto;
    cantidad: number;
    lote: string;
}

export function AsistenteBackflushDirecto() {
    const [terminados, setTerminados] = useState<TerminadoSeleccionado[]>([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [token, setToken] = useState('');
    const [inputToken, setInputToken] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();
    const endpoints = new EndPointsURL();

    useEffect(() => {
        const t = Math.floor(1000 + Math.random() * 9000).toString();
        setToken(t);
        setInputToken('');
    }, [terminados]);

    const addTerminados = (prods: Producto[]) => {
        const nuevos = prods.map(p => ({producto: p, cantidad: 1, lote: ''}));
        setTerminados(prev => [...prev, ...nuevos]);
    };

    const updateCantidad = (idx: number, value: number) => {
        const list = [...terminados];
        list[idx].cantidad = value;
        setTerminados(list);
    };

    const updateLote = (idx: number, value: string) => {
        const list = [...terminados];
        list[idx].lote = value;
        setTerminados(list);
    };

    const removeItem = (idx: number) => {
        setTerminados(terminados.filter((_, i) => i !== idx));
    };

    const datosValidos = terminados.length > 0 && terminados.every(t => t.cantidad > 0 && t.lote.trim() !== '');

    const registrarBackflush = async () => {
        const movimientos: Movimiento[] = terminados.map(t => ({
            cantidad: t.cantidad,
            producto: t.producto,
            tipoMovimiento: TipoMovimiento.BACKFLUSH,
            almacen: Almacen.GENERAL,
            lote: {batchNumber: t.lote, expirationDate: ''},
            fechaMovimiento: new Date().toISOString()
        }));
        try {
            setIsSubmitting(true);
            await axios.post(endpoints.backflush_no_planificado, {movimientosTransaccion: movimientos});
            toast({title: 'Backflush registrado', status: 'success', duration: 3000, isClosable: true});
            setTerminados([]);
        } catch (e) {
            toast({title: 'Error al registrar', status: 'error', duration: 3000, isClosable: true});
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w='full' h='full' py={4}>
            <Flex direction='column' gap={4}>
                <Heading size='lg' color='teal.600'>Backflush No Planificado</Heading>
                <Button alignSelf='flex-start' onClick={() => setIsPickerOpen(true)}>Agregar Terminados</Button>
                {terminados.length > 0 && (
                    <Table size='sm'>
                        <Thead>
                            <Tr>
                                <Th>Producto</Th>
                                <Th>Cantidad</Th>
                                <Th>Lote</Th>
                                <Th></Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {terminados.map((t, idx) => (
                                <Tr key={t.producto.productoId}>
                                    <Td>{t.producto.nombre}</Td>
                                    <Td>
                                        <Input
                                            type='number'
                                            value={t.cantidad}
                                            min={1}
                                            onChange={e => updateCantidad(idx, parseInt(e.target.value) || 0)}
                                        />
                                    </Td>
                                    <Td>
                                        <Input
                                            value={t.lote}
                                            onChange={e => updateLote(idx, e.target.value)}
                                        />
                                    </Td>
                                    <Td>
                                        <Button size='xs' colorScheme='red' onClick={() => removeItem(idx)}>-</Button>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
                <Flex direction='column' align='center' gap={2}>
                    <Input
                        placeholder='Token'
                        value={inputToken}
                        onChange={e => setInputToken(e.target.value)}
                        w={['full', '40%']}
                    />
                    <Box>
                        Token: <strong>{token}</strong>
                    </Box>
                </Flex>
                <Button
                    colorScheme='teal'
                    onClick={registrarBackflush}
                    isDisabled={!datosValidos || inputToken !== token || isSubmitting}
                    isLoading={isSubmitting}
                    loadingText='Enviando'
                >
                    Registrar Backflush
                </Button>
            </Flex>
            <TerminadoPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onConfirm={addTerminados}
                alreadySelected={terminados.map(t => t.producto)}
            />
        </Container>
    );
}

