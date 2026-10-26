import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
    CloseButton,
    Badge,
    Box,
    Button,
    Checkbox,
    Flex,
    Grid,
    Input,
    NativeSelect,
    Spinner,
    Text,
    VStack,
    Field,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import type { Categoria } from "../../types.tsx";

const endpoints = new EndPointsURL();

export interface TerminadoPickerResult {
    productoId: string;
    nombre: string;
    tipo_producto: string;
    categoria?: Categoria;
    prefijoLote?: string;
}

interface TerminadoPicker4MPSProps {
    isOpen: boolean;
    onClose: () => void;
    // Solo cerrar cuando el padre acepte agregar la selección al día.
    onSelectTerminados: (terminados: TerminadoPickerResult[]) => boolean;
    alreadySelectedIds?: readonly string[];
    dayLabel?: string;
    canConfirm?: boolean;
}

interface SearchResponse {
    content?: TerminadoPickerResult[];
    totalPages?: number;
    number?: number;
}

export default function TerminadoPicker4MPS({
    isOpen,
    onClose,
    onSelectTerminados,
    alreadySelectedIds = [],
    dayLabel,
    canConfirm = true,
}: TerminadoPicker4MPSProps) {
    const toast = useAppToast();
    const [searchText, setSearchText] = useState("");
    const [results, setResults] = useState<TerminadoPickerResult[]>([]);
    // La bandeja es independiente de los resultados de la página o búsqueda actual.
    const [selected, setSelected] = useState<TerminadoPickerResult[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCategorias, setIsLoadingCategorias] = useState(false);
    const [tipoBusqueda, setTipoBusqueda] = useState<"NOMBRE" | "ID">("NOMBRE");
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [selectedCategoriaId, setSelectedCategoriaId] = useState("");
    const productsRequest = useRef<AbortController | null>(null);
    const categoriesRequest = useRef<AbortController | null>(null);
    const confirmingRef = useRef(false);
    const alreadySelected = new Set(alreadySelectedIds);
    const selection = selected.filter(producto => !alreadySelected.has(producto.productoId));
    const selectedIds = new Set(selection.map(producto => producto.productoId));
    const criteriaRef = useRef({
        searchText: "",
        tipoBusqueda: "NOMBRE" as "NOMBRE" | "ID",
        selectedCategoriaId: "",
    });

    useEffect(() => {
        criteriaRef.current = {
            searchText,
            tipoBusqueda,
            selectedCategoriaId,
        };
    }, [searchText, selectedCategoriaId, tipoBusqueda]);

    const resetState = useCallback(() => {
        productsRequest.current?.abort();
        categoriesRequest.current?.abort();
        confirmingRef.current = false;
        criteriaRef.current = {
            searchText: "",
            tipoBusqueda: "NOMBRE",
            selectedCategoriaId: "",
        };
        setSearchText("");
        setResults([]);
        setSelected([]);
        setPage(0);
        setTotalPages(1);
        setIsLoading(false);
        setIsLoadingCategorias(false);
        setTipoBusqueda("NOMBRE");
        setSelectedCategoriaId("");
    }, []);

    const fetchCategorias = useCallback(async () => {
        categoriesRequest.current?.abort();
        const controller = new AbortController();
        categoriesRequest.current = controller;
        setIsLoadingCategorias(true);
        try {
            const response = await axios.get<Categoria[]>(endpoints.get_categorias, { signal: controller.signal });
            if (controller.signal.aborted) return;
            setCategorias(response.data ?? []);
        } catch (error) {
            if (controller.signal.aborted) return;
            console.error("Error fetching categorias", error);
            setCategorias([]);
            toast({
                title: "Error al cargar categorias",
                description: "No se pudo obtener la lista de categorias.",
                status: "error",
            });
        } finally {
            if (!controller.signal.aborted) setIsLoadingCategorias(false);
        }
    }, [toast]);

    const fetchProductos = useCallback(async (
        pageToFetch = 0,
        categoriaIdOverride?: string,
    ) => {
        productsRequest.current?.abort();
        const controller = new AbortController();
        productsRequest.current = controller;
        setIsLoading(true);
        try {
            const criteria = criteriaRef.current;
            const nextCategoriaId = categoriaIdOverride ?? criteria.selectedCategoriaId;
            const categoriaId = nextCategoriaId ? Number(nextCategoriaId) : null;
            const response = await axios.post<SearchResponse>(
                endpoints.search_terminados_picker_mps,
                {
                    searchTerm: criteria.searchText ?? "",
                    tipoBusqueda: criteria.tipoBusqueda,
                    categoriaId,
                    page: pageToFetch,
                    size: 10,
                },
                { signal: controller.signal },
            );
            if (controller.signal.aborted) return;

            const data = response.data;
            const terminados = data.content ?? [];

            const mapped: TerminadoPickerResult[] = terminados.map((terminado) => ({
                productoId: terminado.productoId,
                nombre: terminado.nombre,
                tipo_producto: terminado.tipo_producto,
                categoria: terminado.categoria,
                prefijoLote: terminado.prefijoLote,
            }));

            setResults(mapped);
            setTotalPages(data.totalPages ?? 1);
            setPage(data.number ?? pageToFetch);
        } catch (error) {
            if (controller.signal.aborted) return;
            console.error("Error fetching productos terminados para MPS", error);
            setResults([]);
            setTotalPages(1);
            toast({
                title: "Error al buscar productos",
                description: "No se pudo obtener la lista de productos. Intente nuevamente.",
                status: "error",
            });
        } finally {
            if (!controller.signal.aborted) setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (isOpen) {
            void fetchCategorias();
            void fetchProductos(0);
        } else {
            resetState();
        }
        return () => {
            productsRequest.current?.abort();
            categoriesRequest.current?.abort();
        };
    }, [fetchCategorias, fetchProductos, isOpen, resetState]);

    const handleSearch = useCallback(() => {
        void fetchProductos(0);
    }, [fetchProductos]);

    const handleCategoriaChange = useCallback((nextCategoriaId: string) => {
        setSelectedCategoriaId(nextCategoriaId);
        criteriaRef.current = {
            ...criteriaRef.current,
            selectedCategoriaId: nextCategoriaId,
        };
        void fetchProductos(0, nextCategoriaId);
    }, [fetchProductos]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            handleSearch();
        }
    }, [handleSearch]);

    const selectProducto = (producto: TerminadoPickerResult, checked: boolean) => {
        if (alreadySelected.has(producto.productoId)) return;
        setSelected(previous => checked
            ? previous.some(item => item.productoId === producto.productoId) ? previous : [...previous, producto]
            : previous.filter(item => item.productoId !== producto.productoId));
    };

    const handleConfirm = () => {
        if (!canConfirm || selection.length === 0 || confirmingRef.current) return;
        confirmingRef.current = true;
        if (onSelectTerminados(selection)) {
            productsRequest.current?.abort();
            categoriesRequest.current?.abort();
            onClose();
        } else {
            // Si el día dejó de ser editable, conservar la bandeja para el usuario.
            confirmingRef.current = false;
        }
    };

    const handleCancel = () => {
        resetState();
        onClose();
    };

    const paginationLabel = useMemo(() => {
        if (totalPages <= 1) return null;
        return `Pagina ${page + 1} de ${totalPages}`;
    }, [page, totalPages]);

    return (
        <Dialog.Root open={isOpen} size="xl" scrollBehavior="inside" onOpenChange={e => {
            if (!e.open) {
                handleCancel();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW="6xl" w="calc(100vw - 2rem)" maxH="calc(100dvh - 2rem)">
                        <Dialog.Header flexDirection="column" alignItems="start" gap="1" pr="12">
                            <Dialog.Title>Seleccionar terminados para MPS</Dialog.Title>
                            {dayLabel && <Text fontSize="sm" color="fg.muted">Día de entrega: {dayLabel}</Text>}
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
                            <Grid templateColumns={{ base: "minmax(0, 1fr)", md: "minmax(0, 2fr) minmax(15rem, 1fr)" }} gap="4">
                                <Box minW="0">
                                    <Flex direction="column" gap={3}>
                                        <Flex mb={2} gap={4} align="center" wrap="wrap">
                                            <Text fontWeight="medium">Buscar por:</Text>
                                            <Flex>
                                                <Button
                                                    size="sm"
                                                    colorPalette={tipoBusqueda === "NOMBRE" ? "blue" : "gray"}
                                                    mr={2}
                                                    onClick={() => setTipoBusqueda("NOMBRE")}
                                                >
                                                    Nombre
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    colorPalette={tipoBusqueda === "ID" ? "blue" : "gray"}
                                                    onClick={() => setTipoBusqueda("ID")}
                                                >
                                                    ID
                                                </Button>
                                            </Flex>
                                        </Flex>

                                        <Flex gap={3} direction={["column", "column", "row"]}>
                                            <Field.Root>
                                                <Field.Label fontSize="sm">Categoria</Field.Label>
                                                <NativeSelect.Root disabled={isLoadingCategorias}>
                                                    <NativeSelect.Field
                                                        value={selectedCategoriaId}
                                                        onChange={(event) => handleCategoriaChange(event.target.value)}>
                                                        <option value="">Todas las categorias</option>
                                                        {categorias.map((categoria) => (
                                                            <option key={categoria.categoriaId} value={categoria.categoriaId}>
                                                                {categoria.categoriaNombre}
                                                            </option>
                                                        ))}
                                                    </NativeSelect.Field>
                                                    <NativeSelect.Indicator />
                                                </NativeSelect.Root>
                                            </Field.Root>
                                            <Field.Root>
                                                <Field.Label fontSize="sm">Texto de busqueda</Field.Label>
                                                <Flex gap={2}>
                                                    <Input
                                                        placeholder={tipoBusqueda === "NOMBRE" ? "Buscar por nombre" : "Buscar por codigo"}
                                                        value={searchText}
                                                        onChange={(event) => setSearchText(event.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                    />
                                                    <Button onClick={handleSearch} loading={isLoading} loadingText="Buscando">
                                                        Buscar
                                                    </Button>
                                                </Flex>
                                            </Field.Root>
                                        </Flex>
                                    </Flex>

                                    <VStack align="stretch" gap={2} maxH="360px" overflowY="auto" mt={4}>
                                        {isLoading ? (
                                            <Flex justify="center" py={12}>
                                                <Spinner />
                                            </Flex>
                                        ) : results.length === 0 ? (
                                            <Text color="gray.500">No se encontraron productos.</Text>
                                        ) : (
                                            results.map((producto) => {
                                                const isSelected = selectedIds.has(producto.productoId);
                                                const alreadyAdded = alreadySelected.has(producto.productoId);
                                                const categoria = producto.categoria;
                                                return (
                                                    <Box
                                                        key={producto.productoId}
                                                        borderWidth="1px"
                                                        borderRadius="md"
                                                        p={3}
                                                        bg={isSelected ? "blue.subtle" : "bg.panel"}
                                                        borderColor={isSelected ? "blue.solid" : "border"}
                                                    >
                                                        <Flex justify="space-between" align="start" gap={3}>
                                                            <Box minW={0} flex="1">
                                                                <Checkbox.Root w="full" alignItems="start" colorPalette="blue"
                                                                    checked={isSelected || alreadyAdded} disabled={alreadyAdded}
                                                                    onCheckedChange={({ checked }) => selectProducto(producto, checked === true)}>
                                                                    <Checkbox.HiddenInput aria-label={`Seleccionar ${producto.productoId} · ${producto.nombre}`} />
                                                                    <Checkbox.Control mt="0.5"><Checkbox.Indicator /></Checkbox.Control>
                                                                    <Checkbox.Label fontWeight="semibold" lineClamp={2}>{producto.nombre}</Checkbox.Label>
                                                                </Checkbox.Root>
                                                                <Text fontSize="sm" color="fg.muted">ID: {producto.productoId}</Text>
                                                                <Text fontSize="sm" color="fg.muted">
                                                                    {categoria?.categoriaNombre ?? "Sin categoria"}
                                                                </Text>
                                                            </Box>
                                                            {alreadyAdded ? <Badge colorPalette="gray">Ya agregado</Badge> : producto.tipo_producto && (
                                                                <Badge colorPalette="purple">{producto.tipo_producto}</Badge>
                                                            )}
                                                        </Flex>
                                                        <Flex mt={2} gap={2} wrap="wrap">
                                                            <Badge colorPalette={categoria?.loteSize && categoria.loteSize > 0 ? "blue" : "orange"}>
                                                                Lote {categoria?.loteSize ?? "-"}
                                                            </Badge>
                                                            <Badge colorPalette="cyan">
                                                                {categoria?.tiempoDiasFabricacion ?? 0} dias fabricacion
                                                            </Badge>
                                                            <Badge colorPalette={producto.prefijoLote ? "green" : "orange"}>
                                                                Prefijo {producto.prefijoLote || "-"}
                                                            </Badge>
                                                        </Flex>
                                                    </Box>
                                                );
                                            })
                                        )}
                                    </VStack>
                                </Box>
                                <Box as="section" aria-label="Bandeja de selección" minW="0" borderWidth="1px" rounded="md" p="3" bg="bg.subtle" alignSelf="start">
                                    <Flex align="center" justify="space-between" gap="2" mb="2">
                                        <Text fontWeight="semibold" role="status">Seleccionados ({selection.length})</Text>
                                        <Button size="xs" variant="ghost" disabled={!selection.length} onClick={() => setSelected([])}>Vaciar</Button>
                                    </Flex>
                                    {selection.length === 0 ? <Text fontSize="sm" color="fg.muted">Marca los terminados que deseas agregar a este día.</Text> : (
                                        <VStack as="ul" listStyleType="none" m="0" p="0" align="stretch" gap="2" maxH={{ base: "48", md: "96" }} overflowY="auto">
                                            {selection.map(producto => <Flex as="li" key={producto.productoId} align="start" gap="2" p="2" borderWidth="1px" rounded="md" bg="bg.panel">
                                                <Box flex="1" minW="0">
                                                    <Text fontSize="sm" fontWeight="medium" overflowWrap="anywhere">{producto.nombre}</Text>
                                                    <Text fontSize="xs" color="fg.muted">{producto.productoId}</Text>
                                                </Box>
                                                <CloseButton size="xs" flexShrink="0" aria-label={`Quitar ${producto.productoId} · ${producto.nombre}`}
                                                    onClick={() => setSelected(previous => previous.filter(item => item.productoId !== producto.productoId))} />
                                            </Flex>)}
                                        </VStack>
                                    )}
                                    <Text fontSize="xs" color="fg.muted" mt="3">La bandeja se conserva al buscar o cambiar de página. Cada terminado se agregará con 1 lote; podrás ajustarlo en la programación.</Text>
                                    {!canConfirm && <Text role="alert" fontSize="sm" color="fg.warning" mt="2">Este día no permite agregar terminados en este momento.</Text>}
                                </Box>
                            </Grid>
                        </Dialog.Body>
                        <Dialog.Footer justifyContent="space-between" flexWrap="wrap" gap="3">
                            <Flex align="center" gap={3} flexWrap="wrap">
                                {paginationLabel && <Text fontSize="sm" color="gray.600">{paginationLabel}</Text>}
                                {totalPages > 1 && (
                                    <Flex gap={2}>
                                        <Button size="sm" onClick={() => fetchProductos(page - 1)} disabled={isLoading || page <= 0}>
                                            Anterior
                                        </Button>
                                        <Button size="sm" onClick={() => fetchProductos(page + 1)} disabled={isLoading || page >= totalPages - 1}>
                                            Siguiente
                                        </Button>
                                    </Flex>
                                )}
                            </Flex>
                            <Flex gap={3} flexWrap="wrap">
                                <Button variant="ghost" onClick={handleCancel}>
                                    Cancelar
                                </Button>
                                <Button
                                    colorPalette="blue"
                                    onClick={handleConfirm}
                                    disabled={!canConfirm || selection.length === 0}
                                >
                                    Agregar {selection.length} {selection.length === 1 ? "terminado" : "terminados"}
                                </Button>
                            </Flex>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
