import { useState, useEffect, useRef, useCallback } from 'react';
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
    Select,
    Stack,
    VStack,
    HStack,
    Alert,
    AlertIcon,
    Divider,
    useToast,
} from '@chakra-ui/react';
import axios from 'axios';
import DatePicker from '../../../components/MyDatePicker.tsx';
import EndPointsURL from '../../../../src/api/EndPointsURL';
import { TransaccionAlmacen } from '../types.tsx';

interface PageResponse {
    content: TransaccionAlmacen[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

interface Props {
    onSearchResults?: (data: PageResponse) => void;
    onLoadingChange?: (loading: boolean) => void;
    currentPage?: number;
    onPageChange?: (page: number) => void;
}

export function FiltroHistorialDispensaciones(props: Props) {
    const { onSearchResults, onLoadingChange, currentPage = 0, onPageChange, onSearchFunctionReady } = props;
    const toast = useToast();
    const endPoints = new EndPointsURL();

    // Estado para tipo de filtro de ID
    const [tipoFiltroId, setTipoFiltroId] = useState<0 | 1 | 2>(0);
    const [transaccionId, setTransaccionId] = useState<string>('');
    const [ordenProduccionId, setOrdenProduccionId] = useState<string>('');

    // Estado para tipo de filtro de fecha
    const [tipoFiltroFecha, setTipoFiltroFecha] = useState<0 | 1 | 2>(0);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');
    const [fechaEspecifica, setFechaEspecifica] = useState<string>('');

    // Estado para paginación (size fijo en 10)
    const size = 10;

    // Estado para validación y loading
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [hasSearched, setHasSearched] = useState<boolean>(false);
    const previousPageRef = useRef<number>(0);

    // Obtener fecha actual para DatePicker default
    const getTodayDate = (): string => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Validar formulario
    const validarFormulario = useCallback((): boolean => {
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
    }, [tipoFiltroId, transaccionId, ordenProduccionId, tipoFiltroFecha, fechaInicio, fechaFin, fechaEspecifica]);

    // Manejar búsqueda
    const handleBuscar = useCallback(async (pageNumber: number = 0, skipValidation: boolean = false) => {
        if (!skipValidation && !validarFormulario()) {
            return;
        }

        setLoading(true);
        if (onLoadingChange) {
            onLoadingChange(true);
        }

        try {
            // Construir el DTO de filtro
            const filtroDTO = {
                transaccionId: tipoFiltroId === 1 ? parseInt(transaccionId) : null,
                ordenProduccionId: tipoFiltroId === 2 ? parseInt(ordenProduccionId) : null,
                fechaInicio: tipoFiltroFecha === 1 ? fechaInicio : null,
                fechaFin: tipoFiltroFecha === 1 ? fechaFin : null,
                fechaEspecifica: tipoFiltroFecha === 2 ? fechaEspecifica : null,
                tipoFiltroFecha: tipoFiltroFecha,
                tipoFiltroId: tipoFiltroId,
                page: pageNumber,
                size: size,
            };

            const response = await axios.post<PageResponse>(
                endPoints.historial_dispensacion_filter,
                filtroDTO,
                {
                    withCredentials: true,
                }
            );

            setHasSearched(true);
            if (onSearchResults) {
                onSearchResults(response.data);
            }
        } catch (error: any) {
            console.error('Error al buscar dispensaciones:', error);
            const errorMessage = error.response?.data?.message || 
                error.message || 
                'No se pudieron obtener las dispensaciones';
            
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
            if (onLoadingChange) {
                onLoadingChange(false);
            }
        }
    }, [tipoFiltroId, transaccionId, ordenProduccionId, tipoFiltroFecha, fechaInicio, fechaFin, fechaEspecifica, onSearchResults, onLoadingChange, endPoints, toast, size, validarFormulario]);

    // Re-ejecutar búsqueda cuando cambie la página (solo si ya se hizo una búsqueda previa)
    useEffect(() => {
        if (hasSearched && currentPage !== previousPageRef.current && currentPage >= 0) {
            previousPageRef.current = currentPage;
            handleBuscar(currentPage, true); // skipValidation = true porque ya validamos antes
        }
    }, [currentPage, hasSearched, handleBuscar]);

    // Handler para cuando se hace click en buscar (siempre desde página 0)
    const handleBuscarClick = () => {
        if (onPageChange) {
            onPageChange(0);
        }
        handleBuscar(0);
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
        setErrorMessage('');
        setHasSearched(false);
        if (onPageChange) {
            onPageChange(0);
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
                            <Radio value="1">Filtrar por ID Dispensación</Radio>
                            <Radio value="2">Filtrar por ID de ODP relacionada</Radio>
                        </Stack>
                    </RadioGroup>

                    {tipoFiltroId === 1 && (
                        <FormControl mt={4}>
                            <FormLabel>ID de Dispensación</FormLabel>
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
                            <FormLabel>ID de ODP relacionada</FormLabel>
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
                    <Select
                        value={tipoFiltroFecha.toString()}
                        onChange={(e) => {
                            const value = parseInt(e.target.value) as 0 | 1 | 2;
                            setTipoFiltroFecha(value);
                            setFechaInicio('');
                            setFechaFin('');
                            setFechaEspecifica('');
                        }}
                        maxW="300px"
                    >
                        <option value="0">Ninguno</option>
                        <option value="1">Rango de Fechas</option>
                        <option value="2">Fecha Específica</option>
                    </Select>

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

                {/* Botones de acción */}
                <Flex justify="flex-end" gap={4} mt={4}>
                    <Button colorScheme="gray" onClick={handleLimpiar} isDisabled={loading}>
                        Limpiar
                    </Button>
                    <Button 
                        colorScheme="blue" 
                        onClick={handleBuscarClick}
                        isLoading={loading}
                        loadingText="Buscando..."
                    >
                        Buscar
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
