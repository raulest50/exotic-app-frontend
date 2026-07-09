import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    FormControl,
    FormHelperText,
    FormLabel,
    HStack,
    Input,
    Progress,
    Select,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    StatArrow,
    StatHelpText,
    StatLabel,
    StatNumber,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tooltip,
    Tr,
    useBreakpointValue,
    useToast,
} from "@chakra-ui/react";
import { DownloadIcon, RepeatIcon } from "@chakra-ui/icons";
import ReactECharts from "echarts-for-react";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL.tsx";

type ModoFechaInformeGlobal = "fecha_unica" | "rango";

interface InformeGlobalProduccion {
    fechaDesde: string;
    fechaHasta: string;
    modoFecha: "FECHA_UNICA" | "RANGO";
    diasRango: number;
    mpsIds: number[];
    resumen: InformeGlobalResumen;
    consolidadoCategorias: ConsolidadoCategoria[];
    detalleReferencias: DetalleReferencia[];
    notas: NotaInforme[];
}

interface InformeGlobalResumen {
    unidadesPlaneadas: number;
    unidadesProducidas: number;
    unidadesProducidasPeriodoAnterior: number;
    capacidadProductivaPeriodo: number;
    rendimientoPlaneacionPct?: number | null;
    cumplimientoReferenciasPct?: number | null;
    capacidadUtilizadaPct?: number | null;
    tendenciaProduccionPct?: number | null;
    referenciasPlaneadas: number;
    referenciasProducidas: number;
    referenciasPlaneadasProducidas: number;
    referenciasNoPlaneadas: number;
    categoriasConCapacidad: number;
    categoriasSinCapacidad: number;
    movimientosProduccion: number;
}

interface ConsolidadoCategoria {
    categoriaId?: number | null;
    categoriaNombre: string;
    unidadesPlaneadas: number;
    unidadesProducidas: number;
    capacidadProductivaPeriodo: number;
    rendimientoPlaneacionPct?: number | null;
    cumplimientoReferenciasPct?: number | null;
    capacidadUtilizadaPct?: number | null;
    referenciasPlaneadas: number;
    referenciasProducidas: number;
    referenciasPlaneadasProducidas: number;
}

interface DetalleReferencia {
    productoId?: string | null;
    productoNombre: string;
    categoriaId?: number | null;
    categoriaNombre: string;
    cantidadPlaneada: number;
    cantidadProducida: number;
    diferencia: number;
    rendimientoPlaneacionPct?: number | null;
    planeado: boolean;
    producido: boolean;
    noPlaneado: boolean;
}

interface NotaInforme {
    tipo: "INFO" | "WARNING" | string;
    mensaje: string;
}

const endPoints = new EndPointsURL();
const MAX_RANGE_DAYS = 31;
const CHART_REFERENCE_LIMIT = 8;
const chartPalette = [
    "#2f855a",
    "#3182ce",
    "#d69e2e",
    "#805ad5",
    "#e53e3e",
    "#319795",
    "#dd6b20",
    "#718096",
    "#38a169",
];

