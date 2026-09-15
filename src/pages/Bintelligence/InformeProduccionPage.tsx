import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    HStack,
    NativeSelect,
    Progress,
    SimpleGrid,
    Spinner,
    Stack,
    Text,
    useBreakpointValue,
    Field,
    StackSeparator,
} from "@chakra-ui/react";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";
import BetterPagination from "../../components/BetterPagination/BetterPagination";
import {
    EmptyPanel,
    formatDate,
    formatInteger,
    formatPercent,
    KpiCard,
    ReportNotes,
    SectionHeading,
} from "./InformeGlobalUi";
import {
    fetchProductionDeviationsPage,
    requestErrorMessage,
} from "./informesGlobales.api";
import {
    buildProductionChart,
    type ProductionReferenceMode,
} from "./informesGlobales.charts";
import InformeProduccionAreasSection from "./InformeProduccionAreasSection";
import type {
    DesviacionProduccion,
    InformeProduccion,
    InformeQuery,
    PaginaDesviacionesProduccion,
    TipoDesviacionProduccion,
} from "./informesGlobales.types";

const DEFAULT_DEVIATION_PAGE_SIZE = 5;
const DEVIATION_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export default function InformeProduccionPage({ report }: { report: InformeProduccion }) {
    const compactChart = useBreakpointValue({ base: true, md: false }) ?? false;
    const chartHeight = useBreakpointValue({ base: 330, md: 420 }) ?? 420;
    const [referenceMode, setReferenceMode] =
        useState<ProductionReferenceMode>("TOP_8");
    const [deviationPage, setDeviationPage] = useState(0);
    const [deviationPageSize, setDeviationPageSize] =
        useState(DEFAULT_DEVIATION_PAGE_SIZE);
    const [deviations, setDeviations] =
        useState<PaginaDesviacionesProduccion | null>(null);
    const [deviationsLoading, setDeviationsLoading] = useState(true);
    const [deviationsError, setDeviationsError] = useState<string | null>(null);
    const [deviationsRetryKey, setDeviationsRetryKey] = useState(0);
    const summary = report.resumen;
    const deviationQuery = useMemo<InformeQuery>(
        () => report.modoFecha === "FECHA_UNICA"
            ? { fecha: report.fechaDesde }
            : { fechaDesde: report.fechaDesde, fechaHasta: report.fechaHasta },
        [report.fechaDesde, report.fechaHasta, report.modoFecha],
    );
    const chartOptions = useMemo(
        () => buildProductionChart(
            report.consolidadoCategorias,
            report.detalleReferencias,
            compactChart,
            referenceMode,
        ),
        [
            compactChart,
            referenceMode,
            report.consolidadoCategorias,
            report.detalleReferencias,
        ],
    );
    const hasCategoryData = report.consolidadoCategorias.some(
        (category) => category.unidadesPlaneadas > 0 || category.unidadesProducidas > 0,
    );

    useEffect(() => {
        const controller = new AbortController();
        setDeviationsLoading(true);
        setDeviationsError(null);

        fetchProductionDeviationsPage({
            query: deviationQuery,
            page: deviationPage,
            size: deviationPageSize,
            signal: controller.signal,
        })
            .then(setDeviations)
            .catch((requestError: unknown) => {
                if (!controller.signal.aborted) {
                    setDeviationsError(requestErrorMessage(requestError));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setDeviationsLoading(false);
            });

        return () => controller.abort();
    }, [
        deviationPage,
        deviationPageSize,
        deviationQuery,
        deviationsRetryKey,
    ]);

    return (
        <Stack gap={{ base: 4, md: 5 }}>
            <Stack
                direction={{ base: "column", md: "row" }}
                align={{ base: "flex-start", md: "center" }}
                justify="space-between"
                gap={2}
            >
                <SectionHeading
                    title="Informe global de producción"
                    description="Cumplimiento de la planeación y uso de capacidad en el periodo consultado."
                />
                <Badge colorPalette="blue">
                    {periodLabel(report)}
                </Badge>
            </Stack>

            <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={3}>
                <KpiCard
                    label="Unidades producidas"
                    value={formatInteger(summary.unidadesProducidas)}
                    help={productionHelp(
                        summary.unidadesPlaneadas,
                        summary.tendenciaProduccionPct,
                    )}
                />
                <KpiCard
                    label="Rendimiento"
                    value={formatPercent(summary.rendimientoPlaneacionPct)}
                    help="Producido frente a planeado"
                />
                <KpiCard
                    label="Capacidad utilizada"
                    value={formatPercent(summary.capacidadUtilizadaPct)}
                    help={`${formatInteger(summary.capacidadProductivaPeriodo)} unidades de capacidad`}
                />
                <KpiCard
                    label="Referencias cumplidas"
                    value={formatPercent(summary.cumplimientoReferenciasPct)}
                    help={`${formatInteger(summary.referenciasPlaneadasProducidas)} de ${formatInteger(summary.referenciasPlaneadas)}`}
                />
            </SimpleGrid>

            <ReportNotes notes={report.notas} />

            <Card.Root variant="outline">
                <Card.Body p={{ base: 3, md: 5 }}>
                    <Stack gap={4}>
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            justify="space-between"
                            align={{ base: "flex-start", md: "center" }}
                            gap={2}
                        >
                            <SectionHeading
                                title="Producción consolidada por categoría"
                                description="Comparación entre planeado y producido, con composición por referencia."
                            />
                            <Stack
                                direction={{ base: "column", sm: "row" }}
                                align={{ base: "stretch", sm: "flex-end" }}
                                gap={3}
                                w={{ base: "full", md: "auto" }}
                            >
                                <Field.Root
                                    maxW={{ base: "full", sm: "240px" }}
                                    minW={{ sm: "220px" }}
                                >
                                    <Field.Label
                                        fontSize="xs"
                                        color="app.textMuted"
                                        mb={1}
                                    >
                                        Detalle de referencias
                                    </Field.Label>
                                    <NativeSelect.Root size="sm">
                                        <NativeSelect.Field
                                            minH="40px"
                                            value={referenceMode}
                                            onChange={(event) => setReferenceMode(
                                                event.target.value as ProductionReferenceMode,
                                            )}>
                                            <option value="TOP_8">Top 8 + Otras</option>
                                            <option value="PARETO_80">Pareto 80% + Otras</option>
                                            <option value="ALL">Todas las referencias</option>
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                </Field.Root>
                                <Badge
                                    colorPalette="green"
                                    alignSelf={{ base: "flex-start", sm: "center" }}
                                    mb={{ sm: 2 }}
                                >
                                    {formatInteger(summary.movimientosProduccion)} movimientos
                                </Badge>
                            </Stack>
                        </Stack>
                        {hasCategoryData ? (
                            <ReactECharts
                                option={chartOptions}
                                notMerge={true}
                                style={{ height: `${chartHeight}px`, width: "100%" }}
                            />
                        ) : (
                            <EmptyPanel message="No hay datos por categoría para este periodo." />
                        )}
                    </Stack>
                </Card.Body>
            </Card.Root>

            <InformeProduccionAreasSection analytics={report.analiticaAreas} />

            <Stack gap={4}>
                <Stack
                    direction={{ base: "column", md: "row" }}
                    align={{ base: "flex-start", md: "center" }}
                    justify="space-between"
                    gap={2}
                >
                    <SectionHeading
                        title="Desviaciones relevantes"
                        description="Diferencias entre las cantidades planeadas y producidas en el periodo."
                    />
                    {deviations ? (
                        <Badge colorPalette="gray">
                            {formatInteger(deviations.totalElements)} encontradas
                        </Badge>
                    ) : null}
                </Stack>

                {deviations ? (
                    <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={3}>
                        <KpiCard
                            label="Sin producción"
                            value={formatInteger(deviations.counts.sinProduccion)}
                            help="Planeadas sin unidades producidas"
                        />
                        <KpiCard
                            label="Con déficit"
                            value={formatInteger(deviations.counts.deficit)}
                            help="Producción por debajo del plan"
                        />
                        <KpiCard
                            label="No planeadas"
                            value={formatInteger(deviations.counts.noPlaneada)}
                            help="Producción sin cantidad planeada"
                        />
                        <KpiCard
                            label="Sobreproducción"
                            value={formatInteger(deviations.counts.sobreproduccion)}
                            help="Producción por encima del plan"
                        />
                    </SimpleGrid>
                ) : null}

                {deviationsLoading && deviations ? (
                    <Progress.Root
                        size="xs"
                        value={null}
                        colorPalette="green"
                        borderRadius="full"
                        aria-label="Cargando página de desviaciones"
                    >
                        <Progress.Track>
                            <Progress.Range />
                        </Progress.Track>
                    </Progress.Root>
                ) : null}

                {deviationsLoading && !deviations ? (
                    <HStack minH="120px" justify="center">
                        <Spinner color="green.500" />
                        <Text color="app.textMuted">Consultando desviaciones…</Text>
                    </HStack>
                ) : deviationsError ? (
                    <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Stack gap={2}>
                            <Text fontSize="sm">{deviationsError}</Text>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeviationsRetryKey((current) => current + 1)}
                            >
                                Reintentar
                            </Button>
                        </Stack>
                    </Alert.Root>
                ) : deviations && deviations.items.length > 0 ? (
                    <>
                        <Stack separator={<StackSeparator borderColor="app.border" />} gap={0}>
                            {deviations.items.map((item, index) => (
                                <ProductionExceptionRow
                                    key={item.reference.productoId
                                        ?? `${item.reference.productoNombre}-${index}`}
                                    item={item}
                                />
                            ))}
                        </Stack>
                        <BetterPagination
                            page={deviations.page}
                            size={deviations.size}
                            totalPages={deviations.totalPages}
                            totalItems={deviations.totalElements}
                            sizeOptions={DEVIATION_PAGE_SIZE_OPTIONS}
                            loading={deviationsLoading}
                            previousLabel="Anterior"
                            nextLabel="Siguiente"
                            ariaLabel="Paginación de desviaciones de producción"
                            onPageChange={setDeviationPage}
                            onSizeChange={setDeviationPageSize}
                        />
                    </>
                ) : (
                    <Alert.Root status="success" borderRadius="md">
                        <Alert.Indicator />
                        No se identificaron desviaciones en el periodo consultado.
                    </Alert.Root>
                )}
            </Stack>
        </Stack>
    );
}

