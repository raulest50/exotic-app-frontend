import type {
    CategoriaProduccion,
    ClaseAbc,
    ComposicionInventario,
    ReferenciaProduccion,
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

export function buildProductionChart(
    categories: CategoriaProduccion[],
    references: ReferenciaProduccion[],
    compact: boolean,
) {
    const categoryKeys = categories.map((category) => productionCategoryKey(
        category.categoriaId,
        category.categoriaNombre,
    ));
    const seriesByReference = new Map<string, { name: string; data: number[] }>();

    for (const reference of references) {
        if (reference.cantidadProducida <= 0) continue;
        const categoryIndex = categoryKeys.indexOf(productionCategoryKey(
            reference.categoriaId,
            reference.categoriaNombre,
        ));
        if (categoryIndex < 0) continue;

        const referenceKey = reference.productoId ?? reference.productoNombre;
        const chartSeries = seriesByReference.get(referenceKey) ?? {
            name: reference.productoNombre,
            data: Array(categories.length).fill(0),
        };
        chartSeries.data[categoryIndex] += reference.cantidadProducida;
        seriesByReference.set(referenceKey, chartSeries);
    }

    const chartSeries = Array.from(seriesByReference.entries())
        .sort((left, right) => sum(right[1].data) - sum(left[1].data));

    return {
        aria: {
            enabled: true,
            description: "Composición de unidades producidas por referencia y categoría.",
        },
        color: PALETTE,
        tooltip: { trigger: "item", confine: true },
        legend: { type: "scroll", top: 0 },
        grid: {
            left: compact ? 42 : 62,
            right: 20,
            top: 52,
            bottom: categories.length > 6 ? 84 : 52,
        },
        dataZoom: categories.length > 6
            ? [{ type: "inside" }, { type: "slider", bottom: 16, height: 20 }]
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
        series: chartSeries.map(([id, item], index) => ({
            id,
            name: item.name,
            type: "bar",
            stack: "produccion",
            data: item.data,
            itemStyle: { color: PALETTE[index % PALETTE.length] },
            emphasis: { focus: "series" },
        })),
    };
}

function productionCategoryKey(id: number | null | undefined, name: string) {
    return `${id ?? "SIN"}-${name}`;
}

function sum(values: number[]) {
    return values.reduce((total, value) => total + value, 0);
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
        .replaceAll("_", " ")
        .replace(/^./, (firstLetter) => firstLetter.toLocaleUpperCase("es-CO"));
}
