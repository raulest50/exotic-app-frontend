import type {
    CategoriaProduccion,
    ClaseAbc,
    ComposicionInventario,
    ReferenciaProduccion,
    SerieAjusteInventario,
    SerieMovimiento,
} from "./informesGlobales.types";

const PALETTE = [
    "#2F855A",
    "#3182CE",
    "#D69E2E",
    "#805AD5",
    "#E53E3E",
    "#319795",
    "#DD6B20",
    "#718096",
];

const PRODUCTION_REFERENCE_PALETTE = PALETTE.slice(0, -1);
const PLANNED_COLOR = "#A0AEC0";
const PRODUCED_COLOR = "#2F855A";
const OTHER_REFERENCES_COLOR = "#4A5568";
const TOP_REFERENCES_LIMIT = 8;
const PARETO_PRODUCTION_SHARE = 0.8;

export type ProductionReferenceMode = "TOP_8" | "PARETO_80" | "ALL";

interface ProductionReferenceSeries {
    id: string;
    name: string;
    data: number[];
    countByCategory: number[];
    color: string;
}

interface AggregatedProductionReference {
    id: string;
    name: string;
    total: number;
    data: number[];
}

interface ProductionTooltipParams {
    dataIndex?: number;
}

export function buildProductionChart(
    categories: CategoriaProduccion[],
    references: ReferenciaProduccion[],
    compact: boolean,
    referenceMode: ProductionReferenceMode,
) {
    const referenceSeries = buildProductionReferenceSeries(
        categories,
        references,
        referenceMode,
    );
    const visibleCategoryLimit = compact ? 4 : 8;
    const hasZoom = categories.length > visibleCategoryLimit;
    const initialZoomEnd = hasZoom
        ? Math.min(100, (visibleCategoryLimit / categories.length) * 100)
        : 100;

    return {
        aria: {
            enabled: true,
            description:
                "Comparación de unidades planeadas y producidas por categoría, "
                + "con la producción segmentada por referencia.",
        },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            confine: true,
            enterable: true,
            extraCssText: "max-width: 340px; max-height: 360px; overflow-y: auto;",
            formatter: (params: ProductionTooltipParams | ProductionTooltipParams[]) =>
                buildProductionTooltip(categories, referenceSeries, params),
        },
        legend: {
            type: "scroll",
            top: 0,
            selectedMode: false,
            data: [
                "Planeado",
                ...referenceSeries.map((series) => series.name),
            ],
        },
        grid: {
            left: compact ? 42 : 62,
            right: 20,
            top: 58,
            bottom: hasZoom ? 84 : 52,
        },
        dataZoom: hasZoom
            ? [
                {
                    type: "inside",
                    xAxisIndex: 0,
                    start: 0,
                    end: initialZoomEnd,
                },
                {
                    type: "slider",
                    xAxisIndex: 0,
                    start: 0,
                    end: initialZoomEnd,
                    bottom: 16,
                    height: 20,
                },
            ]
            : [],
        xAxis: {
            type: "category",
            data: categories.map((category) => category.categoriaNombre),
            axisLabel: {
                interval: 0,
                rotate: categories.length > 4 ? 28 : 0,
                width: compact ? 78 : 120,
                overflow: "truncate",
            },
        },
        yAxis: { type: "value", minInterval: 1 },
        series: [
            {
                id: "planeado",
                name: "Planeado",
                type: "bar",
                data: categories.map((category) => category.unidadesPlaneadas),
                itemStyle: { color: PLANNED_COLOR },
                barMaxWidth: 44,
                barGap: "18%",
            },
            ...referenceSeries.map((series) => ({
                id: series.id,
                name: series.name,
                type: "bar",
                stack: "produccion",
                data: series.data,
                itemStyle: { color: series.color },
                barMaxWidth: 44,
                emphasis: { focus: "series" },
            })),
        ],
    };
}

