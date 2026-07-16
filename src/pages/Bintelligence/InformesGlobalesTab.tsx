import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    Divider,
    FormControl,
    FormHelperText,
    FormLabel,
    Heading,
    HStack,
    Input,
    Select,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    StatArrow,
    StatHelpText,
    StatLabel,
    StatNumber,
    Text,
    Tooltip,
    useBreakpointValue,
    useToast,
} from "@chakra-ui/react";
import { DownloadIcon, RepeatIcon } from "@chakra-ui/icons";
import ReactECharts from "echarts-for-react";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL.tsx";

type ModoFechaInformeGlobal = "fecha_unica" | "rango";

interface InformePeriodo {
    fechaDesde: string;
    fechaHasta: string;
    modoFecha: "FECHA_UNICA" | "RANGO";
    diasRango: number;
}

interface InformeGlobalProduccion extends InformePeriodo {
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

interface InformeGlobalAlmacen extends InformePeriodo {
    resumen: ResumenAlmacen;
    cantidadesPorUnidad: CantidadPorUnidad[];
    serieDiaria: SerieDiariaAlmacen[];
    consolidadoTipoMaterial: ConsolidadoTipoMaterial[];
    topMateriales: TopMaterial[];
    notas: NotaInforme[];
}

interface ResumenAlmacen {
    valorIngresosEstimado: number;
    valorDispensacionesEstimado: number;
    balanceValorEstimado: number;
    movimientosIngreso: number;
    movimientosDispensacion: number;
    materialesIngresados: number;
    materialesDispensados: number;
    materialesConCosto: number;
    materialesSinCosto: number;
    coberturaCostosPct?: number | null;
}

interface CantidadPorUnidad {
    unidadMedida: string;
    cantidadIngresada: number;
    cantidadDispensada: number;
    balanceNeto: number;
}

interface SerieDiariaAlmacen {
    fecha: string;
    valorIngresosEstimado: number;
    valorDispensacionesEstimado: number;
    movimientosIngreso: number;
    movimientosDispensacion: number;
}

interface ConsolidadoTipoMaterial {
    tipoMaterial: string;
    valorIngresosEstimado: number;
    valorDispensacionesEstimado: number;
    movimientos: number;
    cantidadesPorUnidad: CantidadPorUnidad[];
}

interface TopMaterial {
    productoId: string;
    productoNombre: string;
    tipoMaterial: string;
    unidadMedida: string;
    cantidadIngresada: number;
    cantidadDispensada: number;
    valorIngresosEstimado: number;
    valorDispensacionesEstimado: number;
    impactoValorEstimado: number;
    costoDisponible: boolean;
}

interface NotaInforme {
    tipo: "INFO" | "WARNING" | string;
    mensaje: string;
}

type InformeGlobalParams = {
    fecha?: string;
    fechaDesde?: string;
    fechaHasta?: string;
};

const endPoints = new EndPointsURL();
const MAX_RANGE_DAYS = 31;
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
    const [reporteProduccion, setReporteProduccion] = useState<InformeGlobalProduccion | null>(null);
    const [reporteAlmacen, setReporteAlmacen] = useState<InformeGlobalAlmacen | null>(null);
    const [loadingProduccion, setLoadingProduccion] = useState(false);
    const [loadingAlmacen, setLoadingAlmacen] = useState(false);
    const [errorProduccion, setErrorProduccion] = useState<string | null>(null);
    const [errorAlmacen, setErrorAlmacen] = useState<string | null>(null);

    const isMobile = useBreakpointValue({ base: true, lg: false }) ?? false;
    const productionChartHeight = useBreakpointValue({ base: 310, md: 420 }) ?? 420;
    const warehouseChartHeight = useBreakpointValue({ base: 290, md: 360 }) ?? 360;
    const rangeDays = modoFecha === "rango" ? getRangeDaysInclusive(fechaDesde, fechaHasta) : 1;
    const rangeInvalid = modoFecha === "rango" && Boolean(fechaDesde && fechaHasta && fechaDesde > fechaHasta);
    const rangeTooLong = modoFecha === "rango" && rangeDays > MAX_RANGE_DAYS;
    const canQuery = modoFecha === "fecha_unica"
        ? Boolean(fecha)
        : Boolean(fechaDesde && fechaHasta && !rangeInvalid && !rangeTooLong);
    const isLoading = loadingProduccion || loadingAlmacen;

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

