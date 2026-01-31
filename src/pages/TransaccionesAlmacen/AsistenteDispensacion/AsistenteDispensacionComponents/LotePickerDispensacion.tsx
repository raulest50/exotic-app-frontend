import {useState, useEffect} from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    Flex,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    IconButton,
    Text,
    Box,
    HStack,
    useToast,
    Spinner,
    Alert,
    AlertIcon,
    Select,
    FormControl
} from '@chakra-ui/react';
import {AddIcon, DeleteIcon, RepeatIcon} from '@chakra-ui/icons';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL';
import {LoteSeleccionado} from '../../types';
import CustomDecimalInput from '../../../../components/CustomDecimalInput/CustomDecimalInput';

interface LoteRecomendadoDTO {
    loteId: number;
    batchNumber: string;
    productionDate?: string | null;
    expirationDate?: string | null;
    cantidadDisponible: number;
    cantidadRecomendada: number;
}

interface LoteDisponiblePageResponse {
    productoId: string;
    nombreProducto: string;
    lotesDisponibles: LoteRecomendadoDTO[];
    totalPages: number;
    totalElements: number;
    currentPage: number;
    size: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAccept: (lotesSeleccionados: LoteSeleccionado[]) => void;
    productoId: string;
    productoNombre: string;
    cantidadRequerida: number;
}

