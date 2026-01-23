// src/components/UserPickerGeneric.tsx

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
import { User } from "../../../pages/Usuarios/GestionUsuarios/types.tsx";

const endPoints = new EndPointsURL();

// Define SearchType enum based on backend requirements
enum SearchType {
    ID = 'ID',
    NAME = 'NAME',
    EMAIL = 'EMAIL'
}

interface UserGenericPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (user: User) => void;
}

const UserGenericPicker: React.FC<UserGenericPickerProps> = ({
    isOpen,
    onClose,
    onSelectUser,
}) => {
    const [searchText, setSearchText] = useState('');
    const [searchType, setSearchType] = useState<SearchType>(SearchType.NAME);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10;
    const toast = useToast();

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(endPoints.search_user_by_dto, {
                search: searchText,
                searchType: searchType
            }, {
                params: {
                    page: 0,
                    size: 100
                }
            });
            setUsers(response.data);
            setSelectedUserId(null); // Reset selection on new search
            setCurrentPage(1); // Reset to first page on new search
        } catch (error) {
            console.error('Error searching Users:', error);
            toast({
                title: 'Error',
                description: 'Failed to search Users.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedUserId !== null) {
            const user = users.find((u) => u.id === selectedUserId);
            if (user) {
                onSelectUser(user);
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
    const totalPages = Math.ceil(users.length / resultsPerPage);
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const currentUsers = users.slice(startIndex, endIndex);

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
                <ModalHeader>Seleccionar Usuario</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel>Buscar Usuario</FormLabel>
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
                                    isDisabled={isLoading}
                                    width="150px"
                                >
                                    <option value={SearchType.ID}>ID</option>
                                    <option value={SearchType.NAME}>Nombre</option>
                                    <option value={SearchType.EMAIL}>Correo</option>
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
                            {users.length > 0 ? (
                                <>
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>ID</Th>
                                                <Th>Cédula</Th>
                                                <Th>Nombre</Th>
                                                <Th>Correo</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {currentUsers.map((user) => (
                                                <Tr 
                                                    key={user.id} 
                                                    onClick={() => setSelectedUserId(user.id)}
                                                    bg={selectedUserId === user.id ? "teal.100" : "transparent"}
                                                    _hover={{ bg: "gray.100", cursor: "pointer" }}
                                                >
                                                    <Td>{user.id}</Td>
                                                    <Td>{user.cedula}</Td>
                                                    <Td>{user.nombreCompleto || user.username}</Td>
                                                    <Td>{user.username}</Td>
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
                                <Text textAlign="center">No hay usuarios para mostrar</Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button 
                        colorScheme="teal" 
                        mr={3} 
                        onClick={handleConfirm}
                        isDisabled={selectedUserId === null}
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

export default UserGenericPicker;