        const params: InformeGlobalParams = modoFecha === "fecha_unica"
            ? { fecha }
            : { fechaDesde, fechaHasta };
        setLoadingProduccion(true);
        setLoadingAlmacen(true);
        setErrorProduccion(null);
        setErrorAlmacen(null);

        const [produccionResult, almacenResult] = await Promise.allSettled([
            axios.get<InformeGlobalProduccion>(endPoints.biInformesGlobalesProduccion(params)),
            axios.get<InformeGlobalAlmacen>(endPoints.biInformesGlobalesAlmacen(params)),
        ]);

        if (produccionResult.status === "fulfilled") {
            setReporteProduccion(produccionResult.value.data);
        } else {
            setReporteProduccion(null);
            setErrorProduccion(getRequestErrorMessage(produccionResult.reason));
        }
        setLoadingProduccion(false);

        if (almacenResult.status === "fulfilled") {
            setReporteAlmacen(almacenResult.value.data);
        } else {
            setReporteAlmacen(null);
            setErrorAlmacen(getRequestErrorMessage(almacenResult.reason));
        }
        setLoadingAlmacen(false);

        if (produccionResult.status === "rejected" || almacenResult.status === "rejected") {
            const bothFailed = produccionResult.status === "rejected" && almacenResult.status === "rejected";
            toast({
                title: bothFailed ? "No se pudo cargar el informe" : "Informe parcialmente disponible",
                description: bothFailed
                    ? "Compruebe la conexion y las fechas antes de intentar nuevamente."
                    : "Una de las secciones no respondio. La otra se mantiene disponible.",
                status: bothFailed ? "error" : "warning",
                duration: 6000,
                isClosable: true,
            });
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const productionChartData = useMemo(
        () => buildProductionChartData(reporteProduccion),
        [reporteProduccion]
    );
    const productionChartOptions = useMemo(
        () => buildProductionChartOptions(productionChartData, isMobile),
        [productionChartData, isMobile]
    );
    const warehouseChartOptions = useMemo(
        () => buildWarehouseChartOptions(reporteAlmacen?.serieDiaria ?? [], isMobile),
        [isMobile, reporteAlmacen]
    );
    const hasProductionChartData = productionChartData.series.some(
        (serie) => serie.data.some((value) => value > 0)
    );
    const hasWarehouseChartData = (reporteAlmacen?.serieDiaria ?? []).some(
        (dia) => dia.valorIngresosEstimado > 0 || dia.valorDispensacionesEstimado > 0
    );
    const periodReport = reporteProduccion ?? reporteAlmacen;

    return (
        <Stack spacing={{ base: 4, md: 5 }}>
            <Card variant="outline">
                <CardBody p={{ base: 4, md: 5 }}>
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
                                                El rango maximo es de {MAX_RANGE_DAYS} dias.
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
                                {periodReport ? buildPeriodLabel(periodReport) : "Sin consulta"}
                            </Badge>
                            <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
                                <Button
                                    leftIcon={<RepeatIcon />}
                                    colorScheme="green"
                                    onClick={fetchData}
                                    isLoading={isLoading}
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

            <Stack as="section" spacing={4} aria-labelledby="global-production-title">
                <Box>
                    <Heading id="global-production-title" as="h2" size="sm">
                        Informe global de produccion
                    </Heading>
                    <Text fontSize="sm" color="app.textMuted" mt={1}>
                        Cumplimiento, capacidad y composicion de la produccion del periodo.
                    </Text>
                </Box>

                {loadingProduccion ? (
                    <LoadingPanel label="Cargando informe de produccion..." />
                ) : errorProduccion ? (
                    <ErrorPanel message={errorProduccion} />
                ) : reporteProduccion ? (
                    <>
                        <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={{ base: 3, md: 4 }}>
                            <KpiCard
                                label="Produccion"
                                value={formatInteger(reporteProduccion.resumen.unidadesProducidas)}
                                help={`${formatInteger(reporteProduccion.resumen.unidadesPlaneadas)} planeadas`}
                                trend={reporteProduccion.resumen.tendenciaProduccionPct}
                            />
                            <KpiCard
                                label="Rendimiento"
                                value={formatPercent(reporteProduccion.resumen.rendimientoPlaneacionPct)}
                                help="Producido vs planeado"
                            />
                            <KpiCard
                                label="Capacidad utilizada"
                                value={formatPercent(reporteProduccion.resumen.capacidadUtilizadaPct)}
                                help={`${formatInteger(reporteProduccion.resumen.capacidadProductivaPeriodo)} de capacidad`}
                            />
                            <KpiCard
                                label="Cumplimiento refs."
                                value={formatPercent(reporteProduccion.resumen.cumplimientoReferenciasPct)}
                                help={`${formatInteger(reporteProduccion.resumen.referenciasPlaneadasProducidas)} de ${formatInteger(reporteProduccion.resumen.referenciasPlaneadas)}`}
                            />
                        </SimpleGrid>

                        <ReportNotes notes={reporteProduccion.notas} />

                        <Card variant="outline">
                            <CardBody p={{ base: 4, md: 5 }}>
                                <Stack spacing={4}>
                                    <Stack
                                        direction={{ base: "column", md: "row" }}
                                        justify="space-between"
                                        align={{ base: "flex-start", md: "center" }}
                                        spacing={2}
                                    >
                                        <Box>
                                            <Heading as="h3" size="sm">
                                                Produccion consolidada por categoria
                                            </Heading>
                                            <Text fontSize="sm" color="app.textMuted" mt={1}>
                                                Composicion por referencias; las de menor participacion se agrupan.
                                            </Text>
                                        </Box>
                                        <Badge colorScheme="blue">
                                            {formatInteger(reporteProduccion.resumen.movimientosProduccion)} movimientos
                                        </Badge>
                                    </Stack>

                                    {hasProductionChartData ? (
                                        <ReactECharts
                                            option={productionChartOptions}
                                            style={{ height: `${productionChartHeight}px`, width: "100%" }}
                                        />
                                    ) : (
                                        <EmptyChart message="No hay produccion registrada para la ventana seleccionada." />
                                    )}
                                </Stack>
                            </CardBody>
                        </Card>
                    </>
                ) : (
                    <EmptyPanel message="Seleccione una fecha y actualice el informe de produccion." />
                )}
            </Stack>

            <Divider borderColor="app.border" />

            <Stack as="section" spacing={4} aria-labelledby="global-warehouse-title">
                <Box>
                    <Heading id="global-warehouse-title" as="h2" size="sm">
                        Movimientos de almacen
                    </Heading>
                    <Text fontSize="sm" color="app.textMuted" mt={1}>
                        Entradas, dispensaciones e impacto estimado de materiales en el periodo.
                    </Text>
                </Box>

                {loadingAlmacen ? (
                    <LoadingPanel label="Cargando informe de almacen..." />
                ) : errorAlmacen ? (
                    <ErrorPanel message={errorAlmacen} />
                ) : reporteAlmacen ? (
                    <WarehouseReport
                        report={reporteAlmacen}
                        chartOptions={warehouseChartOptions}
                        chartHeight={warehouseChartHeight}
                        hasChartData={hasWarehouseChartData}
                    />
                ) : (
                    <EmptyPanel message="Seleccione una fecha y actualice el informe de almacen." />
                )}
            </Stack>
        </Stack>
    );
}

function WarehouseReport({ report, chartOptions, chartHeight, hasChartData }: {
    report: InformeGlobalAlmacen;
    chartOptions: Record<string, unknown>;
    chartHeight: number;
    hasChartData: boolean;
}) {
    const totalMovements = report.resumen.movimientosIngreso + report.resumen.movimientosDispensacion;
    const hasCostBasis = report.resumen.materialesConCosto > 0 || totalMovements === 0;

    return (
        <>
            <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={{ base: 3, md: 4 }}>
                <KpiCard
                    label="Valor ingresado"
                    value={hasCostBasis ? formatCurrency(report.resumen.valorIngresosEstimado) : "Sin base"}
                    help={`${formatInteger(report.resumen.movimientosIngreso)} movimientos`}
                />
                <KpiCard
                    label="Valor dispensado"
                    value={hasCostBasis ? formatCurrency(report.resumen.valorDispensacionesEstimado) : "Sin base"}
                    help={`${formatInteger(report.resumen.movimientosDispensacion)} movimientos`}
                />
                <KpiCard
                    label="Balance estimado"
                    value={hasCostBasis ? formatCurrency(report.resumen.balanceValorEstimado) : "Sin base"}
                    help="Ingresos menos dispensaciones"
                />
                <KpiCard
                    label="Cobertura de costos"
                    value={formatPercent(report.resumen.coberturaCostosPct)}
                    help={`${formatInteger(report.resumen.materialesConCosto)} con costo | ${formatInteger(report.resumen.materialesSinCosto)} sin costo`}
                />
            </SimpleGrid>

            <ReportNotes notes={report.notas} />

            <Card variant="outline">
                <CardBody p={{ base: 4, md: 5 }}>
                    <Stack spacing={4}>
                        <Box>
                            <Heading as="h3" size="sm">Cantidades por unidad de medida</Heading>
                            <Text fontSize="sm" color="app.textMuted" mt={1}>
                                Balance fisico separado para evitar sumar magnitudes incompatibles.
                            </Text>
                        </Box>
                        {report.cantidadesPorUnidad.length > 0 ? (
                            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={0}>
                                {report.cantidadesPorUnidad.map((cantidad, index) => (
                                    <Box
                                        key={cantidad.unidadMedida}
                                        py={3}
                                        px={{ base: 0, md: 4 }}
                                        borderTopWidth={{ base: index === 0 ? 0 : "1px", md: 0 }}
                                        borderLeftWidth={{ base: 0, md: index === 0 ? 0 : "1px" }}
                                        borderColor="app.border"
                                    >
                                        <Badge colorScheme="gray" mb={2}>{cantidad.unidadMedida}</Badge>
                                        <SimpleGrid columns={3} spacing={2}>
                                            <QuantityMetric label="Ingreso" value={cantidad.cantidadIngresada} />
                                            <QuantityMetric label="Dispensado" value={cantidad.cantidadDispensada} />
                                            <QuantityMetric label="Balance" value={cantidad.balanceNeto} />
                                        </SimpleGrid>
                                    </Box>
                                ))}
                            </SimpleGrid>
                        ) : (
                            <Text color="app.textMuted">No hay cantidades de materiales para mostrar.</Text>
                        )}
                    </Stack>
                </CardBody>
            </Card>

            <Card variant="outline">
                <CardBody p={{ base: 4, md: 5 }}>
                    <Stack spacing={4}>
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            justify="space-between"
                            align={{ base: "flex-start", md: "center" }}
                            spacing={2}
                        >
                            <Box>
                                <Heading as="h3" size="sm">Evolucion diaria del valor estimado</Heading>
                                <Text fontSize="sm" color="app.textMuted" mt={1}>
                                    Costo actual por cantidad movilizada, sin IVA.
                                </Text>
                            </Box>
                            <Badge colorScheme="teal">{formatInteger(totalMovements)} movimientos</Badge>
                        </Stack>
                        {hasChartData ? (
                            <ReactECharts
                                option={chartOptions}
                                style={{ height: `${chartHeight}px`, width: "100%" }}
                            />
                        ) : (
                            <EmptyChart message={totalMovements > 0
                                ? "Los movimientos del periodo no tienen costos suficientes para construir la serie monetaria."
                                : "No hay movimientos de materiales en la ventana seleccionada."}
                            />
                        )}
                    </Stack>
                </CardBody>
            </Card>

            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                <Card variant="outline">
                    <CardBody p={{ base: 4, md: 5 }}>
                        <Stack spacing={4}>
                            <Heading as="h3" size="sm">Composicion por tipo de material</Heading>
                            {report.consolidadoTipoMaterial.length > 0 ? (
                                <Stack spacing={0} divider={<Divider borderColor="app.border" />}>
                                    {report.consolidadoTipoMaterial.map((tipo) => (
                                        <Box key={tipo.tipoMaterial} py={3}>
                                            <HStack justify="space-between" align="flex-start" spacing={3}>
                                                <Box minW={0}>
                                                    <Text fontWeight="semibold">{tipo.tipoMaterial}</Text>
                                                    <Text fontSize="sm" color="app.textMuted">
                                                        {formatInteger(tipo.movimientos)} movimientos
                                                    </Text>
                                                </Box>
                                                <Box textAlign="right" flexShrink={0}>
                                                    <Text fontSize="sm">+ {formatCurrency(tipo.valorIngresosEstimado)}</Text>
                                                    <Text fontSize="sm" color="app.textMuted">
                                                        - {formatCurrency(tipo.valorDispensacionesEstimado)}
                                                    </Text>
                                                </Box>
                                            </HStack>
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Text color="app.textMuted">No hay tipos de material para mostrar.</Text>
                            )}
                        </Stack>
                    </CardBody>
                </Card>

                <Card variant="outline">
                    <CardBody p={{ base: 4, md: 5 }}>
                        <Stack spacing={4}>
                            <Box>
                                <Heading as="h3" size="sm">Materiales de mayor impacto</Heading>
                                <Text fontSize="sm" color="app.textMuted" mt={1}>
                                    Maximo cinco materiales; no corresponde al detalle de movimientos.
                                </Text>
                            </Box>
                            {report.topMateriales.length > 0 ? (
                                <Stack spacing={0} divider={<Divider borderColor="app.border" />}>
                                    {report.topMateriales.map((material) => (
                                        <Box key={material.productoId} py={3}>
                                            <Stack direction="row" justify="space-between" align="flex-start" spacing={3}>
                                                <Box minW={0}>
                                                    <Text fontWeight="semibold" noOfLines={2}>{material.productoNombre}</Text>
                                                    <Text fontSize="xs" color="app.textMuted" noOfLines={1}>
                                                        {material.tipoMaterial} | {material.productoId}
                                                    </Text>
                                                    <Text fontSize="sm" color="app.textMuted" mt={1}>
                                                        Ingreso {formatMeasure(material.cantidadIngresada, material.unidadMedida)} | Dispensado {formatMeasure(material.cantidadDispensada, material.unidadMedida)}
                                                    </Text>
                                                </Box>
                                                <Box textAlign="right" flexShrink={0}>
                                                    <Badge colorScheme={material.costoDisponible ? "green" : "orange"}>
                                                        {material.unidadMedida}
                                                    </Badge>
                                                    <Text fontSize="sm" fontWeight="semibold" mt={2}>
                                                        {material.costoDisponible
                                                            ? formatCurrency(material.impactoValorEstimado)
                                                            : "Sin costo"}
                                                    </Text>
                                                </Box>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Text color="app.textMuted">No hay materiales para mostrar.</Text>
                            )}
                        </Stack>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </>
    );
}

function KpiCard({ label, value, help, trend }: {
    label: string;
    value: string;
    help: string;
    trend?: number | null;
}) {
    return (
        <Card variant="outline" minW={0} minH={{ base: "132px", md: "148px" }}>
            <CardBody p={{ base: 3, sm: 4, md: 5 }}>
                <Stat minW={0}>
                    <StatLabel fontSize={{ base: "xs", md: "sm" }} noOfLines={2} minH={{ base: "32px", md: "auto" }}>
                        {label}
                    </StatLabel>
                    <StatNumber
                        fontSize={{ base: "lg", sm: "xl", md: "2xl" }}
                        lineHeight="shorter"
                        overflowWrap="anywhere"
                        mt={1}
                    >
                        {value}
                    </StatNumber>
                    <StatHelpText fontSize={{ base: "xs", md: "sm" }} mb={0} mt={2} noOfLines={2}>
                        {trend === undefined || trend === null ? (
                            help
                        ) : (
                            <HStack spacing={1} align="center">
                                <StatArrow type={trend >= 0 ? "increase" : "decrease"} />
                                <Text as="span">{formatSignedPercent(trend)}</Text>
                            </HStack>
                        )}
                    </StatHelpText>
                    {trend !== undefined && trend !== null ? (
                        <Text fontSize="xs" color="app.textMuted" noOfLines={1}>{help}</Text>
                    ) : null}
                </Stat>
            </CardBody>
        </Card>
    );
}

function QuantityMetric({ label, value }: { label: string; value: number }) {
    return (
        <Box minW={0}>
            <Text fontSize="xs" color="app.textMuted" noOfLines={1}>{label}</Text>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="semibold" overflowWrap="anywhere">
                {formatQuantity(value)}
            </Text>
        </Box>
    );
}

function ReportNotes({ notes }: { notes: NotaInforme[] }) {
    if (notes.length === 0) return null;
    return (
        <Stack spacing={2}>
            {notes.map((nota) => (
                <Alert
                    key={`${nota.tipo}-${nota.mensaje}`}
                    status={nota.tipo === "WARNING" ? "warning" : "info"}
                    borderRadius="md"
                    alignItems="flex-start"
                >
                    <AlertIcon mt={0.5} />
                    <Text fontSize="sm">{nota.mensaje}</Text>
                </Alert>
            ))}
        </Stack>
    );
}

function LoadingPanel({ label }: { label: string }) {
    return (
        <Card variant="outline">
            <CardBody>
                <Stack align="center" py={8}>
                    <Spinner />
                    <Text color="app.textMuted">{label}</Text>
                </Stack>
            </CardBody>
        </Card>
    );
}

function ErrorPanel({ message }: { message: string }) {
    return (
        <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">{message}</Text>
        </Alert>
    );
}

function EmptyPanel({ message }: { message: string }) {
    return (
        <Card variant="outline">
            <CardBody>
                <Text color="app.textMuted" textAlign="center" py={8}>{message}</Text>
            </CardBody>
        </Card>
    );
}

function EmptyChart({ message }: { message: string }) {
    return (
        <Box py={10}>
            <Text color="app.textMuted" textAlign="center">{message}</Text>
        </Box>
    );
}

function buildProductionChartData(reporte: InformeGlobalProduccion | null) {
    const categorias = reporte?.consolidadoCategorias ?? [];
    const detalles = (reporte?.detalleReferencias ?? []).filter((detalle) => detalle.cantidadProducida > 0);
    const categoryKeys = categorias.map((categoria) => categoryKey(categoria.categoriaId, categoria.categoriaNombre));
    const categoryLabels = categorias.map((categoria) => categoria.categoriaNombre);
    const seriesByReference = new Map<string, { name: string; data: number[] }>();

    const ensureSeries = (detalle: DetalleReferencia) => {
        const key = referenceKey(detalle);
        if (!seriesByReference.has(key)) {
            seriesByReference.set(key, {
                name: detalle.productoNombre,
                data: Array(categoryLabels.length).fill(0),
            });
        }
        return seriesByReference.get(key) as { name: string; data: number[] };
    };

    detalles.forEach((detalle) => {
        const index = categoryKeys.indexOf(categoryKey(detalle.categoriaId, detalle.categoriaNombre));
        if (index < 0) return;
        ensureSeries(detalle).data[index] += detalle.cantidadProducida;
    });

    const series = Array.from(seriesByReference.entries())
        .map(([id, serie]) => ({ id, ...serie }))
        .sort((a, b) => sumValues(b.data) - sumValues(a.data))
        .map((serie, index) => ({
            ...serie,
            color: chartPalette[index % chartPalette.length],
        }));
    return { categories: categoryLabels, series };
}

type ProductionTooltipParams = {
    seriesName?: string;
    value?: number | string | Array<number | string>;
};

function buildProductionChartOptions(
    chartData: ReturnType<typeof buildProductionChartData>,
    isMobile: boolean
) {
    const needsZoom = chartData.categories.length > (isMobile ? 2 : 5);
    return {
        tooltip: {
            trigger: "item",
            confine: true,
            padding: [8, 10],
            textStyle: { fontSize: 12 },
            extraCssText: "max-width: 240px; white-space: normal;",
            formatter: (params: ProductionTooltipParams) => {
                const rawValue = Array.isArray(params.value)
                    ? params.value[params.value.length - 1]
                    : params.value;
                const value = Number(rawValue ?? 0);
                return `<div>${escapeHtml(params.seriesName ?? "Terminado")}</div><strong>${formatInteger(value)}</strong> unidades`;
            },
        },
        legend: {
            type: "scroll",
            top: 0,
        },
        grid: {
            left: isMobile ? 48 : 56,
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
            id: serie.id,
            name: serie.name,
            type: "bar",
            stack: "produccion",
            data: serie.data,
            itemStyle: { color: serie.color },
            emphasis: { focus: "series" },
        })),
    };
}

function buildWarehouseChartOptions(serieDiaria: SerieDiariaAlmacen[], isMobile: boolean) {
    const needsZoom = serieDiaria.length > (isMobile ? 7 : 16);
    return {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            valueFormatter: (value: number) => formatCurrency(value),
        },
        legend: {
            top: 0,
            data: ["Ingresos", "Dispensaciones"],
        },
        grid: {
            left: isMobile ? 58 : 72,
            right: 16,
            top: 48,
            bottom: needsZoom ? 70 : 44,
        },
        dataZoom: needsZoom
            ? [
                { type: "inside", xAxisIndex: 0 },
                { type: "slider", xAxisIndex: 0, bottom: 14, height: 22 },
            ]
            : [],
        xAxis: {
            type: "category",
            data: serieDiaria.map((dia) => formatChartDate(dia.fecha)),
            axisLabel: {
                interval: 0,
                rotate: isMobile && serieDiaria.length > 4 ? 35 : 0,
            },
        },
        yAxis: {
            type: "value",
            name: "COP",
            axisLabel: {
                formatter: (value: number) => formatCompactCurrency(value),
            },
        },
        series: [
            {
                name: "Ingresos",
                type: "bar",
                data: serieDiaria.map((dia) => dia.valorIngresosEstimado),
                itemStyle: { color: "#2f855a" },
            },
            {
                name: "Dispensaciones",
                type: "bar",
                data: serieDiaria.map((dia) => dia.valorDispensacionesEstimado),
                itemStyle: { color: "#3182ce" },
            },
        ],
    };
}

function categoryKey(categoriaId: number | null | undefined, categoriaNombre: string) {
    return `${categoriaId ?? "SIN"}-${categoriaNombre}`;
}

function referenceKey(detalle: DetalleReferencia) {
    return detalle.productoId ?? detalle.productoNombre;
}

function sumValues(values: number[]) {
    return values.reduce((total, value) => total + value, 0);
}

function escapeHtml(value: string) {
    const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };
    return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function buildPeriodLabel(reporte: InformePeriodo) {
    if (reporte.modoFecha === "FECHA_UNICA") {
        return reporte.fechaDesde;
    }
    return `${reporte.fechaDesde} a ${reporte.fechaHasta} (${reporte.diasRango} dias)`;
}

function getRequestErrorMessage(error: unknown) {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error ?? "Revise las fechas e intente nuevamente.";
    }
    return "Compruebe la conexion e intente nuevamente.";
}

function formatInteger(value?: number | null) {
    return Number(value ?? 0).toLocaleString("es-CO", {
        maximumFractionDigits: 0,
    });
}

function formatQuantity(value?: number | null) {
    return Number(value ?? 0).toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function formatMeasure(value: number, unit: string) {
    return `${formatQuantity(value)} ${unit}`;
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

function formatCurrency(value?: number | null) {
    return Number(value ?? 0).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

function formatCompactCurrency(value: number) {
    const absolute = Math.abs(value);
    if (absolute >= 1_000_000_000) return `$${formatQuantity(value / 1_000_000_000)} mil M`;
    if (absolute >= 1_000_000) return `$${formatQuantity(value / 1_000_000)} M`;
    if (absolute >= 1_000) return `$${formatQuantity(value / 1_000)} mil`;
    return `$${formatQuantity(value)}`;
}

function formatChartDate(value: string) {
    return value.length >= 10 ? value.slice(5) : value;
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
