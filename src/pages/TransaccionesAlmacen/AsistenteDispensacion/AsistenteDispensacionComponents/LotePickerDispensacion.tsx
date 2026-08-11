import {useState, useEffect} from 'react';
import { CloseButton, Button, Flex, Table, IconButton, Text, Box, HStack, Spinner, Alert, NativeSelect, Field, Dialog, Portal } from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL';
import {LoteSeleccionado} from '../../types';
import CustomDecimalInput from '../../../../components/CustomDecimalInput/CustomDecimalInput';
import { LuPlus, LuRepeat, LuTrash2 } from 'react-icons/lu';

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
    const toast = useAppToast();
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
        <Dialog.Root open={isOpen} size='xl' placement='center' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW="6xl">
                        <Dialog.Header><Dialog.Title>Definir Lotes - {productoNombre}</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
                            <Flex direction="column" gap={4}>
                                <Text fontSize="sm" color="app.textMuted">
                                    Cantidad requerida: <strong>{cantidadRequerida.toFixed(2)}</strong> ·
                                    Seleccionada: <strong>{sumaCantidades.toFixed(2)}</strong>
                                </Text>
                                {cantidadExcede && (
                                    <Alert.Root status="warning" size="sm">
                                        <Alert.Indicator />
                                        La cantidad seleccionada no puede superar la requerida.
                                    </Alert.Root>
                                )}
                                
                                <Flex gap={4} direction={{base: 'column', lg: 'row'}}>
                                    {/* Panel Izquierdo: Lotes Disponibles */}
                                    <Box flex="1" borderWidth="1px" borderRadius="md" p={4}>
                                        <Flex justify="space-between" align="center" mb={3}>
                                            <Text fontWeight="bold">Lotes Disponibles</Text>
                                            <HStack gap={2}>
                                                <Field.Root width="auto" minW="120px">
                                                    <NativeSelect.Root size="sm">
                                                        <NativeSelect.Field
                                                            value={size}
                                                            onChange={(e) => handleSizeChange(parseInt(e.target.value))}>
                                                            <option value={5}>5 por página</option>
                                                            <option value={10}>10 por página</option>
                                                            <option value={20}>20 por página</option>
                                                            <option value={50}>50 por página</option>
                                                        </NativeSelect.Field>
                                                        <NativeSelect.Indicator />
                                                    </NativeSelect.Root>
                                                </Field.Root>
                                                <IconButton
                                                    aria-label="Actualizar lista"
                                                    size="sm"
                                                    colorPalette="blue"
                                                    onClick={handleRefresh}
                                                    loading={loading}><LuRepeat /></IconButton>
                                            </HStack>
                                        </Flex>
                                        {loading ? (
                                            <Flex justify="center" align="center" minH="200px">
                                                <Spinner size="xl" />
                                            </Flex>
                                        ) : (
                                            <>
                                                <Box overflowX="auto">
                                                    <Table.Root size="sm">
                                                        <Table.Header>
                                                            <Table.Row>
                                                                <Table.ColumnHeader>Batch Number</Table.ColumnHeader>
                                                                <Table.ColumnHeader>Cantidad Disponible</Table.ColumnHeader>
                                                                <Table.ColumnHeader>Fecha Producción</Table.ColumnHeader>
                                                                <Table.ColumnHeader>Fecha Vencimiento</Table.ColumnHeader>
                                                                <Table.ColumnHeader>Acción</Table.ColumnHeader>
                                                            </Table.Row>
                                                        </Table.Header>
                                                        <Table.Body>
                                                            {lotesDisponibles.length === 0 ? (
                                                                <Table.Row>
                                                                    <Table.Cell colSpan={5} textAlign="center" py={4}>
                                                                        <Text>No hay lotes disponibles</Text>
                                                                    </Table.Cell>
                                                                </Table.Row>
                                                            ) : (
                                                                lotesDisponibles.map((lote) => (
                                                                    <Table.Row key={lote.loteId}>
                                                                        <Table.Cell>{lote.batchNumber}</Table.Cell>
                                                                        <Table.Cell>{lote.cantidadDisponible.toFixed(2)}</Table.Cell>
                                                                        <Table.Cell>{formatDate(lote.productionDate)}</Table.Cell>
                                                                        <Table.Cell>{formatDate(lote.expirationDate)}</Table.Cell>
                                                                        <Table.Cell>
                                                                            <IconButton
                                                                                aria-label="Agregar lote"
                                                                                size="sm"
                                                                                colorPalette="teal"
                                                                                onClick={() => handleAgregarLote(lote)}
                                                                                disabled={lotesSeleccionados.some(ls => ls.loteId === lote.loteId)}><LuPlus /></IconButton>
                                                                        </Table.Cell>
                                                                    </Table.Row>
                                                                ))
                                                            )}
                                                        </Table.Body>
                                                    </Table.Root>
                                                </Box>
                                                
                                                {/* Paginación */}
                                                {totalPages > 1 && (
                                                    <HStack justify="center" mt={4} gap={2}>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                            disabled={currentPage === 0}
                                                        >
                                                            Anterior
                                                        </Button>
                                                        <Text fontSize="sm">
                                                            Página {currentPage + 1} de {totalPages} ({totalElements} lotes)
                                                        </Text>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                            disabled={currentPage >= totalPages - 1}
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
                                            <Text fontSize="sm" color="app.textSubtle" textAlign="center" py={8}>
                                                No hay lotes seleccionados
                                            </Text>
                                        ) : (
                                            <>
                                                <Box overflowX="auto">
                                                    <Table.Root size="sm">
                                                        <Table.Header>
                                                            <Table.Row>
                                                                <Table.ColumnHeader>Batch Number</Table.ColumnHeader>
                                                                <Table.ColumnHeader>Cantidad Disponible</Table.ColumnHeader>
                                                                <Table.ColumnHeader>Cantidad a Tomar</Table.ColumnHeader>
                                                                <Table.ColumnHeader>Acción</Table.ColumnHeader>
                                                            </Table.Row>
                                                        </Table.Header>
                                                        <Table.Body>
                                                            {lotesSeleccionados.map((lote) => (
                                                                <Table.Row key={lote.loteId}>
                                                                    <Table.Cell>{lote.batchNumber}</Table.Cell>
                                                                    <Table.Cell>{lote.cantidadDisponible.toFixed(2)}</Table.Cell>
                                                                    <Table.Cell>
                                                                        <CustomDecimalInput
                                                                            value={lote.cantidad}
                                                                            onChange={(v) => handleCantidadChange(lote.loteId, Math.min(v, lote.cantidadDisponible))}
                                                                            min={0}
                                                                            size="sm"
                                                                            width="100px"
                                                                            placeholder="0.00"
                                                                            maxDecimals={4}
                                                                        />
                                                                    </Table.Cell>
                                                                    <Table.Cell>
                                                                        <IconButton
                                                                            aria-label="Remover lote"
                                                                            size="sm"
                                                                            colorPalette="red"
                                                                            onClick={() => handleRemoverLote(lote.loteId)}><LuTrash2 /></IconButton>
                                                                    </Table.Cell>
                                                                </Table.Row>
                                                            ))}
                                                        </Table.Body>
                                                    </Table.Root>
                                                </Box>
                                                
                                                <Box mt={4}>
                                                    <Text fontSize="sm">
                                                        Suma total: <strong>{sumaCantidades.toFixed(2)}</strong>
                                                    </Text>
                                                    {cantidadExcede && (
                                                        <Alert.Root status="warning" mt={2} size="sm">
                                                            <Alert.Indicator />
                                                            La suma de cantidades ({sumaCantidades.toFixed(2)}) no puede superar la cantidad requerida ({cantidadRequerida.toFixed(2)}).
                                                        </Alert.Root>
                                                    )}
                                                </Box>
                                            </>
                                        )}
                                    </Box>
                                </Flex>
                            </Flex>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="ghost" mr={3} onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                colorPalette="teal"
                                onClick={handleAceptar}
                                disabled={cantidadExcede}
                            >
                                Aceptar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
