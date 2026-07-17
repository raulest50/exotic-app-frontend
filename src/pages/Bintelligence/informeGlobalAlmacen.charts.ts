import type {
    RankingDispensacionUnidad,
    SerieFisicaDiaria,
} from "./informeGlobalAlmacen.types";

const rankingPalette = ["#2f855a", "#3182ce", "#319795", "#d69e2e", "#805ad5", "#dd6b20"];

interface RankingChartDatum {
    value: number;
    name: string;
    productoId: string;
    tipoMaterial: string;
    participacionPct: number;
    movimientos: number;
    materialesAgrupados?: number;
    itemStyle: { color: string };
}

interface RankingTooltipParam {
    data?: RankingChartDatum;
}

interface SerieTooltipParam {
    axisValue?: string;
    marker?: string;
    seriesName?: string;
    value?: number;
}

export function buildRankingDispensacionOptions(
    ranking: RankingDispensacionUnidad,
    isMobile: boolean,
) {
    const datos: RankingChartDatum[] = ranking.materiales.map((material, index) => ({
        value: material.cantidadDispensada,
        name: material.productoNombre,
        productoId: material.productoId,
        tipoMaterial: material.tipoMaterial,
        participacionPct: material.participacionPct,
        movimientos: material.movimientos,
        itemStyle: { color: rankingPalette[index % rankingPalette.length] },
    }));

    if (ranking.materialesOtros > 0) {
        datos.push({
            value: ranking.cantidadOtros,
            name: "Otros",
            productoId: `${ranking.materialesOtros} materiales`,
            tipoMaterial: "Materiales restantes",
            participacionPct: ranking.cantidadTotal > 0
                ? ranking.cantidadOtros * 100 / ranking.cantidadTotal
                : 0,
            movimientos: 0,
            materialesAgrupados: ranking.materialesOtros,
            itemStyle: { color: "#718096" },
        });
    }

    return {
        aria: {
            enabled: true,
            decal: { show: false },
            description: `Ranking de materiales dispensados en ${ranking.unidadMedida}.`,
        },
        animationDuration: 350,
        grid: {
            left: isMobile ? 118 : 190,
            right: isMobile ? 18 : 34,
            top: 12,
            bottom: 42,
            containLabel: false,
        },
        tooltip: {
            trigger: "item",
            confine: true,
            formatter: (param: RankingTooltipParam) => {
                const item = param.data;
                if (!item) return "";
                const detalleMovimientos = item.materialesAgrupados
                    ? `${formatInteger(item.materialesAgrupados)} materiales agrupados`
                    : `${formatInteger(item.movimientos)} movimientos`;
                return [
                    `<strong>${escapeHtml(item.name)}</strong>`,
                    `<span>${escapeHtml(item.productoId)} | ${escapeHtml(item.tipoMaterial)}</span>`,
                    `<span>${formatQuantity(item.value)} ${escapeHtml(ranking.unidadMedida)}</span>`,
                    `<span>${formatPercent(item.participacionPct)} del total | ${detalleMovimientos}</span>`,
                ].join("<br/>");
            },
        },
        xAxis: {
            type: "value",
            name: ranking.unidadMedida,
            nameLocation: "middle",
            nameGap: 28,
            axisLabel: { formatter: (value: number) => formatCompactNumber(value) },
            splitLine: { lineStyle: { color: "#e2e8f0" } },
        },
        yAxis: {
            type: "category",
            inverse: true,
            data: datos.map((item) => item.name),
            axisTick: { show: false },
            axisLabel: {
                width: isMobile ? 104 : 176,
                overflow: "truncate",
                formatter: (value: string) => truncate(value, isMobile ? 17 : 29),
            },
        },
        series: [{
            name: "Dispensado",
            type: "bar",
            data: datos,
            barMaxWidth: 28,
            label: {
                show: !isMobile,
                position: "right",
                formatter: (param: { value?: number }) => formatQuantity(Number(param.value ?? 0)),
            },
            emphasis: { focus: "self" },
        }],
    };
}

export function buildSerieFisicaOptions(
    serieCompleta: SerieFisicaDiaria[],
    unidadMedida: string,
    isMobile: boolean,
) {
    const serie = serieCompleta.filter((item) => item.unidadMedida === unidadMedida);
    const needsZoom = serie.length > (isMobile ? 7 : 16);

    return {
        aria: {
            enabled: true,
            decal: { show: false },
            description: `Serie diaria de dispensaciones y recepciones de compra en ${unidadMedida}.`,
        },
        tooltip: {
            trigger: "axis",
            confine: true,
            formatter: (params: SerieTooltipParam[]) => {
                const fecha = Array.isArray(params) && params.length > 0
                    ? params[0].axisValue ?? ""
                    : "";
                const lineas = Array.isArray(params)
                    ? params.map((param) => `${param.marker ?? ""}${escapeHtml(param.seriesName ?? "")}: <strong>${formatQuantity(Number(param.value ?? 0))} ${escapeHtml(unidadMedida)}</strong>`)
                    : [];
                return [escapeHtml(fecha), ...lineas].join("<br/>");
            },
        },
        legend: {
            top: 0,
            data: ["Dispensado", "Recibido por OCM"],
        },
        grid: {
            left: isMobile ? 52 : 66,
            right: 18,
            top: 50,
            bottom: needsZoom ? 72 : 46,
        },
        dataZoom: needsZoom
            ? [
                { type: "inside", xAxisIndex: 0 },
                { type: "slider", xAxisIndex: 0, bottom: 14, height: 22 },
            ]
            : [],
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: serie.map((item) => formatChartDate(item.fecha)),
            axisLabel: {
                interval: 0,
                rotate: isMobile && serie.length > 4 ? 35 : 0,
            },
        },
        yAxis: {
            type: "value",
            name: unidadMedida,
            axisLabel: { formatter: (value: number) => formatCompactNumber(value) },
            splitLine: { lineStyle: { color: "#e2e8f0" } },
        },
        series: [
            {
                name: "Dispensado",
                type: "line",
                data: serie.map((item) => item.cantidadDispensada),
                showSymbol: serie.length <= 14,
                symbolSize: 7,
                lineStyle: { color: "#2f855a", width: 3 },
                itemStyle: { color: "#2f855a" },
            },
            {
                name: "Recibido por OCM",
                type: "line",
                data: serie.map((item) => item.cantidadRecibidaCompra),
                showSymbol: serie.length <= 14,
                symbolSize: 6,
                lineStyle: { color: "#3182ce", width: 2, type: "dashed" },
                itemStyle: { color: "#3182ce" },
            },
        ],
    };
}

function truncate(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatChartDate(value: string) {
    return value.length >= 10 ? value.slice(5) : value;
}

function formatInteger(value: number) {
    return value.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function formatQuantity(value: number) {
    return value.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function formatPercent(value: number) {
    return `${value.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatCompactNumber(value: number) {
    return Intl.NumberFormat("es-CO", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
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
