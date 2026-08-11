import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
    CloseButton,
    Badge,
    Box,
    Button,
    Flex,
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
    onSelectTerminado: (terminado: TerminadoPickerResult) => void;
}

interface SearchResponse {
    content?: TerminadoPickerResult[];
    totalPages?: number;
    number?: number;
}

export default function TerminadoPicker4MPS({
    isOpen,
    onClose,
    onSelectTerminado,
}: TerminadoPicker4MPSProps) {
    const toast = useAppToast();
    const [searchText, setSearchText] = useState("");
    const [results, setResults] = useState<TerminadoPickerResult[]>([]);
    const [selected, setSelected] = useState<TerminadoPickerResult | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCategorias, setIsLoadingCategorias] = useState(false);
    const [tipoBusqueda, setTipoBusqueda] = useState<"NOMBRE" | "ID">("NOMBRE");
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [selectedCategoriaId, setSelectedCategoriaId] = useState("");
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
        criteriaRef.current = {
            searchText: "",
            tipoBusqueda: "NOMBRE",
            selectedCategoriaId: "",
        };
        setSearchText("");
        setResults([]);
        setSelected(null);
        setPage(0);
        setTotalPages(1);
        setIsLoading(false);
        setSelectedCategoriaId("");
    }, []);

    const fetchCategorias = useCallback(async () => {
        setIsLoadingCategorias(true);
        try {
            const response = await axios.get<Categoria[]>(endpoints.get_categorias);
            setCategorias(response.data ?? []);
        } catch (error) {
            console.error("Error fetching categorias", error);
            setCategorias([]);
            toast({
                title: "Error al cargar categorias",
                description: "No se pudo obtener la lista de categorias.",
                status: "error",
            });
        } finally {
            setIsLoadingCategorias(false);
        }
    }, [toast]);

    const fetchProductos = useCallback(async (
        pageToFetch = 0,
        categoriaIdOverride?: string,
    ) => {
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
            );

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
            console.error("Error fetching productos terminados para MPS", error);
            setResults([]);
            setTotalPages(1);
            toast({
                title: "Error al buscar productos",
                description: "No se pudo obtener la lista de productos. Intente nuevamente.",
                status: "error",
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (isOpen) {
            void fetchCategorias();
            void fetchProductos(0);
        } else {
            resetState();
        }
    }, [fetchCategorias, fetchProductos, isOpen, resetState]);

    const handleSearch = useCallback(() => {
        setSelected(null);
        void fetchProductos(0);
    }, [fetchProductos]);

    const handleCategoriaChange = useCallback((nextCategoriaId: string) => {
        setSelectedCategoriaId(nextCategoriaId);
        criteriaRef.current = {
            ...criteriaRef.current,
            selectedCategoriaId: nextCategoriaId,
        };
        setSelected(null);
        void fetchProductos(0, nextCategoriaId);
    }, [fetchProductos]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
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
        return `Pagina ${page + 1} de ${totalPages}`;
    }, [page, totalPages]);

    return (
        <Dialog.Root open={isOpen} size='xl' onOpenChange={e => {
            if (!e.open) {
                handleCancel();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW="2xl">
                        <Dialog.Header><Dialog.Title>Seleccionar producto terminado para MPS</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
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
                                        const isSelected = selected?.productoId === producto.productoId;
                                        const categoria = producto.categoria;
                                        return (
                                            <Box
                                                key={producto.productoId}
                                                borderWidth="1px"
                                                borderRadius="md"
                                                p={3}
                                                cursor="pointer"
                                                bg={isSelected ? "blue.50" : "white"}
                                                borderColor={isSelected ? "blue.400" : "gray.200"}
                                                _hover={{ bg: "gray.50" }}
                                                onClick={() => setSelected(producto)}
                                            >
                                                <Flex justify="space-between" align="start" gap={3}>
                                                    <Box minW={0}>
                                                        <Text fontWeight="semibold" lineClamp={2}>{producto.nombre}</Text>
                                                        <Text fontSize="sm" color="gray.600">ID: {producto.productoId}</Text>
                                                        <Text fontSize="sm" color="gray.600">
                                                            {categoria?.categoriaNombre ?? "Sin categoria"}
                                                        </Text>
                                                    </Box>
                                                    {producto.tipo_producto && (
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
                        </Dialog.Body>
                        <Dialog.Footer justifyContent="space-between">
                            <Flex align="center" gap={3}>
                                {paginationLabel && <Text fontSize="sm" color="gray.600">{paginationLabel}</Text>}
                                {totalPages > 1 && (
                                    <Flex gap={2}>
                                        <Button size="sm" onClick={() => fetchProductos(page - 1)} disabled={page <= 0}>
                                            Anterior
                                        </Button>
                                        <Button size="sm" onClick={() => fetchProductos(page + 1)} disabled={page >= totalPages - 1}>
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
                                    colorPalette="blue"
                                    onClick={handleConfirm}
                                    disabled={!selected}
                                >
                                    Confirmar
                                </Button>
                            </Flex>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
