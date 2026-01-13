import { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    Input,
    Radio,
    RadioGroup,
    Stack,
    Text,
    VStack,
    HStack,
    Alert,
    AlertIcon,
    Divider,
} from '@chakra-ui/react';
import DatePicker from '../../../../components/MyDatePicker';

type Props = {};

export function FiltroHistorialDispensaciones(props: Props) {
    // Estado para tipo de filtro de ID
    const [tipoFiltroId, setTipoFiltroId] = useState<0 | 1 | 2>(0);
    const [transaccionId, setTransaccionId] = useState<string>('');
    const [ordenProduccionId, setOrdenProduccionId] = useState<string>('');

    // Estado para tipo de filtro de fecha
    const [tipoFiltroFecha, setTipoFiltroFecha] = useState<0 | 1 | 2>(0);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');
    const [fechaEspecifica, setFechaEspecifica] = useState<string>('');

    // Estado para paginación
    const [page, setPage] = useState<number>(0);
    const [size, setSize] = useState<number>(10);

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

        // Validar que al menos un filtro esté activo
        if (tipoFiltroId === 0 && tipoFiltroFecha === 0) {
            setErrorMessage('Debe seleccionar al menos un filtro (ID o fecha)');
            return false;
        }

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

    // Manejar búsqueda (sin implementar fetch aún)
    const handleBuscar = () => {
        if (!validarFormulario()) {
            return;
        }

        // TODO: Implementar fetch al endpoint
        console.log('Búsqueda con filtros:', {
            tipoFiltroId,
            transaccionId: tipoFiltroId === 1 ? parseInt(transaccionId) : null,
            ordenProduccionId: tipoFiltroId === 2 ? parseInt(ordenProduccionId) : null,
            tipoFiltroFecha,
            fechaInicio: tipoFiltroFecha === 1 ? fechaInicio : null,
            fechaFin: tipoFiltroFecha === 1 ? fechaFin : null,
            fechaEspecifica: tipoFiltroFecha === 2 ? fechaEspecifica : null,
            page,
            size,
        });
    };

    // Limpiar formulario
    const handleLimpiar = () => {
        setTipoFiltroId(0);
        setTransaccionId('');
        setOrdenProduccionId('');
        setTipoFiltroFecha(0);
        setFechaInicio('');
        setFechaFin('');
        setFechaEspecifica('');
        setPage(0);
        setSize(10);
        setErrorMessage('');
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
                {/* Filtro por ID */}
                <Box>
                    <FormLabel fontWeight="bold" mb={3}>
                        Filtrar por ID
                    </FormLabel>
                    <RadioGroup
                        value={tipoFiltroId.toString()}
                        onChange={(value) => {
                            setTipoFiltroId(parseInt(value) as 0 | 1 | 2);
                            setTransaccionId('');
                            setOrdenProduccionId('');
                        }}
                    >
                        <Stack direction="row" spacing={4}>
                            <Radio value="0">Ninguno</Radio>
                            <Radio value="1">ID Transacción</Radio>
                            <Radio value="2">ID Orden de Producción</Radio>
                        </Stack>
                    </RadioGroup>

                    {tipoFiltroId === 1 && (
                        <FormControl mt={4}>
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
                        <FormControl mt={4}>
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
                </Box>

                <Divider />

                {/* Filtro por Fecha */}
                <Box>
                    <FormLabel fontWeight="bold" mb={3}>
                        Filtrar por Fecha
                    </FormLabel>
                    <RadioGroup
                        value={tipoFiltroFecha.toString()}
                        onChange={(value) => {
                            setTipoFiltroFecha(parseInt(value) as 0 | 1 | 2);
                            setFechaInicio('');
                            setFechaFin('');
                            setFechaEspecifica('');
                        }}
                    >
                        <Stack direction="row" spacing={4}>
                            <Radio value="0">Ninguno</Radio>
                            <Radio value="1">Rango de Fechas</Radio>
                            <Radio value="2">Fecha Específica</Radio>
                        </Stack>
                    </RadioGroup>

                    {tipoFiltroFecha === 1 && (
                        <HStack spacing={4} mt={4}>
                            <Box flex={1}>
                                <DatePicker
                                    date={fechaInicio}
                                    setDate={setFechaInicio}
                                    defaultDate={getTodayDate()}
                                    label="Fecha Inicio"
                                />
                            </Box>
                            <Box flex={1}>
                                <DatePicker
                                    date={fechaFin}
                                    setDate={setFechaFin}
                                    defaultDate={getTodayDate()}
                                    label="Fecha Fin"
                                />
                            </Box>
                        </HStack>
                    )}

                    {tipoFiltroFecha === 2 && (
                        <Box mt={4} maxW="300px">
                            <DatePicker
                                date={fechaEspecifica}
                                setDate={setFechaEspecifica}
                                defaultDate={getTodayDate()}
                                label="Fecha Específica"
                            />
                        </Box>
                    )}
                </Box>

                <Divider />

                {/* Paginación */}
                <Box>
                    <FormLabel fontWeight="bold" mb={3}>
                        Paginación
                    </FormLabel>
                    <HStack spacing={4}>
                        <FormControl maxW="150px">
                            <FormLabel fontSize="sm">Página</FormLabel>
                            <Input
                                type="number"
                                value={page}
                                onChange={(e) => setPage(Math.max(0, parseInt(e.target.value) || 0))}
                                min="0"
                            />
                        </FormControl>
                        <FormControl maxW="150px">
                            <FormLabel fontSize="sm">Tamaño</FormLabel>
                            <Input
                                type="number"
                                value={size}
                                onChange={(e) => setSize(Math.max(1, parseInt(e.target.value) || 10))}
                                min="1"
                            />
                        </FormControl>
                    </HStack>
                </Box>

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
