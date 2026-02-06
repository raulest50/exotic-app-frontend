// src/components/HistorialOrdenesSeguimiento.tsx

import { useState, useRef } from "react";
import {
    Button,
    Flex,
    Select,
    Spinner,
    Text,
    Table,
    TableContainer,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    Box,
    useOutsideClick
} from "@chakra-ui/react";
import DateRangePicker from "../../../components/DateRangePicker.tsx";
import MyPagination from "../../../components/MyPagination.tsx";
import axios from "axios";
import { OrdenProduccionDTO, OrdenSeguimientoDTO, ProductoWithInsumos } from "../types.tsx"; // Adjust the path as needed
import { format } from "date-fns";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import TerminadoSemiterminadoPicker from "../components/TerminadoSemiterminadoPicker.tsx";
import ProductoFilterCard from "./ProductoFilterCard.tsx";
import OrdenProduccionDialogDetalles from "./OrdenProduccionDialogDetalles.tsx";
import ODP_PDF_Generator from "../components/ODP_PDF_Generator.tsx";

const endPoints = new EndPointsURL();

const toNullableString = (value: unknown): string | null => {
    if (value === null || value === undefined) {
        return null;
    }

    const stringValue = String(value);
    const trimmed = stringValue.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const toNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return null;
        }

        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeOrdenSeguimiento = (seguimiento: unknown): OrdenSeguimientoDTO | null => {
    if (!seguimiento || typeof seguimiento !== "object") {
        return null;
    }

    const seg = seguimiento as Partial<OrdenSeguimientoDTO> & {
        seguimientoId?: unknown;
        insumoNombre?: unknown;
        cantidadRequerida?: unknown;
        estado?: unknown;
    };

    if (typeof seg.seguimientoId !== "number") {
        return null;
    }

    return {
        seguimientoId: seg.seguimientoId,
        insumoNombre: toNullableString(seg.insumoNombre) ?? "",
        cantidadRequerida: Number(seg.cantidadRequerida ?? 0),
        estado: Number(seg.estado ?? 0),
    };
};

const normalizeOrdenProduccion = (orden: any): OrdenProduccionDTO => {
    const ordenesSeguimiento = Array.isArray(orden?.ordenesSeguimiento)
        ? (orden.ordenesSeguimiento as unknown[])
              .map(normalizeOrdenSeguimiento)
              .filter((item): item is OrdenSeguimientoDTO => item !== null)
        : [];

    const productoIdRaw = orden?.productoId ?? orden?.producto?.productoId ?? orden?.producto?.codigo ?? orden?.producto?.codigoProducto;
    const productoNombreRaw = orden?.productoNombre ?? orden?.producto?.nombre;
    const productoTipoRaw = orden?.productoTipo ?? orden?.producto_tipo ?? orden?.producto?.tipo_producto ?? orden?.producto?.tipoProducto;
    const productoUnidadRaw = orden?.productoUnidad ?? orden?.producto?.tipoUnidades ?? orden?.producto?.unidad ?? orden?.tipoUnidades;
    const categoriaIdRaw = orden?.productoCategoriaId ?? orden?.categoriaId ?? orden?.producto?.categoriaId;
    const categoriaNombreRaw = orden?.productoCategoriaNombre ?? orden?.categoriaNombre ?? orden?.producto?.categoriaNombre;

    return {
        ordenId: toNullableNumber(orden?.ordenId) ?? 0,
        productoId: toNullableString(productoIdRaw),
        productoNombre: toNullableString(productoNombreRaw) ?? "",
        productoTipo: toNullableString(productoTipoRaw),
        productoCategoriaId: toNullableNumber(categoriaIdRaw),
        productoCategoriaNombre: toNullableString(categoriaNombreRaw),
        productoUnidad: toNullableString(productoUnidadRaw),
        fechaInicio: toNullableString(orden?.fechaInicio),
        fechaLanzamiento: toNullableString(orden?.fechaLanzamiento),
        fechaFinalPlanificada: toNullableString(orden?.fechaFinalPlanificada),
        estadoOrden: toNullableNumber(orden?.estadoOrden) ?? 0,
        cantidadProducir: toNullableNumber(
            orden?.cantidadProducir ?? orden?.cantidadAProducir ?? orden?.numeroLotes
        ),
        numeroPedidoComercial: toNullableString(orden?.numeroPedidoComercial),
        areaOperativa: toNullableString(orden?.areaOperativa),
        departamentoOperativo: toNullableString(orden?.departamentoOperativo),
        observaciones: toNullableString(orden?.observaciones),
        ordenesSeguimiento,
    };
};

