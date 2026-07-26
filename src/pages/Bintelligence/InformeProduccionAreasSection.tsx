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
} from "@chakra-ui/react";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
    EmptyPanel,
    formatDate,
    formatPercent,
    formatQuantity,
    KpiCard,
    SectionHeading,
} from "./InformeGlobalUi";
import type {
    AnaliticaAreaProduccion,
    AnaliticaAreasProduccion,
    EstadoAreaProduccion,
    FuenteProduccionArea,
    ProduccionUnidadArea,
    SerieFlujoArea,
} from "./informesGlobales.types";

const MAX_VISIBLE_QUANTITIES = 2;

export default function InformeProduccionAreasSection({
    analytics,
}: {
    analytics?: AnaliticaAreasProduccion | null;
}) {
    const compact = useBreakpointValue({ base: true, md: false }) ?? false;
    const chartHeight = useBreakpointValue({ base: 330, md: 390 }) ?? 390;
    const areas = analytics?.areas ?? [];
    const defaultAreaId = useMemo(() => resolveDefaultAreaId(areas), [areas]);
    const [selectedAreaId, setSelectedAreaId] = useState<number | null>(defaultAreaId);

    useEffect(() => {
        if (!areas.some((area) => area.areaId === selectedAreaId)) {
            setSelectedAreaId(defaultAreaId);
        }
    }, [areas, defaultAreaId, selectedAreaId]);

    if (!analytics) {
        return null;
    }

    if (!analytics.disponible) {
        return (
            <Stack spacing={3}>
                <SectionHeading
                    title="Performance por área operativa"
                    description="Flujo, tiempos y señales de acumulación por etapa productiva."
                />
                <Alert status="info" variant="left-accent" borderRadius="md">
                    <AlertIcon />
                    {analytics.mensaje ?? "La analítica por áreas no está disponible temporalmente."}
                </Alert>
            </Stack>
        );
    }

    if (areas.length === 0) {
        return (
            <Stack spacing={3}>
                <SectionHeading
                    title="Performance por área operativa"
                    description="Flujo, tiempos y señales de acumulación por etapa productiva."
                />
                <EmptyPanel
                    message={analytics.mensaje
                        ?? "No hay actividad por áreas para el periodo consultado."}
                />
            </Stack>
        );
    }

    const selectedArea = areas.find((area) => area.areaId === selectedAreaId)
        ?? areas[0];
    const chartOptions = buildAreaFlowChart(selectedArea, compact);

    return (
        <Stack spacing={4}>
            <Stack
                direction={{ base: "column", md: "row" }}
                align={{ base: "flex-start", md: "center" }}
                justify="space-between"
                spacing={2}
            >
                <SectionHeading
                    title="Performance por área operativa"
                    description="Producción en la unidad propia del área y señales observadas de congestión."
                />
                <HStack spacing={2} flexWrap="wrap">
                    <Badge colorScheme="gray">{areas.length} áreas</Badge>
                    <Badge colorScheme="purple">
                        Comparación: {formatDate(analytics.fechaDesdePeriodoAnterior)}
                        {" – "}
                        {formatDate(analytics.fechaHastaPeriodoAnterior)}
                    </Badge>
                </HStack>
            </Stack>

            {compact ? (
                <Stack spacing={3}>
                    {areas.map((area) => (
                        <AreaMobileCard
                            key={area.areaId}
                            area={area}
                            selected={area.areaId === selectedArea.areaId}
                            onSelect={() => setSelectedAreaId(area.areaId)}
                        />
                    ))}
                </Stack>
            ) : (
                <Card variant="outline">
                    <CardBody p={0}>
                        <TableContainer>
                            <Table size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Área</Th>
                                        <Th>Producción</Th>
                                        <Th isNumeric>Salidas/día</Th>
                                        <Th isNumeric>Trabajo listo</Th>
                                        <Th isNumeric>Días backlog</Th>
                                        <Th>Señal</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {areas.map((area) => (
                                        <AreaTableRow
                                            key={area.areaId}
                                            area={area}
                                            selected={area.areaId === selectedArea.areaId}
                                            onSelect={() => setSelectedAreaId(area.areaId)}
                                        />
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </CardBody>
                </Card>
            )}

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
                                title={selectedArea.areaNombre}
                                description="Entradas, salidas y trabajo listo al cierre de cada día."
                            />
                            <HStack spacing={2} flexWrap="wrap">
                                <SignalBadge state={selectedArea.estado} />
                                <Badge
                                    colorScheme={selectedArea.confiabilidad === "SUFICIENTE"
                                        ? "green"
                                        : "gray"}
                                >
                                    Confianza {selectedArea.confiabilidad === "SUFICIENTE"
                                        ? "suficiente"
                                        : "limitada"}
                                </Badge>
                                <Badge colorScheme={coverageColor(selectedArea.coberturaUnidadPct)}>
                                    {selectedArea.coberturaUnidadPct === null
                                    || selectedArea.coberturaUnidadPct === undefined
                                        ? "Sin salidas para medir cobertura"
                                        : `${formatPercent(selectedArea.coberturaUnidadPct)} con unidad`}
                                </Badge>
                            </HStack>
                        </Stack>

                        <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={3}>
                            <KpiCard
                                label="Mediana de espera"
                                value={formatMinutes(selectedArea.actual.medianaMinutosEspera)}
                                help={metricComparisonHelp(
                                    selectedArea.actual.medianaMinutosEspera,
                                    selectedArea.anterior.medianaMinutosEspera,
                                    selectedArea.comparacionDisponible,
                                    `${selectedArea.actual.muestrasEspera} muestras`,
                                )}
                            />
                            <KpiCard
                                label="Mediana de proceso"
                                value={formatMinutes(selectedArea.actual.medianaMinutosProceso)}
                                help={metricComparisonHelp(
                                    selectedArea.actual.medianaMinutosProceso,
                                    selectedArea.anterior.medianaMinutosProceso,
                                    selectedArea.comparacionDisponible,
                                    `${selectedArea.actual.muestrasProceso} muestras`,
                                )}
                            />
                            <KpiCard
                                label="Salidas diarias"
                                value={`${formatQuantity(selectedArea.actual.ritmoSalidaDiario)} lotes`}
                                help={metricComparisonHelp(
                                    selectedArea.actual.ritmoSalidaDiario,
                                    selectedArea.anterior.ritmoSalidaDiario,
                                    selectedArea.comparacionDisponible,
                                    `${selectedArea.actual.salidas} completados`,
                                )}
                            />
                            <KpiCard
                                label="Días de backlog"
                                value={selectedArea.actual.diasBacklog === null
                                || selectedArea.actual.diasBacklog === undefined
                                    ? "Sin ritmo"
                                    : formatQuantity(selectedArea.actual.diasBacklog)}
                                help={metricComparisonHelp(
                                    selectedArea.actual.diasBacklog,
                                    selectedArea.anterior.diasBacklog,
                                    selectedArea.comparacionDisponible,
                                    `${selectedArea.actual.trabajoListo} lotes listos`,
                                )}
                            />
                        </SimpleGrid>

                        <SignalExplanation area={selectedArea} />

                        <ReactECharts
                            option={chartOptions}
                            notMerge={true}
                            style={{ height: `${chartHeight}px`, width: "100%" }}
                        />
                    </Stack>
                </CardBody>
            </Card>
        </Stack>
    );
}

function AreaTableRow({
    area,
    selected,
    onSelect,
}: {
    area: AnaliticaAreaProduccion;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <Tr
            cursor="pointer"
            bg={selected ? "app.surfaceSubtle" : undefined}
            _hover={{ bg: "app.surfaceSubtle" }}
            _focusVisible={{ outline: "2px solid", outlineColor: "blue.400" }}
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect();
                }
            }}
        >
            <Td>
                <Text fontWeight="semibold">{area.areaNombre}</Text>
                <Text color="app.textMuted" fontSize="xs">
                    {area.actual.entradas} entradas · {area.actual.salidas} salidas
                </Text>
            </Td>
            <Td maxW="300px">
                <ProductionSummary area={area} />
            </Td>
            <Td isNumeric>{formatQuantity(area.actual.ritmoSalidaDiario)}</Td>
            <Td isNumeric>{area.actual.trabajoListo} lotes</Td>
            <Td isNumeric>
                {area.actual.diasBacklog === null || area.actual.diasBacklog === undefined
                    ? "Sin ritmo"
                    : formatQuantity(area.actual.diasBacklog)}
            </Td>
            <Td>
                <SignalTooltip area={area}>
                    <Box display="inline-block">
                        <SignalBadge state={area.estado} />
                    </Box>
                </SignalTooltip>
            </Td>
        </Tr>
    );
}