function periodLabel(report: InformeProduccion) {
    if (report.modoFecha === "FECHA_UNICA") return formatDate(report.fechaDesde);
    return `${formatDate(report.fechaDesde)} – ${formatDate(report.fechaHasta)}`;
}

function productionHelp(planned: number, trend?: number | null) {
    const plannedLabel = `${formatInteger(planned)} planeadas`;
    if (trend === null || trend === undefined) return plannedLabel;
    const sign = trend > 0 ? "+" : "";
    return `${plannedLabel} · ${sign}${formatPercent(trend)} vs. periodo anterior`;
}

function ProductionExceptionRow({ item }: { item: DesviacionProduccion }) {
    const presentation = exceptionPresentation(item.kind);
    return (
        <Stack
            direction={{ base: "column", lg: "row" }}
            align={{ base: "stretch", lg: "center" }}
            justify="space-between"
            gap={3}
            py={3}
        >
            <HStack align="flex-start" gap={3} minW={0}>
                <Badge colorPalette={presentation.colorScheme} mt={0.5}>
                    {presentation.label}
                </Badge>
                <Box minW={0}>
                    <Text fontWeight="semibold" lineClamp={2}>
                        {item.reference.productoNombre}
                    </Text>
                    <Text color="app.textMuted" fontSize="xs" lineClamp={1}>
                        {item.reference.productoId ?? "Sin código"} · {item.reference.categoriaNombre}
                    </Text>
                </Box>
            </HStack>

            <SimpleGrid
                columns={{ base: 2, sm: 4 }}
                gap={3}
                minW={{ lg: "460px" }}
            >
                <ExceptionMetric
                    label="Planeado"
                    value={formatInteger(item.reference.cantidadPlaneada)}
                />
                <ExceptionMetric
                    label="Producido"
                    value={formatInteger(item.reference.cantidadProducida)}
                />
                <ExceptionMetric
                    label="Diferencia"
                    value={formatSignedInteger(item.difference)}
                />
                <ExceptionMetric
                    label="Variación"
                    value={formatSignedPercent(item.variationPct)}
                />
            </SimpleGrid>
        </Stack>
    );
}

function ExceptionMetric({ label, value }: { label: string; value: string }) {
    return (
        <Box textAlign={{ base: "left", sm: "right" }}>
            <Text color="app.textMuted" fontSize="xs">{label}</Text>
            <Text fontWeight="semibold">{value}</Text>
        </Box>
    );
}

function exceptionPresentation(kind: TipoDesviacionProduccion) {
    switch (kind) {
        case "SIN_PRODUCCION":
            return { label: "Sin producción", colorScheme: "orange" };
        case "DEFICIT":
            return { label: "Déficit", colorScheme: "yellow" };
        case "NO_PLANEADA":
            return { label: "No planeada", colorScheme: "purple" };
        case "SOBREPRODUCCION":
            return { label: "Sobreproducción", colorScheme: "blue" };
    }
}

function formatSignedInteger(value: number) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatInteger(value)}`;
}

function formatSignedPercent(value: number | null) {
    if (value === null) return "No aplica";
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatPercent(value)}`;
}
