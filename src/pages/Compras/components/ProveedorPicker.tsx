// ProveedorPicker.tsx

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
    Field,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { Proveedor } from "../types.tsx"; // Import the full Proveedor type

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
            setSelectedProveedorId(null); // Reset selection on new search
            setCurrentPage(1); // Reset to first page on new search
        } catch (error) {
            console.error('Error searching Proveedores:', error);
            toast({
                title: 'Error',
                description: 'Failed to search Proveedores.',
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
            // Make sure to compare both IDs as strings
            const proveedor = proveedores.find((p) => p.id.toString() === selectedProveedorId);
//             console.log("proveedor:", proveedor);
//             console.log(proveedores)
            if (proveedor) {
                onSelectProveedor(proveedor); // Pass the full proveedor object
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
    const totalPages = Math.ceil(proveedores.length / resultsPerPage);
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const currentProveedores = proveedores.slice(startIndex, endIndex);

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
                        <Dialog.Header>Seleccionar Proveedor</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack gap={4}>
                                <Field.Root>
                                    <Field.Label>Buscar Proveedor</Field.Label>
                                    <HStack>
                                        <Input
                                            value={searchText}
                                            onValueChange={(e) => setSearchText(e.target.value)}
                                            onKeyDown={onKeyPress_InputBuscar}
                                            placeholder="Ingrese nombre o NIT"
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
                                    {proveedores.length > 0 ? (
                                        <>
                                            <Table.Root variant="simple" size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>NIT</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {currentProveedores.map((proveedor) => (
                                                        <Table.Row 
                                                            key={proveedor.id} 
                                                            onClick={() => setSelectedProveedorId(proveedor.id.toString())}
                                                            bg={selectedProveedorId === proveedor.id.toString() ? "app.rowSelectedBlue" : "transparent"}
                                                            _hover={{ bg: "app.rowHoverStrong", cursor: "pointer" }}
                                                        >
                                                            <Table.Cell>{proveedor.id}</Table.Cell>
                                                            <Table.Cell>{proveedor.nombre}</Table.Cell>
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
                                        <Text textAlign="center">No hay proveedores para mostrar</Text>
                                    )}
                                </Box>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button 
                                colorPalette="blue" 
                                mr={3} 
                                onClick={handleConfirm}
                                disabled={selectedProveedorId === null}
                            >
                                Confirmar
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

export default ProveedorPicker;