function AreaMobileCard({
    area,
    selected,
    onSelect,
}: {
    area: AnaliticaAreaProduccion;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <Card
            variant="outline"
            borderColor={selected ? "blue.400" : undefined}
            cursor="pointer"
            role="button"
            tabIndex={0}
            _focusVisible={{ outline: "2px solid", outlineColor: "blue.400" }}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect();
                }
            }}
        >
            <CardBody p={3}>
                <Stack spacing={3}>
                    <HStack justify="space-between" align="flex-start">
                        <Box minW={0}>
                            <Text fontWeight="semibold" noOfLines={2}>
                                {area.areaNombre}
                            </Text>
                            <Text color="app.textMuted" fontSize="xs">
                                {area.actual.entradas} entradas · {area.actual.salidas} salidas
                            </Text>
                        </Box>
                        <SignalTooltip area={area}>
                            <Box flexShrink={0}>
                                <SignalBadge state={area.estado} />
                            </Box>
                        </SignalTooltip>
                    </HStack>
                    <ProductionSummary area={area} />
                    <SimpleGrid columns={3} spacing={2}>
                        <CompactMetric
                            label="Salidas/día"
                            value={formatQuantity(area.actual.ritmoSalidaDiario)}
                        />
                        <CompactMetric
                            label="Trabajo listo"
                            value={`${area.actual.trabajoListo}`}
                        />
                        <CompactMetric
                            label="Días backlog"
                            value={area.actual.diasBacklog === null
                            || area.actual.diasBacklog === undefined
                                ? "—"
                                : formatQuantity(area.actual.diasBacklog)}
                        />
                    </SimpleGrid>
                </Stack>
            </CardBody>
        </Card>
    );
}

