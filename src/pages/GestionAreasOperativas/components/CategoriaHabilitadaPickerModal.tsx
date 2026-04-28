import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Flex,
    HStack,
    Input,
    InputGroup,
    InputRightElement,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Spinner,
    Table,
    TableContainer,
    Tag,
    TagLabel,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
    Wrap,
    WrapItem,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import MyPagination from '../../../components/MyPagination.tsx';
import { Categoria } from '../../Produccion/types.tsx';
import { CategoriaHabilitada, PaginatedResponse } from '../ConsultaAreasOperativas/types.ts';

interface CategoriaHabilitadaPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSelected: CategoriaHabilitada[];
    onConfirm: (categorias: CategoriaHabilitada[]) => void;
}

const PAGE_SIZE = 10;

export default function CategoriaHabilitadaPickerModal({
    isOpen,
    onClose,
    initialSelected,
    onConfirm,
}: CategoriaHabilitadaPickerModalProps) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [searchNombre, setSearchNombre] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedById, setSelectedById] = useState<Record<number, CategoriaHabilitada>>({});

    const endPoints = new EndPointsURL();
    const toast = useToast();

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const nextSelected = initialSelected.reduce<Record<number, CategoriaHabilitada>>((acc, categoria) => {
            acc[categoria.categoriaId] = categoria;
            return acc;
        }, {});

        setSelectedById(nextSelected);
        setSearchNombre('');
        void fetchCategorias(0, '');
    }, [initialSelected, isOpen]);

    const fetchCategorias = async (pageNumber: number, nombre: string = searchNombre) => {
        setLoading(true);
        try {
            const response = await axios.get<PaginatedResponse<Categoria>>(endPoints.search_categorias_pag, {
                params: {
                    page: pageNumber,
                    size: PAGE_SIZE,
                    nombre: nombre.trim() || undefined,
                },
            });

            setCategorias(response.data.content ?? []);
            setPage(pageNumber);
            setTotalPages(response.data.totalPages ?? 1);
        } catch (error) {
            console.error('Error loading categorias:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron cargar las categorías.',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleCategoria = (categoria: Categoria) => {
        setSelectedById((prev) => {
            const next = { ...prev };
            if (next[categoria.categoriaId]) {
                delete next[categoria.categoriaId];
            } else {
                next[categoria.categoriaId] = {
                    categoriaId: categoria.categoriaId,
                    categoriaNombre: categoria.categoriaNombre,
                };
            }
            return next;
        });
    };

    const handleConfirm = () => {
        const selectedCategorias = Object.values(selectedById).sort((a, b) =>
            a.categoriaNombre.localeCompare(b.categoriaNombre, 'es', { sensitivity: 'base' }),
        );
        onConfirm(selectedCategorias);
        onClose();
    };

    const selectedCategorias = Object.values(selectedById).sort((a, b) =>
        a.categoriaNombre.localeCompare(b.categoriaNombre, 'es', { sensitivity: 'base' }),
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Seleccionar Categorías Habilitadas</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <InputGroup>
                            <Input
                                value={searchNombre}
                                onChange={(event) => setSearchNombre(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !loading) {
                                        void fetchCategorias(0);
                                    }
                                }}
                                placeholder="Buscar categoría por nombre"
                            />
                            <InputRightElement width="auto" px={2}>
                                <Button
                                    colorScheme="blue"
                                    size="sm"
                                    onClick={() => void fetchCategorias(0)}
                                    isLoading={loading}
                                >
                                    Buscar
                                </Button>
                            </InputRightElement>
                        </InputGroup>

                        <Box>
                            <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                                <Text fontWeight="semibold">
                                    Seleccionadas: {selectedCategorias.length}
                                </Text>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={() => setSelectedById({})}
                                    isDisabled={selectedCategorias.length === 0}
                                >
                                    Limpiar selección
                                </Button>
                            </HStack>

                            {selectedCategorias.length === 0 ? (
                                <Text color="gray.500" fontSize="sm">
                                    Sin categorías configuradas.
                                </Text>
                            ) : (
                                <Wrap>
                                    {selectedCategorias.map((categoria) => (
                                        <WrapItem key={categoria.categoriaId}>
                                            <Tag colorScheme="teal" borderRadius="full">
                                                <TagLabel>{categoria.categoriaNombre}</TagLabel>
                                            </Tag>
                                        </WrapItem>
                                    ))}
                                </Wrap>
                            )}
                        </Box>

                        {loading ? (
                            <Flex justify="center" py={8}>
                                <Spinner size="lg" />
                            </Flex>
                        ) : categorias.length === 0 ? (
                            <Text textAlign="center" py={6} color="gray.500">
                                No se encontraron categorías.
                            </Text>
                        ) : (
                            <>
                                <TableContainer borderWidth="1px" borderRadius="lg">
                                    <Table size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>Seleccionar</Th>
                                                <Th>ID</Th>
                                                <Th>Nombre</Th>
                                                <Th>Descripción</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {categorias.map((categoria) => {
                                                const checked = Boolean(selectedById[categoria.categoriaId]);
                                                return (
                                                    <Tr
                                                        key={categoria.categoriaId}
                                                        bg={checked ? 'teal.50' : 'white'}
                                                        _hover={{ bg: checked ? 'teal.100' : 'gray.50' }}
                                                        cursor="pointer"
                                                        onClick={() => toggleCategoria(categoria)}
                                                    >
                                                        <Td onClick={(event) => event.stopPropagation()}>
                                                            <Checkbox
                                                                isChecked={checked}
                                                                onChange={() => toggleCategoria(categoria)}
                                                            />
                                                        </Td>
                                                        <Td>{categoria.categoriaId}</Td>
                                                        <Td>{categoria.categoriaNombre}</Td>
                                                        <Td>{categoria.categoriaDescripcion || '-'}</Td>
                                                    </Tr>
                                                );
                                            })}
                                        </Tbody>
                                    </Table>
                                </TableContainer>

                                <MyPagination
                                    page={page}
                                    totalPages={totalPages}
                                    loading={loading}
                                    handlePageChange={(nextPage) => void fetchCategorias(nextPage)}
                                />
                            </>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button colorScheme="teal" onClick={handleConfirm}>
                        Confirmar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
