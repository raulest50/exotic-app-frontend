import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Badge,
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    Input,
    Portal,
    Spinner,
    Table,
    Text,
} from "@chakra-ui/react";
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import MyPagination from "../../../../components/MyPagination.tsx";
import { useAppToast } from "@/components/ui/use-app-toast";
import type { ProcesoRutaOption } from "./types.ts";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (proceso: ProcesoRutaOption) => void;
    currentProcesoId?: number | null;
}

interface PageResponse<T> {
    content: T[];
    totalPages: number;
}

const PAGE_SIZE = 8;

export default function ProcesoProduccionRutaPicker({
    isOpen,
    onClose,
    onSelect,
    currentProcesoId,
}: Props) {
    const endpoint = useMemo(
        () => new EndPointsURL().get_ruta_proceso_cat_procesos_disponibles,
        [],
    );
    const toast = useAppToast();
    const [procesos, setProcesos] = useState<ProcesoRutaOption[]>([]);
    const [selected, setSelected] = useState<ProcesoRutaOption | null>(null);
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    const fetchProcesos = useCallback(async (pageNumber: number, searchValue: string) => {
        const normalizedSearch = searchValue.trim();
        setLoading(true);
        try {
            const response = await axios.get<PageResponse<ProcesoRutaOption>>(endpoint, {
                params: {
                    page: pageNumber,
                    size: PAGE_SIZE,
                    sort: "nombre,asc",
                    search: normalizedSearch || undefined,
                },
                withCredentials: true,
            });
            setProcesos(response.data.content ?? []);
            setTotalPages(Math.max(response.data.totalPages ?? 1, 1));
            setPage(pageNumber);
            setAppliedSearch(normalizedSearch);
        } catch (error) {
            console.error("No fue posible cargar los procesos para la ruta", error);
            setProcesos([]);
            toast({
                title: "Error",
                description: "No se pudieron cargar los procesos de producción.",
                status: "error",
                duration: 3500,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [endpoint, toast]);

    useEffect(() => {
        if (isOpen) {
            setSelected(null);
            setSearch("");
            void fetchProcesos(0, "");
        }
    }, [fetchProcesos, isOpen]);

    const handleConfirm = () => {
        if (!selected) return;
        onSelect(selected);
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} size="xl" onOpenChange={({ open }) => {
            if (!open) onClose();
        }}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW="3xl">
                        <Dialog.Header>
                            <Dialog.Title>Seleccionar proceso de producción</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
                            <Flex gap={2} mb={4} direction={{ base: "column", md: "row" }}>
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") void fetchProcesos(0, search);
                                    }}
                                    placeholder="Buscar proceso por nombre"
                                />
                                <Button onClick={() => void fetchProcesos(0, search)} loading={loading}>
                                    Buscar
                                </Button>
                            </Flex>

                            {loading ? (
                                <Flex justify="center" py={8}><Spinner /></Flex>
                            ) : procesos.length === 0 ? (
                                <Text textAlign="center" color="app.textSubtle" py={8}>
                                    No se encontraron procesos.
                                </Text>
                            ) : (
                                <Box borderWidth="1px" borderRadius="lg" overflowX="auto">
                                    <Table.Root size="sm">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                <Table.ColumnHeader>Proceso</Table.ColumnHeader>
                                                <Table.ColumnHeader>POE vigente</Table.ColumnHeader>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {procesos.map((proceso) => {
                                                const isSelected = selected?.procesoId === proceso.procesoId;
                                                const isCurrent = currentProcesoId === proceso.procesoId;
                                                return (
                                                    <Table.Row
                                                        key={proceso.procesoId}
                                                        cursor="pointer"
                                                        bg={isSelected ? "purple.100" : undefined}
                                                        onClick={() => setSelected(proceso)}
                                                    >
                                                        <Table.Cell>{proceso.procesoId}</Table.Cell>
                                                        <Table.Cell fontWeight={isSelected ? "bold" : "normal"}>
                                                            {proceso.nombre}
                                                            {isCurrent ? (
                                                                <Badge ml={2} colorPalette="gray">Actual</Badge>
                                                            ) : null}
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <Badge colorPalette={proceso.poeVigenteDisponible ? "green" : "orange"}>
                                                                {proceso.poeVigenteDisponible
                                                                    ? `Versión ${proceso.poeVigenteVersion}`
                                                                    : "Sin POE"}
                                                            </Badge>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                );
                                            })}
                                        </Table.Body>
                                    </Table.Root>
                                </Box>
                            )}

                            {totalPages > 1 ? (
                                <Box mt={4}>
                                    <MyPagination
                                        page={page}
                                        totalPages={totalPages}
                                        loading={loading}
                                        handlePageChange={(nextPage) => fetchProcesos(nextPage, appliedSearch)}
                                    />
                                </Box>
                            ) : null}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button colorPalette="purple" onClick={handleConfirm} disabled={!selected}>
                                Asignar proceso
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
