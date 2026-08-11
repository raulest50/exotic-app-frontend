import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Heading,
    IconButton,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    SimpleGrid,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    VStack,
    Separator,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import { FiArrowRight, FiX } from 'react-icons/fi';
import axios from 'axios';
import EndPointsURL from '../../../../../api/EndPointsURL.tsx';
import {
    AreaProduccion,
    OrdenProduccionDTO,
    ItemDispensadoAveria,
    AveriaItemSeleccionado,
} from '../WizardAveriaProduccion';

const endPoints = new EndPointsURL();

interface HistorialAveriaItem {
    productoId: string;
    productoNombre: string;
    tipoUnidades: string;
    cantidadAveria: number;
}

interface HistorialAveria {
    transaccionId: number;
    fechaTransaccion: string;
    observaciones: string | null;
    usuarioAprobador: string | null;
    items: HistorialAveriaItem[];
}

interface AveriaProduccionStep2ListAveriasProps {
    setActiveStep: (step: number) => void;
    selectedArea: AreaProduccion | null;
    selectedOrden: OrdenProduccionDTO | null;
    averiaItems: AveriaItemSeleccionado[];
    setAveriaItems: (items: AveriaItemSeleccionado[]) => void;
}

export default function AveriaProduccionStep2ListAverias({
    setActiveStep,
    selectedArea,
    selectedOrden,
    averiaItems,
    setAveriaItems,
}: AveriaProduccionStep2ListAveriasProps) {
    const [itemsDispensados, setItemsDispensados] = useState<ItemDispensadoAveria[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [historialAverias, setHistorialAverias] = useState<HistorialAveria[]>([]);
    const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);
    const toast = useAppToast();

    const itemKey = (i: { productoId: string; loteId: number }) => `${i.productoId}|${i.loteId}`;
    const selectedKeys = new Set(averiaItems.map((i) => itemKey(i)));

    useEffect(() => {
        if (selectedOrden) {
            fetchItemsDispensados(selectedOrden.ordenId);
            fetchHistorialAverias(selectedOrden.ordenId);
        }
    }, [selectedOrden]);

    const fetchItemsDispensados = async (ordenId: number) => {
        setIsLoading(true);
        try {
            const url = endPoints.averias_items_dispensados.replace(
                '{ordenProduccionId}',
                String(ordenId),
            );
            const response = await axios.get(url);
            setItemsDispensados(response.data);
        } catch (error) {
            console.error('Error fetching items dispensados:', error);
            toast({
                title: 'Error',
                description: 'Error al cargar los materiales dispensados.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistorialAverias = async (ordenId: number) => {
        setIsLoadingHistorial(true);
        try {
            const url = endPoints.averias_historial.replace(
                '{ordenProduccionId}',
                String(ordenId),
            );
            const response = await axios.get(url);
            setHistorialAverias(response.data);
        } catch (error) {
            console.error('Error fetching historial averías:', error);
        } finally {
            setIsLoadingHistorial(false);
        }
    };

    const handleSeleccionar = (item: ItemDispensadoAveria) => {
        if (selectedKeys.has(itemKey(item))) return;
        setAveriaItems([...averiaItems, { ...item, cantidadAveria: 0 }]);
    };

    const handleRemover = (key: string) => {
        setAveriaItems(averiaItems.filter((i) => itemKey(i) !== key));
    };

    const handleCantidadChange = (key: string, value: number) => {
        setAveriaItems(
            averiaItems.map((i) =>
                itemKey(i) === key ? { ...i, cantidadAveria: value } : i,
            ),
        );
    };

    const esValidoReporteAveria = (): boolean => {
        if (averiaItems.length === 0) return false;
        return averiaItems.every(
            (i) => i.cantidadAveria > 0 && i.cantidadAveria <= i.cantidadDisponibleAveria,
        );
    };

    const handleSiguiente = () => {
        if (esValidoReporteAveria()) {
            setActiveStep(3);
        }
    };

    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 3: Selección de Materiales Averiados
            </Text>

            {selectedArea && selectedOrden && (
                <Box p={2} mb={4} bg="app.stepperBlue" borderRadius="md" borderWidth="1px" borderColor="app.cardItemBorderBlue">
                    <Text fontSize="sm">
                        Área: <strong>{selectedArea.nombre}</strong> | Orden:{' '}
                        <strong>{selectedOrden.loteAsignado}</strong> — {selectedOrden.productoNombre}
                    </Text>
                </Box>
            )}

            <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                {/* Left panel */}
                <Box borderWidth="1px" borderRadius="md" p={3}>
                    <Heading size="sm" mb={3}>
                        Materiales Dispensados
                    </Heading>
                    {isLoading ? (
                        <Text color="app.textSubtle" textAlign="center">Cargando...</Text>
                    ) : itemsDispensados.length > 0 ? (
                        <Box overflowX="auto">
                            <Table.Root variant="simple" size="sm">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Producto</Table.ColumnHeader>
                                        <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Dispensada</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Averiada</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Disponible</Table.ColumnHeader>
                                        <Table.ColumnHeader w="50px"></Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {itemsDispensados.map((item) => {
                                        const key = itemKey(item);
                                        const isSelected = selectedKeys.has(key);
                                        return (
                                            <Table.Row
                                                key={key}
                                                opacity={isSelected ? 0.5 : 1}
                                            >
                                                <Table.Cell>
                                                    <Text fontSize="sm">{item.productoNombre}</Text>
                                                    <Text fontSize="xs" color="app.textSubtle">{item.tipoUnidades}</Text>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Text fontSize="sm">{item.batchNumber}</Text>
                                                </Table.Cell>
                                                <Table.Cell textAlign='end'>{item.cantidadDispensada}</Table.Cell>
                                                <Table.Cell textAlign='end'>{item.cantidadAveriadaPrevia}</Table.Cell>
                                                <Table.Cell fontWeight="semibold" textAlign='end'>{item.cantidadDisponibleAveria}</Table.Cell>
                                                <Table.Cell>
                                                    <IconButton
                                                        aria-label="Seleccionar"
                                                        size="sm"
                                                        colorPalette="teal"
                                                        variant="ghost"
                                                        disabled={isSelected}
                                                        onClick={() => handleSeleccionar(item)}><FiArrowRight /></IconButton>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table.Root>
                        </Box>
                    ) : (
                        <Text color="app.textSubtle" textAlign="center">
                            No hay materiales dispensados para esta orden.
                        </Text>
                    )}
                </Box>

                {/* Right panel */}
                <Box borderWidth="1px" borderRadius="md" p={3}>
                    <Heading size="sm" mb={3}>
                        Items a Reportar Avería
                    </Heading>
                    {averiaItems.length > 0 ? (
                        <VStack gap={3} align="stretch">
                            {averiaItems.map((item) => {
                                const key = itemKey(item);
                                return (
                                    <Box
                                        key={key}
                                        p={3}
                                        borderWidth="1px"
                                        borderRadius="md"
                                        borderColor="app.cardItemHover"
                                        bg="app.rowSelectedTeal"
                                    >
                                        <Flex justify="space-between" align="start" mb={2}>
                                            <Box>
                                                <Text fontSize="sm" fontWeight="semibold">
                                                    {item.productoNombre}
                                                </Text>
                                                <Text fontSize="xs" color="app.textSubtle">
                                                    Lote: {item.batchNumber} | Disponible: {item.cantidadDisponibleAveria} {item.tipoUnidades}
                                                </Text>
                                            </Box>
                                            <IconButton
                                                aria-label="Eliminar"
                                                size="sm"
                                                colorPalette="red"
                                                variant="ghost"
                                                onClick={() => handleRemover(key)}><FiX /></IconButton>
                                        </Flex>
                                        <Flex align="center" gap={2}>
                                            <Text fontSize="sm" whiteSpace="nowrap">Cant. Avería:</Text>
                                            <NumberInput.Root
                                                size="sm"
                                                min={0.01}
                                                max={item.cantidadDisponibleAveria}
                                                step={0.01}
                                                precision={2}
                                                value={String(item.cantidadAveria || '')}
                                                onValueChange={(_, val) => handleCantidadChange(key, val)}
                                            >
                                                <NumberInput.Input />
                                                <NumberInput.Control>
                                                    <NumberInput.IncrementTrigger />
                                                    <NumberInput.DecrementTrigger />
                                                </NumberInput.Control>
                                            </NumberInput.Root>
                                        </Flex>
                                        {item.cantidadAveria > item.cantidadDisponibleAveria && (
                                            <Text fontSize="xs" color="red.500" mt={1}>
                                                Excede la cantidad disponible ({item.cantidadDisponibleAveria})
                                            </Text>
                                        )}
                                    </Box>
                                );
                            })}
                        </VStack>
                    ) : (
                        <Text color="app.textSubtle" textAlign="center">
                            Seleccione materiales del panel izquierdo.
                        </Text>
                    )}
                </Box>
            </SimpleGrid>

            {/* Historial de averías reportadas */}
            <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
                <Heading size="sm" mb={3}>
                    Averías Reportadas Anteriormente
                </Heading>
                {isLoadingHistorial ? (
                    <Text color="app.textSubtle" textAlign="center">Cargando historial...</Text>
                ) : historialAverias.length > 0 ? (
                    <VStack gap={0} align="stretch" separator={<Separator />}>
                        {historialAverias.map((tx) => (
                            <Box key={tx.transaccionId} py={3}>
                                <Flex gap={4} mb={2} wrap="wrap" fontSize="sm">
                                    <Text>
                                        <strong>Fecha:</strong>{' '}
                                        {new Date(tx.fechaTransaccion).toLocaleString()}
                                    </Text>
                                    {tx.usuarioAprobador && (
                                        <Text>
                                            <strong>Usuario:</strong> {tx.usuarioAprobador}
                                        </Text>
                                    )}
                                    {tx.observaciones && (
                                        <Text>
                                            <strong>Obs:</strong> {tx.observaciones}
                                        </Text>
                                    )}
                                </Flex>
                                <Box overflowX="auto">
                                    <Table.Root size="sm" variant="simple">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.ColumnHeader>Producto</Table.ColumnHeader>
                                                <Table.ColumnHeader>Unidades</Table.ColumnHeader>
                                                <Table.ColumnHeader textAlign='end'>Cantidad Avería</Table.ColumnHeader>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {tx.items.map((item) => (
                                                <Table.Row key={item.productoId}>
                                                    <Table.Cell fontSize="sm">{item.productoNombre}</Table.Cell>
                                                    <Table.Cell fontSize="sm">{item.tipoUnidades}</Table.Cell>
                                                    <Table.Cell fontSize="sm" textAlign='end'>{item.cantidadAveria}</Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                    </Table.Root>
                                </Box>
                            </Box>
                        ))}
                    </VStack>
                ) : (
                    <Text color="app.textSubtle" textAlign="center">
                        No hay averías reportadas para esta orden.
                    </Text>
                )}
            </Box>

            <Flex gap={4} pt={4}>
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                    Anterior
                </Button>
                <Button
                    colorPalette="blue"
                    onClick={handleSiguiente}
                    disabled={!esValidoReporteAveria()}
                >
                    Siguiente
                </Button>
            </Flex>
        </Box>
    );
}
