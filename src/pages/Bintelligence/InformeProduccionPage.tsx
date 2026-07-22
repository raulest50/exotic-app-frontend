import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Card,
    CardBody,
    HStack,
    SimpleGrid,
    Stack,
    StackDivider,
    Text,
    useBreakpointValue,
} from "@chakra-ui/react";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import {
    EmptyPanel,
    formatDate,
    formatInteger,
    formatPercent,
    KpiCard,
    ReportNotes,
    SectionHeading,
} from "./InformeGlobalUi";
import { buildProductionChart } from "./informesGlobales.charts";
import type {
    InformeProduccion,
    ReferenciaProduccion,
} from "./informesGlobales.types";

const MAX_VISIBLE_EXCEPTIONS = 5;

type ProductionExceptionKind =
    | "SIN_PRODUCCION"
    | "DEFICIT"
    | "NO_PLANEADA"
    | "SOBREPRODUCCION";

interface ProductionException {
    reference: ReferenciaProduccion;
    kind: ProductionExceptionKind;
    difference: number;
    variationPct: number | null;
}

export default function InformeProduccionPage({ report }: { report: InformeProduccion }) {
    const compactChart = useBreakpointValue({ base: true, md: false }) ?? false;
    const chartHeight = useBreakpointValue({ base: 330, md: 420 }) ?? 420;
    const summary = report.resumen;
    const chartOptions = buildProductionChart(
        report.consolidadoCategorias,
        compactChart,
    );
    const hasCategoryData = report.consolidadoCategorias.some(
        (category) => category.unidadesPlaneadas > 0 || category.unidadesProducidas > 0,
    );
    const exceptionAnalysis = useMemo(
        () => analyzeProductionExceptions(report.detalleReferencias),
        [report.detalleReferencias],
    );

    return (
        <Stack spacing={{ base: 4, md: 5 }}>
            <Stack
                direction={{ base: "column", md: "row" }}
                align={{ base: "flex-start", md: "center" }}
                justify="space-between"
                spacing={2}
            >
                <SectionHeading
                    title="Informe global de producción"
                    description="Cumplimiento de la planeación y uso de capacidad en el periodo consultado."
                />
                <Badge colorScheme="blue">
                    {periodLabel(report)}
                </Badge>
            </Stack>

            <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={3}>
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

            <Card variant="outline">
                <CardBody p={{ base: 3, md: 5 }}>
                    <Stack spacing={4}>
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            justify="space-between"
                            align={{ base: "flex-start", md: "center" }}
                            spacing={2}
                        >
                            <SectionHeading
                                title="Producción consolidada por categoría"
                                description="Comparación de unidades planeadas y producidas por categoría."
                            />
                            <Badge colorScheme="green">
                                {formatInteger(summary.movimientosProduccion)} movimientos
                            </Badge>
                        </Stack>
                        {hasCategoryData ? (
                            <ReactECharts
                                option={chartOptions}
                                style={{ height: `${chartHeight}px`, width: "100%" }}
                            />
                        ) : (
                            <EmptyPanel message="No hay datos por categoría para este periodo." />
                        )}
                    </Stack>
                </CardBody>
            </Card>

            <Stack spacing={4}>
                <Stack
                    direction={{ base: "column", md: "row" }}
                    align={{ base: "flex-start", md: "center" }}
                    justify="space-between"
                    spacing={2}
                >
                    <SectionHeading
                        title="Desviaciones relevantes"
                        description="Diferencias entre las cantidades planeadas y producidas en el periodo."
                    />
                    {exceptionAnalysis.items.length > 0 ? (
                        <Badge colorScheme="gray">
                            {Math.min(
                                exceptionAnalysis.items.length,
                                MAX_VISIBLE_EXCEPTIONS,
                            )} de {formatInteger(exceptionAnalysis.items.length)} mostradas
                        </Badge>
                    ) : null}
                </Stack>

                <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={3}>
                    <KpiCard
                        label="Sin producción"
                        value={formatInteger(exceptionAnalysis.counts.SIN_PRODUCCION)}
                        help="Planeadas sin unidades producidas"
                    />
                    <KpiCard
                        label="Con déficit"
                        value={formatInteger(exceptionAnalysis.counts.DEFICIT)}
                        help="Producción por debajo del plan"
                    />
                    <KpiCard
                        label="No planeadas"
                        value={formatInteger(exceptionAnalysis.counts.NO_PLANEADA)}
                        help="Producción sin cantidad planeada"
                    />
                    <KpiCard
                        label="Sobreproducción"
                        value={formatInteger(exceptionAnalysis.counts.SOBREPRODUCCION)}
                        help="Producción por encima del plan"
                    />
                </SimpleGrid>

                {exceptionAnalysis.items.length > 0 ? (
                    <Stack divider={<StackDivider borderColor="app.border" />} spacing={0}>
                        {exceptionAnalysis.items
                            .slice(0, MAX_VISIBLE_EXCEPTIONS)
                            .map((item, index) => (
                                <ProductionExceptionRow
                                    key={item.reference.productoId
                                        ?? `${item.reference.productoNombre}-${index}`}
                                    item={item}
                                />
                            ))}
                    </Stack>
                ) : (
                    <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        No se identificaron desviaciones en el periodo consultado.
                    </Alert>
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

function analyzeProductionExceptions(references: ReferenciaProduccion[]) {
    const counts: Record<ProductionExceptionKind, number> = {
        SIN_PRODUCCION: 0,
        DEFICIT: 0,
        NO_PLANEADA: 0,
        SOBREPRODUCCION: 0,
    };

    const items = references
        .map(toProductionException)
        .filter((item): item is ProductionException => item !== null);

    items.forEach((item) => {
        counts[item.kind] += 1;
    });

    items.sort(compareProductionExceptions);
    return { counts, items };
}

function toProductionException(
    reference: ReferenciaProduccion,
): ProductionException | null {
    const planned = reference.cantidadPlaneada;
    const produced = reference.cantidadProducida;
    const difference = produced - planned;
    let kind: ProductionExceptionKind | null = null;

    if (planned > 0 && produced === 0) {
        kind = "SIN_PRODUCCION";
    } else if (planned <= 0 && produced > 0) {
        kind = "NO_PLANEADA";
    } else if (planned > 0 && produced < planned) {
        kind = "DEFICIT";
    } else if (planned > 0 && produced > planned) {
        kind = "SOBREPRODUCCION";
    }

    if (!kind) return null;
    return {
        reference,
        kind,
        difference,
        variationPct: planned > 0 ? (difference / planned) * 100 : null,
    };
}

function compareProductionExceptions(
    left: ProductionException,
    right: ProductionException,
) {
    const impactDifference = Math.abs(right.difference) - Math.abs(left.difference);
    if (impactDifference !== 0) return impactDifference;

    const categoryDifference = compareText(
        left.reference.categoriaNombre,
        right.reference.categoriaNombre,
    );
    if (categoryDifference !== 0) return categoryDifference;

    const nameDifference = compareText(
        left.reference.productoNombre,
        right.reference.productoNombre,
    );
    if (nameDifference !== 0) return nameDifference;

    return compareText(
        left.reference.productoId ?? "",
        right.reference.productoId ?? "",
    );
}

function compareText(left: string, right: string) {
    return left.localeCompare(right, "es", { sensitivity: "base" });
}

function ProductionExceptionRow({ item }: { item: ProductionException }) {
    const presentation = exceptionPresentation(item.kind);
    return (
        <Stack
            direction={{ base: "column", lg: "row" }}
            align={{ base: "stretch", lg: "center" }}
            justify="space-between"
            spacing={3}
            py={3}
        >
            <HStack align="flex-start" spacing={3} minW={0}>
                <Badge colorScheme={presentation.colorScheme} mt={0.5}>
                    {presentation.label}
                </Badge>
                <Box minW={0}>
                    <Text fontWeight="semibold" noOfLines={2}>
                        {item.reference.productoNombre}
                    </Text>
                    <Text color="app.textMuted" fontSize="xs" noOfLines={1}>
                        {item.reference.productoId ?? "Sin código"} · {item.reference.categoriaNombre}
                    </Text>
                </Box>
            </HStack>

            <SimpleGrid
                columns={{ base: 2, sm: 4 }}
                spacing={3}
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

function exceptionPresentation(kind: ProductionExceptionKind) {
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
