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
    useToast,
} from '@chakra-ui/react';
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
    const toast = useToast();

    const selectedIds = new Set(averiaItems.map((i) => i.productoId));

    useEffect(() => {
        if (selectedOrden) {
            fetchItemsDispensados(selectedOrden.ordenId);
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

    const handleSeleccionar = (item: ItemDispensadoAveria) => {
        if (selectedIds.has(item.productoId)) return;
        setAveriaItems([...averiaItems, { ...item, cantidadAveria: 0 }]);
    };

    const handleRemover = (productoId: string) => {
        setAveriaItems(averiaItems.filter((i) => i.productoId !== productoId));
    };

    const handleCantidadChange = (productoId: string, value: number) => {
        setAveriaItems(
            averiaItems.map((i) =>
                i.productoId === productoId ? { ...i, cantidadAveria: value } : i,
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
                <Box p={2} mb={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
                    <Text fontSize="sm">
                        Área: <strong>{selectedArea.nombre}</strong> | Orden:{' '}
                        <strong>{selectedOrden.loteAsignado}</strong> — {selectedOrden.productoNombre}
                    </Text>
                </Box>
            )}

            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                {/* Left panel */}
                <Box borderWidth="1px" borderRadius="md" p={3}>
                    <Heading size="sm" mb={3}>
                        Materiales Dispensados
                    </Heading>
                    {isLoading ? (
                        <Text color="gray.500" textAlign="center">Cargando...</Text>
                    ) : itemsDispensados.length > 0 ? (
                        <Box overflowX="auto">
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Producto</Th>
                                        <Th isNumeric>Dispensada</Th>
                                        <Th isNumeric>Averiada</Th>
                                        <Th isNumeric>Disponible</Th>
                                        <Th w="50px"></Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {itemsDispensados.map((item) => {
                                        const isSelected = selectedIds.has(item.productoId);
                                        return (
                                            <Tr
                                                key={item.productoId}
                                                opacity={isSelected ? 0.5 : 1}
                                            >
                                                <Td>
                                                    <Text fontSize="sm">{item.productoNombre}</Text>
                                                    <Text fontSize="xs" color="gray.500">{item.tipoUnidades}</Text>
                                                </Td>
                                                <Td isNumeric>{item.cantidadDispensada}</Td>
                                                <Td isNumeric>{item.cantidadAveriadaPrevia}</Td>
                                                <Td isNumeric fontWeight="semibold">{item.cantidadDisponibleAveria}</Td>
                                                <Td>
                                                    <IconButton
                                                        aria-label="Seleccionar"
                                                        icon={<FiArrowRight />}
                                                        size="sm"
                                                        colorScheme="teal"
                                                        variant="ghost"
                                                        isDisabled={isSelected}
                                                        onClick={() => handleSeleccionar(item)}
                                                    />
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </Box>
                    ) : (
                        <Text color="gray.500" textAlign="center">
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
                        <VStack spacing={3} align="stretch">
                            {averiaItems.map((item) => (
                                <Box
                                    key={item.productoId}
                                    p={3}
                                    borderWidth="1px"
                                    borderRadius="md"
                                    borderColor="teal.200"
                                    bg="teal.50"
                                >
                                    <Flex justify="space-between" align="start" mb={2}>
                                        <Box>
                                            <Text fontSize="sm" fontWeight="semibold">
                                                {item.productoNombre}
                                            </Text>
                                            <Text fontSize="xs" color="gray.500">
                                                Disponible: {item.cantidadDisponibleAveria} {item.tipoUnidades}
                                            </Text>
                                        </Box>
                                        <IconButton
                                            aria-label="Eliminar"
                                            icon={<FiX />}
                                            size="sm"
                                            colorScheme="red"
                                            variant="ghost"
                                            onClick={() => handleRemover(item.productoId)}
                                        />
                                    </Flex>
                                    <Flex align="center" gap={2}>
                                        <Text fontSize="sm" whiteSpace="nowrap">Cant. Avería:</Text>
                                        <NumberInput
                                            size="sm"
                                            min={0.01}
                                            max={item.cantidadDisponibleAveria}
                                            step={0.01}
                                            precision={2}
                                            value={item.cantidadAveria || ''}
                                            onChange={(_, val) => handleCantidadChange(item.productoId, val)}
                                        >
                                            <NumberInputField />
                                            <NumberInputStepper>
                                                <NumberIncrementStepper />
                                                <NumberDecrementStepper />
                                            </NumberInputStepper>
                                        </NumberInput>
                                    </Flex>
                                    {item.cantidadAveria > item.cantidadDisponibleAveria && (
                                        <Text fontSize="xs" color="red.500" mt={1}>
                                            Excede la cantidad disponible ({item.cantidadDisponibleAveria})
                                        </Text>
                                    )}
                                </Box>
                            ))}
                        </VStack>
                    ) : (
                        <Text color="gray.500" textAlign="center">
                            Seleccione materiales del panel izquierdo.
                        </Text>
                    )}
                </Box>
            </SimpleGrid>

            <Flex gap={4} pt={4}>
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                    Anterior
                </Button>
                <Button
                    colorScheme="blue"
                    onClick={handleSiguiente}
                    isDisabled={!esValidoReporteAveria()}
                >
                    Siguiente
                </Button>
            </Flex>
        </Box>
    );
}
