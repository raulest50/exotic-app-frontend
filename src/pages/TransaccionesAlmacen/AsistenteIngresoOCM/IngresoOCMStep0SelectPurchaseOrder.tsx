import { Box, Button, Flex, Heading, Input, Table, useDisclosure, VStack, IconButton, HStack, Field } from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { Tooltip } from '@/components/ui/tooltip';
import {useMemo, useRef, useState} from "react";
import ProveedorFilterOCM from "../../Compras/components/ProveedorFilterOCM";
import ProveedorPicker from "../../Compras/components/ProveedorPicker";
import {OrdenCompra, Proveedor} from "../types";
import BetterPagination from "../../../components/BetterPagination/BetterPagination";
import { fetchOrdenesPendientesOcm } from "./ocmIngresoApi";
import { LuRepeat } from 'react-icons/lu';

interface StepOneComponentProps {
    setActiveStep: (step: number) => void;
    setSelectedOrder: (orden: OrdenCompra) => void;
}



export default function IngresoOCMStep0SelectPurchaseOrder({
    setActiveStep,
    setSelectedOrder,
}: StepOneComponentProps) {
    const toast = useAppToast();
    const [isLoading, setIsLoading] = useState(false);
    const [proveedor, setProveedor] = useState<Proveedor | null>(null);
    const [ordenCompraId, setOrdenCompraId] = useState("");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [size, setSize] = useState(10);
    // Estado para controlar si se muestra precio total o porcentaje recibido
    const [mostrarPorcentaje, setMostrarPorcentaje] = useState(false);
    const skipNextPageChangeRef = useRef(false);

    const { open, onOpen, onClose } = useDisclosure();

    const serializeDate = (date: string, endOfDay = false) => {
        if (!date) return null;
        const timeSuffix = endOfDay ? "T23:59:59" : "T00:00:00";
        return `${date}${timeSuffix}`;
    };

    const fetchOrdenesPendientes = async (pageNum: number, pageSize: number) => {
        setIsLoading(true);
        try {
            const trimmedOrdenCompraId = ordenCompraId.trim();
            const data = await fetchOrdenesPendientesOcm({
                page: pageNum,
                size: pageSize,
                ordenCompraId: trimmedOrdenCompraId ? Number(trimmedOrdenCompraId) : undefined,
                fechaInicio: serializeDate(fechaInicio),
                fechaFin: serializeDate(fechaFin, true),
                proveedorId: proveedor?.id ?? undefined,
            });
            const content = data.content ?? [];

            if (content.length === 0) {
                toast({
                    title: "No se encontraron órdenes",
                    description: "No hay órdenes que coincidan con el filtro seleccionado.",
                    status: "info",
                    duration: 4000,
                    isClosable: true,
                });
            }

            setOrdenes(content);
            setTotalPages(data.totalPages ?? 0);
            setPage(data.number ?? pageNum);
            setSize(data.size ?? pageSize);
        } catch (error: any) {
            console.error("Error fetching órdenes pendientes", error);
            toast({
                title: "No se pudieron cargar las órdenes",
                description: "Intente nuevamente o verifique su conexión.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (skipNextPageChangeRef.current) {
            skipNextPageChangeRef.current = false;
            return;
        }
        setPage(newPage);
        fetchOrdenesPendientes(newPage, size);
    };

    const handleSizeChange = (newSize: number) => {
        skipNextPageChangeRef.current = true;
        setSize(newSize);
        setPage(0);
        fetchOrdenesPendientes(0, newSize);
    };


    const onRegistrarIngreso = (orden: OrdenCompra) => {
        setSelectedOrder(orden);
        setActiveStep(1);
    };

    /**
     * Renderiza el valor de la celda según el modo de visualización:
     * - Si mostrarPorcentaje es true: muestra el porcentaje recibido (ej: "75.5%")
     * - Si mostrarPorcentaje es false: muestra el precio total formateado como moneda
     */
    const renderCellValue = (orden: OrdenCompra) => {
        if (mostrarPorcentaje) {
            // Mostrar porcentaje de entrega recibido
            const porcentaje = orden.porcentajeRecibido;
            if (porcentaje === undefined || porcentaje === null) {
                return "N/A";
            }
            return `${porcentaje.toFixed(1)}%`;
        } else {
            // Mostrar precio total de la orden
            return orden.totalPagar?.toLocaleString("es-CO", { style: "currency", currency: "COP" }) || "N/A";
        }
    };

    const tableRows = useMemo(() => ordenes.map((orden) => (
        <Table.Row key={orden.ordenCompraId}>
            <Table.Cell>{orden.ordenCompraId}</Table.Cell>
            <Table.Cell>{orden.proveedor?.nombre}</Table.Cell>
            <Table.Cell>{orden.fechaEmision ? new Date(orden.fechaEmision).toLocaleDateString() : ""}</Table.Cell>
            <Table.Cell>{orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString() : ""}</Table.Cell>
            <Table.Cell>{renderCellValue(orden)}</Table.Cell>
            <Table.Cell textAlign="center">
                <Button size="sm" colorPalette="teal" onClick={() => onRegistrarIngreso(orden)}>
                    Gestionar
                </Button>
            </Table.Cell>
        </Table.Row>
    )), [ordenes, mostrarPorcentaje]); // Incluir mostrarPorcentaje en las dependencias

    return (
        <Box p="1em" bg="app.stepperBlue">
            <VStack gap={6} align="stretch">
                <Heading fontFamily="Comfortaa Variable" textAlign="center">
                    Órdenes de compra pendientes por recibir
                </Heading>

                <Flex gap={4} wrap="wrap" alignItems="flex-end">
                    <Field.Root minW="180px">
                        <Field.Label>ID OCM</Field.Label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={ordenCompraId}
                            onChange={(e) => setOrdenCompraId(e.target.value.replace(/\D/g, ""))}
                            placeholder="Ej: 123"
                        />
                    </Field.Root>

                    <ProveedorFilterOCM
                        selectedProveedor={proveedor as import("../../Compras/types").Proveedor | null}
                        onOpenPicker={onOpen}
                        onClearFilter={() => setProveedor(null)}
                    />

                    <VStack gap={2} alignItems="stretch">
                        <Field.Root minW="220px">
                            <Field.Label>Fecha inicial</Field.Label>
                            <Input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                            />
                        </Field.Root>
                        <Field.Root minW="220px">
                            <Field.Label>Fecha final</Field.Label>
                            <Input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                            />
                        </Field.Root>
                    </VStack>

                    <Button
                        colorPalette="teal"
                        onClick={() => fetchOrdenesPendientes(0, size)}
                        loading={isLoading}
                    >
                        Buscar
                    </Button>
                </Flex>

                <Box bg="app.surface" borderRadius="md" boxShadow="sm" overflowX="auto">
                    <Table.Root size="sm">
                        <Table.Header bg="app.tableHeader">
                            <Table.Row>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Proveedor</Table.ColumnHeader>
                                <Table.ColumnHeader>Fecha emisión</Table.ColumnHeader>
                                <Table.ColumnHeader>Fecha vencimiento</Table.ColumnHeader>
                                <Table.ColumnHeader>
                                    <HStack gap={2} justify="space-between" width="100%">
                                        <span>{mostrarPorcentaje ? "Porcentaje recibido" : "Total"}</span>
                                        <Tooltip 
                                            content={mostrarPorcentaje ? "Mostrar precio total" : "Mostrar porcentaje recibido"}
                                            positioning={{
                                                placement: "top"
                                            }}
                                        >
                                            <IconButton
                                                aria-label={mostrarPorcentaje ? "Mostrar precio total" : "Mostrar porcentaje recibido"}
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => setMostrarPorcentaje(!mostrarPorcentaje)}
                                                colorPalette="teal"><LuRepeat /></IconButton>
                                        </Tooltip>
                                    </HStack>
                                </Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="center">Acciones</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {tableRows.length > 0 ? (
                                tableRows
                            ) : (
                                <Table.Row>
                                    <Table.Cell colSpan={6} textAlign="center" py={6}>
                                        {isLoading ? "Cargando órdenes..." : "No se encontraron órdenes pendientes."}
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table.Root>
                </Box>
                {totalPages > 0 && (
                    <BetterPagination
                        page={page}
                        size={size}
                        totalPages={totalPages}
                        loading={isLoading}
                        onPageChange={handlePageChange}
                        onSizeChange={handleSizeChange}
                    />
                )}
            </VStack>

            <ProveedorPicker
                isOpen={open}
                onClose={onClose}
                onSelectProveedor={(prov) => setProveedor(prov)}
            />
        </Box>
    );
}
