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

const RESULTS_PER_PAGE = 10;

export default function AveriaProduccionStep0SelectArea({
    setActiveStep,
    selectedArea,
    onSelectArea,
}: AveriaProduccionStep0SelectAreaProps) {
    const [searchText, setSearchText] = useState('');
    const [areas, setAreas] = useState<AreaProduccion[]>([]);
    const [selectedAreaId, setSelectedAreaId] = useState<number | null>(selectedArea?.areaId ?? null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const toast = useToast();

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
            setCurrentPage(1);
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

    const totalPages = Math.ceil(areas.length / RESULTS_PER_PAGE);
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const currentAreas = areas.slice(startIndex, startIndex + RESULTS_PER_PAGE);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 1: Selección de Área Operativa
            </Text>

            <VStack spacing={4} align="stretch">
                {/* Search section */}
                <FormControl>
                    <FormLabel>Buscar Área de Producción</FormLabel>
                    <HStack>
                        <Input
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={onKeyDown_InputBuscar}
                            placeholder="Ingrese nombre del área"
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

                {/* Results table */}
                <Box w="full" overflowX="auto">
                    {areas.length > 0 ? (
                        <>
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>ID</Th>
                                        <Th>Nombre</Th>
                                        <Th>Descripción</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {currentAreas.map((area) => (
                                        <Tr
                                            key={area.areaId}
                                            onClick={() => handleRowClick(area)}
                                            bg={selectedAreaId === area.areaId ? 'teal.100' : 'transparent'}
                                            _hover={{ bg: selectedAreaId === area.areaId ? 'teal.200' : 'gray.100', cursor: 'pointer' }}
                                        >
                                            <Td>{area.areaId}</Td>
                                            <Td>{area.nombre}</Td>
                                            <Td>{area.descripcion}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>

                            {totalPages > 1 && (
                                <Flex justifyContent="center" mt={4}>
                                    <Button
                                        size="sm"
                                        onClick={() => goToPage(currentPage - 1)}
                                        isDisabled={currentPage === 1}
                                        mr={2}
                                    >
                                        Anterior
                                    </Button>
                                    <Text alignSelf="center" mx={2}>
                                        Página {currentPage} de {totalPages}
                                    </Text>
                                    <Button
                                        size="sm"
                                        onClick={() => goToPage(currentPage + 1)}
                                        isDisabled={currentPage === totalPages}
                                        ml={2}
                                    >
                                        Siguiente
                                    </Button>
                                </Flex>
                            )}
                        </>
                    ) : (
                        <Text textAlign="center" color="gray.500">
                            No hay áreas para mostrar. Realice una búsqueda.
                        </Text>
                    )}
                </Box>

                {/* Selected area confirmation */}
                {selectedArea && (
                    <Box p={3} bg="teal.50" borderRadius="md" borderWidth="1px" borderColor="teal.200">
                        <Text fontWeight="semibold">
                            Área seleccionada: {selectedArea.nombre} (ID: {selectedArea.areaId})
                        </Text>
                        {selectedArea.descripcion && (
                            <Text fontSize="sm" color="gray.600">{selectedArea.descripcion}</Text>
                        )}
                    </Box>
                )}

                {/* Navigation */}
                <Flex gap={4} pt={2}>
                    <Button
                        colorScheme="blue"
                        onClick={handleSiguiente}
                        isDisabled={!selectedArea}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
