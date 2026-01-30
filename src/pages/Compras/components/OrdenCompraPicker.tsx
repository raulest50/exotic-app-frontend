import React, { useState } from "react";
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
    const toast = useToast();

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
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Seleccionar orden de compra</ModalHeader>
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
                                    value={estados}
                                    onChange={(e) => setEstados(e.target.value)}
                                >
                                    <option value="-1,0,1,2,3">Todas</option>
                                    <option value="0,1,2">Pendientes</option>
                                    <option value="3">Cerradas</option>
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
                                                <Th>Fecha</Th>
                                                <Th>Proveedor</Th>
                                                <Th>Estado</Th>
                                                <Th>Total</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {ordenes.map((orden) => (
                                                <Tr
                                                    key={orden.ordenCompraId}
                                                    onClick={() => setSelectedOrdenId(orden.ordenCompraId ?? null)}
                                                    bg={selectedOrdenId === orden.ordenCompraId ? "teal.50" : "transparent"}
                                                    _hover={{ bg: "gray.50", cursor: "pointer" }}
                                                >
                                                    <Td>{orden.ordenCompraId}</Td>
                                                    <Td>{orden.fechaEmision ? format(new Date(orden.fechaEmision), "yyyy-MM-dd") : "-"}</Td>
                                                    <Td>{orden.proveedor?.nombre ?? "-"}</Td>
                                                    <Td>{orden.estado}</Td>
                                                    <Td>{orden.totalPagar != null ? orden.totalPagar.toLocaleString() : "-"}</Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                    {totalPages > 1 && (
                                        <Flex justifyContent="center" mt={2} gap={2}>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSearch(Math.max(0, page - 1))}
                                                isDisabled={page === 0 || isLoading}
                                            >
                                                Anterior
                                            </Button>
                                            <Text alignSelf="center">
                                                Página {page + 1} de {totalPages}
                                            </Text>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSearch(Math.min(totalPages - 1, page + 1))}
                                                isDisabled={page >= totalPages - 1 || isLoading}
                                            >
                                                Siguiente
                                            </Button>
                                        </Flex>
                                    )}
                                </>
                            ) : (
                                <Text textAlign="center" color="gray.500" py={4}>
                                    {isLoading ? "Cargando..." : "Use los filtros y pulse Buscar para listar órdenes."}
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
                    <Button variant="ghost" onClick={handleCancel}>
                        Cancelar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