function buildProductionReferenceSeries(
    categories: CategoriaProduccion[],
    references: ReferenciaProduccion[],
    referenceMode: ProductionReferenceMode,
): ProductionReferenceSeries[] {
    const categoryIndexes = new Map<string, number>();
    categories.forEach((category, index) => {
        categoryIndexes.set(
            productionCategoryKey(category.categoriaId, category.categoriaNombre),
            index,
        );
    });
    const referencesById = new Map<string, AggregatedProductionReference>();

    for (const reference of references) {
        if (reference.cantidadProducida <= 0) continue;

        const categoryIndex = categoryIndexes.get(productionCategoryKey(
            reference.categoriaId,
            reference.categoriaNombre,
        ));
        if (categoryIndex === undefined) continue;

        const referenceId = reference.productoId ?? reference.productoNombre;
        const aggregated = referencesById.get(referenceId) ?? {
            id: referenceId,
            name: reference.productoNombre,
            total: 0,
            data: Array(categories.length).fill(0),
        };
        aggregated.total += reference.cantidadProducida;
        aggregated.data[categoryIndex] += reference.cantidadProducida;
        referencesById.set(referenceId, aggregated);
    }

    const sortedReferences = Array.from(referencesById.values())
        .sort(compareAggregatedProductionReferences);
    const selectedCount = selectedReferenceCount(sortedReferences, referenceMode);
    const selectedReferences = sortedReferences.slice(0, selectedCount);
    const groupedReferences = sortedReferences.slice(selectedCount);

    const series = selectedReferences.map((reference) => {
        const paletteIndex = sortedReferences.indexOf(reference)
            % PRODUCTION_REFERENCE_PALETTE.length;
        return {
            id: `referencia:${reference.id}`,
            name: reference.name,
            data: reference.data,
            countByCategory: reference.data.map((value) => value > 0 ? 1 : 0),
            color: PRODUCTION_REFERENCE_PALETTE[paletteIndex],
        };
    });

    if (groupedReferences.length > 0) {
        const otherData = Array(categories.length).fill(0) as number[];
        const countByCategory = Array(categories.length).fill(0) as number[];
        for (const reference of groupedReferences) {
            reference.data.forEach((value, index) => {
                otherData[index] += value;
                if (value > 0) countByCategory[index] += 1;
            });
        }
        series.push({
            id: "referencia:otras",
            name: "Otras referencias",
            data: otherData,
            countByCategory,
            color: OTHER_REFERENCES_COLOR,
        });
    }

    return series;
}

function selectedReferenceCount(
    references: AggregatedProductionReference[],
    referenceMode: ProductionReferenceMode,
) {
    if (referenceMode === "ALL") return references.length;
    if (referenceMode === "TOP_8") {
        return Math.min(TOP_REFERENCES_LIMIT, references.length);
    }

    const totalProduction = references.reduce(
        (total, reference) => total + reference.total,
        0,
    );
    if (totalProduction <= 0) return 0;

    let accumulatedProduction = 0;
    for (let index = 0; index < references.length; index += 1) {
        accumulatedProduction += references[index].total;
        if (accumulatedProduction / totalProduction >= PARETO_PRODUCTION_SHARE) {
            return index + 1;
        }
    }
    return references.length;
}

function compareAggregatedProductionReferences(
    left: AggregatedProductionReference,
    right: AggregatedProductionReference,
) {
    const productionDifference = right.total - left.total;
    if (productionDifference !== 0) return productionDifference;

    const nameDifference = left.name.localeCompare(
        right.name,
        "es",
        { sensitivity: "base" },
    );
    if (nameDifference !== 0) return nameDifference;
    return left.id.localeCompare(right.id, "es", { sensitivity: "base" });
}

function buildProductionTooltip(
    categories: CategoriaProduccion[],
    referenceSeries: ProductionReferenceSeries[],
    params: ProductionTooltipParams | ProductionTooltipParams[],
) {
    const firstParam = Array.isArray(params) ? params[0] : params;
    const categoryIndex = firstParam?.dataIndex ?? -1;
    const category = categories[categoryIndex];
    if (!category) return "";

    const planned = category.unidadesPlaneadas;
    const produced = category.unidadesProducidas;
    const difference = produced - planned;
    const fulfillment = planned > 0
        ? formatChartPercent(produced * 100 / planned)
        : "Sin planeación";
    const detailRows = referenceSeries
        .filter((series) => series.data[categoryIndex] > 0)
        .map((series) => {
            const groupedCount = series.countByCategory[categoryIndex];
            const label = series.id === "referencia:otras" && groupedCount > 0
                ? `${series.name} (${groupedCount})`
                : series.name;
            return tooltipRow(
                label,
                formatChartNumber(series.data[categoryIndex]),
                series.color,
            );
        })
        .join("");

    return [
        `<div style="font-weight:600;margin-bottom:6px">${escapeHtml(category.categoriaNombre)}</div>`,
        tooltipRow("Planeado", formatChartNumber(planned), PLANNED_COLOR),
        tooltipRow("Producido", formatChartNumber(produced), PRODUCED_COLOR),
        tooltipRow("Diferencia", formatSignedChartNumber(difference)),
        tooltipRow("Cumplimiento", fulfillment),
        detailRows
            ? `<div style="border-top:1px solid #E2E8F0;margin:6px 0"></div>${detailRows}`
            : "",
    ].join("");
}

