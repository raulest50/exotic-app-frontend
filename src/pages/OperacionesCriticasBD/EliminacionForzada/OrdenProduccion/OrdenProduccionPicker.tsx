import React, { useMemo, useState } from "react";
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
} from "@chakra-ui/react";
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
    const toast = useToast();

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
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Seleccionar orden de producción</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <Flex gap={2} flexWrap="wrap">
                            <FormControl flex="1" minW="120px">
                                <FormLabel>Desde</FormLabel>
                                <Input
                                    type="date"
                                    value={date1}
                                    onChange={(e) => setDate1(e.target.value)}
                                />
                            </FormControl>
                            <FormControl flex="1" minW="120px">
                                <FormLabel>Hasta</FormLabel>
                                <Input
                                    type="date"
                                    value={date2}
                                    onChange={(e) => setDate2(e.target.value)}
                                />
                            </FormControl>
                            <FormControl flex="1" minW="140px">
                                <FormLabel>Estado</FormLabel>
                                <Select
                                    value={String(estadoOrden)}
                                    onChange={(e) =>
                                        setEstadoOrden(Number(e.target.value))
                                    }
                                >
                                    <option value="0">Solo abiertas/activas</option>
                                    <option value="1">Solo cerradas</option>
                                    <option value="2">Todas</option>
                                    <option value="-1">Canceladas</option>
                                </Select>
                            </FormControl>
                            <Button
                                colorScheme="teal"
                                onClick={() => handleSearch(0)}
                                isLoading={isLoading}
                                loadingText="Buscando"
                                alignSelf="flex-end"
                            >
                                Buscar
                            </Button>
                        </Flex>
                        <Box w="full" overflowX="auto">
                            {ordenes.length > 0 ? (
                                <>
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>ID</Th>
                                                <Th>Producto</Th>
                                                <Th>Estado</Th>
                                                <Th>Fecha creación</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {ordenes.map((orden) => (
                                                <Tr
                                                    key={orden.ordenId}
                                                    onClick={() =>
                                                        setSelectedOrdenId(orden.ordenId)
                                                    }
                                                    bg={
                                                        selectedOrdenId === orden.ordenId
                                                            ? "teal.50"
                                                            : "transparent"
                                                    }
                                                    _hover={{
                                                        bg: "gray.50",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <Td>{orden.ordenId}</Td>
                                                    <Td>{orden.productoNombre}</Td>
                                                    <Td>{orden.estadoOrden ?? "-"}</Td>
                                                    <Td>
                                                        {orden.fechaCreacion
                                                            ? format(
                                                                  new Date(
                                                                      orden.fechaCreacion
                                                                  ),
                                                                  "yyyy-MM-dd HH:mm"
                                                              )
                                                            : "-"}
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                    {totalPages > 1 && (
                                        <Flex justifyContent="center" mt={2} gap={2}>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    handleSearch(Math.max(0, page - 1))
                                                }
                                                isDisabled={page === 0 || isLoading}
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
                                                isDisabled={
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
                                    color="gray.500"
                                    py={4}
                                >
                                    {isLoading
                                        ? "Cargando..."
                                        : "Use los filtros y pulse Buscar para listar órdenes."}
                                </Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        colorScheme="teal"
                        mr={3}
                        onClick={handleConfirm}
                        isDisabled={selectedOrdenId == null}
                    >
                        Seleccionar
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
