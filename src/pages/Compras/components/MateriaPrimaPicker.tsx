// ./MateriaPrimaPicker.tsx
import React, { useState } from 'react';
import {
    Steps,
    Box,
    Button,
    Input,
    VStack,
    HStack,
    Text,
    NativeSelect,
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
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { Material } from '../types.tsx';

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
    const toast = useAppToast();

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
        <Dialog.Root open={isOpen} size='lg' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Seleccionar Materia Prima</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack gap={4}>
                                <Field.Root>
                                    <Field.Label>Buscar Materia Prima</Field.Label>
                                    <HStack>
                                        <Input
                                            value={searchText}
                                            onValueChange={(e) => setSearchText(e.target.value)}
                                            onKeyDown={onKeyPress_InputBuscar}
                                            placeholder="Ingrese nombre o ID"
                                            disabled={isLoading}
                                        />
                                        <NativeSelect.Root>
                                            <NativeSelect.Field
                                                value={tipoBusqueda}
                                                onValueChange={(e) => setTipoBusqueda(e.target.value)}
                                                width="150px"
                                                disabled={isLoading}>
                                                <option value="NOMBRE">Nombre</option>
                                                <option value="ID">ID</option>
                                            </NativeSelect.Field>
                                            <NativeSelect.Indicator />
                                        </NativeSelect.Root>
                                        <Button 
                                            onClick={() => {
                                                setCurrentPage(0); // Reset to first page on new search
                                                handleSearch(0); // Pass page 0 explicitly
                                            }} 
                                            loading={isLoading}
                                            loadingText="Buscando"
                                            colorPalette="blue"
                                        >
                                            Buscar
                                        </Button>
                                    </HStack>
                                </Field.Root>
                                <Box w="full" overflowX="auto">
                                    {materiasPrimas.length > 0 ? (
                                        <>
                                            <Table.Root variant="simple" size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Categoría</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {materiasPrimas.map((materiaPrima) => (
                                                        <Table.Row 
                                                            key={materiaPrima.productoId} 
                                                            onClick={() => setSelectedMateriaPrimaId(materiaPrima.productoId)}
                                                            bg={selectedMateriaPrimaId === materiaPrima.productoId ? "app.rowSelectedBlue" : "transparent"}
                                                            _hover={{ bg: "app.rowHoverStrong", cursor: "pointer" }}
                                                        >
                                                            <Table.Cell>{materiaPrima.productoId}</Table.Cell>
                                                            <Table.Cell>{materiaPrima.nombre}</Table.Cell>
                                                            <Table.Cell>{materiaPrima.tipoMaterial === 1 ? "Materia Prima" : "Material de Empaque"}</Table.Cell>
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
                                                        disabled={currentPage === 0 || isLoading}
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
                                                        disabled={currentPage === totalPages - 1 || isLoading}
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
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button 
                                colorPalette="blue" 
                                mr={3} 
                                onClick={handleConfirm}
                                disabled={selectedMateriaPrimaId === null}
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

export default MateriaPrimaPicker;
