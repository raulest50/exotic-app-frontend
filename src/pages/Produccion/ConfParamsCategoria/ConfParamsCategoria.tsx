import { useCallback, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import MyPagination from "../../../components/MyPagination.tsx";
import {
    Steps,
    Alert,
    Box,
    Button,
    Flex,
    Icon,
    IconButton,
    Input,
    InputGroup,
    InputRightElement,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    Field,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { RiSave3Fill } from "react-icons/ri";
import CustomIntegerInput from "../../../components/CustomIntegerInput/CustomIntegerInput.tsx";
import type { Categoria } from "../types.tsx";
import { RutaProcesoCatDesigner } from "./RutaProcesoCatDesigner";
import { LuLock, LuUnlock } from 'react-icons/lu';

const PAGE_SIZE = 10;

type EditableCategoriaField = "loteSize" | "tiempoDiasFabricacion";

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

export default function ConfParamsCategoria() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [searchNombre, setSearchNombre] = useState("");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingLoteSize, setEditingLoteSize] = useState<Record<number, number>>({});
    const [editingTiempoDiasFabricacion, setEditingTiempoDiasFabricacion] = useState<Record<number, number>>({});
    const [unlockedFields, setUnlockedFields] = useState<Record<string, boolean>>({});
    const [savingFieldKey, setSavingFieldKey] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"list" | "designer">("list");
    const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
    const [rutasExistentes, setRutasExistentes] = useState<Record<number, boolean>>({});
    const [loadingRutas, setLoadingRutas] = useState(false);

    const endPoints = useMemo(() => new EndPointsURL(), []);
    const toast = useAppToast();

    const buildFieldKey = (categoriaId: number, field: EditableCategoriaField) => `${categoriaId}-${field}`;

    const openRutaDesigner = (categoria: Categoria) => {
        setSelectedCategoria(categoria);
        setViewMode("designer");
    };

    const backToList = () => {
        setViewMode("list");
        setSelectedCategoria(null);
        if (categorias.length > 0) {
            const categoriaIds = categorias.map((c) => c.categoriaId);
            fetchRutasExistentes(categoriaIds);
        }
    };

    const fetchRutasExistentes = async (categoriaIds: number[]) => {
        if (categoriaIds.length === 0) return;
        setLoadingRutas(true);
        try {
            const response = await axios.get(endPoints.check_rutas_exist_batch, {
                params: { categoriaIds: categoriaIds.join(",") },
            });
            setRutasExistentes(response.data);
        } catch (err) {
            console.error("Error checking rutas existentes:", err);
        } finally {
            setLoadingRutas(false);
        }
    };

    const fetchCategorias = useCallback(async (pageNumber: number) => {
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
                loadedCategorias.forEach((c) => {
                    next[c.categoriaId] = c.loteSize ?? 0;
                });
                return { ...prev, ...next };
            });

            setEditingTiempoDiasFabricacion((prev) => {
                const next: Record<number, number> = {};
                loadedCategorias.forEach((c) => {
                    next[c.categoriaId] = c.tiempoDiasFabricacion ?? 0;
                });
                return { ...prev, ...next };
            });

            if (loadedCategorias.length > 0) {
                await fetchRutasExistentes(loadedCategorias.map((c) => c.categoriaId));
            }
        } catch (err) {
            console.error("Error fetching categorias:", err);
            setError("Error al cargar las categorias. Por favor, intente nuevamente.");
            setCategorias([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [endPoints, searchNombre]);

    useEffect(() => {
        void fetchCategorias(0);
    }, [fetchCategorias]);

    const handleSearch = () => {
        void fetchCategorias(0);
    };

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
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
        setEditingLoteSize((prev) => ({ ...prev, [categoriaId]: value }));
    };

    const handleTiempoDiasFabricacionChange = (categoriaId: number, value: number) => {
        setEditingTiempoDiasFabricacion((prev) => ({ ...prev, [categoriaId]: value }));
    };

    const handleSaveLoteSize = async (categoria: Categoria) => {
        const categoriaId = categoria.categoriaId;
        const value = editingLoteSize[categoriaId] ?? categoria.loteSize ?? 0;
        const fieldKey = buildFieldKey(categoriaId, "loteSize");
        if (value < 0) return;

        setSavingFieldKey(fieldKey);
        try {
            const url = endPoints.update_categoria_lote_size.replace("{categoriaId}", String(categoriaId));
            await axios.patch(url, { loteSize: value });
            setCategorias((prev) =>
                prev.map((c) => (c.categoriaId === categoriaId ? { ...c, loteSize: value } : c)),
            );
            setUnlockedFields((prev) => ({ ...prev, [fieldKey]: false }));
            toast({
                title: "Tamano de lote actualizado",
                description: `Categoria "${categoria.categoriaNombre}" actualizada correctamente`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            toast({
                title: "Error",
                description: getAxiosErrorMessage(err, "No se pudo actualizar el tamano de lote."),
                status: "error",
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
        const fieldKey = buildFieldKey(categoriaId, "tiempoDiasFabricacion");
        if (value < 0) return;

        setSavingFieldKey(fieldKey);
        try {
            const url = endPoints.update_categoria_tiempo_dias_fabricacion.replace("{categoriaId}", String(categoriaId));
            await axios.patch(url, { tiempoDiasFabricacion: value });
            setCategorias((prev) =>
                prev.map((c) => (c.categoriaId === categoriaId ? { ...c, tiempoDiasFabricacion: value } : c)),
            );
            setUnlockedFields((prev) => ({ ...prev, [fieldKey]: false }));
            toast({
                title: "Tiempo de fabricacion actualizado",
                description: `Categoria "${categoria.categoriaNombre}" actualizada correctamente`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            toast({
                title: "Error",
                description: getAxiosErrorMessage(err, "No se pudo actualizar el tiempo de fabricacion."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingFieldKey(null);
        }
    };

    if (viewMode === "designer" && selectedCategoria) {
        return <RutaProcesoCatDesigner categoria={selectedCategoria} onBack={backToList} />;
    }

    return (
        <Flex direction="column" p={4}>
            <Box p={4} borderWidth="1px" borderRadius="lg" mb={4}>
                <Field.Root>
                    <Field.Label>Buscar por nombre</Field.Label>
                    <InputGroup>
                        <Input
                            value={searchNombre}
                            onValueChange={(e) => setSearchNombre(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Coincidencia parcial (vacio = todas)"
                        />
                        <InputRightElement width="auto" px={2}>
                            <Button colorPalette="blue" size="sm" onClick={handleSearch} loading={loading}>
                                Buscar
                            </Button>
                        </InputRightElement>
                    </InputGroup>
                </Field.Root>
            </Box>

            {error && (
                <Alert.Root status="error" mb={4}>
                    <Alert.Indicator />
                    <Text>{error}</Text>
                </Alert.Root>
            )}

            {loading && categorias.length === 0 ? (
                <Flex justify="center" py={8}>
                    <Spinner size="lg" />
                </Flex>
            ) : !loading && categorias.length === 0 ? (
                <Alert.Root status="info" mb={4}>
                    <Alert.Indicator />
                    <Text>
                        No se encontraron categorias.
                        {searchNombre.trim()
                            ? " Pruebe con otro criterio de busqueda."
                            : " No hay categorias registradas."}
                    </Text>
                </Alert.Root>
            ) : (
                <>
                    <Box borderWidth="1px" borderRadius="lg" overflow="hidden" mb={4}>
                        <Table.ScrollArea w="full" overflowX="auto">
                            <Table.Root variant="simple" size="sm" minW="900px">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                        <Table.ColumnHeader>Tamano de lote</Table.ColumnHeader>
                                        <Table.ColumnHeader>Tiempo fabricacion (dias)</Table.ColumnHeader>
                                        <Table.ColumnHeader>Ruta de Proceso</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {categorias.map((categoria) => {
                                        const catId = categoria.categoriaId;
                                        const loteFieldKey = buildFieldKey(catId, "loteSize");
                                        const tiempoFieldKey = buildFieldKey(catId, "tiempoDiasFabricacion");

                                        const currentLote = editingLoteSize[catId] ?? categoria.loteSize ?? 0;
                                        const currentTiempo = editingTiempoDiasFabricacion[catId] ?? categoria.tiempoDiasFabricacion ?? 0;

                                        return (
                                            <Table.Row key={catId}>
                                                <Table.Cell>{catId}</Table.Cell>
                                                <Table.Cell>{categoria.categoriaNombre}</Table.Cell>
                                                <Table.Cell>
                                                    <Flex align="center" gap={2}>
                                                        <IconButton
                                                            aria-label={unlockedFields[loteFieldKey] ? "Bloquear edicion" : "Habilitar edicion"}
                                                            variant="ghost"
                                                            size="sm"
                                                            boxSize={10}
                                                            onClick={() => toggleLock(catId, "loteSize")}>{unlockedFields[loteFieldKey] ? <Icon as={LuUnlock} boxSize={5} /> : <Icon as={LuLock} boxSize={5} />}</IconButton>
                                                        <CustomIntegerInput
                                                            value={currentLote}
                                                            onChange={(v) => handleLoteSizeChange(catId, v)}
                                                            isDisabled={!unlockedFields[loteFieldKey]}
                                                            min={0}
                                                            placeholder="0"
                                                            width="100px"
                                                        />
                                                        {unlockedFields[loteFieldKey] && currentLote !== (categoria.loteSize ?? 0) && (
                                                            <IconButton
                                                                aria-label="Guardar"
                                                                colorPalette="green"
                                                                size="sm"
                                                                boxSize={10}
                                                                onClick={() => handleSaveLoteSize(categoria)}
                                                                loading={savingFieldKey === loteFieldKey}><Icon boxSize={5} asChild><RiSave3Fill /></Icon></IconButton>
                                                        )}
                                                    </Flex>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Flex align="center" gap={2}>
                                                        <IconButton
                                                            aria-label={unlockedFields[tiempoFieldKey] ? "Bloquear edicion" : "Habilitar edicion"}
                                                            variant="ghost"
                                                            size="sm"
                                                            boxSize={10}
                                                            onClick={() => toggleLock(catId, "tiempoDiasFabricacion")}>{unlockedFields[tiempoFieldKey] ? <Icon as={LuUnlock} boxSize={5} /> : <Icon as={LuLock} boxSize={5} />}</IconButton>
                                                        <CustomIntegerInput
                                                            value={currentTiempo}
                                                            onChange={(v) => handleTiempoDiasFabricacionChange(catId, v)}
                                                            isDisabled={!unlockedFields[tiempoFieldKey]}
                                                            min={0}
                                                            placeholder="0"
                                                            width="120px"
                                                        />
                                                        {unlockedFields[tiempoFieldKey] && currentTiempo !== (categoria.tiempoDiasFabricacion ?? 0) && (
                                                            <IconButton
                                                                aria-label="Guardar"
                                                                colorPalette="green"
                                                                size="sm"
                                                                boxSize={10}
                                                                onClick={() => handleSaveTiempoDiasFabricacion(categoria)}
                                                                loading={savingFieldKey === tiempoFieldKey}><Icon boxSize={5} asChild><RiSave3Fill /></Icon></IconButton>
                                                        )}
                                                    </Flex>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Button
                                                        size="sm"
                                                        colorPalette={rutasExistentes[catId] ? "purple" : "teal"}
                                                        onClick={() => openRutaDesigner(categoria)}
                                                        loading={loadingRutas}
                                                    >
                                                        {rutasExistentes[catId] ? "Editar Ruta Proc" : "Crear Ruta Proc"}
                                                    </Button>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table.Root>
                        </Table.ScrollArea>
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
