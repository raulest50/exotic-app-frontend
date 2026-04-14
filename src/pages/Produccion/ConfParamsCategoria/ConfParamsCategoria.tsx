import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import MyPagination from '../../../components/MyPagination.tsx';
import {
    Flex,
    Box,
    FormControl,
    FormLabel,
    Input,
    InputGroup,
    InputRightElement,
    Button,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Spinner,
    Alert,
    AlertIcon,
    Text,
    useToast,
    IconButton,
    Icon,
} from '@chakra-ui/react';
import { LockIcon, UnlockIcon } from '@chakra-ui/icons';
import { RiSave3Fill } from 'react-icons/ri';
import CustomIntegerInput from '../../../components/CustomIntegerInput/CustomIntegerInput.tsx';
import { Categoria } from '../types.tsx';
import { RutaProcesoCatDesigner } from '../RutaProcesoCatDesigner';

const PAGE_SIZE = 10;

type EditableCategoriaField = 'loteSize' | 'tiempoDiasFabricacion';

export default function ConfParamsCategoria() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [searchNombre, setSearchNombre] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingLoteSize, setEditingLoteSize] = useState<Record<number, number>>({});
    const [editingTiempoDiasFabricacion, setEditingTiempoDiasFabricacion] = useState<Record<number, number>>({});
    const [unlockedFields, setUnlockedFields] = useState<Record<string, boolean>>({});
    const [savingFieldKey, setSavingFieldKey] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'designer'>('list');
    const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
    const [rutasExistentes, setRutasExistentes] = useState<Record<number, boolean>>({});
    const [loadingRutas, setLoadingRutas] = useState(false);
    const endPoints = new EndPointsURL();
    const toast = useToast();

    const buildFieldKey = (categoriaId: number, field: EditableCategoriaField) => `${categoriaId}-${field}`;

    const openRutaDesigner = (categoria: Categoria) => {
        setSelectedCategoria(categoria);
        setViewMode('designer');
    };

    const backToList = () => {
        setViewMode('list');
        setSelectedCategoria(null);
        if (categorias.length > 0) {
            const categoriaIds = categorias.map(c => c.categoriaId);
            fetchRutasExistentes(categoriaIds);
        }
    };

    const fetchRutasExistentes = async (categoriaIds: number[]) => {
        if (categoriaIds.length === 0) return;
        setLoadingRutas(true);
        try {
            const response = await axios.get(endPoints.check_rutas_exist_batch, {
                params: { categoriaIds: categoriaIds.join(',') }
            });
            setRutasExistentes(response.data);
        } catch (err) {
            console.error('Error checking rutas existentes:', err);
        } finally {
            setLoadingRutas(false);
        }
    };

    const fetchCategorias = useCallback(
        async (pageNumber: number) => {
            setLoading(true);
            setError(null);
            try {
                const params: { page: number; size: number; nombre?: string } = {
                    page: pageNumber,
                    size: PAGE_SIZE,
                };
                if (searchNombre.trim()) {
                    params.nombre = searchNombre.trim();
                }
                const response = await axios.get(endPoints.search_categorias_pag, { params });
                const loadedCategorias: Categoria[] = response.data.content;
                setCategorias(loadedCategorias);
                setTotalPages(response.data.totalPages);
                setPage(pageNumber);

                setEditingLoteSize((prev) => {
                    const next: Record<number, number> = {};
                    loadedCategorias.forEach((c: Categoria) => {
                        next[c.categoriaId] = c.loteSize ?? 0;
                    });
                    return { ...prev, ...next };
                });

                setEditingTiempoDiasFabricacion((prev) => {
                    const next: Record<number, number> = {};
                    loadedCategorias.forEach((c: Categoria) => {
                        next[c.categoriaId] = c.tiempoDiasFabricacion ?? 0;
                    });
                    return { ...prev, ...next };
                });

                if (loadedCategorias.length > 0) {
                    const categoriaIds = loadedCategorias.map(c => c.categoriaId);
                    fetchRutasExistentes(categoriaIds);
                }
            } catch (err) {
                console.error('Error fetching categorias:', err);
                setError('Error al cargar las categorias. Por favor, intente nuevamente.');
                setCategorias([]);
                setTotalPages(1);
            } finally {
                setLoading(false);
            }
        },
        [searchNombre, endPoints.search_categorias_pag]
    );

    useEffect(() => {
        fetchCategorias(0);
    }, []);

    const handleSearch = () => {
        fetchCategorias(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const toggleLock = (categoriaId: number, field: EditableCategoriaField) => {
        const fieldKey = buildFieldKey(categoriaId, field);
        setUnlockedFields((prev) => ({
            ...prev,
            [fieldKey]: !prev[fieldKey],
        }));
    };

    const handleLoteSizeChange = (categoriaId: number, value: number) => {
        setEditingLoteSize((prev) => ({
            ...prev,
            [categoriaId]: value,
        }));
    };

    const handleTiempoDiasFabricacionChange = (categoriaId: number, value: number) => {
        setEditingTiempoDiasFabricacion((prev) => ({
            ...prev,
            [categoriaId]: value,
        }));
    };

    const handleSaveLoteSize = async (categoria: Categoria) => {
        const categoriaId = categoria.categoriaId;
        const value = editingLoteSize[categoriaId] ?? categoria.loteSize ?? 0;
        const fieldKey = buildFieldKey(categoriaId, 'loteSize');
        if (value < 0) return;

        setSavingFieldKey(fieldKey);
        try {
            const url = endPoints.update_categoria_lote_size.replace('{categoriaId}', String(categoriaId));
            await axios.patch(url, { loteSize: value });
            setCategorias((prev) =>
                prev.map((c) => (c.categoriaId === categoriaId ? { ...c, loteSize: value } : c))
            );
            setEditingLoteSize((prev) => ({ ...prev, [categoriaId]: value }));
            setUnlockedFields((prev) => ({ ...prev, [fieldKey]: false }));
            toast({
                title: 'Tamano de lote actualizado',
                description: `Categoria "${categoria.categoriaNombre}" actualizada correctamente`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            console.error('Error updating lote size:', err);
            let errorMessage = 'No se pudo actualizar el tamano de lote.';
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingFieldKey(null);
        }
    };

    const handleSaveTiempoDiasFabricacion = async (categoria: Categoria) => {
        const categoriaId = categoria.categoriaId;
        const value = editingTiempoDiasFabricacion[categoriaId] ?? categoria.tiempoDiasFabricacion ?? 0;
        const fieldKey = buildFieldKey(categoriaId, 'tiempoDiasFabricacion');
        if (value < 0) return;

        setSavingFieldKey(fieldKey);
        try {
            const url = endPoints.update_categoria_tiempo_dias_fabricacion.replace('{categoriaId}', String(categoriaId));
            await axios.patch(url, { tiempoDiasFabricacion: value });
            setCategorias((prev) =>
                prev.map((c) => (
                    c.categoriaId === categoriaId ? { ...c, tiempoDiasFabricacion: value } : c
                ))
            );
            setEditingTiempoDiasFabricacion((prev) => ({ ...prev, [categoriaId]: value }));
            setUnlockedFields((prev) => ({ ...prev, [fieldKey]: false }));
            toast({
                title: 'Tiempo de fabricacion actualizado',
                description: `Categoria "${categoria.categoriaNombre}" actualizada correctamente`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            console.error('Error updating tiempo dias fabricacion:', err);
            let errorMessage = 'No se pudo actualizar el tiempo de fabricacion.';
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingFieldKey(null);
        }
    };

    if (viewMode === 'designer' && selectedCategoria) {
        return (
            <RutaProcesoCatDesigner
                categoria={selectedCategoria}
                onBack={backToList}
            />
        );
    }

    return (
        <Flex direction="column" p={4}>
            <Box p={4} borderWidth="1px" borderRadius="lg" mb={4}>
                <FormControl>
                    <FormLabel>Buscar por nombre</FormLabel>
                    <InputGroup>
                        <Input
                            value={searchNombre}
                            onChange={(e) => setSearchNombre(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Coincidencia parcial (vacio = todas)"
                        />
                        <InputRightElement width="auto" px={2}>
                            <Button
                                colorScheme="blue"
                                size="sm"
                                onClick={handleSearch}
                                isLoading={loading}
                            >
                                Buscar
                            </Button>
                        </InputRightElement>
                    </InputGroup>
                </FormControl>
            </Box>

            {error && (
                <Alert status="error" mb={4}>
                    <AlertIcon />
                    <Text>{error}</Text>
                </Alert>
            )}

            {loading && categorias.length === 0 ? (
                <Flex justify="center" py={8}>
                    <Spinner size="lg" />
                </Flex>
            ) : !loading && categorias.length === 0 ? (
                <Alert status="info" mb={4}>
                    <AlertIcon />
                    <Text>
                        No se encontraron categorias.
                        {searchNombre.trim()
                            ? ' Pruebe con otro criterio de busqueda.'
                            : ' No hay categorias registradas.'}
                    </Text>
                </Alert>
            ) : (
                <>
                    <Box borderWidth="1px" borderRadius="lg" overflow="hidden" mb={4}>
                        <Table variant="simple">
                            <Thead>
                                <Tr>
                                    <Th>ID</Th>
                                    <Th>Nombre</Th>
                                    <Th>Tamano de lote</Th>
                                    <Th>Tiempo fabricacion (dias)</Th>
                                    <Th>Ruta de Proceso</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {categorias.map((categoria) => (
                                    <Tr key={categoria.categoriaId}>
                                        <Td>{categoria.categoriaId}</Td>
                                        <Td>{categoria.categoriaNombre}</Td>
                                        <Td>
                                            {(() => {
                                                const catId = categoria.categoriaId;
                                                const fieldKey = buildFieldKey(catId, 'loteSize');
                                                const unlocked = !!unlockedFields[fieldKey];
                                                const currentValue = editingLoteSize[catId] ?? categoria.loteSize ?? 0;
                                                const originalValue = categoria.loteSize ?? 0;
                                                const hasChanges = currentValue !== originalValue;
                                                return (
                                                    <Flex align="center" gap={2}>
                                                        <IconButton
                                                            aria-label={unlocked ? 'Bloquear edicion' : 'Habilitar edicion'}
                                                            icon={unlocked ? <UnlockIcon boxSize={5} /> : <LockIcon boxSize={5} />}
                                                            variant="ghost"
                                                            size="sm"
                                                            boxSize={10}
                                                            onClick={() => toggleLock(catId, 'loteSize')}
                                                        />
                                                        <CustomIntegerInput
                                                            value={currentValue}
                                                            onChange={(v) => handleLoteSizeChange(catId, v)}
                                                            isDisabled={!unlocked}
                                                            min={0}
                                                            placeholder="0"
                                                            width="100px"
                                                        />
                                                        {unlocked && hasChanges && (
                                                            <IconButton
                                                                aria-label="Guardar"
                                                                icon={<Icon as={RiSave3Fill} boxSize={5} />}
                                                                colorScheme="green"
                                                                size="sm"
                                                                boxSize={10}
                                                                onClick={() => handleSaveLoteSize(categoria)}
                                                                isLoading={savingFieldKey === fieldKey}
                                                            />
                                                        )}
                                                    </Flex>
                                                );
                                            })()}
                                        </Td>
                                        <Td>
                                            {(() => {
                                                const catId = categoria.categoriaId;
                                                const fieldKey = buildFieldKey(catId, 'tiempoDiasFabricacion');
                                                const unlocked = !!unlockedFields[fieldKey];
                                                const currentValue =
                                                    editingTiempoDiasFabricacion[catId] ?? categoria.tiempoDiasFabricacion ?? 0;
                                                const originalValue = categoria.tiempoDiasFabricacion ?? 0;
                                                const hasChanges = currentValue !== originalValue;
                                                return (
                                                    <Flex align="center" gap={2}>
                                                        <IconButton
                                                            aria-label={unlocked ? 'Bloquear edicion' : 'Habilitar edicion'}
                                                            icon={unlocked ? <UnlockIcon boxSize={5} /> : <LockIcon boxSize={5} />}
                                                            variant="ghost"
                                                            size="sm"
                                                            boxSize={10}
                                                            onClick={() => toggleLock(catId, 'tiempoDiasFabricacion')}
                                                        />
                                                        <CustomIntegerInput
                                                            value={currentValue}
                                                            onChange={(v) => handleTiempoDiasFabricacionChange(catId, v)}
                                                            isDisabled={!unlocked}
                                                            min={0}
                                                            placeholder="0"
                                                            width="120px"
                                                        />
                                                        {unlocked && hasChanges && (
                                                            <IconButton
                                                                aria-label="Guardar"
                                                                icon={<Icon as={RiSave3Fill} boxSize={5} />}
                                                                colorScheme="green"
                                                                size="sm"
                                                                boxSize={10}
                                                                onClick={() => handleSaveTiempoDiasFabricacion(categoria)}
                                                                isLoading={savingFieldKey === fieldKey}
                                                            />
                                                        )}
                                                    </Flex>
                                                );
                                            })()}
                                        </Td>
                                        <Td>
                                            {(() => {
                                                const hasRuta = rutasExistentes[categoria.categoriaId] === true;
                                                return (
                                                    <Button
                                                        size="sm"
                                                        colorScheme={hasRuta ? 'purple' : 'teal'}
                                                        onClick={() => openRutaDesigner(categoria)}
                                                        isLoading={loadingRutas}
                                                    >
                                                        {hasRuta ? 'Editar Ruta Proc' : 'Crear Ruta Proc'}
                                                    </Button>
                                                );
                                            })()}
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </Box>
                    {totalPages > 1 && (
                        <MyPagination
                            page={page}
                            totalPages={totalPages}
                            loading={loading}
                            handlePageChange={fetchCategorias}
                        />
                    )}
                </>
            )}
        </Flex>
    );
}
