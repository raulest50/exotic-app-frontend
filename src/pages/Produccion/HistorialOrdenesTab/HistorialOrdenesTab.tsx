// src/components/HistorialOrdenesSeguimiento.tsx

import { useEffect, useRef, useState } from "react";
import {
    Badge,
    Button,
    Flex,
    NativeSelect,
    Spinner,
    Text,
    Table,
    Box,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import DateRangePicker from "../../../components/DateRangePicker.tsx";
import MyPagination from "../../../components/MyPagination.tsx";
import axios from "axios";
import { OrdenProduccionDTO, ProductoWithInsumos } from "../types.tsx";
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

const normalizeOrdenProduccion = (orden: any): OrdenProduccionDTO => {
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
        fechaCreacion: toNullableString(orden?.fechaCreacion),
        fechaInicio: toNullableString(orden?.fechaInicio),
        fechaLanzamiento: toNullableString(orden?.fechaLanzamiento),
        fechaFinalPlanificada: toNullableString(orden?.fechaFinalPlanificada),
        estadoOrden: toNullableNumber(orden?.estadoOrden) ?? 0,
        politicaDispensacionInicio: toNullableString(orden?.politicaDispensacionInicio),
        fechaAplicacionPoliticaDispensacion: toNullableString(orden?.fechaAplicacionPoliticaDispensacion),
        estadoDispensacionMateriales: toNullableString(orden?.estadoDispensacionMateriales),
        cantidadProducir: toNullableNumber(
            orden?.cantidadProducir ?? orden?.cantidadAProducir ?? orden?.numeroLotes
        ),
        numeroPedidoComercial: toNullableString(orden?.numeroPedidoComercial),
        areaOperativa: toNullableString(orden?.areaOperativa),
        departamentoOperativo: toNullableString(orden?.departamentoOperativo),
        loteAsignado: toNullableString(orden?.loteAsignado),
        observaciones: toNullableString(orden?.observaciones),
        origenOrden: (toNullableString(orden?.origenOrden) as "MANUAL" | "MPS" | null) ?? "MANUAL",
        mpsId: toNullableNumber(orden?.mpsId),
        mpsWeekStartDate: toNullableString(orden?.mpsWeekStartDate),
        mpsLotePlanificadoId: toNullableNumber(orden?.mpsLotePlanificadoId),
        mpsItemId: toNullableNumber(orden?.mpsItemId),
        mpsLoteOrdinal: toNullableNumber(orden?.mpsLoteOrdinal),
    };
};

const getEstadoOrdenLabel = (estadoOrden: number): string => {
    switch (estadoOrden) {
        case -1:
            return "Cancelada";
        case 0:
            return "Abierta";
        case 2:
            return "Terminada";
        case 3:
            return "Fabricacion completada";
        default:
            return `Estado ${estadoOrden}`;
    }
};

const getEstadoOrdenColorScheme = (estadoOrden: number): string => {
    switch (estadoOrden) {
        case -1:
            return "red";
        case 0:
            return "yellow";
        case 2:
            return "green";
        case 3:
            return "blue";
        default:
            return "gray";
    }
};

const getOrigenOrdenColorScheme = (origenOrden: OrdenProduccionDTO["origenOrden"]): string => {
    return origenOrden === "MPS" ? "purple" : "gray";
};

interface ContextMenuState {
    mouseX: number;
    mouseY: number;
    orden: OrdenProduccionDTO;
}

export default function HistorialOrdenesTab() {
    const toast = useAppToast();
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

    useEffect(() => {
        if (!contextMenu) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!contextMenuRef.current?.contains(event.target as Node)) {
                setContextMenu(null);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [contextMenu]);

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
            try {
                const generator = new ODP_PDF_Generator();
                await generator.downloadPDF(contextMenu.orden);
            } catch (error) {
                console.error("Error generando PDF ODP", error);
                toast({
                    title: "No se pudo generar la ODP",
                    description: error instanceof Error
                        ? error.message
                        : "No fue posible obtener la identidad documental.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            }
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
                <NativeSelect.Root>
                    <NativeSelect.Field
                        value={searchParamState}
                        onChange={(e) => setSearchParamState(e.target.value)}
                        ml={4}
                        width="200px">
                        <option value="0">Solo Ordenes Activas</option>
                        <option value="1">Solo Ordenes Cerradas</option>
                        <option value="2">Todas</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Flex ml={4} flex={1}>
                    <ProductoFilterCard
                        selectedProducto={selectedProducto}
                        onOpenPicker={() => setIsPickerOpen(true)}
                        onClearFilter={() => setSelectedProducto(null)}
                    />
                </Flex>
                <Button
                    onClick={handleClickSearch}
                    colorPalette={"blue"}
                    ml={4}
                    loading={loading}
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
            <Table.ScrollArea>
                <Table.Root variant="line">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Lote</Table.ColumnHeader>
                            <Table.ColumnHeader>Producto</Table.ColumnHeader>
                            <Table.ColumnHeader>Origen</Table.ColumnHeader>
                            <Table.ColumnHeader>Fechas</Table.ColumnHeader>
                            <Table.ColumnHeader>Estado</Table.ColumnHeader>
                            <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                            <Table.ColumnHeader>Pedido</Table.ColumnHeader>

                            <Table.ColumnHeader textAlign="right">Acciones</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {ordenes.map((orden) => (
                            <Table.Row 
                                key={orden.ordenId}
                                onContextMenu={(e) => handleContextMenu(e, orden)}
                                _hover={{ bg: 'blue.100', cursor: 'pointer' }}
                            >
                                <Table.Cell>{orden.loteAsignado ?? "-"}</Table.Cell>
                                <Table.Cell>
                                    <Text fontWeight="medium">{orden.productoNombre || "-"}</Text>
                                    {orden.productoId && (
                                        <Text fontSize="sm" color="gray.500">
                                            ID: {orden.productoId}
                                        </Text>
                                    )}
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette={getOrigenOrdenColorScheme(orden.origenOrden)}>
                                        {orden.origenOrden === "MPS" ? "MPS" : "Manual"}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    <Text fontSize="sm">Inicio: {orden.fechaInicio ?? "-"}</Text>
                                    <Text fontSize="sm">Lanzamiento: {orden.fechaLanzamiento ?? "-"}</Text>
                                    <Text fontSize="sm">Fin planificada: {orden.fechaFinalPlanificada ?? "-"}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette={getEstadoOrdenColorScheme(orden.estadoOrden)}>
                                        {getEstadoOrdenLabel(orden.estadoOrden)}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>{orden.cantidadProducir ?? "-"}</Table.Cell>
                                <Table.Cell>{orden.numeroPedidoComercial ?? "-"}</Table.Cell>

                                <Table.Cell textAlign="right">
                                    <Button
                                        size="sm"
                                        colorPalette="blue"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedOrden(orden);
                                            setIsDetailsOpen(true);
                                        }}
                                    >
                                        Ver detalles
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>

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
