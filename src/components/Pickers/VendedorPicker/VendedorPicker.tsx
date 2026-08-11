// src/components/Pickers/VendedorPicker/VendedorPicker.tsx

import React, { useState } from 'react';
import {
    Steps,
    Box,
    Button,
    Input,
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
    NativeSelect,
    Field,
    Dialog,
    Portal,
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
        <Dialog.Root open={isOpen} size='lg' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Seleccionar Vendedor</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack gap={4}>
                                <Field.Root>
                                    <Field.Label>Buscar Vendedor</Field.Label>
                                    <HStack>
                                        <Input
                                            value={searchText}
                                            onValueChange={(e) => setSearchText(e.target.value)}
                                            onKeyDown={onKeyPress_InputBuscar}
                                            placeholder="Ingrese texto de búsqueda"
                                            disabled={isLoading}
                                        />
                                        <NativeSelect.Root>
                                            <NativeSelect.Field
                                                value={searchType}
                                                onValueChange={(e) => setSearchType(e.target.value as SearchType)}
                                                width="150px"
                                                disabled={isLoading}>
                                                <option value={SearchType.ID}>Por ID</option>
                                                <option value={SearchType.NAME}>Por Nombre</option>
                                            </NativeSelect.Field>
                                            <NativeSelect.Indicator />
                                        </NativeSelect.Root>
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
                                    {vendedores.length > 0 ? (
                                        <>
                                            <Table.Root variant="simple" size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Correo Electrónico</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Usuario</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {currentVendedores.map((vendedor) => (
                                                        <Table.Row 
                                                            key={vendedor.cedula} 
                                                            onClick={() => setSelectedVendedorId(vendedor.cedula)}
                                                            bg={selectedVendedorId === vendedor.cedula ? "teal.100" : "transparent"}
                                                            _hover={{ bg: "gray.100", cursor: "pointer" }}
                                                        >
                                                            <Table.Cell>{vendedor.cedula}</Table.Cell>
                                                            <Table.Cell>{`${vendedor.nombres} ${vendedor.apellidos}`}</Table.Cell>
                                                            <Table.Cell>{vendedor.email}</Table.Cell>
                                                            <Table.Cell>{vendedor.username || '-'}</Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table.Root>

                                            {/* Pagination controls */}
                                            {totalPages > 1 && (
                                                <Flex justifyContent="center" mt={4}>
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => goToPage(currentPage - 1)} 
                                                        disabled={currentPage === 1}
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
                                                        disabled={currentPage === totalPages}
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
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button 
                                colorPalette="teal" 
                                mr={3} 
                                onClick={handleConfirm}
                                disabled={selectedVendedorId === null}
                            >
                                Aceptar
                            </Button>
                            <Button variant="ghost" onClick={handleCancel}>
                                Cancelar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default VendedorPicker;
