import {
    Badge,
    Box,
    Button,
    HStack,
    Input,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    useToast,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import {
    buscarEjecuciones,
    detalleEjecucion,
    extractApiError,
    searchAreasOperativas,
} from "./calidadApi";
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
    return `${item.lote.batchNumber}${producto ? ` / ${producto}` : ""}`;
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
    const toast = useToast();
    const [areaSearch, setAreaSearch] = useState("");
    const [areas, setAreas] = useState<AreaOperativaOption[]>([]);
    const [selectedArea, setSelectedArea] = useState<AreaOperativaOption | null>(null);
    const [producto, setProducto] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [page, setPage] = useState(0);
    const [resultados, setResultados] = useState<PageResponse<EjecucionListItemResponse> | null>(null);
    const [detalle, setDetalle] = useState<EjecucionDetalleResponse | null>(null);
    const [loadingAreas, setLoadingAreas] = useState(false);
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

    const buscarAreas = async () => {
        setLoadingAreas(true);
        try {
            setAreas(await searchAreasOperativas(areaSearch));
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible buscar areas operativas."),
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setLoadingAreas(false);
        }
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
        <VStack align="stretch" spacing={5}>
            <Box borderWidth="1px" borderRadius="md" p={4}>
                <HStack align="end" spacing={3}>
                    <Box flex="1">
                        <Text fontWeight="semibold" mb={1}>Area operativa</Text>
                        <Input
                            value={areaSearch}
                            onChange={(event) => setAreaSearch(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && buscarAreas()}
                            placeholder="Buscar por nombre"
                        />
                    </Box>
                    <Button onClick={buscarAreas} isLoading={loadingAreas}>Buscar area</Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSelectedArea(null);
                            setAreas([]);
                            setAreaSearch("");
                        }}
                    >
                        Limpiar area
                    </Button>
                </HStack>
                {areas.length > 0 && (
                    <HStack mt={3} spacing={2} flexWrap="wrap">
                        {areas.map((area) => (
                            <Button
                                key={area.areaId}
                                size="sm"
                                variant={selectedArea?.areaId === area.areaId ? "solid" : "outline"}
                                colorScheme={selectedArea?.areaId === area.areaId ? "teal" : "gray"}
                                onClick={() => setSelectedArea(area)}
                            >
                                {area.nombre}
                            </Button>
                        ))}
                    </HStack>
                )}
            </Box>

            <Box borderWidth="1px" borderRadius="md" p={4}>
                <HStack align="end" spacing={3}>
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
                    <Button colorScheme="teal" onClick={() => buscar(0)} isLoading={loadingSearch}>Buscar</Button>
                </HStack>
            </Box>

            <Box borderWidth="1px" borderRadius="md" p={4}>
                <HStack justify="space-between" mb={3}>
                    <Text fontWeight="semibold">Controles registrados</Text>
                    {resultados && <Text fontSize="sm" color="gray.600">{resultados.totalElements} registros</Text>}
                </HStack>
                <Table size="sm">
                    <Thead>
                        <Tr>
                            <Th>Fecha</Th>
                            <Th>Area</Th>
                            <Th>Lote / Producto</Th>
                            <Th>Version</Th>
                            <Th>Usuario</Th>
                            <Th />
                        </Tr>
                    </Thead>
                    <Tbody>
                        {(resultados?.content ?? []).map((item) => (
                            <Tr key={item.id}>
                                <Td>{formatDateTime(item.fechaRegistro)}</Td>
                                <Td>{item.areaOperativa.nombre}</Td>
                                <Td>{loteLabel(item)}</Td>
                                <Td>{item.plantillaVersion}</Td>
                                <Td>{item.usuarioNombreCompleto || item.usuarioUsername}</Td>
                                <Td>
                                    <Button size="xs" onClick={() => cargarDetalle(item.id)} isLoading={loadingDetalle}>
                                        Ver
                                    </Button>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
                {resultados && resultados.totalPages > 1 && (
                    <HStack justify="flex-end" mt={3}>
                        <Button size="sm" isDisabled={page <= 0} onClick={() => buscar(page - 1)}>Anterior</Button>
                        <Text fontSize="sm">Pagina {page + 1} de {resultados.totalPages}</Text>
                        <Button size="sm" isDisabled={page + 1 >= resultados.totalPages} onClick={() => buscar(page + 1)}>Siguiente</Button>
                    </HStack>
                )}
            </Box>

            {detalle && (
                <Box borderWidth="1px" borderRadius="md" p={4}>
                    <HStack justify="space-between" mb={3}>
                        <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold">{detalle.areaOperativa.nombre}</Text>
                            <Text fontSize="sm" color="gray.600">{loteLabel(detalle)}</Text>
                        </VStack>
                        <Badge colorScheme="teal">Version {detalle.plantillaVersion}</Badge>
                    </HStack>
                    <VStack align="stretch" spacing={4}>
                        {muestrasPorCaracteristica.map(([key, muestras]) => (
                            <Box key={key} borderWidth="1px" borderRadius="md" p={3}>
                                <HStack mb={2}>
                                    <Text fontWeight="semibold">{muestras[0]?.caracteristicaNombre}</Text>
                                    <Badge>{muestras[0]?.tipo === "NUMERICA" ? "Numerica" : "Cumple/No cumple"}</Badge>
                                    {muestras[0]?.unidad && <Badge variant="outline">{muestras[0].unidad}</Badge>}
                                </HStack>
                                <Table size="sm">
                                    <Thead>
                                        <Tr>
                                            <Th>Muestra</Th>
                                            <Th>Resumen</Th>
                                            <Th>Lecturas</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {muestras.map((muestra) => (
                                            <Tr key={muestra.id}>
                                                <Td>{muestra.numeroMuestra}</Td>
                                                <Td>{resumenMuestra(muestra)}</Td>
                                                <Td>
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
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
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
