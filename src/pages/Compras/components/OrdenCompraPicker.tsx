import React, { useState } from "react";
import {
    Box,
    Button,
    Flex,
    Input,
    NativeSelect,
    Table,
    Text,
    VStack,
    Field,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type { OrdenCompraMateriales } from "../types";
import { format } from "date-fns";

const endPoints = new EndPointsURL();

interface OrdenCompraPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectOrden: (orden: OrdenCompraMateriales) => void;
}

export default function OrdenCompraPicker({
    isOpen,
    onClose,
    onSelectOrden,
}: OrdenCompraPickerProps) {
    const [date1, setDate1] = useState(format(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
    const [date2, setDate2] = useState(format(new Date(), "yyyy-MM-dd"));
    const [estados, setEstados] = useState("-1,0,1,2,3");
    const [ordenes, setOrdenes] = useState<OrdenCompraMateriales[]>([]);
    const [selectedOrdenId, setSelectedOrdenId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const toast = useAppToast();

    const handleSearch = async (pageNum = 0) => {
        setIsLoading(true);
        try {
            const response = await axios.get(endPoints.search_ordenc_date_estado, {
                withCredentials: true,
                params: {
                    date1,
                    date2,
                    estados,
                    page: pageNum,
                    size: 10,
                },
            });
            const data = response.data;
            setOrdenes(data.content ?? []);
            setTotalPages(data.totalPages ?? 0);
            setPage(data.number ?? pageNum);
            setSelectedOrdenId(null);
        } catch (error: unknown) {
            console.error("Error searching órdenes de compra", error);
            toast({
                title: "Error",
                description: "No se pudieron cargar las órdenes de compra.",
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
            const orden = ordenes.find((o) => o.ordenCompraId === selectedOrdenId);
            if (orden) {
                onSelectOrden(orden);
            }
        }
        onClose();
    };

    const handleCancel = () => {
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
                        <Dialog.Header><Dialog.Title>Seleccionar orden de compra</Dialog.Title></Dialog.Header>
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
                                            <NativeSelect.Field value={estados} onChange={(e) => setEstados(e.target.value)}>
                                                <option value="-1,0,1,2,3">Todas</option>
                                                <option value="0,1,2">Pendientes</option>
                                                <option value="3">Cerradas</option>
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
                                            <Table.Root variant="line" size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Proveedor</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Total</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {ordenes.map((orden) => (
                                                        <Table.Row
                                                            key={orden.ordenCompraId}
                                                            onClick={() => setSelectedOrdenId(orden.ordenCompraId ?? null)}
                                                            bg={selectedOrdenId === orden.ordenCompraId ? "app.rowSelectedTeal" : "transparent"}
                                                            _hover={{ bg: "app.rowHover", cursor: "pointer" }}
                                                        >
                                                            <Table.Cell>{orden.ordenCompraId}</Table.Cell>
                                                            <Table.Cell>{orden.fechaEmision ? format(new Date(orden.fechaEmision), "yyyy-MM-dd") : "-"}</Table.Cell>
                                                            <Table.Cell>{orden.proveedor?.nombre ?? "-"}</Table.Cell>
                                                            <Table.Cell>{orden.estado}</Table.Cell>
                                                            <Table.Cell>{orden.totalPagar != null ? orden.totalPagar.toLocaleString() : "-"}</Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table.Root>
                                            {totalPages > 1 && (
                                                <Flex justifyContent="center" mt={2} gap={2}>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSearch(Math.max(0, page - 1))}
                                                        disabled={page === 0 || isLoading}
                                                    >
                                                        Anterior
                                                    </Button>
                                                    <Text alignSelf="center">
                                                        Página {page + 1} de {totalPages}
                                                    </Text>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSearch(Math.min(totalPages - 1, page + 1))}
                                                        disabled={page >= totalPages - 1 || isLoading}
                                                    >
                                                        Siguiente
                                                    </Button>
                                                </Flex>
                                            )}
                                        </>
                                    ) : (
                                        <Text textAlign="center" color="app.textSubtle" py={4}>
                                            {isLoading ? "Cargando..." : "Use los filtros y pulse Buscar para listar órdenes."}
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
                            <Button variant="ghost" onClick={handleCancel}>
                                Cancelar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
