import React, { useMemo, useState } from "react";
import {
    Box,
    Button,
    Flex,
    Input,
    NativeSelect,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    Field,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { format } from "date-fns";
import EndPointsURL from "../../../../api/EndPointsURL";

export interface OrdenProduccionPickItem {
    ordenId: number;
    productoNombre: string;
    estadoOrden?: number;
    fechaCreacion?: string | null;
}

interface OrdenProduccionPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectOrden: (orden: OrdenProduccionPickItem) => void;
}

export default function OrdenProduccionPicker({
    isOpen,
    onClose,
    onSelectOrden,
}: OrdenProduccionPickerProps) {
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [date1, setDate1] = useState(
        format(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
    );
    const [date2, setDate2] = useState(format(new Date(), "yyyy-MM-dd"));
    const [estadoOrden, setEstadoOrden] = useState<number>(2); // 2 = Todas en backend
    const [ordenes, setOrdenes] = useState<OrdenProduccionPickItem[]>([]);
    const [selectedOrdenId, setSelectedOrdenId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const toast = useAppToast();

    const handleSearch = async (pageNum = 0) => {
        setIsLoading(true);
        try {
            const response = await axios.get(endpoints.search_ordenes_within_range, {
                withCredentials: true,
                params: {
                    startDate: `${date1}T00:00:00`,
                    endDate: `${date2}T23:59:59`,
                    estadoOrden,
                    productoId: "",
                    page: pageNum,
                    size: 10,
                },
            });
            const data = response.data;
            const content = Array.isArray(data.content) ? data.content : [];
            setOrdenes(
                content.map((o: Record<string, unknown>) => ({
                    ordenId: Number(o.ordenId ?? o.orden_id ?? 0),
                    productoNombre: String(o.productoNombre ?? o.producto_nombre ?? "-"),
                    estadoOrden: o.estadoOrden != null ? Number(o.estadoOrden) : undefined,
                    fechaCreacion: o.fechaCreacion != null ? String(o.fechaCreacion) : null,
                }))
            );
            setTotalPages(data.totalPages ?? 0);
            setPage(data.number ?? pageNum);
            setSelectedOrdenId(null);
        } catch (error: unknown) {
            console.error("Error buscando órdenes de producción", error);
            toast({
                title: "Error",
                description: "No se pudieron cargar las órdenes de producción.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedOrdenId != null) {
            const orden = ordenes.find((o) => o.ordenId === selectedOrdenId);
            if (orden) onSelectOrden(orden);
        }
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} size='xl' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Seleccionar orden de producción</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack gap={4} align="stretch">
                                <Flex gap={2} flexWrap="wrap">
                                    <Field.Root flex="1" minW="120px">
                                        <Field.Label>Desde</Field.Label>
                                        <Input
                                            type="date"
                                            value={date1}
                                            onChange={(e) => setDate1(e.target.value)}
                                        />
                                    </Field.Root>
                                    <Field.Root flex="1" minW="120px">
                                        <Field.Label>Hasta</Field.Label>
                                        <Input
                                            type="date"
                                            value={date2}
                                            onChange={(e) => setDate2(e.target.value)}
                                        />
                                    </Field.Root>
                                    <Field.Root flex="1" minW="140px">
                                        <Field.Label>Estado</Field.Label>
                                        <NativeSelect.Root>
                                            <NativeSelect.Field
                                                value={String(estadoOrden)}
                                                onChange={(e) =>
                                                    setEstadoOrden(Number(e.target.value))
                                                }>
                                                <option value="0">Solo abiertas/activas</option>
                                                <option value="1">Solo cerradas</option>
                                                <option value="2">Todas</option>
                                                <option value="-1">Canceladas</option>
                                            </NativeSelect.Field>
                                            <NativeSelect.Indicator />
                                        </NativeSelect.Root>
                                    </Field.Root>
                                    <Button
                                        colorPalette="teal"
                                        onClick={() => handleSearch(0)}
                                        loading={isLoading}
                                        loadingText="Buscando"
                                        alignSelf="flex-end"
                                    >
                                        Buscar
                                    </Button>
                                </Flex>
                                <Box w="full" overflowX="auto">
                                    {ordenes.length > 0 ? (
                                        <>
                                            <Table.Root variant="simple" size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Producto</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Fecha creación</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {ordenes.map((orden) => (
                                                        <Table.Row
                                                            key={orden.ordenId}
                                                            onClick={() =>
                                                                setSelectedOrdenId(orden.ordenId)
                                                            }
                                                            bg={
                                                                selectedOrdenId === orden.ordenId
                                                                    ? "app.rowSelectedTeal"
                                                                    : "transparent"
                                                            }
                                                            _hover={{
                                                                bg: "app.rowHover",
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            <Table.Cell>{orden.ordenId}</Table.Cell>
                                                            <Table.Cell>{orden.productoNombre}</Table.Cell>
                                                            <Table.Cell>{orden.estadoOrden ?? "-"}</Table.Cell>
                                                            <Table.Cell>
                                                                {orden.fechaCreacion
                                                                    ? format(
                                                                          new Date(
                                                                              orden.fechaCreacion
                                                                          ),
                                                                          "yyyy-MM-dd HH:mm"
                                                                      )
                                                                    : "-"}
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table.Root>
                                            {totalPages > 1 && (
                                                <Flex justifyContent="center" mt={2} gap={2}>
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            handleSearch(Math.max(0, page - 1))
                                                        }
                                                        disabled={page === 0 || isLoading}
                                                    >
                                                        Anterior
                                                    </Button>
                                                    <Text alignSelf="center">
                                                        Página {page + 1} de {totalPages}
                                                    </Text>
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            handleSearch(
                                                                Math.min(totalPages - 1, page + 1)
                                                            )
                                                        }
                                                        disabled={
                                                            page >= totalPages - 1 || isLoading
                                                        }
                                                    >
                                                        Siguiente
                                                    </Button>
                                                </Flex>
                                            )}
                                        </>
                                    ) : (
                                        <Text
                                            textAlign="center"
                                            color="app.textSubtle"
                                            py={4}
                                        >
                                            {isLoading
                                                ? "Cargando..."
                                                : "Use los filtros y pulse Buscar para listar órdenes."}
                                        </Text>
                                    )}
                                </Box>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button
                                colorPalette="teal"
                                mr={3}
                                onClick={handleConfirm}
                                disabled={selectedOrdenId == null}
                            >
                                Seleccionar
                            </Button>
                            <Button variant="ghost" onClick={onClose}>
                                Cancelar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
