// src/components/Pickers/VendedorPicker/VendedorPicker.tsx

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
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Flex,
    Select,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from "../../../api/EndPointsURL.tsx";

const endPoints = new EndPointsURL();

// Interface for Vendedor based on the backend model
interface Vendedor {
    cedula: number;
    nombres: string;
    apellidos: string;
    email: string;
    username?: string;
}

// Enum for search types
enum SearchType {
    ID = 'ID',
    NAME = 'NAME'
}

// DTO for searching Vendedor
interface SearchVendedorDTO {
    search: string;
    searchType: SearchType;
}

interface VendedorPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectVendedor: (vendedor: Vendedor) => void;
}

const VendedorPicker: React.FC<VendedorPickerProps> = ({
    isOpen,
    onClose,
    onSelectVendedor,
}) => {
    const [searchText, setSearchText] = useState('');
    const [searchType, setSearchType] = useState<SearchType>(SearchType.NAME);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [selectedVendedorId, setSelectedVendedorId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10;
    const toast = useToast();

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const searchDTO: SearchVendedorDTO = {
                search: searchText,
                searchType: searchType
            };

            const response = await axios.post(endPoints.search_vendedor, searchDTO, {
                params: {
                    page: 0,
                    size: 100
                }
            });

            console.log('Respuesta de búsqueda de vendedores:', response.data);

            // Manejar correctamente la estructura de Page de Spring
            if (response.data) {
                // Si la respuesta es directamente un array
                if (Array.isArray(response.data)) {
                    setVendedores(response.data);
                } 
                // Si la respuesta es un objeto Page con propiedad content
                else if (response.data.content && Array.isArray(response.data.content)) {
                    setVendedores(response.data.content);
                }
                // Si la respuesta es el objeto directamente en data
                else if (typeof response.data === 'object') {
                    setVendedores([response.data]);
                }
                else {
                    setVendedores([]);
                }
            } else {
                setVendedores([]);
            }

            setSelectedVendedorId(null); // Reset selection on new search
            setCurrentPage(1); // Reset to first page on new search
        } catch (error) {
            console.error('Error searching Vendedores:', error);
            toast({
                title: 'Error',
                description: 'Error al buscar vendedores.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedVendedorId !== null) {
            const vendedor = vendedores.find((v) => v.cedula === selectedVendedorId);
            if (vendedor) {
                onSelectVendedor(vendedor);
            }
        }
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    const onKeyPress_InputBuscar = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !isLoading) {
            handleSearch();
        }
    };

    // Calculate pagination
    const totalPages = Math.ceil(vendedores.length / resultsPerPage);
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const currentVendedores = vendedores.slice(startIndex, endIndex);

    // Handle pagination
    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Seleccionar Vendedor</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel>Buscar Vendedor</FormLabel>
                            <HStack>
                                <Input
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyDown={onKeyPress_InputBuscar}
                                    placeholder="Ingrese texto de búsqueda"
                                    isDisabled={isLoading}
                                />
                                <Select 
                                    value={searchType}
                                    onChange={(e) => setSearchType(e.target.value as SearchType)}
                                    width="150px"
                                    isDisabled={isLoading}
                                >
                                    <option value={SearchType.ID}>Por ID</option>
                                    <option value={SearchType.NAME}>Por Nombre</option>
                                </Select>
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
                            {vendedores.length > 0 ? (
                                <>
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>ID</Th>
                                                <Th>Nombre</Th>
                                                <Th>Correo Electrónico</Th>
                                                <Th>Usuario</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {currentVendedores.map((vendedor) => (
                                                <Tr 
                                                    key={vendedor.cedula} 
                                                    onClick={() => setSelectedVendedorId(vendedor.cedula)}
                                                    bg={selectedVendedorId === vendedor.cedula ? "teal.100" : "transparent"}
                                                    _hover={{ bg: "gray.100", cursor: "pointer" }}
                                                >
                                                    <Td>{vendedor.cedula}</Td>
                                                    <Td>{`${vendedor.nombres} ${vendedor.apellidos}`}</Td>
                                                    <Td>{vendedor.email}</Td>
                                                    <Td>{vendedor.username || '-'}</Td>
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
                                <Text textAlign="center">No hay vendedores para mostrar</Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button 
                        colorScheme="teal" 
                        mr={3} 
                        onClick={handleConfirm}
                        isDisabled={selectedVendedorId === null}
                    >
                        Aceptar
                    </Button>
                    <Button variant="ghost" onClick={handleCancel}>
                        Cancelar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default VendedorPicker;