export default function InformesGlobalesTab() {
    const toast = useToast();
    const [modoFecha, setModoFecha] = useState<ModoFechaInformeGlobal>("fecha_unica");
    const [fecha, setFecha] = useState(getTodayIsoDate());
    const [fechaDesde, setFechaDesde] = useState(getCurrentMonthStartIsoDate());
    const [fechaHasta, setFechaHasta] = useState(getTodayIsoDate());
    const [reporte, setReporte] = useState<InformeGlobalProduccion | null>(null);
    const [loading, setLoading] = useState(false);

    const isMobile = useBreakpointValue({ base: true, lg: false }) ?? false;
    const chartHeight = useBreakpointValue({ base: 340, md: 420 }) ?? 420;
    const rangeDays = modoFecha === "rango" ? getRangeDaysInclusive(fechaDesde, fechaHasta) : 1;
    const rangeInvalid = modoFecha === "rango" && Boolean(fechaDesde && fechaHasta && fechaDesde > fechaHasta);
    const rangeTooLong = modoFecha === "rango" && rangeDays > MAX_RANGE_DAYS;
    const canQuery = modoFecha === "fecha_unica"
        ? Boolean(fecha)
        : Boolean(fechaDesde && fechaHasta && !rangeInvalid && !rangeTooLong);

    const fetchData = async () => {
        if (!canQuery) {
            toast({
                title: "Fechas invalidas",
                description: "Seleccione una fecha o un rango valido para consultar el informe.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);
        try {
            const params = modoFecha === "fecha_unica"
                ? { fecha }
                : { fechaDesde, fechaHasta };
            const response = await axios.get<InformeGlobalProduccion>(
                endPoints.biInformesGlobalesProduccion(params)
            );
            setReporte(response.data);
        } catch (error) {
            console.error("Error loading informes globales produccion:", error);
            toast({
                title: "No se pudo cargar el informe",
                description: axios.isAxiosError(error)
                    ? error.response?.data?.error ?? "Revise las fechas e intente nuevamente."
                    : "Compruebe la conexion e intente nuevamente.",
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const chartData = useMemo(() => buildChartData(reporte, isMobile), [isMobile, reporte]);
    const chartOptions = useMemo(() => buildChartOptions(chartData, isMobile), [chartData, isMobile]);
    const hasChartData = chartData.series.some((serie) => serie.data.some((value) => value > 0));
    const detalles = reporte?.detalleReferencias ?? [];

    return (
        <Stack spacing={4}>
            <Card variant="outline">
                <CardBody>
                    <Stack spacing={4}>
                        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                            <FormControl>
                                <FormLabel>Tipo de fecha</FormLabel>
                                <Select
                                    value={modoFecha}
                                    onChange={(event) => setModoFecha(event.target.value as ModoFechaInformeGlobal)}
                                >
                                    <option value="fecha_unica">Fecha unica</option>
                                    <option value="rango">Rango de fechas</option>
                                </Select>
                            </FormControl>

                            {modoFecha === "fecha_unica" ? (
                                <FormControl>
                                    <FormLabel>Fecha</FormLabel>
                                    <Input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
                                </FormControl>
                            ) : (
                                <>
                                    <FormControl>
                                        <FormLabel>Fecha desde</FormLabel>
                                        <Input
                                            type="date"
                                            value={fechaDesde}
                                            onChange={(event) => setFechaDesde(event.target.value)}
                                        />
                                    </FormControl>
                                    <FormControl isInvalid={rangeInvalid || rangeTooLong}>
                                        <FormLabel>Fecha hasta</FormLabel>
                                        <Input
                                            type="date"
                                            value={fechaHasta}
                                            onChange={(event) => setFechaHasta(event.target.value)}
                                        />
                                        {rangeInvalid ? (
                                            <FormHelperText color="red.500">
                                                La fecha inicial no puede ser posterior.
                                            </FormHelperText>
                                        ) : null}
                                        {rangeTooLong ? (
                                            <FormHelperText color="red.500">
                                                El rango maximo inicial es de {MAX_RANGE_DAYS} dias.
                                            </FormHelperText>
                                        ) : null}
                                    </FormControl>
                                </>
                            )}
                        </SimpleGrid>

                        <Stack
                            direction={{ base: "column", md: "row" }}
                            align={{ base: "stretch", md: "center" }}
                            justify="space-between"
                            spacing={3}
                        >
                            <Badge colorScheme="green" alignSelf={{ base: "flex-start", md: "center" }}>
                                {reporte ? buildPeriodLabel(reporte) : "Sin consulta"}
                            </Badge>
                            <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
                                <Button
                                    leftIcon={<RepeatIcon />}
                                    colorScheme="green"
                                    onClick={fetchData}
                                    isLoading={loading}
                                    isDisabled={!canQuery}
                                    w={{ base: "full", sm: "auto" }}
                                >
                                    Actualizar
                                </Button>
                                <Tooltip label="Exportacion Excel proximamente">
                                    <Box as="span" w={{ base: "full", sm: "auto" }}>
                                        <Button
                                            leftIcon={<DownloadIcon />}
                                            variant="outline"
                                            colorScheme="green"
                                            isDisabled
                                            w="full"
                                        >
                                            Descargar Excel
                                        </Button>
                                    </Box>
                                </Tooltip>
                            </Stack>
                        </Stack>
                    </Stack>
                </CardBody>
            </Card>

            {loading ? (
                <Card variant="outline">
                    <CardBody>
                        <Stack align="center" py={8}>
                            <Spinner />
                            <Text color="app.textMuted">Cargando informe global...</Text>
                        </Stack>
                    </CardBody>
                </Card>
            ) : (
                <>
                    {reporte ? (
                        <>
                            <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                                <KpiCard
                                    label="Produccion"
                                    value={formatInteger(reporte.resumen.unidadesProducidas)}
                                    help={`${formatInteger(reporte.resumen.unidadesPlaneadas)} planeadas`}
                                    trend={reporte.resumen.tendenciaProduccionPct}
                                />
                                <KpiCard
                                    label="Rendimiento"
                                    value={formatPercent(reporte.resumen.rendimientoPlaneacionPct)}
                                    help="Producido vs planeado"
                                />
                                <KpiCard
                                    label="Capacidad utilizada"
                                    value={formatPercent(reporte.resumen.capacidadUtilizadaPct)}
                                    help={`${formatInteger(reporte.resumen.capacidadProductivaPeriodo)} unidades capacidad`}
                                />
                                <KpiCard
                                    label="Cumplimiento refs."
                                    value={formatPercent(reporte.resumen.cumplimientoReferenciasPct)}
                                    help={`${formatInteger(reporte.resumen.referenciasPlaneadasProducidas)} de ${formatInteger(reporte.resumen.referenciasPlaneadas)}`}
                                />
                            </SimpleGrid>

                            {reporte.notas.map((nota) => (
                                <Alert
                                    key={`${nota.tipo}-${nota.mensaje}`}
                                    status={nota.tipo === "WARNING" ? "warning" : "info"}
                                    borderRadius="md"
                                >
                                    <AlertIcon />
                                    <Text fontSize="sm">{nota.mensaje}</Text>
                                </Alert>
                            ))}

                            <Card variant="outline">
                                <CardBody>
                                    <Stack spacing={4}>
                                        <Stack
                                            direction={{ base: "column", md: "row" }}
                                            justify="space-between"
                                            align={{ base: "flex-start", md: "center" }}
                                            spacing={2}
                                        >
                                            <Box>
                                                <Text fontWeight="semibold">
                                                    Produccion por categoria y referencia
                                                </Text>
                                                <Text fontSize="sm" color="app.textMuted">
                                                    Barras apiladas por referencias producidas.
                                                </Text>
                                            </Box>
                                            <Badge colorScheme="blue">
                                                {formatInteger(reporte.resumen.movimientosProduccion)} movimientos
                                            </Badge>
                                        </Stack>

                                        {hasChartData ? (
                                            <ReactECharts
                                                option={chartOptions}
                                                style={{ height: `${chartHeight}px`, width: "100%" }}
                                            />
                                        ) : (
                                            <Box py={10}>
                                                <Text color="app.textMuted" textAlign="center">
                                                    No hay produccion registrada para la ventana seleccionada.
                                                </Text>
                                            </Box>
                                        )}
                                    </Stack>
                                </CardBody>
                            </Card>

                            <Card variant="outline" display={{ base: "none", lg: "block" }}>
                                <CardBody>
                                    <Text fontWeight="semibold" mb={4}>
                                        Detalle por referencia
                                    </Text>
                                    {detalles.length > 0 ? (
                                        <TableContainer>
                                            <Table size="sm" variant="simple">
                                                <Thead>
                                                    <Tr>
                                                        <Th>Categoria</Th>
                                                        <Th>Referencia</Th>
                                                        <Th isNumeric>Planeado</Th>
                                                        <Th isNumeric>Producido</Th>
                                                        <Th>Rendimiento</Th>
                                                        <Th>Estado</Th>
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {detalles.map((detalle) => (
                                                        <DetalleReferenciaRow
                                                            key={`${detalle.productoId ?? detalle.productoNombre}-${detalle.categoriaNombre}`}
                                                            detalle={detalle}
                                                        />
                                                    ))}
                                                </Tbody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <Text color="app.textMuted" textAlign="center" py={8}>
                                            No hay referencias para mostrar.
                                        </Text>
                                    )}
                                </CardBody>
                            </Card>

                            <Box display={{ base: "block", lg: "none" }}>
                                <Text fontWeight="semibold" mb={3}>
                                    Detalle por referencia
                                </Text>
                                {detalles.length > 0 ? (
                                    <Stack spacing={3}>
                                        {detalles.map((detalle) => (
                                            <DetalleReferenciaCard
                                                key={`${detalle.productoId ?? detalle.productoNombre}-${detalle.categoriaNombre}`}
                                                detalle={detalle}
                                            />
                                        ))}
                                    </Stack>
                                ) : (
                                    <Text color="app.textMuted" textAlign="center" py={8}>
                                        No hay referencias para mostrar.
                                    </Text>
                                )}
                            </Box>
                        </>
                    ) : (
                        <Card variant="outline">
                            <CardBody>
                                <Text color="app.textMuted" textAlign="center" py={8}>
                                    Seleccione una fecha y actualice el informe.
                                </Text>
                            </CardBody>
                        </Card>
                    )}
                </>
            )}
        </Stack>
    );
}

function KpiCard({ label, value, help, trend }: {
    label: string;
    value: string;
    help: string;
    trend?: number | null;
}) {
    return (
        <Card variant="outline">
            <CardBody>
                <Stat>
                    <StatLabel>{label}</StatLabel>
                    <StatNumber>{value}</StatNumber>
                    <StatHelpText mb={0}>
                        {trend === undefined || trend === null ? (
                            help
                        ) : (
                            <HStack spacing={1}>
                                <StatArrow type={trend >= 0 ? "increase" : "decrease"} />
                                <Text as="span">{formatSignedPercent(trend)}</Text>
                            </HStack>
                        )}
                    </StatHelpText>
                    {trend !== undefined && trend !== null ? (
                        <Text fontSize="xs" color="app.textMuted">{help}</Text>
                    ) : null}
                </Stat>
            </CardBody>
        </Card>
    );
}

function DetalleReferenciaRow({ detalle }: { detalle: DetalleReferencia }) {
    const status = getReferenceStatus(detalle);
    return (
        <Tr>
            <Td>{detalle.categoriaNombre}</Td>
            <Td maxW="280px">
                <Text fontWeight="medium" noOfLines={1}>{detalle.productoNombre}</Text>
                <Text fontSize="xs" color="app.textMuted">{detalle.productoId}</Text>
            </Td>
            <Td isNumeric>{formatInteger(detalle.cantidadPlaneada)}</Td>
            <Td isNumeric>{formatInteger(detalle.cantidadProducida)}</Td>
            <Td minW="180px">
                <Stack spacing={1}>
                    <Text fontSize="sm">{formatPercent(detalle.rendimientoPlaneacionPct)}</Text>
                    <Progress
                        value={clampPercent(detalle.rendimientoPlaneacionPct)}
                        colorScheme={status.colorScheme}
                        size="sm"
                        borderRadius="full"
                    />
                </Stack>
            </Td>
            <Td>
                <Badge colorScheme={status.colorScheme}>{status.label}</Badge>
            </Td>
        </Tr>
    );
}

function DetalleReferenciaCard({ detalle }: { detalle: DetalleReferencia }) {
    const status = getReferenceStatus(detalle);
    return (
        <Card variant="outline">
            <CardBody>
                <Stack spacing={3}>
                    <Stack direction="row" justify="space-between" spacing={3} align="flex-start">
                        <Box minW={0}>
                            <Badge colorScheme="gray" mb={2}>{detalle.categoriaNombre}</Badge>
                            <Text fontWeight="semibold" noOfLines={2}>{detalle.productoNombre}</Text>
                            <Text fontSize="xs" color="app.textMuted">{detalle.productoId}</Text>
                        </Box>
                        <Badge colorScheme={status.colorScheme} flexShrink={0}>{status.label}</Badge>
                    </Stack>
                    <SimpleGrid columns={2} spacing={3}>
                        <MetricMini label="Planeado" value={formatInteger(detalle.cantidadPlaneada)} />
                        <MetricMini label="Producido" value={formatInteger(detalle.cantidadProducida)} />
                    </SimpleGrid>
                    <Box>
                        <HStack justify="space-between" mb={1}>
                            <Text fontSize="sm" color="app.textMuted">Rendimiento</Text>
                            <Text fontSize="sm" fontWeight="semibold">
                                {formatPercent(detalle.rendimientoPlaneacionPct)}
                            </Text>
                        </HStack>
                        <Progress
                            value={clampPercent(detalle.rendimientoPlaneacionPct)}
                            colorScheme={status.colorScheme}
                            borderRadius="full"
                        />
                    </Box>
                </Stack>
            </CardBody>
        </Card>
    );
}

function MetricMini({ label, value }: { label: string; value: string }) {
    return (
        <Box borderWidth="1px" borderColor="app.border" borderRadius="md" p={3}>
            <Text fontSize="xs" color="app.textMuted">{label}</Text>
            <Text fontWeight="semibold">{value}</Text>
        </Box>
    );
}

function buildChartData(reporte: InformeGlobalProduccion | null, isMobile: boolean) {
    const categorias = reporte?.consolidadoCategorias ?? [];
    const detalles = (reporte?.detalleReferencias ?? []).filter((detalle) => detalle.cantidadProducida > 0);
    const categoryKeys = categorias.map((categoria) => categoryKey(categoria.categoriaId, categoria.categoriaNombre));
    const categoryLabels = categorias.map((categoria) => categoria.categoriaNombre);
    const topLimit = isMobile ? 5 : CHART_REFERENCE_LIMIT;
    const topReferenceIds = new Set(
        [...detalles]
            .sort((a, b) => b.cantidadProducida - a.cantidadProducida)
            .slice(0, topLimit)
            .map(referenceKey)
    );
    const seriesByName = new Map<string, number[]>();

    const ensureSeries = (name: string) => {
        if (!seriesByName.has(name)) {
            seriesByName.set(name, Array(categoryLabels.length).fill(0));
        }
        return seriesByName.get(name) as number[];
    };

    detalles.forEach((detalle) => {
        const index = categoryKeys.indexOf(categoryKey(detalle.categoriaId, detalle.categoriaNombre));
        if (index < 0) return;
        const name = topReferenceIds.has(referenceKey(detalle))
            ? detalle.productoNombre
            : "Otras referencias";
        ensureSeries(name)[index] += detalle.cantidadProducida;
    });

    const series = Array.from(seriesByName.entries()).map(([name, data], index) => ({
        name,
        data,
        color: chartPalette[index % chartPalette.length],
    }));
    return { categories: categoryLabels, series };
}

function buildChartOptions(
    chartData: ReturnType<typeof buildChartData>,
    isMobile: boolean
) {
    const needsZoom = chartData.categories.length > (isMobile ? 2 : 5);
    return {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            valueFormatter: (value: number) => formatInteger(value),
        },
        legend: {
            type: "scroll",
            top: 0,
        },
        grid: {
            left: 56,
            right: 16,
            top: 64,
            bottom: needsZoom ? 72 : 44,
        },
        dataZoom: needsZoom
            ? [
                { type: "inside", xAxisIndex: 0 },
                { type: "slider", xAxisIndex: 0, bottom: 16, height: 22 },
            ]
            : [],
        xAxis: {
            type: "category",
            data: chartData.categories,
            axisLabel: {
                interval: 0,
                rotate: isMobile || chartData.categories.length > 4 ? 30 : 0,
            },
        },
        yAxis: {
            type: "value",
            name: "Unidades",
        },
        series: chartData.series.map((serie) => ({
            name: serie.name,
            type: "bar",
            stack: "produccion",
            data: serie.data,
            itemStyle: { color: serie.color },
            emphasis: { focus: "series" },
        })),
    };
}

function getReferenceStatus(detalle: DetalleReferencia) {
    if (detalle.noPlaneado) {
        return { label: "No planeado", colorScheme: "orange" };
    }
    if (!detalle.producido && detalle.planeado) {
        return { label: "Pendiente", colorScheme: "red" };
    }
    if ((detalle.rendimientoPlaneacionPct ?? 0) >= 100) {
        return { label: "Cumplido", colorScheme: "green" };
    }
    if (detalle.producido) {
        return { label: "Parcial", colorScheme: "yellow" };
    }
    return { label: "Sin datos", colorScheme: "gray" };
}

function categoryKey(categoriaId: number | null | undefined, categoriaNombre: string) {
    return `${categoriaId ?? "SIN"}-${categoriaNombre}`;
}

function referenceKey(detalle: DetalleReferencia) {
    return detalle.productoId ?? detalle.productoNombre;
}

function buildPeriodLabel(reporte: InformeGlobalProduccion) {
    if (reporte.modoFecha === "FECHA_UNICA") {
        return reporte.fechaDesde;
    }
    return `${reporte.fechaDesde} a ${reporte.fechaHasta} (${reporte.diasRango} dias)`;
}

function clampPercent(value?: number | null) {
    if (value === undefined || value === null || Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

function formatInteger(value?: number | null) {
    return Number(value ?? 0).toLocaleString("es-CO", {
        maximumFractionDigits: 0,
    });
}

function formatPercent(value?: number | null) {
    if (value === undefined || value === null) return "Sin base";
    return `${value.toLocaleString("es-CO", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })}%`;
}

function formatSignedPercent(value: number) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatPercent(value)}`;
}

function getTodayIsoDate() {
    return toLocalIsoDate(new Date());
}

function getCurrentMonthStartIsoDate() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${today.getFullYear()}-${month}-01`;
}

function toLocalIsoDate(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

function getRangeDaysInclusive(fechaInicio: string, fechaFin: string) {
    if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) return 0;
    const start = new Date(`${fechaInicio}T00:00:00`);
    const end = new Date(`${fechaFin}T00:00:00`);
    return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}
