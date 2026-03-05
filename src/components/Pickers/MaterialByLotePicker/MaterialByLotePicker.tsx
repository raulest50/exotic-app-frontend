import React, { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    HStack,
    Input,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
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
import EndPointsURL from '../../../api/EndPointsURL.tsx';

const endPoints = new EndPointsURL();

export interface MaterialByLoteItem {
    productoId: string;
    productoNombre: string;
    tipoUnidades: string;
    loteId: number;
    batchNumber: string;
    cantidadDisponible: number;
}

interface MaterialByLotePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectItem: (item: MaterialByLoteItem) => void;
}

const MaterialByLotePicker: React.FC<MaterialByLotePickerProps> = ({
    isOpen,
    onClose,
    onSelectItem,
}) => {
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<MaterialByLoteItem[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10;
    const toast = useToast();

    const itemKey = (item: MaterialByLoteItem) => `${item.productoId}|${item.loteId}`;

    const handleSearch = async () => {
        if (!searchText.trim()) return;
        setIsLoading(true);
        try {
            const response = await axios.get(endPoints.averias_almacen_search_material_by_lote, {
                params: { batchNumber: searchText.trim() },
            });
            setResults(response.data);
            setSelectedKey(null);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error searching materiales by lote:', error);
            toast({
                title: 'Error',
                description: 'Error al buscar materiales por lote.',
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

    const handleConfirm = () => {
        if (selectedKey !== null) {
            const item = results.find((r) => itemKey(r) === selectedKey);
            if (item) {
                onSelectItem(item);
            }
        }
        onClose();
    };

    const totalPages = Math.ceil(results.length / resultsPerPage);
    const startIndex = (currentPage - 1) * resultsPerPage;
    const currentResults = results.slice(startIndex, startIndex + resultsPerPage);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Buscar Material por Lote</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel>Buscar por Número de Lote</FormLabel>
                            <HStack>
                                <Input
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyDown={onKeyDown_InputBuscar}
                                    placeholder="Ingrese número de lote (parcial o completo)"
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
                            {results.length > 0 ? (
                                <>
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>Código</Th>
                                                <Th>Nombre</Th>
                                                <Th>Lote</Th>
                                                <Th>Unidades</Th>
                                                <Th isNumeric>Cantidad Disponible</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {currentResults.map((item) => {
                                                const key = itemKey(item);
                                                return (
                                                    <Tr
                                                        key={key}
                                                        onClick={() => setSelectedKey(key)}
                                                        bg={selectedKey === key ? 'blue.100' : 'transparent'}
                                                        _hover={{ bg: selectedKey === key ? 'blue.200' : 'gray.100', cursor: 'pointer' }}
                                                    >
                                                        <Td>{item.productoId}</Td>
                                                        <Td>{item.productoNombre}</Td>
                                                        <Td>{item.batchNumber}</Td>
                                                        <Td>{item.tipoUnidades}</Td>
                                                        <Td isNumeric>{item.cantidadDisponible.toFixed(2)}</Td>
                                                    </Tr>
                                                );
                                            })}
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
                                    No hay resultados. Busque por número de lote.
                                </Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        colorScheme="blue"
                        mr={3}
                        onClick={handleConfirm}
                        isDisabled={selectedKey === null}
                    >
                        Confirmar
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default MaterialByLotePicker;
