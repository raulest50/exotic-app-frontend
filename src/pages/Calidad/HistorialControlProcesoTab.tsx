import {
    Badge,
    Box,
    Button,
    HStack,
    Input,
    Table,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { useMemo, useState } from "react";
import {
    buscarEjecuciones,
    detalleEjecucion,
    extractApiError,
} from "./calidadApi";
import CalidadAreaOperativaPicker from "./CalidadAreaOperativaPicker";
import ControlProcesoNumericCharts from "./charts/ControlProcesoNumericCharts";
import type {
    AreaOperativaOption,
    EjecucionDetalleResponse,
    EjecucionListItemResponse,
    MuestraResponse,
    PageResponse,
} from "./types";

function formatDateTime(value: string) {
    if (!value) return "";
    return new Date(value).toLocaleString();
}

function loteLabel(item: EjecucionListItemResponse | EjecucionDetalleResponse) {
    const producto = item.lote.producto ? `${item.lote.producto.productoId} - ${item.lote.producto.nombre}` : "";
    const orden = item.lote.tipoOrden === "OF" && item.lote.ordenFabricacionId
        ? `OF-${item.lote.ordenFabricacionId}`
        : item.lote.ordenProduccionId ? `OP-${item.lote.ordenProduccionId}` : null;
    return `${item.lote.batchNumber}${orden ? ` (${orden})` : ""}${producto ? ` / ${producto}` : ""}`;
}

function resumenMuestra(muestra: MuestraResponse) {
    if (muestra.tipo === "NUMERICA") {
        const valores = muestra.lecturas
            .map((lectura) => lectura.valorNumerico)
            .filter((value): value is number => value != null);
        const promedio = valores.length ? valores.reduce((sum, value) => sum + value, 0) / valores.length : null;
        return promedio == null ? "" : `Promedio: ${promedio.toFixed(3)}`;
    }
    const cumple = muestra.lecturas.filter((lectura) => lectura.valorBooleano === true).length;
    const noCumple = muestra.lecturas.filter((lectura) => lectura.valorBooleano === false).length;
    return `Cumple: ${cumple} / No cumple: ${noCumple}`;
}

export default function HistorialControlProcesoTab() {
    const toast = useAppToast();
    const [selectedArea, setSelectedArea] = useState<AreaOperativaOption | null>(null);
    const [producto, setProducto] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [page, setPage] = useState(0);
    const [resultados, setResultados] = useState<PageResponse<EjecucionListItemResponse> | null>(null);
    const [detalle, setDetalle] = useState<EjecucionDetalleResponse | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    const muestrasPorCaracteristica = useMemo(() => {
        const grouped = new Map<string, MuestraResponse[]>();
        for (const muestra of detalle?.muestras ?? []) {
            const key = `${muestra.caracteristicaId}:${muestra.caracteristicaNombre}`;
            grouped.set(key, [...(grouped.get(key) ?? []), muestra]);
        }
        return Array.from(grouped.entries());
    }, [detalle]);

    const handleAreaChange = (area: AreaOperativaOption | null) => {
        setSelectedArea(area);
        setResultados(null);
        setDetalle(null);
        setPage(0);
    };

    const buscar = async (targetPage = 0) => {
        setLoadingSearch(true);
        try {
            const data = await buscarEjecuciones({
                areaId: selectedArea?.areaId,
                producto: producto.trim() || undefined,
                fechaDesde: fechaDesde || undefined,
                fechaHasta: fechaHasta || undefined,
                page: targetPage,
                size: 20,
            });
            setResultados(data);
            setPage(targetPage);
            setDetalle(null);
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible buscar controles de proceso."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoadingSearch(false);
        }
    };

    const cargarDetalle = async (id: number) => {
        setLoadingDetalle(true);
        try {
            setDetalle(await detalleEjecucion(id));
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible cargar el detalle."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoadingDetalle(false);
        }
    };

    return (
        <VStack align="stretch" gap={5}>
            <CalidadAreaOperativaPicker
                value={selectedArea}
                onChange={handleAreaChange}
                helperText="Este filtro es opcional para consultar controles registrados."
            />

            <Box borderWidth="1px" borderRadius="md" p={4}>
                <HStack align="end" gap={3}>
                    <Box flex="1">
                        <Text fontWeight="semibold" mb={1}>Producto</Text>
                        <Input value={producto} onChange={(event) => setProducto(event.target.value)} placeholder="Codigo o nombre" />
                    </Box>
                    <Box>
                        <Text fontWeight="semibold" mb={1}>Desde</Text>
                        <Input type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} />
                    </Box>
                    <Box>
                        <Text fontWeight="semibold" mb={1}>Hasta</Text>
                        <Input type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} />
                    </Box>
                    <Button colorPalette="teal" onClick={() => buscar(0)} loading={loadingSearch}>Buscar</Button>
                </HStack>
            </Box>

            <Box borderWidth="1px" borderRadius="md" p={4}>
                <HStack justify="space-between" mb={3}>
                    <Text fontWeight="semibold">Controles registrados</Text>
                    {resultados && <Text fontSize="sm" color="gray.600">{resultados.totalElements} registros</Text>}
                </HStack>
                <Table.Root size="sm">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                            <Table.ColumnHeader>Area</Table.ColumnHeader>
                            <Table.ColumnHeader>Lote / Producto</Table.ColumnHeader>
                            <Table.ColumnHeader>Version</Table.ColumnHeader>
                            <Table.ColumnHeader>Usuario</Table.ColumnHeader>
                            <Table.ColumnHeader />
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {(resultados?.content ?? []).map((item) => (
                            <Table.Row key={item.id}>
                                <Table.Cell>{formatDateTime(item.fechaRegistro)}</Table.Cell>
                                <Table.Cell>{item.areaOperativa.nombre}</Table.Cell>
                                <Table.Cell>{loteLabel(item)}</Table.Cell>
                                <Table.Cell>{item.plantillaVersion}</Table.Cell>
                                <Table.Cell>{item.usuarioNombreCompleto || item.usuarioUsername}</Table.Cell>
                                <Table.Cell>
                                    <Button size="xs" onClick={() => cargarDetalle(item.id)} loading={loadingDetalle}>
                                        Ver
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
                {resultados && resultados.totalPages > 1 && (
                    <HStack justify="flex-end" mt={3}>
                        <Button size="sm" disabled={page <= 0} onClick={() => buscar(page - 1)}>Anterior</Button>
                        <Text fontSize="sm">Pagina {page + 1} de {resultados.totalPages}</Text>
                        <Button size="sm" disabled={page + 1 >= resultados.totalPages} onClick={() => buscar(page + 1)}>Siguiente</Button>
                    </HStack>
                )}
            </Box>

            {detalle && (
                <Box borderWidth="1px" borderRadius="md" p={4}>
                    <HStack justify="space-between" mb={3}>
                        <VStack align="start" gap={1}>
                            <Text fontWeight="semibold">{detalle.areaOperativa.nombre}</Text>
                            <Text fontSize="sm" color="gray.600">{loteLabel(detalle)}</Text>
                        </VStack>
                        <Badge colorPalette="teal">Version {detalle.plantillaVersion}</Badge>
                    </HStack>
                    <VStack align="stretch" gap={4}>
                        <ControlProcesoNumericCharts muestras={detalle.muestras} />
                        {muestrasPorCaracteristica.map(([key, muestras]) => (
                            <Box key={key} borderWidth="1px" borderRadius="md" p={3}>
                                <HStack mb={2}>
                                    <Text fontWeight="semibold">{muestras[0]?.caracteristicaNombre}</Text>
                                    <Badge>{muestras[0]?.tipo === "NUMERICA" ? "Numerica" : "Cumple/No cumple"}</Badge>
                                    {muestras[0]?.unidad && <Badge variant="outline">{muestras[0].unidad}</Badge>}
                                </HStack>
                                <Table.Root size="sm">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeader>Muestra</Table.ColumnHeader>
                                            <Table.ColumnHeader>Resumen</Table.ColumnHeader>
                                            <Table.ColumnHeader>Lecturas</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {muestras.map((muestra) => (
                                            <Table.Row key={muestra.id}>
                                                <Table.Cell>{muestra.numeroMuestra}</Table.Cell>
                                                <Table.Cell>{resumenMuestra(muestra)}</Table.Cell>
                                                <Table.Cell>
                                                    {muestra.lecturas.map((lectura) => (
                                                        <Badge key={lectura.id} mr={1} mb={1} variant="outline">
                                                            {lectura.indiceUnidad}:{" "}
                                                            {muestra.tipo === "NUMERICA"
                                                                ? lectura.valorNumerico
                                                                : lectura.valorBooleano
                                                                  ? "Cumple"
                                                                  : "No cumple"}
                                                        </Badge>
                                                    ))}
                                                </Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                </Table.Root>
                            </Box>
                        ))}
                    </VStack>
                    {detalle.observaciones && (
                        <Box mt={4}>
                            <Text fontWeight="semibold">Observaciones</Text>
                            <Text>{detalle.observaciones}</Text>
                        </Box>
                    )}
                </Box>
            )}
        </VStack>
    );
}
