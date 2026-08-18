import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useColorModeValue } from "../../../components/ui/color-mode";
import type { MuestraResponse } from "../types";

interface NumericReading {
    indiceUnidad: number;
    valor: number;
    fueraEspecificacion: boolean;
}

interface NumericSample {
    numeroMuestra: number;
    lecturas: NumericReading[];
    promedio: number;
    promedioFueraEspecificacion: boolean;
}

interface NumericCharacteristicGroup {
    key: string;
    nombre: string;
    unidad?: string | null;
    limiteInferior?: number | null;
    limiteSuperior?: number | null;
    muestras: NumericSample[];
}

interface ChartTooltipParam {
    seriesName: string;
    value: number | null;
    dataIndex: number;
    marker: string;
    data?: unknown;
}

interface ChartPointData {
    value: number;
    fueraEspecificacion?: boolean;
}

const UNIT_COLORS = [
    "#3182CE",
    "#805AD5",
    "#319795",
    "#D69E2E",
    "#DD6B20",
    "#2B6CB0",
    "#6B46C1",
    "#2F855A",
];
const OUT_OF_SPEC_COLOR = "#E53E3E";
const AVERAGE_COLOR = "#00897B";
const LOWER_LIMIT_COLOR = "#D69E2E";
const UPPER_LIMIT_COLOR = "#DD6B20";
const numberFormatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 4,
});

