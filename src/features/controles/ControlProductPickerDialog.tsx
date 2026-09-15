import {
    Alert,
    Badge,
    Box,
    Button,
    Checkbox,
    CloseButton,
    Dialog,
    Field,
    Flex,
    HStack,
    Input,
    NativeSelect,
    Portal,
    RadioGroup,
    Spinner,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { useAppToast } from "../../components/ui/use-app-toast";
import { apiFailureDetail, searchControlProducts } from "./api";
import type { ControlProductOption } from "./types";

type PickerMode = "SINGLE" | "MULTIPLE";
type SearchMode = "NOMBRE" | "ID";

interface ControlProductPickerDialogProps {
    open: boolean;
    mode: PickerMode;
    categoriaId?: number | null;
    selectedProducts: ControlProductOption[];
    onClose: () => void;
    onConfirm: (products: ControlProductOption[]) => void;
}

export default function ControlProductPickerDialog({
    open,
    mode,
    categoriaId,
    selectedProducts,
    onClose,
    onConfirm,
}: ControlProductPickerDialogProps) {
    const toast = useAppToast();
    const [search, setSearch] = useState("");
    const [searchMode, setSearchMode] = useState<SearchMode>("NOMBRE");
    const [items, setItems] = useState<ControlProductOption[]>([]);
    const [selection, setSelection] = useState<Map<string, ControlProductOption>>(new Map());
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const selectedIds = useMemo(
        () => selectedProducts.map((product) => product.productoId).sort().join("\u0000"),
        [selectedProducts],
    );

    const load = useCallback(async (
        nextPage: number,
        nextSearch: string,
        nextSearchMode: SearchMode,
    ) => {
        setLoading(true);
        try {
            const result = await searchControlProducts({
                search: nextSearch.trim(),
                tipoBusqueda: nextSearchMode,
                categoriaId: categoriaId ?? undefined,
                page: nextPage,
                size: 10,
            });
            setItems(result.content ?? []);
            setPage(result.number ?? nextPage);
            setTotalPages(result.totalPages ?? 0);
        } catch (error) {
            setItems([]);
            setTotalPages(0);
            toast({
                title: "No fue posible buscar productos",
                description: apiFailureDetail(error, "Error de consulta.").message,
                status: "error",
            });
        } finally {
            setLoading(false);
        }
    }, [categoriaId, toast]);

    useEffect(() => {
        if (!open) return;
        setSearch("");
        setSearchMode("NOMBRE");
        setSelection(new Map(selectedProducts.map((product) => [product.productoId, product])));
        void load(0, "", "NOMBRE");
    }, [load, open, selectedIds, selectedProducts]);

    const searchNow = () => {
        void load(0, search, searchMode);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" && !loading) searchNow();
    };

    const toggleMultiple = (product: ControlProductOption, checked: boolean) => {
        setSelection((current) => {
            const next = new Map(current);
            if (checked) next.set(product.productoId, product);
            else next.delete(product.productoId);
            return next;
        });
    };

    const selectedSingleId = mode === "SINGLE" ? selection.keys().next().value ?? "" : "";
    const title = mode === "SINGLE" ? "Seleccionar producto" : "Seleccionar productos excluidos";

    return (
        <Dialog.Root open={open} size="xl" onOpenChange={({ open: nextOpen }) => !nextOpen && onClose()}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW="3xl">
                        <Dialog.Header>
                            <Dialog.Title>{title}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar selector de productos" size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
                            <VStack align="stretch" gap={4}>
                                {mode === "MULTIPLE" && (
                                    <Alert.Root status="info" size="sm">
                                        <Alert.Indicator />
                                        <Alert.Content>
                                            <Alert.Description>
                                                Solo se muestran productos terminados de la categoría seleccionada.
                                            </Alert.Description>
                                        </Alert.Content>
                                    </Alert.Root>
                                )}

                                <Flex gap={3} direction={{ base: "column", md: "row" }} align={{ md: "end" }}>
                                    <Field.Root flex="1">
                                        <Field.Label>Buscar producto</Field.Label>
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={searchMode === "NOMBRE" ? "Nombre del producto" : "Código del producto"}
                                            disabled={loading}
                                        />
                                    </Field.Root>
                                    <Field.Root width={{ base: "full", md: "150px" }}>
                                        <Field.Label>Buscar por</Field.Label>
                                        <NativeSelect.Root disabled={loading}>
                                            <NativeSelect.Field
                                                value={searchMode}
                                                onChange={(event) => setSearchMode(event.target.value as SearchMode)}
                                            >
                                                <option value="NOMBRE">Nombre</option>
                                                <option value="ID">Código</option>
                                            </NativeSelect.Field>
                                            <NativeSelect.Indicator />
                                        </NativeSelect.Root>
                                    </Field.Root>
                                    <Button onClick={searchNow} loading={loading}>Buscar</Button>
                                </Flex>

                                <Box borderWidth="1px" borderRadius="lg" minH="260px" maxH="380px" overflowY="auto">
                                    {loading ? (
                                        <Flex justify="center" align="center" minH="260px">
                                            <Spinner />
                                        </Flex>
                                    ) : items.length === 0 ? (
                                        <Flex justify="center" align="center" minH="260px" px={4}>
                                            <Text color="fg.muted" textAlign="center">No se encontraron productos elegibles.</Text>
                                        </Flex>
                                    ) : mode === "SINGLE" ? (
                                        <RadioGroup.Root
                                            value={selectedSingleId}
                                            onValueChange={({ value }) => {
                                                const product = items.find((item) => item.productoId === value);
                                                setSelection(product ? new Map([[product.productoId, product]]) : new Map());
                                            }}
                                        >
                                            <VStack align="stretch" gap={0}>
                                                {items.map((product) => (
                                                    <RadioGroup.Item
                                                        key={product.productoId}
                                                        value={product.productoId}
                                                        px={4}
                                                        py={3}
                                                        borderBottomWidth="1px"
                                                        _last={{ borderBottomWidth: 0 }}
                                                        _hover={{ bg: "bg.subtle" }}
                                                    >
                                                        <RadioGroup.ItemHiddenInput />
                                                        <RadioGroup.ItemControl><RadioGroup.ItemIndicator /></RadioGroup.ItemControl>
                                                        <RadioGroup.ItemText flex="1">
                                                            <HStack justify="space-between" align="start" gap={3}>
                                                                <Box>
                                                                    <Text fontWeight="semibold">{product.nombre}</Text>
                                                                    <Text fontSize="sm" color="fg.muted">{product.productoId}</Text>
                                                                </Box>
                                                                <Badge colorPalette={product.tipoProducto === "T" ? "purple" : "blue"}>
                                                                    {product.tipoProducto === "T" ? "Terminado" : "Semiterminado"}
                                                                </Badge>
                                                            </HStack>
                                                        </RadioGroup.ItemText>
                                                    </RadioGroup.Item>
                                                ))}
                                            </VStack>
                                        </RadioGroup.Root>
                                    ) : (
                                        <VStack align="stretch" gap={0}>
                                            {items.map((product) => (
                                                <Checkbox.Root
                                                    key={product.productoId}
                                                    checked={selection.has(product.productoId)}
                                                    onCheckedChange={({ checked }) => toggleMultiple(product, checked === true)}
                                                    px={4}
                                                    py={3}
                                                    borderBottomWidth="1px"
                                                    _last={{ borderBottomWidth: 0 }}
                                                    _hover={{ bg: "bg.subtle" }}
                                                >
                                                    <Checkbox.HiddenInput />
                                                    <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                                    <Checkbox.Label flex="1">
                                                        <Box>
                                                            <Text fontWeight="semibold">{product.nombre}</Text>
                                                            <Text fontSize="sm" color="fg.muted">{product.productoId}</Text>
                                                        </Box>
                                                    </Checkbox.Label>
                                                </Checkbox.Root>
                                            ))}
                                        </VStack>
                                    )}
                                </Box>

                                <HStack justify="space-between" flexWrap="wrap">
                                    <Text fontSize="sm" color="fg.muted">
                                        {totalPages > 0 ? `Página ${page + 1} de ${totalPages}` : "Sin resultados"}
                                    </Text>
                                    <HStack>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={loading || page <= 0}
                                            onClick={() => void load(page - 1, search, searchMode)}
                                        >Anterior</Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={loading || page >= totalPages - 1}
                                            onClick={() => void load(page + 1, search, searchMode)}
                                        >Siguiente</Button>
                                    </HStack>
                                </HStack>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button
                                colorPalette="teal"
                                disabled={mode === "SINGLE" && selection.size !== 1}
                                onClick={() => {
                                    onConfirm([...selection.values()]);
                                    onClose();
                                }}
                            >
                                {mode === "SINGLE" ? "Seleccionar" : `Confirmar (${selection.size})`}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