function ProductionSummary({ area }: { area: AnaliticaAreaProduccion }) {
    const currentProduction = area.produccion.filter((item) => item.cantidadActual > 0);
    if (currentProduction.length === 0) {
        return <Text color="app.textMuted" fontSize="sm">Sin salidas cuantificables</Text>;
    }

    const visible = currentProduction.slice(0, MAX_VISIBLE_QUANTITIES);
    return (
        <Tooltip
            hasArrow
            placement="top"
            label={<ProductionTooltipContent area={area} />}
        >
            <Stack spacing={1} cursor="help">
                {visible.map((item) => (
                    <HStack key={productionKey(item)} spacing={2} flexWrap="wrap">
                        <Text fontWeight="semibold" fontSize="sm">
                            {formatQuantity(item.cantidadActual)} {item.unidad}
                        </Text>
                        <SourceBadge source={item.fuente} />
                        <TrendLabel value={item.variacionPct} />
                    </HStack>
                ))}
                {currentProduction.length > visible.length ? (
                    <Badge colorScheme="gray" alignSelf="flex-start">
                        +{currentProduction.length - visible.length} cantidades
                    </Badge>
                ) : null}
                {area.coberturaUnidadPct !== null
                && area.coberturaUnidadPct !== undefined
                && area.coberturaUnidadPct < 100 ? (
                    <Text color="app.textMuted" fontSize="xs">
                        {formatPercent(area.coberturaUnidadPct)} de salidas con unidad
                    </Text>
                ) : null}
            </Stack>
        </Tooltip>
    );
}

function ProductionTooltipContent({ area }: { area: AnaliticaAreaProduccion }) {
    return (
        <Stack spacing={2} maxW="320px">
            <Text fontWeight="bold">{area.areaNombre}</Text>
            {area.produccion
                .filter((item) => item.cantidadActual > 0)
                .map((item) => (
                    <Box key={productionKey(item)}>
                        <Text>
                            {formatQuantity(item.cantidadActual)} {item.unidad}
                            {" · "}
                            {sourceLabel(item.fuente)}
                        </Text>
                        {item.cantidadEquivalenteActual !== null
                        && item.cantidadEquivalenteActual !== undefined
                        && item.unidadEquivalente ? (
                            <Text fontSize="xs">
                                Equivale a {formatQuantity(item.cantidadEquivalenteActual)}
                                {" "}
                                {item.unidadEquivalente}
                            </Text>
                        ) : null}
                        <Text fontSize="xs">
                            Anterior: {formatQuantity(item.cantidadAnterior)} {item.unidad}
                        </Text>
                    </Box>
                ))}
            <Text fontSize="xs">
                Las cantidades estándar usan el factor de lote configurado actualmente.
            </Text>
        </Stack>
    );
}

