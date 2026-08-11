import { useState } from 'react';
import { useColorModeValue } from "../../../../../components/ui/color-mode";
import {
    Steps,
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
    useToast,
    Field,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../../../api/EndPointsURL.tsx';
import BetterPagination from '../../../../../components/BetterPagination/BetterPagination';
import { AreaProduccion } from '../WizardAveriaProduccion';

const endPoints = new EndPointsURL();

interface SearchAreaProduccionDTO {
    nombre: string;
}

interface AveriaProduccionStep0SelectAreaProps {
    setActiveStep: (step: number) => void;
    selectedArea: AreaProduccion | null;
    onSelectArea: (area: AreaProduccion | null) => void;
}

export default function AveriaProduccionStep0SelectArea({
    setActiveStep,
    selectedArea,
    onSelectArea,
}: AveriaProduccionStep0SelectAreaProps) {
    const [searchText, setSearchText] = useState('');
    const [areas, setAreas] = useState<AreaProduccion[]>([]);
    const [selectedAreaId, setSelectedAreaId] = useState<number | null>(selectedArea?.areaId ?? null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const toast = useToast();
    const selectedRowBg = useColorModeValue('teal.100', 'teal.900');
    const selectedRowHoverBg = useColorModeValue('teal.200', 'teal.800');
    const selectedPanelBorder = useColorModeValue('teal.200', 'teal.600');

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const searchDTO: SearchAreaProduccionDTO = { nombre: searchText };
            const response = await axios.post(endPoints.area_prod_search_by_name, searchDTO, {
                params: { page: 0, size: 100 },
            });
            setAreas(response.data);
            setSelectedAreaId(null);
            onSelectArea(null);
            setCurrentPage(0);
        } catch (error) {
            console.error('Error searching Areas:', error);
            toast({
                title: 'Error',
                description: 'Error al buscar áreas de producción.',
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

    const handleRowClick = (area: AreaProduccion) => {
        setSelectedAreaId(area.areaId);
        onSelectArea(area);
    };

    const handleSiguiente = () => {
        if (selectedArea) {
            setActiveStep(1);
        }
    };

    const totalPages = Math.ceil(areas.length / pageSize);
    const startIndex = currentPage * pageSize;
    const currentAreas = areas.slice(startIndex, startIndex + pageSize);

    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 1: Selección de Área Operativa
            </Text>

            <VStack gap={4} align="stretch">
                {/* Search section */}
                <Field.Root>
                    <Field.Label>Buscar Área de Producción</Field.Label>
                    <HStack>
                        <Input
                            value={searchText}
                            onValueChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={onKeyDown_InputBuscar}
                            placeholder="Ingrese nombre del área"
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

                {/* Results table */}
                <Box w="full" overflowX="auto">
                    {areas.length > 0 ? (
                        <>
                            <Table.Root variant="simple" size="sm">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                        <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {currentAreas.map((area) => (
                                        <Table.Row
                                            key={area.areaId}
                                            onClick={() => handleRowClick(area)}
                                            bg={selectedAreaId === area.areaId ? selectedRowBg : 'transparent'}
                                            _hover={{ bg: selectedAreaId === area.areaId ? selectedRowHoverBg : 'app.rowHoverStrong', cursor: 'pointer' }}
                                        >
                                            <Table.Cell>{area.areaId}</Table.Cell>
                                            <Table.Cell>{area.nombre}</Table.Cell>
                                            <Table.Cell>{area.descripcion}</Table.Cell>
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
                            No hay áreas para mostrar. Realice una búsqueda.
                        </Text>
                    )}
                </Box>

                {/* Selected area confirmation */}
                {selectedArea && (
                    <Box p={3} bg="app.rowSelectedTeal" borderRadius="md" borderWidth="1px" borderColor={selectedPanelBorder}>
                        <Text fontWeight="semibold">
                            Área seleccionada: {selectedArea.nombre} (ID: {selectedArea.areaId})
                        </Text>
                        {selectedArea.descripcion && (
                            <Text fontSize="sm" color="app.textMuted">{selectedArea.descripcion}</Text>
                        )}
                    </Box>
                )}

                {/* Navigation */}
                <Flex gap={4} pt={2}>
                    <Button
                        colorPalette="blue"
                        onClick={handleSiguiente}
                        disabled={!selectedArea}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
