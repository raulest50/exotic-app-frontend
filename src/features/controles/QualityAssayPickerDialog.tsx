import {
    Badge,
    Box,
    Button,
    CloseButton,
    Dialog,
    Field,
    Flex,
    HStack,
    Input,
    Portal,
    RadioGroup,
    Spinner,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";

import { useAppToast } from "../../components/ui/use-app-toast";
import { apiFailureDetail, type ControlDomainApi } from "./api";
import type {
    EnsayoPendienteOption,
    EnsayoPendienteOptionFilters,
} from "./types";

interface QualityAssayPickerDialogProps {
    open: boolean;
    selected: EnsayoPendienteOption | null;
    tipoOrden?: EnsayoPendienteOptionFilters["tipoOrden"];
    areaId?: number;
    loadOptions: NonNullable<ControlDomainApi["listEnsayosPendientes"]>;
    onClose: () => void;
    onConfirm: (option: EnsayoPendienteOption) => void;
}

function momentLabel(moment: EnsayoPendienteOption["momentos"][number]) {
    return moment === "DURANTE_FABRICACION" ? "Intermedio" : "Producto terminado";
}

export default function QualityAssayPickerDialog({
    open,
    selected,
    tipoOrden,
    areaId,
    loadOptions,
    onClose,
    onConfirm,
}: QualityAssayPickerDialogProps) {
    const toast = useAppToast();
    const [search, setSearch] = useState("");
    const [items, setItems] = useState<EnsayoPendienteOption[]>([]);
    const [selection, setSelection] = useState<EnsayoPendienteOption | null>(selected);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (nextPage: number, nextSearch: string) => {
        setLoading(true);
        try {
            const result = await loadOptions({
                search: nextSearch.trim() || undefined,
                tipoOrden,
                areaId,
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
                title: "No fue posible cargar los ensayos",
                description: apiFailureDetail(error, "Error de consulta.").message,
                status: "error",
            });
        } finally {
            setLoading(false);
        }
    }, [areaId, loadOptions, tipoOrden, toast]);

    useEffect(() => {
        if (!open) return;
        setSearch("");
        setSelection(selected);
        void load(0, "");
    }, [load, open, selected]);

    const searchNow = () => void load(0, search);
    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" && !loading) searchNow();
    };

    return (
        <Dialog.Root open={open} size="xl" onOpenChange={({ open: nextOpen }) => !nextOpen && onClose()}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW="3xl">
                        <Dialog.Header>
                            <Dialog.Title>Seleccionar ensayo de calidad</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar selector de ensayos" size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
                            <VStack align="stretch" gap={4}>
                                <Flex gap={3} direction={{ base: "column", md: "row" }} align={{ md: "end" }}>
                                    <Field.Root flex="1">
                                        <Field.Label>Buscar ensayo</Field.Label>
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            onKeyDown={handleSearchKeyDown}
                                            placeholder="Código o nombre"
                                            disabled={loading}
                                        />
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
                                            <Text color="fg.muted" textAlign="center">
                                                No hay ensayos con controles pendientes para estos filtros.
                                            </Text>
                                        </Flex>
                                    ) : (
                                        <RadioGroup.Root
                                            value={selection?.planId.toString() ?? ""}
                                            onValueChange={({ value }) => {
                                                const option = items.find((item) => item.planId.toString() === value);
                                                setSelection(option ?? null);
                                            }}
                                        >
                                            <VStack align="stretch" gap={0}>
                                                {items.map((option) => (
                                                    <RadioGroup.Item
                                                        key={option.planId}
                                                        value={option.planId.toString()}
                                                        px={4}
                                                        py={3}
                                                        borderBottomWidth="1px"
                                                        _last={{ borderBottomWidth: 0 }}
                                                        _hover={{ bg: "bg.subtle" }}
                                                    >
                                                        <RadioGroup.ItemHiddenInput />
                                                        <RadioGroup.ItemControl>
                                                            <RadioGroup.ItemIndicator />
                                                        </RadioGroup.ItemControl>
                                                        <RadioGroup.ItemText flex="1">
                                                            <Flex
                                                                justify="space-between"
                                                                align={{ base: "start", md: "center" }}
                                                                direction={{ base: "column", md: "row" }}
                                                                gap={2}
                                                            >
                                                                <Box>
                                                                    <Text fontWeight="semibold">{option.nombre}</Text>
                                                                    <Text fontSize="sm" color="fg.muted">{option.codigo}</Text>
                                                                </Box>
                                                                <HStack gap={2} flexWrap="wrap">
                                                                    {option.momentos.map((moment) => (
                                                                        <Badge
                                                                            key={moment}
                                                                            colorPalette={moment === "REVISION_FINAL" ? "purple" : "teal"}
                                                                        >
                                                                            {momentLabel(moment)}
                                                                        </Badge>
                                                                    ))}
                                                                </HStack>
                                                            </Flex>
                                                        </RadioGroup.ItemText>
                                                    </RadioGroup.Item>
                                                ))}
                                            </VStack>
                                        </RadioGroup.Root>
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
                                            onClick={() => void load(page - 1, search)}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={loading || page >= totalPages - 1}
                                            onClick={() => void load(page + 1, search)}
                                        >
                                            Siguiente
                                        </Button>
                                    </HStack>
                                </HStack>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button
                                colorPalette="teal"
                                disabled={!selection}
                                onClick={() => {
                                    if (!selection) return;
                                    onConfirm(selection);
                                    onClose();
                                }}
                            >
                                Seleccionar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
