import { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    Input,
    Select,
    Text,
    VStack,
    HStack,
    Alert,
    AlertIcon,
    Divider,
    Grid,
    useDisclosure,
} from '@chakra-ui/react';
import DatePicker from '../../../components/MyDatePicker.tsx';
import { FiltroHistDispensacionDTO } from './types';
import TerminadoPicker, { TerminadoPickerResult } from '../../../components/Pickers/TerminadoPicker/TerminadoPicker.tsx';

interface Props {
    onBuscar: (filtro: FiltroHistDispensacionDTO) => void;
    onLimpiar?: () => void;
}

export function FiltroHistorialDispensaciones({ onBuscar, onLimpiar }: Props) {
    // Estado para tipo de filtro de ID
    const [tipoFiltroId, setTipoFiltroId] = useState<0 | 1 | 2 | 3>(0);
    const [transaccionId, setTransaccionId] = useState<string>('');
    const [ordenProduccionId, setOrdenProduccionId] = useState<string>('');
    const [loteAsignado, setLoteAsignado] = useState<string>('');

    // Estado para tipo de filtro de fecha
    const [tipoFiltroFecha, setTipoFiltroFecha] = useState<0 | 1 | 2>(0);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');
    const [fechaEspecifica, setFechaEspecifica] = useState<string>('');

    // Estado para filtro de producto terminado
    const [selectedTerminado, setSelectedTerminado] = useState<TerminadoPickerResult | null>(null);
    const {
        isOpen: isTerminadoPickerOpen,
        onOpen: onOpenTerminadoPicker,
        onClose: onCloseTerminadoPicker
    } = useDisclosure();

    // Estado para validación
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Obtener fecha actual para DatePicker default
    const getTodayDate = (): string => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Validar formulario
    const validarFormulario = (): boolean => {
        setErrorMessage('');

        // Permitir que ambos filtros estén en "Ninguno" (0) para retornar todas las transacciones

        // Validar filtro de ID
        if (tipoFiltroId === 1) {
            if (!transaccionId || transaccionId.trim() === '' || parseInt(transaccionId) <= 0) {
                setErrorMessage('Debe proporcionar un ID de transacción válido');
                return false;
            }
        } else if (tipoFiltroId === 2) {
            if (!ordenProduccionId || ordenProduccionId.trim() === '' || parseInt(ordenProduccionId) <= 0) {
                setErrorMessage('Debe proporcionar un ID de orden de producción válido');
                return false;
            }
        } else if (tipoFiltroId === 3) {
            if (!loteAsignado || loteAsignado.trim() === '') {
                setErrorMessage('Debe proporcionar un lote de producción válido');
                return false;
            }
        }

        // Validar filtro de fecha
        if (tipoFiltroFecha === 1) {
            if (!fechaInicio || !fechaFin) {
                setErrorMessage('Debe proporcionar ambas fechas (inicio y fin) para el rango');
                return false;
            }
            if (new Date(fechaInicio) > new Date(fechaFin)) {
                setErrorMessage('La fecha de inicio no puede ser posterior a la fecha de fin');
                return false;
            }
        } else if (tipoFiltroFecha === 2) {
            if (!fechaEspecifica) {
                setErrorMessage('Debe proporcionar una fecha específica');
                return false;
            }
        }

        return true;
    };

    // Manejar búsqueda
    const handleBuscar = () => {
        if (!validarFormulario()) {
            return;
        }

        const filtro: FiltroHistDispensacionDTO = {
            tipoFiltroId,
            transaccionId: tipoFiltroId === 1 ? parseInt(transaccionId) : null,
            ordenProduccionId: tipoFiltroId === 2 ? parseInt(ordenProduccionId) : null,
            loteAsignado: tipoFiltroId === 3 ? loteAsignado.trim() : null,
            productoTerminadoId: selectedTerminado?.productoId ?? null,
            tipoFiltroFecha,
            fechaInicio: tipoFiltroFecha === 1 ? fechaInicio : null,
            fechaFin: tipoFiltroFecha === 1 ? fechaFin : null,
            fechaEspecifica: tipoFiltroFecha === 2 ? fechaEspecifica : null,
            page: 0, // Siempre resetear a página 0 en nueva búsqueda
            size: 10, // Tamaño por defecto, se manejará en el componente padre
        };

        onBuscar(filtro);
    };

    // Limpiar formulario
    const handleLimpiar = () => {
        setTipoFiltroId(0);
        setTransaccionId('');
        setOrdenProduccionId('');
        setLoteAsignado('');
        setTipoFiltroFecha(0);
        setFechaInicio('');
        setFechaFin('');
        setFechaEspecifica('');
        setSelectedTerminado(null);
        setErrorMessage('');
        if (onLimpiar) {
            onLimpiar();
        }
    };

    return (
        <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="md">
            <Heading size="md" mb={6}>
                Filtros de Búsqueda de Dispensaciones
            </Heading>

            {errorMessage && (
                <Alert status="error" mb={4}>
                    <AlertIcon />
                    {errorMessage}
                </Alert>
            )}

            <VStack spacing={6} align="stretch">
                {/* Filtro por ID o lote */}
                <Box>
                    <FormLabel fontWeight="bold" mb={3}>
                        Filtrar por ID o Lote
                    </FormLabel>
                    <Grid templateColumns="repeat(12, 1fr)" gap={4} alignItems="end">
                        <FormControl gridColumn="span 4">
                            <Select
                                value={tipoFiltroId.toString()}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value) as 0 | 1 | 2 | 3;
                                    setTipoFiltroId(value);
                                    setTransaccionId('');
                                    setOrdenProduccionId('');
                                    setLoteAsignado('');
                                }}
                            >
                                <option value="0">Ninguno</option>
                                <option value="1">ID Transacción</option>
                                <option value="2">ID Orden de Producción</option>
                                <option value="3">Lote de Producción</option>
                            </Select>
                        </FormControl>

                        {tipoFiltroId === 1 && (
                            <FormControl gridColumn="span 8">
                                <FormLabel>ID de Transacción</FormLabel>
                                <Input
                                    type="number"
                                    value={transaccionId}
                                    onChange={(e) => setTransaccionId(e.target.value)}
                                    placeholder="Ej: 123"
                                    min="1"
                                />
                            </FormControl>
                        )}

                        {tipoFiltroId === 2 && (
                            <FormControl gridColumn="span 8">
                                <FormLabel>ID de Orden de Producción</FormLabel>
                                <Input
                                    type="number"
                                    value={ordenProduccionId}
                                    onChange={(e) => setOrdenProduccionId(e.target.value)}
                                    placeholder="Ej: 456"
                                    min="1"
                                />
                            </FormControl>
                        )}

                        {tipoFiltroId === 3 && (
                            <FormControl gridColumn="span 8">
                                <FormLabel>Lote de Producción</FormLabel>
                                <Input
                                    value={loteAsignado}
                                    onChange={(e) => setLoteAsignado(e.target.value)}
                                    placeholder="Ej: LOT-PT"
                                />
                            </FormControl>
                        )}
                    </Grid>
                </Box>

                <Divider />

                {/* Filtro por producto terminado */}
                <Box>
                    <FormLabel fontWeight="bold" mb={3}>
                        Filtrar por Producto Terminado
                    </FormLabel>
                    <Grid templateColumns="repeat(12, 1fr)" gap={4} alignItems="center">
                        <Box gridColumn="span 8">
                            <Text fontWeight="semibold">
                                {selectedTerminado ? selectedTerminado.nombre : 'Sin producto terminado seleccionado'}
                            </Text>
                            {selectedTerminado && (
                                <Text fontSize="sm" color="gray.600">
                                    ID: {selectedTerminado.productoId}
                                </Text>
                            )}
                        </Box>

                        <HStack gridColumn="span 4" justify="flex-end" spacing={3}>
                            <Button colorScheme="purple" variant="outline" onClick={onOpenTerminadoPicker}>
                                {selectedTerminado ? 'Cambiar' : 'Seleccionar'}
                            </Button>
                            {selectedTerminado && (
                                <Button
                                    colorScheme="red"
                                    variant="ghost"
                                    onClick={() => setSelectedTerminado(null)}
                                >
                                    Quitar
                                </Button>
                            )}
                        </HStack>
                    </Grid>

                    <TerminadoPicker
                        isOpen={isTerminadoPickerOpen}
                        onClose={onCloseTerminadoPicker}
                        onSelectTerminado={(terminado) => setSelectedTerminado(terminado)}
                    />
                </Box>

                <Divider />

                {/* Filtro por Fecha */}
                <Box>
                    <FormLabel fontWeight="bold" mb={3}>
                        Filtrar por Fecha
                    </FormLabel>
                    <Grid templateColumns="repeat(12, 1fr)" gap={4} alignItems="end">
                        <FormControl gridColumn="span 4">
                            <Select
                                value={tipoFiltroFecha.toString()}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value) as 0 | 1 | 2;
                                    setTipoFiltroFecha(value);
                                    setFechaInicio('');
                                    setFechaFin('');
                                    setFechaEspecifica('');
                                }}
                            >
                                <option value="0">Ninguno</option>
                                <option value="1">Rango de Fechas</option>
                                <option value="2">Fecha Específica</option>
                            </Select>
                        </FormControl>

                        {tipoFiltroFecha === 1 && (
                            <Box gridColumn="span 8">
                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    <DatePicker
                                        date={fechaInicio}
                                        setDate={setFechaInicio}
                                        defaultDate={getTodayDate()}
                                        label="Fecha Inicio"
                                    />
                                    <DatePicker
                                        date={fechaFin}
                                        setDate={setFechaFin}
                                        defaultDate={getTodayDate()}
                                        label="Fecha Fin"
                                    />
                                </Grid>
                            </Box>
                        )}

                        {tipoFiltroFecha === 2 && (
                            <Box gridColumn="span 8">
                                <DatePicker
                                    date={fechaEspecifica}
                                    setDate={setFechaEspecifica}
                                    defaultDate={getTodayDate()}
                                    label="Fecha Específica"
                                />
                            </Box>
                        )}
                    </Grid>
                </Box>

                <Divider />

                {/* Botones de acción */}
                <Flex justify="flex-end" gap={4} mt={4}>
                    <Button colorScheme="gray" onClick={handleLimpiar}>
                        Limpiar
                    </Button>
                    <Button colorScheme="blue" onClick={handleBuscar}>
                        Buscar
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