function tooltipRow(label: string, value: string, color?: string) {
    const marker = color
        ? `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color};margin-right:6px"></span>`
        : "";
    return [
        '<div style="display:flex;justify-content:space-between;gap:18px;line-height:1.6">',
        `<span>${marker}${escapeHtml(label)}</span>`,
        `<strong>${escapeHtml(value)}</strong>`,
        "</div>",
    ].join("");
}

function productionCategoryKey(id: number | null | undefined, name: string) {
    return `${id ?? "SIN"}-${name}`;
}

function formatChartNumber(value: number) {
    return value.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function formatSignedChartNumber(value: number) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatChartNumber(value)}`;
}

function formatChartPercent(value: number) {
    return `${value.toLocaleString("es-CO", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })}%`;
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

export function buildCompositionChart(composition: ComposicionInventario[]) {
    return {
        aria: {
            enabled: true,
            description: "Participación del valor estimado del inventario por tipo.",
        },
        color: PALETTE,
        tooltip: {
            trigger: "item",
            valueFormatter: (value: number) => formatCurrency(value),
        },
        legend: { bottom: 0 },
        series: [{
            name: "Valor estimado",
            type: "pie",
            radius: ["42%", "68%"],
            center: ["50%", "44%"],
            avoidLabelOverlap: true,
            data: composition.map((item) => ({
                name: humanize(item.tipo),
                value: item.valorEstimado,
                referencias: item.referencias,
            })),
        }],
    };
}

export function buildAbcChart(classes: ClaseAbc[]) {
    return {
        aria: {
            enabled: true,
            description: "Valor estimado del inventario clasificado en grupos ABC.",
        },
        color: ["#2F855A", "#3182CE", "#D69E2E"],
        tooltip: {
            trigger: "axis",
            valueFormatter: (value: number) => formatCurrency(value),
        },
        grid: { left: 58, right: 20, top: 24, bottom: 42 },
        xAxis: { type: "category", data: classes.map((item) => `Clase ${item.clase}`) },
        yAxis: {
            type: "value",
            axisLabel: { formatter: (value: number) => formatCompact(value) },
        },
        series: [{
            name: "Valor estimado",
            type: "bar",
            data: classes.map((item, index) => ({
                value: item.valorEstimado,
                itemStyle: { color: PALETTE[index] },
            })),
            barMaxWidth: 56,
        }],
    };
}

export function buildMovementChart(
    series: SerieMovimiento[],
    perspective: "valor" | "cantidad",
    unit: string,
    compact: boolean,
) {
    const points = perspective === "valor"
        ? aggregateMovementValues(series)
        : series.filter((item) => item.unidadMedida === unit);
    const axisUnit = perspective === "valor" ? "COP" : unit;
    const hasZoom = points.length > (compact ? 8 : 18);

    return {
        aria: {
            enabled: true,
            description: `Tendencia diaria de movimientos de inventario en ${axisUnit}.`,
        },
        color: PALETTE,
        tooltip: { trigger: "axis", confine: true },
        legend: { top: 0 },
        grid: {
            left: compact ? 45 : 62,
            right: 18,
            top: 74,
            bottom: hasZoom ? 78 : 48,
        },
        dataZoom: hasZoom
            ? [{ type: "inside" }, { type: "slider", bottom: 14, height: 22 }]
            : [],
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: points.map((item) => item.fecha.slice(5)),
            axisLabel: { rotate: compact && points.length > 4 ? 30 : 0 },
        },
        yAxis: {
            type: "value",
            name: axisUnit,
            axisLabel: { formatter: (value: number) => formatCompact(value) },
        },
        series: [
            lineSeries("Recepciones OCM", points.map((item) => item.recepcionesOcm)),
            lineSeries("Dispensaciones", points.map((item) => item.dispensaciones)),
            lineSeries("Producto terminado", points.map((item) => item.productoTerminado)),
            lineSeries("Otros ingresos", points.map((item) => item.otrosIngresos)),
        ],
    };
}

export function buildAdjustmentTrendChart(
    series: SerieAjusteInventario[],
    perspective: "valor" | "cantidad",
    unit: string,
    group: "TODOS" | "MATERIA_PRIMA" | "EMPAQUE",
    compact: boolean,
) {
    const filtered = series.filter((item) =>
        (group === "TODOS" || item.grupo === group)
        && (perspective === "valor" || item.unidadMedida === unit));
    const valuesByDate = new Map<string, {
        fecha: string;
        positivos: number;
        negativos: number;
    }>();

    for (const item of filtered) {
        const point = valuesByDate.get(item.fecha) ?? {
            fecha: item.fecha,
            positivos: 0,
            negativos: 0,
        };
        point.positivos += perspective === "valor"
            ? item.valorPositivo
            : item.cantidadPositiva;
        point.negativos += perspective === "valor"
            ? item.valorNegativo
            : item.cantidadNegativa;
        valuesByDate.set(item.fecha, point);
    }

    const points = Array.from(valuesByDate.values())
        .sort((left, right) => left.fecha.localeCompare(right.fecha));
    const axisUnit = perspective === "valor" ? "COP" : unit;
    const hasZoom = points.length > (compact ? 8 : 18);

    return {
        aria: {
            enabled: true,
            description: `Tendencia diaria de ajustes de inventario en ${axisUnit}.`,
        },
        color: ["#2F855A", "#C53030"],
        tooltip: {
            trigger: "axis",
            confine: true,
            valueFormatter: perspective === "valor"
                ? (value: number) => formatCurrency(value)
                : undefined,
        },
        legend: { top: 0 },
        grid: {
            left: compact ? 45 : 62,
            right: 18,
            top: 64,
            bottom: hasZoom ? 78 : 48,
        },
        dataZoom: hasZoom
            ? [{ type: "inside" }, { type: "slider", bottom: 14, height: 22 }]
            : [],
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: points.map((item) => item.fecha.slice(5)),
            axisLabel: { rotate: compact && points.length > 4 ? 30 : 0 },
        },
        yAxis: {
            type: "value",
            name: axisUnit,
            axisLabel: { formatter: (value: number) => formatCompact(value) },
        },
        series: [
            lineSeries("Ajustes positivos", points.map((item) => item.positivos)),
            lineSeries("Ajustes negativos", points.map((item) => item.negativos)),
        ],
    };
}

interface MovementChartPoint {
    fecha: string;
    recepcionesOcm: number;
    dispensaciones: number;
    productoTerminado: number;
    otrosIngresos: number;
}

function aggregateMovementValues(series: SerieMovimiento[]): MovementChartPoint[] {
    const valuesByDate = new Map<string, MovementChartPoint>();
    for (const item of series) {
        const point = valuesByDate.get(item.fecha) ?? {
            fecha: item.fecha,
            recepcionesOcm: 0,
            dispensaciones: 0,
            productoTerminado: 0,
            otrosIngresos: 0,
        };
        point.recepcionesOcm += item.valorRecepcionesOcm;
        point.dispensaciones += item.valorDispensaciones;
        point.productoTerminado += item.valorProductoTerminado;
        point.otrosIngresos += item.valorOtrosIngresos;
        valuesByDate.set(item.fecha, point);
    }
    return Array.from(valuesByDate.values())
        .sort((left, right) => left.fecha.localeCompare(right.fecha));
}

function lineSeries(name: string, data: number[]) {
    return {
        name,
        type: "line",
        data,
        showSymbol: data.length <= 14,
        symbolSize: 6,
        lineStyle: { width: 2 },
    };
}

function formatCompact(value: number) {
    return Intl.NumberFormat("es-CO", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
}

function formatCurrency(value: number) {
    return value.toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
    });
}

function humanize(value: string) {
    return value
        .toLocaleLowerCase("es-CO")
        .replace(/_/g, " ")
        .replace(/^./, (firstLetter) => firstLetter.toLocaleUpperCase("es-CO"));
}