function isFiniteNumber(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function isOutsideSpecification(
    value: number,
    lower?: number | null,
    upper?: number | null,
) {
    return (isFiniteNumber(lower) && value < lower)
        || (isFiniteNumber(upper) && value > upper);
}

function buildNumericGroups(muestras: MuestraResponse[]): NumericCharacteristicGroup[] {
    const grouped = new Map<number, MuestraResponse[]>();
    for (const muestra of muestras) {
        if (muestra.tipo !== "NUMERICA") continue;
        grouped.set(muestra.caracteristicaId, [
            ...(grouped.get(muestra.caracteristicaId) ?? []),
            muestra,
        ]);
    }

    return Array.from(grouped.entries()).flatMap(([caracteristicaId, items]) => {
        const ordered = [...items].sort(
            (left, right) => left.numeroMuestra - right.numeroMuestra,
        );
        const first = ordered[0];
        if (!first) return [];

        const muestrasNumericas = ordered.flatMap((muestra): NumericSample[] => {
            const lecturas = muestra.lecturas.flatMap((lectura): NumericReading[] => {
                const valor = lectura.valorNumerico;
                if (!isFiniteNumber(valor)) return [];
                return [{
                    indiceUnidad: lectura.indiceUnidad,
                    valor,
                    fueraEspecificacion: isOutsideSpecification(
                        valor,
                        muestra.limiteInferior,
                        muestra.limiteSuperior,
                    ),
                }];
            });
            if (lecturas.length === 0) return [];
            const promedio = lecturas.reduce(
                (total, lectura) => total + lectura.valor,
                0,
            ) / lecturas.length;
            return [{
                numeroMuestra: muestra.numeroMuestra,
                lecturas,
                promedio,
                promedioFueraEspecificacion: isOutsideSpecification(
                    promedio,
                    muestra.limiteInferior,
                    muestra.limiteSuperior,
                ),
            }];
        });
        if (muestrasNumericas.length === 0) return [];

        return [{
            key: String(caracteristicaId),
            nombre: first.caracteristicaNombre,
            unidad: first.unidad,
            limiteInferior: first.limiteInferior,
            limiteSuperior: first.limiteSuperior,
            muestras: muestrasNumericas,
        }];
    });
}

export function hasNumericControlSamples(muestras: MuestraResponse[]) {
    return muestras.some((muestra) =>
        muestra.tipo === "NUMERICA"
        && muestra.lecturas.some((lectura) => isFiniteNumber(lectura.valorNumerico)));
}

function isChartPointData(value: unknown): value is ChartPointData {
    return typeof value === "object" && value !== null && "value" in value;
}

function formatValue(value: number, unidad?: string | null) {
    return `${numberFormatter.format(value)}${unidad ? ` ${unidad}` : ""}`;
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function buildTooltip(
    params: ChartTooltipParam[],
    group: NumericCharacteristicGroup,
) {
    if (!Array.isArray(params) || params.length === 0) return "";
    const sample = group.muestras[params[0].dataIndex];
    if (!sample) return "";
    const rows = params.flatMap((param): string[] => {
        if (!isFiniteNumber(param.value)) return [];
        const fuera = isChartPointData(param.data)
            && param.data.fueraEspecificacion;
        return [
            `${param.marker}${escapeHtml(param.seriesName)}: <strong>${escapeHtml(formatValue(
                param.value,
                group.unidad,
            ))}</strong>${fuera ? " · fuera de especificación" : ""}`,
        ];
    });
    return [
        `<strong>Muestra ${sample.numeroMuestra}</strong>`,
        ...rows,
    ].join("<br/>");
}

function buildChartOption(
    group: NumericCharacteristicGroup,
    colors: { text: string; grid: string; axis: string },
) {
    const unitIndexes = Array.from(new Set(
        group.muestras.flatMap((muestra) =>
            muestra.lecturas.map((lectura) => lectura.indiceUnidad)),
    )).sort((left, right) => left - right);
    const limitLines = [
        ...(isFiniteNumber(group.limiteInferior) ? [{
            name: "Límite inferior",
            yAxis: group.limiteInferior,
            lineStyle: { color: LOWER_LIMIT_COLOR, type: "dashed", width: 2 },
            label: {
                color: LOWER_LIMIT_COLOR,
                formatter: `Límite inferior: ${formatValue(group.limiteInferior, group.unidad)}`,
            },
        }] : []),
        ...(isFiniteNumber(group.limiteSuperior) ? [{
            name: "Límite superior",
            yAxis: group.limiteSuperior,
            lineStyle: { color: UPPER_LIMIT_COLOR, type: "dashed", width: 2 },
            label: {
                color: UPPER_LIMIT_COLOR,
                formatter: `Límite superior: ${formatValue(group.limiteSuperior, group.unidad)}`,
            },
        }] : []),
    ];

    return {
        aria: {
            enabled: true,
            description: `Curva de ${group.nombre} por número de muestra. La línea representa el promedio y los puntos las lecturas individuales.`,
        },
        animationDuration: 350,
        tooltip: {
            trigger: "axis",
            confine: true,
            formatter: (params: ChartTooltipParam[]) => buildTooltip(params, group),
        },
        legend: {
            type: "scroll",
            top: 0,
            textStyle: { color: colors.text },
            data: ["Promedio", ...unitIndexes.map((index) => `Unidad ${index}`)],
        },
        grid: {
            left: 64,
            right: 34,
            top: 62,
            bottom: 64,
            containLabel: true,
        },
        xAxis: {
            type: "category",
            data: group.muestras.map((muestra) => String(muestra.numeroMuestra)),
            name: "Número de muestra",
            nameLocation: "middle",
            nameGap: 34,
            axisLine: { lineStyle: { color: colors.axis } },
            axisLabel: { color: colors.text },
            nameTextStyle: { color: colors.text },
        },
        yAxis: {
            type: "value",
            scale: true,
            name: group.unidad
                ? `${group.nombre} (${group.unidad})`
                : group.nombre,
            nameLocation: "middle",
            nameGap: 48,
            splitLine: { lineStyle: { color: colors.grid } },
            axisLabel: { color: colors.text },
            nameTextStyle: { color: colors.text },
        },
        series: [
            {
                name: "Promedio",
                type: "line",
                data: group.muestras.map((muestra) => ({
                    value: muestra.promedio,
                    fueraEspecificacion: muestra.promedioFueraEspecificacion,
                    itemStyle: {
                        color: muestra.promedioFueraEspecificacion
                            ? OUT_OF_SPEC_COLOR
                            : AVERAGE_COLOR,
                    },
                })),
                itemStyle: { color: AVERAGE_COLOR },
                lineStyle: { color: AVERAGE_COLOR, width: 3 },
                symbol: "circle",
                symbolSize: 9,
                connectNulls: false,
                z: 4,
                markLine: limitLines.length ? {
                    symbol: "none",
                    silent: true,
                    data: limitLines,
                } : undefined,
            },
            ...unitIndexes.map((unitIndex, colorIndex) => ({
                name: `Unidad ${unitIndex}`,
                type: "scatter",
                data: group.muestras.map((muestra) => {
                    const lectura = muestra.lecturas.find(
                        (item) => item.indiceUnidad === unitIndex,
                    );
                    if (!lectura) return null;
                    return {
                        value: lectura.valor,
                        fueraEspecificacion: lectura.fueraEspecificacion,
                        itemStyle: {
                            color: lectura.fueraEspecificacion
                                ? OUT_OF_SPEC_COLOR
                                : UNIT_COLORS[colorIndex % UNIT_COLORS.length],
                        },
                    };
                }),
                itemStyle: { color: UNIT_COLORS[colorIndex % UNIT_COLORS.length] },
                symbolSize: 8,
                z: 5,
            })),
        ],
    };
}

export default function ControlProcesoNumericCharts({
    muestras,
}: {
    muestras: MuestraResponse[];
}) {
    const groups = useMemo(() => buildNumericGroups(muestras), [muestras]);
    const textColor = useColorModeValue("#2D3748", "#E2E8F0");
    const gridColor = useColorModeValue("#E2E8F0", "#4A5568");
    const axisColor = useColorModeValue("#A0AEC0", "#718096");

    if (groups.length === 0) return null;

    return (
        <Stack gap={4}>
            {groups.map((group) => {
                const readings = group.muestras.flatMap((muestra) => muestra.lecturas);
                const outOfSpec = readings.filter(
                    (lectura) => lectura.fueraEspecificacion,
                ).length;
                const hasLimits = isFiniteNumber(group.limiteInferior)
                    || isFiniteNumber(group.limiteSuperior);
                const limits = [
                    isFiniteNumber(group.limiteInferior)
                        ? `mín. ${formatValue(group.limiteInferior, group.unidad)}`
                        : null,
                    isFiniteNumber(group.limiteSuperior)
                        ? `máx. ${formatValue(group.limiteSuperior, group.unidad)}`
                        : null,
                ].filter(Boolean).join(" · ");
                const option = buildChartOption(group, {
                    text: textColor,
                    grid: gridColor,
                    axis: axisColor,
                });

                return (
                    <Box key={group.key} borderWidth="1px" borderRadius="md" p={{ base: 3, md: 4 }}>
                        <HStack justify="space-between" align="start" mb={2} gap={3} flexWrap="wrap">
                            <Box>
                                <Text fontWeight="semibold">Curva de {group.nombre}</Text>
                                <Text fontSize="sm" color="app.textSubtle">
                                    Promedio por muestra con sus lecturas individuales.
                                </Text>
                            </Box>
                            <HStack gap={2} flexWrap="wrap">
                                {group.unidad ? <Badge variant="outline">{group.unidad}</Badge> : null}
                                <Badge>{group.muestras.length} muestras</Badge>
                                <Badge>{readings.length} lecturas</Badge>
                                {outOfSpec > 0 ? (
                                    <Badge colorPalette="red">{outOfSpec} fuera de especificación</Badge>
                                ) : !hasLimits ? (
                                    <Badge colorPalette="gray">Sin límites configurados</Badge>
                                ) : (
                                    <Badge colorPalette="green">Lecturas dentro de límites</Badge>
                                )}
                            </HStack>
                        </HStack>
                        {limits ? (
                            <Text fontSize="xs" color="app.textSubtle" mb={1}>
                                Especificación: {limits}
                            </Text>
                        ) : (
                            <Text fontSize="xs" color="app.textSubtle" mb={1}>
                                La característica no tiene límites de especificación configurados.
                            </Text>
                        )}
                        <Box
                            role="img"
                            aria-label={`Curva de ${group.nombre} por número de muestra`}
                            h={{ base: "330px", md: "390px" }}
                            minW={0}
                        >
                            <ReactECharts
                                option={option}
                                notMerge
                                lazyUpdate
                                style={{ height: "100%", width: "100%" }}
                            />
                        </Box>
                        <Text fontSize="xs" color="app.textSubtle">
                            La línea representa el promedio. Los puntos representan unidades individuales y los puntos rojos indican valores fuera de especificación.
                        </Text>
                    </Box>
                );
            })}
        </Stack>
    );
}
