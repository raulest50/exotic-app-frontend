import { useState } from 'react';
import { useColorModeValue } from "../../../../../components/ui/color-mode";
import {
    Steps,
    Badge,
    Box,
    Button,
    Flex,
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
    Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../../../../api/EndPointsURL.tsx';
import BetterPagination from '../../../../../components/BetterPagination/BetterPagination';
import { AreaProduccion, OrdenProduccionDTO } from '../WizardAveriaProduccion';
import {
    getEstadoDispensacionMaterialesColor,
    getEstadoDispensacionMaterialesLabel,
    getPoliticaDispensacionInicioColor,
    getPoliticaDispensacionInicioLabel,
} from '../../../../Produccion/components/SeguimientoBoardUI';

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
    const toast = useAppToast();
    const selectedRowBg = useColorModeValue('teal.100', 'teal.900');
    const selectedRowHoverBg = useColorModeValue('teal.200', 'teal.800');
    const selectedPanelBorder = useColorModeValue('teal.200', 'teal.600');

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
                <Box p={2} mb={4} bg="app.stepperBlue" borderRadius="md" borderWidth="1px" borderColor="app.cardItemBorderBlue">
                    <Text fontSize="sm">
                        Área seleccionada: <strong>{selectedArea.nombre}</strong> (ID: {selectedArea.areaId})
                    </Text>
                </Box>
            )}

            <VStack gap={4} align="stretch">
                <Field.Root>
                    <Field.Label>Buscar por Lote Asignado</Field.Label>
                    <HStack>
                        <Input
                            value={searchText}
                            onValueChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={onKeyDown_InputBuscar}
                            placeholder="Ingrese número de lote"
                            disabled={isLoading}
                        />
                        <Button
                            colorPalette="blue"
                            onClick={handleSearch}
                            loading={isLoading}
                            loadingText="Buscando"
                        >
                            Buscar
                        </Button>
                    </HStack>
                </Field.Root>

                <Box w="full" overflowX="auto">
                    {ordenes.length > 0 ? (
                        <>
                            <Table.Root variant="simple" size="sm">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Lote Asignado</Table.ColumnHeader>
                                        <Table.ColumnHeader>Producto</Table.ColumnHeader>
                                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                        <Table.ColumnHeader>Materiales</Table.ColumnHeader>
                                        <Table.ColumnHeader>Cantidad a Producir</Table.ColumnHeader>
                                        <Table.ColumnHeader>Fecha Creación</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {currentOrdenes.map((orden) => (
                                        <Table.Row
                                            key={orden.ordenId}
                                            onClick={() => handleRowClick(orden)}
                                            bg={selectedOrdenId === orden.ordenId ? selectedRowBg : 'transparent'}
                                            _hover={{ bg: selectedOrdenId === orden.ordenId ? selectedRowHoverBg : 'app.rowHoverStrong', cursor: 'pointer' }}
                                        >
                                            <Table.Cell>{orden.loteAsignado}</Table.Cell>
                                            <Table.Cell>{orden.productoNombre}</Table.Cell>
                                            <Table.Cell>{getEstadoLabel(orden.estadoOrden)}</Table.Cell>
                                            <Table.Cell>
                                                <Flex gap={2} wrap="wrap">
                                                    <Badge colorPalette={getEstadoDispensacionMaterialesColor(orden.estadoDispensacionMateriales)}>
                                                        {getEstadoDispensacionMaterialesLabel(orden.estadoDispensacionMateriales)}
                                                    </Badge>
                                                    <Badge colorPalette={getPoliticaDispensacionInicioColor(orden.politicaDispensacionInicio)}>
                                                        {getPoliticaDispensacionInicioLabel(orden.politicaDispensacionInicio)}
                                                    </Badge>
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell>{orden.cantidadProducir}</Table.Cell>
                                            <Table.Cell>{orden.fechaCreacion ? new Date(orden.fechaCreacion).toLocaleDateString() : '-'}</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>

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
                        <Text textAlign="center" color="app.textSubtle">
                            No hay órdenes para mostrar. Realice una búsqueda.
                        </Text>
                    )}
                </Box>

                {selectedOrden && (
                    <Box p={3} bg="app.rowSelectedTeal" borderRadius="md" borderWidth="1px" borderColor={selectedPanelBorder}>
                        <Text fontWeight="semibold">
                            Orden seleccionada: {selectedOrden.loteAsignado} — {selectedOrden.productoNombre}
                        </Text>
                        <Text fontSize="sm" color="app.textMuted">
                            Estado: {getEstadoLabel(selectedOrden.estadoOrden)} | Cantidad: {selectedOrden.cantidadProducir}
                        </Text>
                        <Flex mt={2} gap={2} wrap="wrap">
                            <Badge colorPalette={getEstadoDispensacionMaterialesColor(selectedOrden.estadoDispensacionMateriales)}>
                                {getEstadoDispensacionMaterialesLabel(selectedOrden.estadoDispensacionMateriales)}
                            </Badge>
                            <Badge colorPalette={getPoliticaDispensacionInicioColor(selectedOrden.politicaDispensacionInicio)}>
                                {getPoliticaDispensacionInicioLabel(selectedOrden.politicaDispensacionInicio)}
                            </Badge>
                        </Flex>
                    </Box>
                )}

                <Flex gap={4} pt={2}>
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Anterior
                    </Button>
                    <Button
                        colorPalette="blue"
                        onClick={handleSiguiente}
                        disabled={!selectedOrden}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