function SignalExplanation({ area }: { area: AnaliticaAreaProduccion }) {
    const presentation = signalPresentation(area.estado);
    return (
        <Alert
            status={presentation.alertStatus}
            variant="left-accent"
            borderRadius="md"
            alignItems="flex-start"
        >
            <AlertIcon mt={0.5} />
            <Box>
                <Text fontWeight="semibold">{presentation.label}</Text>
                {area.motivos.map((reason, index) => (
                    <Text key={`${area.areaId}-reason-${index}`} fontSize="sm">
                        {reason}
                    </Text>
                ))}
            </Box>
        </Alert>
    );
}

function SignalTooltip({
    area,
    children,
}: {
    area: AnaliticaAreaProduccion;
    children: ReactElement;
}) {
    return (
        <Tooltip
            hasArrow
            placement="top"
            label={(
                <Stack spacing={1} maxW="300px">
                    {area.motivos.map((reason, index) => (
                        <Text key={`${area.areaId}-tooltip-${index}`} fontSize="xs">
                            {reason}
                        </Text>
                    ))}
                </Stack>
            )}
        >
            {children}
        </Tooltip>
    );
}

function SignalBadge({ state }: { state: EstadoAreaProduccion }) {
    const presentation = signalPresentation(state);
    return (
        <Badge colorScheme={presentation.colorScheme}>
            {presentation.label}
        </Badge>
    );
}

function SourceBadge({ source }: { source: FuenteProduccionArea }) {
    const colorScheme = source === "REPORTADA"
        ? "green"
        : source === "ESTANDAR"
            ? "blue"
            : "gray";
    return (
        <Badge colorScheme={colorScheme} fontSize="xs">
            {sourceLabel(source)}
        </Badge>
    );
}

function TrendLabel({ value }: { value?: number | null }) {
    if (value === null || value === undefined) return null;
    return (
        <Text
            fontSize="xs"
            color={value > 0 ? "green.500" : value < 0 ? "orange.500" : "app.textMuted"}
        >
            {value > 0 ? "+" : ""}{formatPercent(value)}
        </Text>
    );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
    return (
        <Box>
            <Text color="app.textMuted" fontSize="xs">{label}</Text>
            <Text fontWeight="semibold" fontSize="sm">{value}</Text>
        </Box>
    );
}

function buildAreaFlowChart(area: AnaliticaAreaProduccion, compact: boolean) {
    const previousByIndex = new Map(
        area.serieAnterior.map((point) => [point.indiceDia, point]),
    );
    return {
        aria: {
            enabled: true,
            description:
                `Flujo diario del área ${area.areaNombre}: entradas, salidas y backlog en lotes.`,
        },
        tooltip: {
            trigger: "axis",
            confine: true,
            formatter: (params: AreaChartTooltipParam[]) =>
                buildAreaChartTooltip(params, area.serieActual, previousByIndex),
        },
        legend: {
            type: "scroll",
            top: 0,
            data: [
                "Entradas",
                "Salidas",
                "Backlog actual",
                ...(area.comparacionDisponible ? ["Backlog anterior"] : []),
            ],
        },
        grid: {
            left: compact ? 42 : 58,
            right: 24,
            top: 54,
            bottom: 48,
        },
        xAxis: {
            type: "category",
            data: area.serieActual.map((point) => point.fecha),
            axisLabel: {
                formatter: (value: string) => value.slice(5),
                rotate: area.serieActual.length > 10 ? 35 : 0,
            },
        },
        yAxis: {
            type: "value",
            min: 0,
            minInterval: 1,
            name: "Lotes",
        },
        series: [
            {
                name: "Entradas",
                type: "bar",
                data: area.serieActual.map((point) => point.entradas),
                itemStyle: { color: "#3182CE" },
                barMaxWidth: 28,
            },
            {
                name: "Salidas",
                type: "bar",
                data: area.serieActual.map((point) => point.salidas),
                itemStyle: { color: "#38A169" },
                barMaxWidth: 28,
            },
            {
                name: "Backlog actual",
                type: "line",
                data: area.serieActual.map((point) => point.backlogCierre),
                itemStyle: { color: "#DD6B20" },
                lineStyle: { width: 3 },
                symbolSize: 6,
                smooth: 0.2,
            },
            ...(area.comparacionDisponible ? [{
                name: "Backlog anterior",
                type: "line",
                data: area.serieActual.map((point) =>
                    previousByIndex.get(point.indiceDia)?.backlogCierre ?? null),
                itemStyle: { color: "#805AD5" },
                lineStyle: { width: 2, type: "dashed" },
                symbol: "none",
                smooth: 0.2,
            }] : []),
        ],
    };
}

