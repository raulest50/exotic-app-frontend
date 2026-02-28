import { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    HStack,
    Input,
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
import axios from 'axios';
import EndPointsURL from '../../../../../api/EndPointsURL.tsx';
import BetterPagination from '../../../../../components/BetterPagination/BetterPagination';
import { AreaProduccion, OrdenProduccionDTO } from '../WizardAveriaProduccion';

const endPoints = new EndPointsURL();

interface AveriaProduccionStep1SelectOrderProps {
    setActiveStep: (step: number) => void;
    selectedArea: AreaProduccion | null;
    selectedOrden: OrdenProduccionDTO | null;
    onSelectOrden: (orden: OrdenProduccionDTO | null) => void;
}

const estadoLabels: Record<number, string> = {
    0: 'Abierta',
    11: '1ra Dispensación',
    12: '2da Dispensación',
    13: '3ra Dispensación',
    2: 'Terminada',
    [-1]: 'Cancelada',
};

function getEstadoLabel(estado: number): string {
    return estadoLabels[estado] ?? `Estado ${estado}`;
}

export default function AveriaProduccionStep1SelectOrder({
    setActiveStep,
    selectedArea,
    selectedOrden,
    onSelectOrden,
}: AveriaProduccionStep1SelectOrderProps) {
    const [searchText, setSearchText] = useState('');
    const [ordenes, setOrdenes] = useState<OrdenProduccionDTO[]>([]);
    const [selectedOrdenId, setSelectedOrdenId] = useState<number | null>(selectedOrden?.ordenId ?? null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const toast = useToast();

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(endPoints.search_orden_by_lote, {
                params: { loteAsignado: searchText, page: 0, size: 100 },
            });
            const content = response.data.content ?? response.data;
            setOrdenes(Array.isArray(content) ? content : []);
            setSelectedOrdenId(null);
            onSelectOrden(null);
            setCurrentPage(0);
        } catch (error) {
            console.error('Error searching ordenes:', error);
            toast({
                title: 'Error',
                description: 'Error al buscar órdenes de producción.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const onKeyDown_InputBuscar = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !isLoading) {
            handleSearch();
        }
    };

    const handleRowClick = (orden: OrdenProduccionDTO) => {
        setSelectedOrdenId(orden.ordenId);
        onSelectOrden(orden);
    };

    const handleSiguiente = () => {
        if (selectedOrden) {
            setActiveStep(2);
        }
    };

    const totalPages = Math.ceil(ordenes.length / pageSize);
    const startIndex = currentPage * pageSize;
    const currentOrdenes = ordenes.slice(startIndex, startIndex + pageSize);

    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 2: Selección de Orden de Producción
            </Text>

            {selectedArea && (
                <Box p={2} mb={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
                    <Text fontSize="sm">
                        Área seleccionada: <strong>{selectedArea.nombre}</strong> (ID: {selectedArea.areaId})
                    </Text>
                </Box>
            )}

            <VStack spacing={4} align="stretch">
                <FormControl>
                    <FormLabel>Buscar por Lote Asignado</FormLabel>
                    <HStack>
                        <Input
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={onKeyDown_InputBuscar}
                            placeholder="Ingrese número de lote"
                            isDisabled={isLoading}
                        />
                        <Button
                            colorScheme="blue"
                            onClick={handleSearch}
                            isLoading={isLoading}
                            loadingText="Buscando"
                        >
                            Buscar
                        </Button>
                    </HStack>
                </FormControl>

                <Box w="full" overflowX="auto">
                    {ordenes.length > 0 ? (
                        <>
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Lote Asignado</Th>
                                        <Th>Producto</Th>
                                        <Th>Estado</Th>
                                        <Th>Cantidad a Producir</Th>
                                        <Th>Fecha Creación</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {currentOrdenes.map((orden) => (
                                        <Tr
                                            key={orden.ordenId}
                                            onClick={() => handleRowClick(orden)}
                                            bg={selectedOrdenId === orden.ordenId ? 'teal.100' : 'transparent'}
                                            _hover={{ bg: selectedOrdenId === orden.ordenId ? 'teal.200' : 'gray.100', cursor: 'pointer' }}
                                        >
                                            <Td>{orden.loteAsignado}</Td>
                                            <Td>{orden.productoNombre}</Td>
                                            <Td>{getEstadoLabel(orden.estadoOrden)}</Td>
                                            <Td>{orden.cantidadProducir}</Td>
                                            <Td>{orden.fechaCreacion ? new Date(orden.fechaCreacion).toLocaleDateString() : '-'}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>

                            <BetterPagination
                                page={currentPage}
                                size={pageSize}
                                totalPages={totalPages}
                                loading={isLoading}
                                onPageChange={setCurrentPage}
                                onSizeChange={setPageSize}
                            />
                        </>
                    ) : (
                        <Text textAlign="center" color="gray.500">
                            No hay órdenes para mostrar. Realice una búsqueda.
                        </Text>
                    )}
                </Box>

                {selectedOrden && (
                    <Box p={3} bg="teal.50" borderRadius="md" borderWidth="1px" borderColor="teal.200">
                        <Text fontWeight="semibold">
                            Orden seleccionada: {selectedOrden.loteAsignado} — {selectedOrden.productoNombre}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                            Estado: {getEstadoLabel(selectedOrden.estadoOrden)} | Cantidad: {selectedOrden.cantidadProducir}
                        </Text>
                    </Box>
                )}

                <Flex gap={4} pt={2}>
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Anterior
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleSiguiente}
                        isDisabled={!selectedOrden}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
