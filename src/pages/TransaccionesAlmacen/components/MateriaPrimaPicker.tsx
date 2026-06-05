// ./MateriaPrimaPicker.tsx
import React, { useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useToast,
    VStack,
    HStack,
    Text,
    Select,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Flex,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from "../../../api/EndPointsURL";
import { Material } from '../types';

const endPoints = new EndPointsURL();

interface MateriaPrimaPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectMateriaPrima: (materiaPrima: Material) => void;
}

const MateriaPrimaPicker: React.FC<MateriaPrimaPickerProps> = ({
                                                                   isOpen,
                                                                   onClose,
                                                                   onSelectMateriaPrima,
                                                               }) => {
    const [searchText, setSearchText] = useState('');
    const [tipoBusqueda, setTipoBusqueda] = useState('NOMBRE'); // 'NOMBRE' or 'ID'
    const [materiasPrimas, setMateriasPrimas] = useState<Material[]>([]);
    const [selectedMateriaPrimaId, setSelectedMateriaPrimaId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0); // Backend uses 0-based indexing
    const [totalPages, setTotalPages] = useState(0);
    const [, setTotalElements] = useState(0);
    const size = 10; // Results per page
    const toast = useToast();

    const handleSearch = async (pageParam?: number) => {
        setIsLoading(true);
        try {
            // Use pageParam if provided, otherwise use currentPage
            const pageToUse = pageParam !== undefined ? pageParam : currentPage;

            const response = await axios.get(endPoints.search_mprima, {
                params: { 
                    search: searchText, 
                    tipoBusqueda,
                    page: pageToUse,
                    size: size
                },
            });
            // Extract pagination information from the response
            const { content, totalPages: pages, totalElements: elements, number: pageNumber } = response.data;

            // Update state with the new data
            const updatedMateriasPrimas = content.map((item: Material) => ({
                ...item,
                // Optionally adjust properties if needed.
            }));

            setMateriasPrimas(updatedMateriasPrimas);
            setTotalPages(pages);
            setTotalElements(elements);
            setCurrentPage(pageNumber);
            setSelectedMateriaPrimaId(null);
        } catch (error) {
            console.error('Error searching materias primas:', error);
            toast({
                title: 'Error',
                description: 'Failed to search materias primas.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedMateriaPrimaId !== null) {
            const selectedMateriaPrima = materiasPrimas.find(
                (p) => p.productoId === selectedMateriaPrimaId
            );
            if (selectedMateriaPrima) {
                onSelectMateriaPrima(selectedMateriaPrima);
            }
        }
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    const onKeyPress_InputBuscar = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !isLoading) {
            setCurrentPage(0); // Reset to first page on new search
            handleSearch(0); // Pass page 0 explicitly
        }
    };

    // Handle pagination
    const goToPage = (page: number) => {
        if (page >= 0 && page < totalPages) {
            setCurrentPage(page);
            handleSearch(page);  // Pass the page directly to handleSearch
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Seleccionar Materia Prima</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel>Buscar Materia Prima</FormLabel>
                            <HStack>
                                <Input
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyDown={onKeyPress_InputBuscar}
                                    placeholder="Ingrese nombre o ID"
                                    isDisabled={isLoading}
                                />
                                <Select
                                    value={tipoBusqueda}
                                    onChange={(e) => setTipoBusqueda(e.target.value)}
                                    width="150px"
                                    isDisabled={isLoading}
                                >
                                    <option value="NOMBRE">Nombre</option>
                                    <option value="ID">ID</option>
                                </Select>
                                <Button 
                                    onClick={() => {
                                        setCurrentPage(0); // Reset to first page on new search
                                        handleSearch(0); // Pass page 0 explicitly
                                    }} 
                                    isLoading={isLoading}
                                    loadingText="Buscando"
                                    colorScheme="blue"
                                >
                                    Buscar
                                </Button>
                            </HStack>
                        </FormControl>
                        <Box w="full" overflowX="auto">
                            {materiasPrimas.length > 0 ? (
                                <>
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>ID</Th>
                                                <Th>Nombre</Th>
                                                <Th>Categoría</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {materiasPrimas.map((materiaPrima) => (
                                                <Tr 
                                                    key={materiaPrima.productoId} 
                                                    onClick={() => setSelectedMateriaPrimaId(materiaPrima.productoId)}
                                                    bg={selectedMateriaPrimaId === materiaPrima.productoId ? "blue.100" : "transparent"}
                                                    _hover={{ bg: "app.rowHoverStrong", cursor: "pointer" }}
                                                >
                                                    <Td>{materiaPrima.productoId}</Td>
                                                    <Td>{materiaPrima.nombre}</Td>
                                                    <Td>{materiaPrima.tipoMaterial === 1 ? "Materia Prima" : "Material de Empaque"}</Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>

                                    {/* Pagination controls */}
                                    {totalPages > 1 && (
                                        <Flex justifyContent="center" mt={4}>
                                            <Button 
                                                size="sm" 
                                                onClick={() => goToPage(currentPage - 1)} 
                                                isDisabled={currentPage === 0 || isLoading}
                                                mr={2}
                                            >
                                                Anterior
                                            </Button>
                                            <Text alignSelf="center" mx={2}>
                                                Página {currentPage + 1} de {totalPages}
                                            </Text>
                                            <Button 
                                                size="sm" 
                                                onClick={() => goToPage(currentPage + 1)} 
                                                isDisabled={currentPage === totalPages - 1 || isLoading}
                                                ml={2}
                                            >
                                                Siguiente
                                            </Button>
                                        </Flex>
                                    )}
                                </>
                            ) : (
                                <Text textAlign="center">No hay materias primas para mostrar</Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button 
                        colorScheme="blue" 
                        mr={3} 
                        onClick={handleConfirm}
                        isDisabled={selectedMateriaPrimaId === null}
                    >
                        Confirmar
                    </Button>
                    <Button variant="ghost" onClick={handleCancel}>
                        Cancelar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default MateriaPrimaPicker;