interface AreaChartTooltipParam {
    seriesName: string;
    value: number | null;
    dataIndex: number;
    marker: string;
}

function buildAreaChartTooltip(
    params: AreaChartTooltipParam[],
    currentSeries: SerieFlujoArea[],
    previousByIndex: Map<number, SerieFlujoArea>,
) {
    if (!Array.isArray(params) || params.length === 0) return "";
    const current = currentSeries[params[0].dataIndex];
    if (!current) return "";
    const previous = previousByIndex.get(current.indiceDia);
    const rows = params
        .filter((param) => param.value !== null && param.value !== undefined)
        .map((param) =>
            `${param.marker}${param.seriesName}: <strong>${formatQuantity(Number(param.value))}</strong>`)
        .join("<br/>");
    return [
        `<strong>${formatDate(current.fecha)}</strong>`,
        previous ? `Periodo anterior: ${formatDate(previous.fecha)}` : null,
        rows,
    ].filter(Boolean).join("<br/>");
}

function resolveDefaultAreaId(areas: AnaliticaAreaProduccion[]) {
    if (areas.length === 0) return null;
    const bottleneck = areas.find((area) => area.estado === "POSIBLE_CUELLO");
    if (bottleneck) return bottleneck.areaId;
    return [...areas]
        .sort((left, right) =>
            (right.actual.diasBacklog ?? -1) - (left.actual.diasBacklog ?? -1))[0]
        .areaId;
}

function metricComparisonHelp(
    current?: number | null,
    previous?: number | null,
    comparisonAvailable = false,
    prefix?: string,
) {
    if (!comparisonAvailable || current === null || current === undefined
        || previous === null || previous === undefined) {
        return prefix ? `${prefix} · sin base comparable` : "Sin base comparable";
    }
    if (previous === 0) {
        return prefix ? `${prefix} · anterior sin valor` : "Periodo anterior sin valor";
    }
    const variation = ((current - previous) / previous) * 100;
    const comparison = `${variation > 0 ? "+" : ""}${formatPercent(variation)} vs. anterior`;
    return prefix ? `${prefix} · ${comparison}` : comparison;
}

function formatMinutes(value?: number | null) {
    if (value === null || value === undefined) return "No estimable";
    if (value < 60) return `${formatQuantity(value)} min`;
    if (value < 1440) return `${formatQuantity(value / 60)} h`;
    return `${formatQuantity(value / 1440)} días`;
}

function productionKey(item: ProduccionUnidadArea) {
    return `${item.fuente}-${item.unidad}-${item.unidadEquivalente ?? ""}`;
}

function sourceLabel(source: FuenteProduccionArea) {
    switch (source) {
        case "REPORTADA":
            return "Reportada";
        case "ESTANDAR":
            return "Estándar";
        case "LOTES":
            return "Sin unidad";
    }
}

function signalPresentation(state: EstadoAreaProduccion): {
    label: string;
    colorScheme: string;
    alertStatus: "success" | "warning" | "error" | "info";
} {
    switch (state) {
        case "POSIBLE_CUELLO":
            return {
                label: "Posible cuello",
                colorScheme: "red",
                alertStatus: "error",
            };
        case "OBSERVACION":
            return {
                label: "En observación",
                colorScheme: "yellow",
                alertStatus: "warning",
            };
        case "ESTABLE":
            return {
                label: "Estable",
                colorScheme: "green",
                alertStatus: "success",
            };
        case "SIN_DATOS":
            return {
                label: "Sin datos",
                colorScheme: "gray",
                alertStatus: "info",
            };
    }
}

function coverageColor(value?: number | null) {
    if (value === null || value === undefined) return "gray";
    if (value >= 95) return "green";
    if (value >= 70) return "yellow";
    return "orange";
}