interface ContextMenuState {
    mouseX: number;
    mouseY: number;
    orden: OrdenProduccionDTO;
}

export default function HistorialOrdenesTab() {
    const [date1, setDate1] = useState(format(new Date(), "yyyy-MM-dd"));
    const [date2, setDate2] = useState(format(new Date(), "yyyy-MM-dd"));

    const [searchParamState, setSearchParamState] = useState("0");

    const [ordenes, setOrdenes] = useState<OrdenProduccionDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState<number>(0);
    const [size] = useState<number>(5); // You can make this dynamic if needed
    const [totalPages, setTotalPages] = useState<number>(0);

    const [selectedProducto, setSelectedProducto] = useState<ProductoWithInsumos | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);

    const [selectedOrden, setSelectedOrden] = useState<OrdenProduccionDTO | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    useOutsideClick({
        ref: contextMenuRef,
        handler: () => setContextMenu(null),
    });

    const productoIdParam = selectedProducto?.producto?.productoId ?? undefined;

    const handleClickSearch = async () => {
        setLoading(true);
        setError(null);
        setPage(0); // Reset to first page on new search

        try {
            const response = await axios.get(endPoints.search_ordenes_within_range, {
                params: {
                    startDate: `${date1}T00:00:00`, // Adjust the format if needed
                    endDate: `${date2}T23:59:59`, // Adjust the format if needed
                    estadoOrden: searchParamState,
                    productoId: productoIdParam,
                    page: 0,
                    size: size,
                },
            });

            const normalizedContent: OrdenProduccionDTO[] = Array.isArray(response.data.content)
                ? response.data.content.map(normalizeOrdenProduccion)
                : [];

            setOrdenes(normalizedContent);
            setTotalPages(response.data.totalPages);
        } catch (err) {
            setError("Error fetching Ordenes de Producción");
        } finally {
            setLoading(false);
        }
    };

    const fetchOrdenes = async (currentPage: number) => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(endPoints.search_ordenes_within_range, {
                params: {
                    startDate: `${date1}T00:00:00`, // Adjust the format if needed
                    endDate: `${date2}T23:59:59`, // Adjust the format if needed
                    estadoOrden: searchParamState,
                    productoId: productoIdParam,
                    page: currentPage,
                    size: size,
                },
            });

            const normalizedContent: OrdenProduccionDTO[] = Array.isArray(response.data.content)
                ? response.data.content.map(normalizeOrdenProduccion)
                : [];

            setOrdenes(normalizedContent);
            setTotalPages(response.data.totalPages);
            setPage(currentPage);
        } catch (err) {
            setError("Error fetching Ordenes de Producción");
        } finally {
            setLoading(false);
        }
    };

    const refreshCurrentPage = () => {
        fetchOrdenes(page);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < totalPages) {
            fetchOrdenes(newPage);
        }
    };

    const handleContextMenu = (event: React.MouseEvent, orden: OrdenProduccionDTO) => {
        event.preventDefault();
        setContextMenu({
            mouseX: event.clientX,
            mouseY: event.clientY,
            orden: orden,
        });
    };

    const handleGenerarPDF = async () => {
        if (contextMenu) {
            const generator = new ODP_PDF_Generator();
            await generator.downloadPDF(contextMenu.orden);
        }
        setContextMenu(null);
    };

    return (
        <Flex direction={"column"} p={4}>
            <Flex direction={"row"} mb={4} align="center">
                <DateRangePicker
                    date1={date1}
                    setDate1={setDate1}
                    date2={date2}
                    setDate2={setDate2}
                    flex_direction={"column"}
                />
                <Select
                    value={searchParamState}
                    onChange={(e) => setSearchParamState(e.target.value)}
                    ml={4}
                    width="200px"
                >
                    <option value="0">Solo Ordenes Activas</option>
                    <option value="1">Solo Ordenes Cerradas</option>
                    <option value="2">Todas</option>
                </Select>
                <Flex ml={4} flex={1}>
                    <ProductoFilterCard
                        selectedProducto={selectedProducto}
                        onOpenPicker={() => setIsPickerOpen(true)}
                        onClearFilter={() => setSelectedProducto(null)}
                    />
                </Flex>
                <Button
                    onClick={handleClickSearch}
                    colorScheme={"blue"}
                    ml={4}
                    isLoading={loading}
                >
                    Buscar
                </Button>
            </Flex>

            {/* Display Loading Spinner */}
            {loading && (
                <Flex justify="center" align="center" my={4}>
                    <Spinner size="xl" />
                </Flex>
            )}

            {/* Display Error Message */}
            {error && (
                <Text color="red.500" mb={4}>
                    {error}
                </Text>
            )}

            {/* Display List of Ordenes ProduccionPage */}
            <TableContainer>
                <Table variant="simple">
                    <Thead>
                        <Tr>
                            <Th>ID</Th>
                            <Th>Producto</Th>
                            <Th>Fechas</Th>
                            <Th>Estado</Th>
                            <Th>Cantidad</Th>
                            <Th>Pedido</Th>

                            <Th textAlign="right">Acciones</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {ordenes.map((orden) => (
                            <Tr 
                                key={orden.ordenId}
                                onContextMenu={(e) => handleContextMenu(e, orden)}
                                _hover={{ bg: 'blue.100', cursor: 'pointer' }}
                            >
                                <Td>{orden.ordenId}</Td>
                                <Td>
                                    <Text fontWeight="medium">{orden.productoNombre || "-"}</Text>
                                    {orden.productoId && (
                                        <Text fontSize="sm" color="gray.500">
                                            ID: {orden.productoId}
                                        </Text>
                                    )}
                                </Td>
                                <Td>
                                    <Text fontSize="sm">Inicio: {orden.fechaInicio ?? "-"}</Text>
                                    <Text fontSize="sm">Lanzamiento: {orden.fechaLanzamiento ?? "-"}</Text>
                                    <Text fontSize="sm">Fin planificada: {orden.fechaFinalPlanificada ?? "-"}</Text>
                                </Td>
                                <Td>{orden.estadoOrden}</Td>
                                <Td>{orden.cantidadProducir ?? "-"}</Td>
                                <Td>{orden.numeroPedidoComercial ?? "-"}</Td>

                                <Td textAlign="right">
                                    <Button
                                        size="sm"
                                        colorScheme="blue"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedOrden(orden);
                                            setIsDetailsOpen(true);
                                        }}
                                    >
                                        Ver detalles
                                    </Button>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </TableContainer>

            {/* Pagination Component */}
            <MyPagination
                page={page}
                totalPages={totalPages}
                loading={loading}
                handlePageChange={handlePageChange}
            />
            <TerminadoSemiterminadoPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onConfirm={(producto) => {
                    setSelectedProducto(producto);
                    setIsPickerOpen(false);
                }}
            />
            <OrdenProduccionDialogDetalles
                isOpen={isDetailsOpen}
                onClose={() => {
                    setIsDetailsOpen(false);
                    setSelectedOrden(null);
                }}
                orden={selectedOrden}
                onCanceled={refreshCurrentPage}
            />

            {/* Custom Context Menu */}
            {contextMenu && (
                <Box
                    ref={contextMenuRef}
                    position="fixed"
                    top={contextMenu.mouseY}
                    left={contextMenu.mouseX}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    boxShadow="md"
                    zIndex={1000}
                    p={2}
                >
                    <Box
                        p={1}
                        _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                        onClick={handleGenerarPDF}
                    >
                        Generar PDF
                    </Box>
                    <Box
                        p={1}
                        _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                        onClick={() => {
                            setSelectedOrden(contextMenu.orden);
                            setIsDetailsOpen(true);
                            setContextMenu(null);
                        }}
                    >
                        Ver detalles
                    </Box>
                </Box>
            )}
        </Flex>
    );
}
