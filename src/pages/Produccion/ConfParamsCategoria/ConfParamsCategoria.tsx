import { useCallback, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import MyPagination from "../../../components/MyPagination.tsx";
import {
    Alert,
    Box,
    Button,
    Flex,
    Icon,
    IconButton,
    Input,
    InputGroup,
    Spinner,
    Table,
    Text,
    Field,
    NativeSelect,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { RiSave3Fill } from "react-icons/ri";
import CustomIntegerInput from "../../../components/CustomIntegerInput/CustomIntegerInput.tsx";
import type { Categoria, UnidadTiempoVencimiento } from "../types.tsx";
import { RutaProcesoCatDesigner } from "./RutaProcesoCatDesigner";
import { LuLock, LuLockOpen } from 'react-icons/lu';

const PAGE_SIZE = 10;

type EditableCategoriaField = "loteSize" | "tiempoDiasFabricacion" | "vidaUtil";

type VidaUtilDraft = {
    cantidad: string;
    unidad: UnidadTiempoVencimiento | null;
};

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
    const [editingVidaUtil, setEditingVidaUtil] = useState<Record<number, VidaUtilDraft>>({});
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

            setEditingVidaUtil((prev) => {
                const next: Record<number, VidaUtilDraft> = {};
                loadedCategorias.forEach((c) => {
                    next[c.categoriaId] = {
                        cantidad: c.vidaUtilCantidad != null ? String(c.vidaUtilCantidad) : "",
                        unidad: c.vidaUtilUnidad ?? null,
                    };
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

    const handleVidaUtilCantidadChange = (categoriaId: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        setEditingVidaUtil((prev) => ({
            ...prev,
            [categoriaId]: {
                ...(prev[categoriaId] ?? { cantidad: "", unidad: null }),
                cantidad: value,
            },
        }));
    };

    const handleVidaUtilUnidadChange = (
        categoriaId: number,
        unidad: UnidadTiempoVencimiento | null,
    ) => {
        setEditingVidaUtil((prev) => {
            const current = prev[categoriaId] ?? { cantidad: "", unidad: null };
            return {
                ...prev,
                [categoriaId]: {
                    cantidad: unidad == null ? "" : (current.cantidad || "1"),
                    unidad,
                },
            };
        });
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

    const handleSaveVidaUtil = async (categoria: Categoria) => {
        const categoriaId = categoria.categoriaId;
        const draft = editingVidaUtil[categoriaId] ?? { cantidad: "", unidad: null };
        const fieldKey = buildFieldKey(categoriaId, "vidaUtil");
        const cantidad = draft.unidad == null ? null : Number(draft.cantidad);
        if (draft.unidad != null && (cantidad == null || !Number.isInteger(cantidad) || cantidad <= 0)) {
            toast({
                title: "Vida util invalida",
                description: "La cantidad debe ser un numero entero mayor que cero.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        setSavingFieldKey(fieldKey);
        try {
            const url = endPoints.update_categoria_vida_util.replace(
                "{categoriaId}", String(categoriaId));
            const response = await axios.patch<Categoria>(url, {
                vidaUtilCantidad: cantidad,
                vidaUtilUnidad: draft.unidad,
            });
            setCategorias((prev) => prev.map((c) => (
                c.categoriaId === categoriaId ? response.data : c
            )));
            setEditingVidaUtil((prev) => ({
                ...prev,
                [categoriaId]: {
                    cantidad: response.data.vidaUtilCantidad != null
                        ? String(response.data.vidaUtilCantidad)
                        : "",
                    unidad: response.data.vidaUtilUnidad ?? null,
                },
            }));
            setUnlockedFields((prev) => ({ ...prev, [fieldKey]: false }));
            toast({
                title: "Vida util actualizada",
                description: `Categoria "${categoria.categoriaNombre}" actualizada correctamente`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            toast({
                title: "Error",
                description: getAxiosErrorMessage(err, "No se pudo actualizar la vida util."),
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
                    <InputGroup
                        endElement={(
                            <Button colorPalette="blue" size="sm" onClick={handleSearch} loading={loading}>
                                Buscar
                            </Button>
                        )}
                        endElementProps={{ width: "auto", px: 2 }}
                    >
                        <Input
                            value={searchNombre}
                            onChange={(e) => setSearchNombre(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Coincidencia parcial (vacio = todas)"
                            pe="5rem"
                        />
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
                            <Table.Root variant="line" size="sm" minW="1180px">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                        <Table.ColumnHeader>Tamano de lote</Table.ColumnHeader>
                                        <Table.ColumnHeader>Vida util / vencimiento</Table.ColumnHeader>
                                        <Table.ColumnHeader>Tiempo fabricacion (dias)</Table.ColumnHeader>
                                        <Table.ColumnHeader>Ruta de Proceso</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {categorias.map((categoria) => {
                                        const catId = categoria.categoriaId;
                                        const loteFieldKey = buildFieldKey(catId, "loteSize");
                                        const tiempoFieldKey = buildFieldKey(catId, "tiempoDiasFabricacion");
                                        const vidaUtilFieldKey = buildFieldKey(catId, "vidaUtil");

                                        const currentLote = editingLoteSize[catId] ?? categoria.loteSize ?? 0;
                                        const currentTiempo = editingTiempoDiasFabricacion[catId] ?? categoria.tiempoDiasFabricacion ?? 0;
                                        const currentVidaUtil = editingVidaUtil[catId] ?? {
                                            cantidad: categoria.vidaUtilCantidad != null
                                                ? String(categoria.vidaUtilCantidad)
                                                : "",
                                            unidad: categoria.vidaUtilUnidad ?? null,
                                        };
                                        const vidaUtilChanged = currentVidaUtil.cantidad
                                            !== (categoria.vidaUtilCantidad != null
                                                ? String(categoria.vidaUtilCantidad)
                                                : "")
                                            || currentVidaUtil.unidad !== (categoria.vidaUtilUnidad ?? null);

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
                                                            onClick={() => toggleLock(catId, "loteSize")}>{unlockedFields[loteFieldKey] ? <Icon as={LuLockOpen} boxSize={5} /> : <Icon as={LuLock} boxSize={5} />}</IconButton>
                                                        <CustomIntegerInput
                                                            value={currentLote}
                                                            onChange={(v) => handleLoteSizeChange(catId, v)}
                                                            disabled={!unlockedFields[loteFieldKey]}
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
                                                    <Flex align="center" gap={2} minW="330px">
                                                        <IconButton
                                                            aria-label={unlockedFields[vidaUtilFieldKey]
                                                                ? "Bloquear edicion"
                                                                : "Habilitar edicion"}
                                                            variant="ghost"
                                                            size="sm"
                                                            boxSize={10}
                                                            onClick={() => toggleLock(catId, "vidaUtil")}
                                                        >
                                                            {unlockedFields[vidaUtilFieldKey]
                                                                ? <Icon as={LuLockOpen} boxSize={5} />
                                                                : <Icon as={LuLock} boxSize={5} />}
                                                        </IconButton>
                                                        <Input
                                                            value={currentVidaUtil.cantidad}
                                                            onChange={(event) => handleVidaUtilCantidadChange(
                                                                catId, event.target.value)}
                                                            disabled={!unlockedFields[vidaUtilFieldKey]
                                                                || currentVidaUtil.unidad == null}
                                                            inputMode="numeric"
                                                            placeholder="N"
                                                            width="70px"
                                                            textAlign="right"
                                                        />
                                                        <NativeSelect.Root
                                                            width="160px"
                                                            disabled={!unlockedFields[vidaUtilFieldKey]}
                                                        >
                                                            <NativeSelect.Field
                                                                value={currentVidaUtil.unidad ?? ""}
                                                                onChange={(event) => handleVidaUtilUnidadChange(
                                                                    catId,
                                                                    (event.target.value || null)
                                                                        as UnidadTiempoVencimiento | null,
                                                                )}
                                                            >
                                                                <option value="">Sin automatico</option>
                                                                <option value="DIAS">Dias</option>
                                                                <option value="MESES">Meses</option>
                                                                <option value="ANIOS">Anios</option>
                                                            </NativeSelect.Field>
                                                            <NativeSelect.Indicator />
                                                        </NativeSelect.Root>
                                                        {unlockedFields[vidaUtilFieldKey] && vidaUtilChanged && (
                                                            <IconButton
                                                                aria-label="Guardar vida util"
                                                                colorPalette="green"
                                                                size="sm"
                                                                boxSize={10}
                                                                onClick={() => handleSaveVidaUtil(categoria)}
                                                                loading={savingFieldKey === vidaUtilFieldKey}
                                                            >
                                                                <Icon boxSize={5} asChild><RiSave3Fill /></Icon>
                                                            </IconButton>
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
                                                            onClick={() => toggleLock(catId, "tiempoDiasFabricacion")}>{unlockedFields[tiempoFieldKey] ? <Icon as={LuLockOpen} boxSize={5} /> : <Icon as={LuLock} boxSize={5} />}</IconButton>
                                                        <CustomIntegerInput
                                                            value={currentTiempo}
                                                            onChange={(v) => handleTiempoDiasFabricacionChange(catId, v)}
                                                            disabled={!unlockedFields[tiempoFieldKey]}
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