export function LotePickerDispensacion({
    isOpen,
    onClose,
    onAccept,
    productoId,
    productoNombre,
    cantidadRequerida
}: Props) {
    const [lotesDisponibles, setLotesDisponibles] = useState<LoteRecomendadoDTO[]>([]);
    const [lotesSeleccionados, setLotesSeleccionados] = useState<LoteSeleccionado[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [size, setSize] = useState(10);
    const toast = useToast();
    const endpoints = new EndPointsURL();

    // Cargar lotes disponibles cuando se abre el modal
    useEffect(() => {
        if (isOpen && productoId) {
            fetchLotesDisponibles(0, size);
        }
    }, [isOpen, productoId]);

    // Resetear estado cuando se cierra el modal
    useEffect(() => {
        if (!isOpen) {
            setLotesSeleccionados([]);
            setCurrentPage(0);
        }
    }, [isOpen]);

    const fetchLotesDisponibles = async (page: number, pageSize?: number) => {
        setLoading(true);
        try {
            const currentSize = pageSize || size;
            // Construir URL con query params
            const url = `${endpoints.lotes_disponibles_paginados}?productoId=${productoId}&page=${page}&size=${currentSize}`;
            const resp = await axios.get<LoteDisponiblePageResponse>(url, {withCredentials: true});
            
            setLotesDisponibles(resp.data.lotesDisponibles);
            setTotalPages(resp.data.totalPages);
            setTotalElements(resp.data.totalElements);
            setCurrentPage(resp.data.currentPage);
        } catch (err) {
            toast({
                title: 'Error al cargar lotes',
                description: 'No se pudieron cargar los lotes disponibles',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < totalPages) {
            fetchLotesDisponibles(newPage, size);
        }
    };

    const handleRefresh = () => {
        fetchLotesDisponibles(currentPage, size);
    };

    const handleSizeChange = (newSize: number) => {
        setSize(newSize);
        setCurrentPage(0); // Resetear a la primera página cuando cambia el tamaño
        fetchLotesDisponibles(0, newSize);
    };

    const handleAgregarLote = (lote: LoteRecomendadoDTO) => {
        // Verificar si el lote ya está seleccionado
        if (lotesSeleccionados.some(ls => ls.loteId === lote.loteId)) {
            return; // No hacer nada si ya está seleccionado
        }

        const nuevoLoteSeleccionado: LoteSeleccionado = {
            loteId: lote.loteId,
            batchNumber: lote.batchNumber,
            cantidad: 0,
            cantidadDisponible: lote.cantidadDisponible,
            productionDate: lote.productionDate || null,
            expirationDate: lote.expirationDate || null
        };

        setLotesSeleccionados([...lotesSeleccionados, nuevoLoteSeleccionado]);
    };

    const handleRemoverLote = (loteId: number) => {
        setLotesSeleccionados(lotesSeleccionados.filter(ls => ls.loteId !== loteId));
    };

    const handleCantidadChange = (loteId: number, cantidad: number) => {
        if (cantidad < 0) return;
        
        setLotesSeleccionados(lotesSeleccionados.map(ls => {
            if (ls.loteId === loteId) {
                // No permitir cantidad mayor a la disponible
                const cantidadFinal = Math.min(cantidad, ls.cantidadDisponible);
                return {...ls, cantidad: cantidadFinal};
            }
            return ls;
        }));
    };

    const calcularSumaCantidades = (): number => {
        return lotesSeleccionados.reduce((suma, ls) => suma + ls.cantidad, 0);
    };

    const sumaCantidades = calcularSumaCantidades();
    const cantidadExcede = sumaCantidades - cantidadRequerida > 0.01; // Tolerancia para comparación de decimales

    const handleAceptar = () => {
        if (!cantidadExcede) {
            onAccept(lotesSeleccionados);
            onClose();
        }
    };

    const formatDate = (date: string | null | undefined): string => {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleDateString('es-ES');
        } catch {
            return 'N/A';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Definir Lotes - {productoNombre}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Flex direction="column" gap={4}>
                        <Text fontSize="sm" color="gray.600">
                            Cantidad requerida: <strong>{cantidadRequerida.toFixed(2)}</strong> ·
                            Seleccionada: <strong>{sumaCantidades.toFixed(2)}</strong>
                        </Text>
                        {cantidadExcede && (
                            <Alert status="warning" size="sm">
                                <AlertIcon />
                                La cantidad seleccionada no puede superar la requerida.
                            </Alert>
                        )}
                        
                        <Flex gap={4} direction={{base: 'column', lg: 'row'}}>
                            {/* Panel Izquierdo: Lotes Disponibles */}
                            <Box flex="1" borderWidth="1px" borderRadius="md" p={4}>
                                <Flex justify="space-between" align="center" mb={3}>
                                    <Text fontWeight="bold">Lotes Disponibles</Text>
                                    <HStack spacing={2}>
                                        <FormControl width="auto" minW="120px">
                                            <Select
                                                size="sm"
                                                value={size}
                                                onChange={(e) => handleSizeChange(parseInt(e.target.value))}
                                            >
                                                <option value={5}>5 por página</option>
                                                <option value={10}>10 por página</option>
                                                <option value={20}>20 por página</option>
                                                <option value={50}>50 por página</option>
                                            </Select>
                                        </FormControl>
                                        <IconButton
                                            aria-label="Actualizar lista"
                                            icon={<RepeatIcon />}
                                            size="sm"
                                            colorScheme="blue"
                                            onClick={handleRefresh}
                                            isLoading={loading}
                                        />
                                    </HStack>
                                </Flex>
                                {loading ? (
                                    <Flex justify="center" align="center" minH="200px">
                                        <Spinner size="xl" />
                                    </Flex>
                                ) : (
                                    <>
                                        <Box overflowX="auto">
                                            <Table size="sm">
                                                <Thead>
                                                    <Tr>
                                                        <Th>Batch Number</Th>
                                                        <Th>Cantidad Disponible</Th>
                                                        <Th>Fecha Producción</Th>
                                                        <Th>Fecha Vencimiento</Th>
                                                        <Th>Acción</Th>
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {lotesDisponibles.length === 0 ? (
                                                        <Tr>
                                                            <Td colSpan={5} textAlign="center" py={4}>
                                                                <Text>No hay lotes disponibles</Text>
                                                            </Td>
                                                        </Tr>
                                                    ) : (
                                                        lotesDisponibles.map((lote) => (
                                                            <Tr key={lote.loteId}>
                                                                <Td>{lote.batchNumber}</Td>
                                                                <Td>{lote.cantidadDisponible.toFixed(2)}</Td>
                                                                <Td>{formatDate(lote.productionDate)}</Td>
                                                                <Td>{formatDate(lote.expirationDate)}</Td>
                                                                <Td>
                                                                    <IconButton
                                                                        aria-label="Agregar lote"
                                                                        icon={<AddIcon />}
                                                                        size="sm"
                                                                        colorScheme="teal"
                                                                        onClick={() => handleAgregarLote(lote)}
                                                                        isDisabled={lotesSeleccionados.some(ls => ls.loteId === lote.loteId)}
                                                                    />
                                                                </Td>
                                                            </Tr>
                                                        ))
                                                    )}
                                                </Tbody>
                                            </Table>
                                        </Box>
                                        
                                        {/* Paginación */}
                                        {totalPages > 1 && (
                                            <HStack justify="center" mt={4} spacing={2}>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                    isDisabled={currentPage === 0}
                                                >
                                                    Anterior
                                                </Button>
                                                <Text fontSize="sm">
                                                    Página {currentPage + 1} de {totalPages} ({totalElements} lotes)
                                                </Text>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                    isDisabled={currentPage >= totalPages - 1}
                                                >
                                                    Siguiente
                                                </Button>
                                            </HStack>
                                        )}
                                    </>
                                )}
                            </Box>

                            {/* Panel Derecho: Lotes Seleccionados */}
                            <Box flex="1" borderWidth="1px" borderRadius="md" p={4}>
                                <Text fontWeight="bold" mb={3}>Lotes Seleccionados</Text>
                                {lotesSeleccionados.length === 0 ? (
                                    <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
                                        No hay lotes seleccionados
                                    </Text>
                                ) : (
                                    <>
                                        <Box overflowX="auto">
                                            <Table size="sm">
                                                <Thead>
                                                    <Tr>
                                                        <Th>Batch Number</Th>
                                                        <Th>Cantidad Disponible</Th>
                                                        <Th>Cantidad a Tomar</Th>
                                                        <Th>Acción</Th>
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {lotesSeleccionados.map((lote) => (
                                                        <Tr key={lote.loteId}>
                                                            <Td>{lote.batchNumber}</Td>
                                                            <Td>{lote.cantidadDisponible.toFixed(2)}</Td>
                                                            <Td>
                                                                <CustomDecimalInput
                                                                    value={lote.cantidad}
                                                                    onChange={(v) => handleCantidadChange(lote.loteId, Math.min(v, lote.cantidadDisponible))}
                                                                    min={0}
                                                                    size="sm"
                                                                    width="100px"
                                                                    placeholder="0.00"
                                                                    maxDecimals={4}
                                                                />
                                                            </Td>
                                                            <Td>
                                                                <IconButton
                                                                    aria-label="Remover lote"
                                                                    icon={<DeleteIcon />}
                                                                    size="sm"
                                                                    colorScheme="red"
                                                                    onClick={() => handleRemoverLote(lote.loteId)}
                                                                />
                                                            </Td>
                                                        </Tr>
                                                    ))}
                                                </Tbody>
                                            </Table>
                                        </Box>
                                        
                                        <Box mt={4}>
                                            <Text fontSize="sm">
                                                Suma total: <strong>{sumaCantidades.toFixed(2)}</strong>
                                            </Text>
                                            {cantidadExcede && (
                                                <Alert status="warning" mt={2} size="sm">
                                                    <AlertIcon />
                                                    La suma de cantidades ({sumaCantidades.toFixed(2)}) no puede superar la cantidad requerida ({cantidadRequerida.toFixed(2)}).
                                                </Alert>
                                            )}
                                        </Box>
                                    </>
                                )}
                            </Box>
                        </Flex>
                    </Flex>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        colorScheme="teal"
                        onClick={handleAceptar}
                        isDisabled={cantidadExcede}
                    >
                        Aceptar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
