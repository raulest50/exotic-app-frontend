// src/components/UserPickerGeneric.tsx

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
        <Dialog.Root open={isOpen} size='lg' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Seleccionar Usuario</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack gap={4}>
                                <Field.Root>
                                    <Field.Label>Buscar Usuario</Field.Label>
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
                                                disabled={isLoading}
                                                width="150px">
                                                <option value={SearchType.ID}>ID</option>
                                                <option value={SearchType.NAME}>Nombre</option>
                                                <option value={SearchType.EMAIL}>Correo</option>
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
                                    {users.length > 0 ? (
                                        <>
                                            <Table.Root variant="simple" size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Cédula</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Correo</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {currentUsers.map((user) => (
                                                        <Table.Row 
                                                            key={user.id} 
                                                            onClick={() => setSelectedUserId(user.id)}
                                                            bg={selectedUserId === user.id ? "teal.100" : "transparent"}
                                                            _hover={{ bg: "gray.100", cursor: "pointer" }}
                                                        >
                                                            <Table.Cell>{user.id}</Table.Cell>
                                                            <Table.Cell>{user.cedula}</Table.Cell>
                                                            <Table.Cell>{user.nombreCompleto || user.username}</Table.Cell>
                                                            <Table.Cell>{user.username}</Table.Cell>
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
                                        <Text textAlign="center">No hay usuarios para mostrar</Text>
                                    )}
                                </Box>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button 
                                colorPalette="teal" 
                                mr={3} 
                                onClick={handleConfirm}
                                disabled={selectedUserId === null}
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

export default UserGenericPicker;
