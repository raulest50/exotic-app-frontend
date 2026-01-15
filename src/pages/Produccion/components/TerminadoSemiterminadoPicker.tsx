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
import EndPointsURL from '../../../api/EndPointsURL';
import {Producto, ProductoWithInsumos, InsumoWithStock, ProductoStockDTO, Terminado} from '../types';

interface TerminadoSemiterminadoPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (producto: ProductoWithInsumos, canProduce: boolean) => void;
}

interface SearchResponse<T> {
    content?: T[];
    totalPages?: number;
    number?: number;
}

const endpoints = new EndPointsURL();

type InsumoWithStockResponse = Omit<InsumoWithStock, 'tipo_producto' | 'subInsumos'> & {
    tipo_producto?: string;
    tipoProducto?: string;
    tipoUnidades?: string;
    subInsumos?: InsumoWithStockResponse[];
};

export default function TerminadoSemiterminadoPicker({isOpen, onClose, onConfirm}: TerminadoSemiterminadoPickerProps) {
    const toast = useToast();
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<ProductoStockDTO[]>([]);
    const [selected, setSelected] = useState<ProductoStockDTO | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    const resetState = useCallback(() => {
        setSearchText('');
        setResults([]);
        setSelected(null);
        setPage(0);
        setTotalPages(1);
        setIsLoading(false);
        setIsConfirming(false);
    }, []);

    const [tipoBusqueda, setTipoBusqueda] = useState<'NOMBRE' | 'ID'>('NOMBRE');

    const fetchProductos = useCallback(async (pageToFetch = 0) => {
        setIsLoading(true);
        try {
            // Use POST request to the new endpoint with parameters in the request body
            const response = await axios.post<SearchResponse<Terminado>>(
                endpoints.search_terminados_picker,
                {
                    searchTerm: searchText ?? '',
                    tipoBusqueda: tipoBusqueda,
                    page: pageToFetch,
                    size: 10
                }
            );

            // The response is always a paged object with the new endpoint
            const data = response.data;
            const terminados = data.content ?? [];

            // Convert Terminado objects to ProductoStockDTO objects
            const productoStockDTOs = terminados.map(terminado => {
                // Extract category information if available
                const categoriaId = terminado.categoria?.categoriaId;
                const categoriaNombre = terminado.categoria?.categoriaNombre;

                // Create a new producto object with category information as direct properties
                const producto = {
                    ...terminado,
                    categoriaId,
                    categoriaNombre,
                    casePack: terminado.casePack
                };

                return {
                    producto,
                    stock: 0 // The stock is not provided in the response, set to 0 or fetch separately if needed
                };
            });

            setResults(productoStockDTOs);
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
    }, [isOpen, fetchProductos, resetState]);

    const handleSearch = useCallback(() => {
        fetchProductos(0);
    }, [fetchProductos]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    }, [handleSearch]);

    const handleSelect = (productoStock: ProductoStockDTO) => {
        setSelected(productoStock);
    };

    const handleConfirm = async () => {
        if (!selected) return;
        setIsConfirming(true);
        try {
            const url = endpoints.insumos_with_stock.replace('{id}', encodeURIComponent(String(selected.producto.productoId)));
            const response = await axios.get<
                InsumoWithStockResponse[] | SearchResponse<InsumoWithStockResponse>
            >(url);
            const data = response.data;
            const rawInsumos = Array.isArray(data) ? data : data.content ?? [];

            // Función recursiva para normalizar los insumos y sus subinsumos
            const normalizeInsumo = (insumo: InsumoWithStockResponse): InsumoWithStock => ({
                ...insumo,
                tipo_producto: insumo.tipo_producto ?? insumo.tipoProducto ?? '',
                tipoUnidades: insumo.tipoUnidades ?? 'KG', // Usar 'KG' como valor predeterminado si no está definido
                subInsumos: (insumo.subInsumos ?? []).map(normalizeInsumo)
            });

            const insumos: InsumoWithStock[] = rawInsumos.map(normalizeInsumo);

            const productoWithInsumos: ProductoWithInsumos = {
                producto: selected.producto,
                insumos
            };
            const canProduce = insumos.every(insumo => insumo.stockActual >= insumo.cantidadRequerida);
            onConfirm(productoWithInsumos, canProduce);
            resetState();
            onClose();
        } catch (error) {
            console.error('Error fetching insumos for producto', error);
            toast({
                title: 'Error al obtener insumos',
                description: 'No se pudo obtener la información de insumos del producto seleccionado.',
                status: 'error'
            });
        } finally {
            setIsConfirming(false);
        }
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
        <Modal isOpen={isOpen} onClose={handleCancel} size='xl'>
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
                            <Button onClick={handleSearch} isLoading={isLoading} loadingText='Buscando'>
                                Buscar
                            </Button>
                        </Flex>
                    </Flex>
                    <VStack align='stretch' spacing={2} maxH='320px' overflowY='auto'>
                        {isLoading ? (
                            <Flex justify='center' py={12}>
                                <Spinner/>
                            </Flex>
                        ) : results.length === 0 ? (
                            <Text color='gray.500'>No se encontraron productos.</Text>
                        ) : (
                            results.map(productoStock => {
                                const producto = productoStock?.producto;

                                // Skip rendering if producto is undefined
                                if (!producto) {
                                    return null;
                                }

                                // Use optional chaining for selected.producto
                                const isSelected = selected?.producto?.productoId === producto.productoId;

                                return (
                                    <Box
                                        key={producto.productoId}
                                        borderWidth='1px'
                                        borderRadius='md'
                                        p={3}
                                        cursor='pointer'
                                        bg={isSelected ? 'blue.50' : 'white'}
                                        borderColor={isSelected ? 'blue.400' : 'gray.200'}
                                        _hover={{bg: 'gray.50'}}
                                        onClick={() => handleSelect(productoStock)}
                                    >
                                        <Flex justify='space-between' align='start'>
                                            <Box>
                                                <Text fontWeight='semibold'>{producto.nombre}</Text>
                                                <Text fontSize='sm' color='gray.600'>ID: {producto.productoId}</Text>
                                            </Box>
                                            {producto.tipo_producto && (
                                                <Badge colorScheme='purple'>{producto.tipo_producto}</Badge>
                                            )}
                                        </Flex>
                                    </Box>
                                );
                            })
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter justifyContent='space-between'>
                    <Flex align='center' gap={3}>
                        {paginationLabel && <Text fontSize='sm' color='gray.600'>{paginationLabel}</Text>}
                        {totalPages > 1 && (
                            <Flex gap={2}>
                                <Button size='sm' onClick={() => fetchProductos(page - 1)} isDisabled={page <= 0}>
                                    Anterior
                                </Button>
                                <Button size='sm' onClick={() => fetchProductos(page + 1)} isDisabled={page >= totalPages - 1}>
                                    Siguiente
                                </Button>
                            </Flex>
                        )}
                    </Flex>
                    <Flex gap={3}>
                        <Button variant='ghost' onClick={handleCancel} isDisabled={isConfirming}>
                            Cancelar
                        </Button>
                        <Button
                            colorScheme='blue'
                            onClick={handleConfirm}
                            isDisabled={!selected}
                            isLoading={isConfirming}
                            loadingText='Cargando insumos'
                        >
                            Confirmar
                        </Button>
                    </Flex>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
