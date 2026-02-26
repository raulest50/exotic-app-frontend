import {useCallback, useEffect, useMemo, useState, type KeyboardEvent} from 'react';
import {
    Badge,
    Box,
    Button,
    Flex,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Spinner,
    Text,
    VStack,
    useToast
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';

const endpoints = new EndPointsURL();

export interface TerminadoPickerResult {
    productoId: string;
    nombre: string;
    tipo_producto: string;
}

interface TerminadoPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTerminado: (terminado: TerminadoPickerResult) => void;
}

interface SearchResponse {
    content?: TerminadoPickerResult[];
    totalPages?: number;
    number?: number;
}

export default function TerminadoPicker({isOpen, onClose, onSelectTerminado}: TerminadoPickerProps) {
    const toast = useToast();
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<TerminadoPickerResult[]>([]);
    const [selected, setSelected] = useState<TerminadoPickerResult | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [tipoBusqueda, setTipoBusqueda] = useState<'NOMBRE' | 'ID'>('NOMBRE');

    const resetState = useCallback(() => {
        setSearchText('');
        setResults([]);
        setSelected(null);
        setPage(0);
        setTotalPages(1);
        setIsLoading(false);
    }, []);

    const fetchProductos = useCallback(async (pageToFetch = 0) => {
        setIsLoading(true);
        try {
            const response = await axios.post<SearchResponse>(
                endpoints.search_terminados_picker,
                {
                    searchTerm: searchText ?? '',
                    tipoBusqueda: tipoBusqueda,
                    page: pageToFetch,
                    size: 10
                }
            );

            const data = response.data;
            const terminados = data.content ?? [];

            const mapped: TerminadoPickerResult[] = terminados.map(t => ({
                productoId: t.productoId,
                nombre: t.nombre,
                tipo_producto: t.tipo_producto,
            }));

            setResults(mapped);
            setTotalPages(data.totalPages ?? 1);
            setPage(data.number ?? pageToFetch);
        } catch (error) {
            console.error('Error fetching productos terminados', error);
            setResults([]);
            setTotalPages(1);
            toast({
                title: 'Error al buscar productos',
                description: 'No se pudo obtener la lista de productos. Intente nuevamente.',
                status: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    }, [searchText, tipoBusqueda, toast]);

    useEffect(() => {
        if (isOpen) {
            fetchProductos(0);
        } else {
            resetState();
        }
    }, [isOpen]);

    const handleSearch = useCallback(() => {
        fetchProductos(0);
    }, [fetchProductos]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    }, [handleSearch]);

    const handleConfirm = () => {
        if (!selected) return;
        onSelectTerminado(selected);
        resetState();
        onClose();
    };

    const handleCancel = () => {
        resetState();
        onClose();
    };

    const paginationLabel = useMemo(() => {
        if (totalPages <= 1) return null;
        return `Página ${page + 1} de ${totalPages}`;
    }, [page, totalPages]);

    return (
        <Modal isOpen={isOpen} onClose={handleCancel} size="xl">
            <ModalOverlay/>
            <ModalContent>
                <ModalHeader>Seleccionar producto terminado</ModalHeader>
                <ModalCloseButton/>
                <ModalBody>
                    <Flex direction="column" gap={3}>
                        <Flex mb={2} gap={4} align="center">
                            <Text fontWeight="medium">Buscar por:</Text>
                            <Flex>
                                <Button
                                    size="sm"
                                    colorScheme={tipoBusqueda === 'NOMBRE' ? 'blue' : 'gray'}
                                    mr={2}
                                    onClick={() => setTipoBusqueda('NOMBRE')}
                                >
                                    Nombre
                                </Button>
                                <Button
                                    size="sm"
                                    colorScheme={tipoBusqueda === 'ID' ? 'blue' : 'gray'}
                                    onClick={() => setTipoBusqueda('ID')}
                                >
                                    ID
                                </Button>
                            </Flex>
                        </Flex>
                        <Flex gap={2}>
                            <Input
                                placeholder={tipoBusqueda === 'NOMBRE' ? 'Buscar por nombre' : 'Buscar por código'}
                                value={searchText}
                                onChange={event => setSearchText(event.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <Button onClick={handleSearch} isLoading={isLoading} loadingText="Buscando">
                                Buscar
                            </Button>
                        </Flex>
                    </Flex>
                    <VStack align="stretch" spacing={2} maxH="320px" overflowY="auto" mt={3}>
                        {isLoading ? (
                            <Flex justify="center" py={12}>
                                <Spinner/>
                            </Flex>
                        ) : results.length === 0 ? (
                            <Text color="gray.500">No se encontraron productos.</Text>
                        ) : (
                            results.map(producto => {
                                const isSelected = selected?.productoId === producto.productoId;
                                return (
                                    <Box
                                        key={producto.productoId}
                                        borderWidth="1px"
                                        borderRadius="md"
                                        p={3}
                                        cursor="pointer"
                                        bg={isSelected ? 'blue.50' : 'white'}
                                        borderColor={isSelected ? 'blue.400' : 'gray.200'}
                                        _hover={{bg: 'gray.50'}}
                                        onClick={() => setSelected(producto)}
                                    >
                                        <Flex justify="space-between" align="start">
                                            <Box>
                                                <Text fontWeight="semibold">{producto.nombre}</Text>
                                                <Text fontSize="sm" color="gray.600">ID: {producto.productoId}</Text>
                                            </Box>
                                            {producto.tipo_producto && (
                                                <Badge colorScheme="purple">{producto.tipo_producto}</Badge>
                                            )}
                                        </Flex>
                                    </Box>
                                );
                            })
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter justifyContent="space-between">
                    <Flex align="center" gap={3}>
                        {paginationLabel && <Text fontSize="sm" color="gray.600">{paginationLabel}</Text>}
                        {totalPages > 1 && (
                            <Flex gap={2}>
                                <Button size="sm" onClick={() => fetchProductos(page - 1)} isDisabled={page <= 0}>
                                    Anterior
                                </Button>
                                <Button size="sm" onClick={() => fetchProductos(page + 1)} isDisabled={page >= totalPages - 1}>
                                    Siguiente
                                </Button>
                            </Flex>
                        )}
                    </Flex>
                    <Flex gap={3}>
                        <Button variant="ghost" onClick={handleCancel}>
                            Cancelar
                        </Button>
                        <Button
                            colorScheme="blue"
                            onClick={handleConfirm}
                            isDisabled={!selected}
                        >
                            Confirmar
                        </Button>
                    </Flex>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
