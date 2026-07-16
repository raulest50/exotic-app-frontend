import { useEffect, useState } from 'react';
import {
    Badge,
    Box,
    Button,
    Checkbox,
    Flex,
    FormControl,
    FormLabel,
    Grid,
    Heading,
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
    SimpleGrid,
    Spinner,
    Select,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useColorModeValue,
    useToast,
    VStack,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import MyPagination from '../../../components/MyPagination.tsx';
import { Categoria } from '../../Produccion/types.tsx';
import {
    CategoriaHabilitada,
    PaginatedResponse,
    UnidadMedidaAreaOperativa,
} from '../ConsultaAreasOperativas/types.ts';

interface CategoriaHabilitadaPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSelected: CategoriaHabilitada[];
    onConfirm: (categorias: CategoriaHabilitada[]) => void;
    unidadesDisponibles?: UnidadMedidaAreaOperativa[];
    allowUnidadSelection?: boolean;
}

const PAGE_SIZE = 10;

export default function CategoriaHabilitadaPickerModal({
    isOpen,
    onClose,
    initialSelected,
    onConfirm,
    unidadesDisponibles = [],
    allowUnidadSelection = false,
}: CategoriaHabilitadaPickerModalProps) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [searchNombre, setSearchNombre] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedById, setSelectedById] = useState<Record<number, CategoriaHabilitada>>({});

    const endPoints = new EndPointsURL();
    const toast = useToast();
    const selectedRowHoverBg = useColorModeValue('teal.100', 'teal.800');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const nextSelected = initialSelected.reduce<Record<number, CategoriaHabilitada>>((acc, categoria) => {
            acc[categoria.categoriaId] = {
                ...categoria,
                unidadMedidaId: categoria.unidadMedidaId ?? null,
                factorLote: categoria.factorLote ?? null,
            };
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
                    unidadMedidaId: null,
                    factorLote: null,
                };
            }
            return next;
        });
    };

    const setUnidadForCategoria = (categoriaId: number, unidadId: number | null) => {
        setSelectedById((prev) => {
            const selected = prev[categoriaId];
            if (!selected) {
                return prev;
            }

            return {
                ...prev,
                [categoriaId]: {
                    ...selected,
                    unidadMedidaId: unidadId,
                    factorLote: unidadId === null ? null : selected.factorLote ?? 1,
                },
            };
        });
    };

    const setFactorLoteForCategoria = (categoriaId: number, factorLote: number | null) => {
        setSelectedById((prev) => {
            const selected = prev[categoriaId];
            if (!selected) {
                return prev;
            }

            return {
                ...prev,
                [categoriaId]: {
                    ...selected,
                    factorLote,
                },
            };
        });
    };

    const handleConfirm = () => {
        const hasInvalidFactor = Object.values(selectedById).some((categoria) =>
            Boolean(categoria.unidadMedidaId) && (!categoria.factorLote || categoria.factorLote <= 0),
        );
        if (hasInvalidFactor) {
            toast({
                title: 'Factor lote requerido',
                description: 'Toda categoría con unidad asociada debe tener un factor lote mayor que cero.',
                status: 'warning',
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        const selectedCategorias = Object.values(selectedById)
            .map((categoria) => ({
                ...categoria,
                unidadMedidaId: categoria.unidadMedidaId ?? null,
                factorLote: categoria.unidadMedidaId ? categoria.factorLote ?? 1 : null,
            }))
            .sort((a, b) =>
                a.categoriaNombre.localeCompare(b.categoriaNombre, 'es', { sensitivity: 'base' }),
            );
        onConfirm(selectedCategorias);
        onClose();
    };

    const selectedCategorias = Object.values(selectedById).sort((a, b) =>
        a.categoriaNombre.localeCompare(b.categoriaNombre, 'es', { sensitivity: 'base' }),
    );
    const hasInvalidFactor = selectedCategorias.some((categoria) =>
        Boolean(categoria.unidadMedidaId) && (!categoria.factorLote || categoria.factorLote <= 0),
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent
                w="calc(100% - 24px)"
                h={{ base: 'calc(100dvh - 24px)', md: 'min(760px, calc(100dvh - 48px))' }}
                maxH={{ base: 'calc(100dvh - 24px)', md: 'calc(100dvh - 48px)' }}
                my={3}
                mx={3}
                overflow="hidden"
                borderRadius={{ base: 'xl', md: '2xl' }}
                bg="app.surface"
            >
                <ModalHeader px={{ base: 4, md: 6 }} py={4} borderBottomWidth="1px" borderColor="app.border">
                    <Box pr={10}>
                        <HStack spacing={3} flexWrap="wrap">
                            <Heading as="h2" size="md" fontFamily="Comfortaa Variable">
                                Gestionar categorías
                            </Heading>
                            <Badge colorScheme="teal">{selectedCategorias.length} seleccionadas</Badge>
                        </HStack>
                        <Text color="app.textSubtle" fontSize="sm" fontWeight="normal" mt={1}>
                            Busque categorías y configure sus unidades de medida cuando corresponda.
                        </Text>
                    </Box>
                </ModalHeader>
                <ModalCloseButton top={4} right={4} />
                <ModalBody p={0} overflow="hidden" minH={0}>
                    <Grid
                        h="full"
                        minH={0}
                        templateColumns={{ base: '1fr', lg: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)' }}
                        overflowY={{ base: 'auto', lg: 'hidden' }}
                    >
                        <VStack
                            align="stretch"
                            spacing={4}
                            p={{ base: 4, md: 5 }}
                            minW={0}
                            overflowY={{ base: 'visible', lg: 'auto' }}
                        >
                            <Box>
                                <Heading as="h3" size="sm">Categorías disponibles</Heading>
                                <Text color="app.textSubtle" fontSize="sm" mt={1}>
                                    Seleccione una o varias categorías de los resultados.
                                </Text>
                            </Box>

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
                                    pr="92px"
                                />
                                <InputRightElement width="auto" px={2}>
                                    <Button
                                        colorScheme="teal"
                                        size="sm"
                                        onClick={() => void fetchCategorias(0)}
                                        isLoading={loading}
                                    >
                                        Buscar
                                    </Button>
                                </InputRightElement>
                            </InputGroup>

                            {loading ? (
                                <Flex justify="center" align="center" minH="260px">
                                    <Spinner size="lg" />
                                </Flex>
                            ) : categorias.length === 0 ? (
                                <Flex
                                    minH="260px"
                                    borderWidth="1px"
                                    borderStyle="dashed"
                                    borderColor="app.border"
                                    borderRadius="xl"
                                    align="center"
                                    justify="center"
                                    direction="column"
                                    textAlign="center"
                                    px={6}
                                >
                                    <Text fontWeight="semibold">No se encontraron categorías</Text>
                                    <Text color="app.textSubtle" fontSize="sm" mt={1}>
                                        Intente con otro término de búsqueda.
                                    </Text>
                                </Flex>
                            ) : (
                                <>
                                    <TableContainer borderWidth="1px" borderColor="app.border" borderRadius="xl">
                                        <Table size="sm">
                                            <Thead bg="app.tableHeader">
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
                                                            bg={checked ? 'app.rowSelectedTeal' : 'app.surface'}
                                                            _hover={{ bg: checked ? selectedRowHoverBg : 'app.rowHover' }}
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
                                                            <Td fontWeight="medium">{categoria.categoriaNombre}</Td>
                                                            <Td>
                                                                <Text noOfLines={2} minW="180px">
                                                                    {categoria.categoriaDescripcion || '-'}
                                                                </Text>
                                                            </Td>
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

                        <VStack
                            align="stretch"
                            spacing={4}
                            p={{ base: 4, md: 5 }}
                            minW={0}
                            bg="app.surfaceSubtle"
                            borderTopWidth={{ base: '1px', lg: 0 }}
                            borderLeftWidth={{ base: 0, lg: '1px' }}
                            borderColor="app.border"
                            overflowY={{ base: 'visible', lg: 'auto' }}
                        >
                            <Flex justify="space-between" align="flex-start" gap={3}>
                                <Box>
                                    <HStack>
                                        <Heading as="h3" size="sm">Selección actual</Heading>
                                        <Badge colorScheme="teal">{selectedCategorias.length}</Badge>
                                    </HStack>
                                    <Text color="app.textSubtle" fontSize="sm" mt={1}>
                                        {allowUnidadSelection
                                            ? 'Asocie una unidad y un factor de lote cuando sea necesario.'
                                            : 'Estas categorías quedarán habilitadas para el área.'}
                                    </Text>
                                </Box>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={() => setSelectedById({})}
                                    isDisabled={selectedCategorias.length === 0}
                                    flexShrink={0}
                                >
                                    Limpiar
                                </Button>
                            </Flex>

                            {selectedCategorias.length === 0 ? (
                                <Flex
                                    minH="260px"
                                    borderWidth="1px"
                                    borderStyle="dashed"
                                    borderColor="app.border"
                                    borderRadius="xl"
                                    bg="app.surface"
                                    align="center"
                                    justify="center"
                                    direction="column"
                                    textAlign="center"
                                    px={6}
                                >
                                    <Text fontWeight="semibold">Sin categorías seleccionadas</Text>
                                    <Text color="app.textSubtle" fontSize="sm" mt={1}>
                                        Seleccione categorías desde la tabla de resultados.
                                    </Text>
                                </Flex>
                            ) : (
                                <VStack align="stretch" spacing={3}>
                                    {allowUnidadSelection && unidadesDisponibles.length === 0 && (
                                        <Box
                                            borderWidth="1px"
                                            borderColor="app.border"
                                            borderRadius="lg"
                                            bg="app.surface"
                                            px={4}
                                            py={3}
                                        >
                                            <Text color="app.textSubtle" fontSize="sm">
                                                Sin unidades disponibles para asociar.
                                            </Text>
                                        </Box>
                                    )}

                                    {selectedCategorias.map((categoria) => (
                                        <Box
                                            key={categoria.categoriaId}
                                            borderWidth="1px"
                                            borderColor="app.border"
                                            borderRadius="xl"
                                            bg="app.surface"
                                            p={4}
                                        >
                                            <Flex justify="space-between" align="flex-start" gap={3} mb={allowUnidadSelection ? 4 : 0}>
                                                <Box minW={0}>
                                                    <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
                                                        {categoria.categoriaNombre}
                                                    </Text>
                                                    <Text color="app.textSubtle" fontSize="xs" mt={1}>
                                                        Categoría #{categoria.categoriaId}
                                                    </Text>
                                                </Box>
                                                <Badge colorScheme="teal" flexShrink={0}>Seleccionada</Badge>
                                            </Flex>

                                            {allowUnidadSelection && (
                                                <SimpleGrid columns={{ base: 1, sm: 2, lg: 1, xl: 2 }} spacing={3}>
                                                    <FormControl>
                                                        <FormLabel fontSize="xs">Unidad</FormLabel>
                                                        <Select
                                                            size="sm"
                                                            value={categoria.unidadMedidaId ?? ''}
                                                            onChange={(event) => setUnidadForCategoria(
                                                                categoria.categoriaId,
                                                                event.target.value ? Number(event.target.value) : null,
                                                            )}
                                                        >
                                                            <option value="">Sin unidad</option>
                                                            {unidadesDisponibles.map((unidad) => (
                                                                <option key={unidad.id} value={unidad.id}>
                                                                    {unidad.nombre}
                                                                </option>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                    <FormControl>
                                                        <FormLabel fontSize="xs">Factor lote</FormLabel>
                                                        <Input
                                                            size="sm"
                                                            type="number"
                                                            min={0.000001}
                                                            step="0.000001"
                                                            value={categoria.factorLote ?? ''}
                                                            isDisabled={!categoria.unidadMedidaId}
                                                            onChange={(event) => {
                                                                const parsed = Number(event.target.value);
                                                                setFactorLoteForCategoria(
                                                                    categoria.categoriaId,
                                                                    event.target.value && Number.isFinite(parsed) ? parsed : null,
                                                                );
                                                            }}
                                                        />
                                                    </FormControl>
                                                </SimpleGrid>
                                            )}
                                        </Box>
                                    ))}
                                </VStack>
                            )}
                        </VStack>
                    </Grid>
                </ModalBody>
                <ModalFooter
                    px={{ base: 4, md: 6 }}
                    py={4}
                    borderTopWidth="1px"
                    borderColor="app.border"
                    bg="app.surface"
                    flexShrink={0}
                >
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button colorScheme="teal" onClick={handleConfirm} isDisabled={hasInvalidFactor}>
                        Confirmar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
