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
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { Proveedor } from "../../../pages/Compras/types.tsx";

const endPoints = new EndPointsURL();

interface ProveedorPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectProveedor: (proveedor: Proveedor) => void;
}

const ProveedorPicker: React.FC<ProveedorPickerProps> = ({
    isOpen,
    onClose,
    onSelectProveedor,
}) => {
    const [searchText, setSearchText] = useState('');
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [selectedProveedorId, setSelectedProveedorId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10;
    const toast = useToast();

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(endPoints.search_proveedores, {
                params: { q: searchText },
            });
            setProveedores(response.data);
            setSelectedProveedorId(null);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error searching Proveedores:', error);
            toast({
                title: 'Error',
                description: 'Error al buscar proveedores.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedProveedorId !== null) {
            const proveedor = proveedores.find((p) => p.id.toString() === selectedProveedorId);
            if (proveedor) {
                onSelectProveedor(proveedor);
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

    const totalPages = Math.ceil(proveedores.length / resultsPerPage);
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const currentProveedores = proveedores.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Seleccionar Proveedor</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel>Buscar Proveedor</FormLabel>
                            <HStack>
                                <Input
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyDown={onKeyPress_InputBuscar}
                                    placeholder="Ingrese nombre o NIT"
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
                            {proveedores.length > 0 ? (
                                <>
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>NIT</Th>
                                                <Th>Nombre</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {currentProveedores.map((proveedor) => (
                                                <Tr
                                                    key={proveedor.id}
                                                    onClick={() => setSelectedProveedorId(proveedor.id.toString())}
                                                    bg={selectedProveedorId === proveedor.id.toString() ? "blue.100" : "transparent"}
                                                    _hover={{ bg: "gray.100", cursor: "pointer" }}
                                                >
                                                    <Td>{proveedor.id}</Td>
                                                    <Td>{proveedor.nombre}</Td>
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
                                <Text textAlign="center">No hay proveedores para mostrar</Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        colorScheme="blue"
                        mr={3}
                        onClick={handleConfirm}
                        isDisabled={selectedProveedorId === null}
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

export default ProveedorPicker;
