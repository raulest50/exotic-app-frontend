import type {
    MpsSemanalDraftDTO,
    MpsSemanalItemDTO,
    MpsSemanalLotePlanificadoDTO,
} from "../MpsSemanalService";

export const MPS_WEEK_DAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

export function formatMpsPdfNumber(value: number | null | undefined): string {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return safeValue.toLocaleString("es-CO", {
        minimumFractionDigits: safeValue % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

export function formatMpsPdfDate(value: string | null | undefined): string {
    if (!value) {
        return "-";
    }

    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export function formatMpsPdfDateTime(value: Date = new Date()): string {
    return value.toLocaleString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatMpsEstadoLabel(estado: MpsSemanalDraftDTO["estado"]): string {
    switch (estado) {
        case "BORRADOR":
            return "Borrador";
        case "APROBADO":
            return "Aprobado";
        case "CERRADO":
            return "Cerrado";
        default:
            return estado;
    }
}

export function buildMpsSemanalPdfFileName(mps: MpsSemanalDraftDTO): string {
    const weekLabel = getMpsSemanaPdfLabel(mps).replace(/[^a-zA-Z0-9_-]/g, "-");
    return `mps-semanal-${weekLabel}.pdf`;
}

export function getMpsSemanaPdfLabel(mps: MpsSemanalDraftDTO): string {
    return mps.semanaMpsCodigo?.trim() || mps.weekStartDate;
}

export function truncateMpsPdfText(value: string | null | undefined, maxLength: number): string {
    if (!value) {
        return "-";
    }
    return value.length > maxLength ? `${value.slice(0, Math.max(maxLength - 3, 1))}...` : value;
}

function formatPlannedLotLine(lote: MpsSemanalLotePlanificadoDTO): string {
    const orderSuffix = lote.ordenProduccionId ? ` | OP ${lote.ordenProduccionId}` : "";
    const realLotSuffix = lote.loteAsignado ? ` | ${lote.loteAsignado}` : "";
    return `#${lote.loteOrdinal}: ${formatMpsPdfNumber(lote.cantidadPlanificada)} und | ${lote.estado}${orderSuffix}${realLotSuffix}`;
}

function buildItemPdfRow(dayLabel: string, dayDate: string, item: MpsSemanalItemDTO): string[] {
    return [
        `${dayLabel}\n${formatMpsPdfDate(dayDate)}`,
        `${item.terminadoId}\n${truncateMpsPdfText(item.terminadoNombre, 44)}`,
        item.categoriaNombre ?? "-",
        formatMpsPdfNumber(item.numeroLotes),
        formatMpsPdfNumber(item.cantidadTotal),
        `Lanz. ${formatMpsPdfDate(item.fechaLanzamiento)}\nEntrega ${formatMpsPdfDate(item.fechaFinalPlanificada)}`,
        item.lotesPlanificados.map(formatPlannedLotLine).join("\n"),
        item.observacion || item.warning || "",
    ];
}

export function buildMpsSemanalPdfRows(mps: MpsSemanalDraftDTO): string[][] {
    const rows = mps.dias.flatMap((dia) => {
        const dayLabel = MPS_WEEK_DAY_LABELS[dia.dayIndex] ?? `Dia ${dia.dayIndex + 1}`;
        if (dia.items.length === 0) {
            return [[
                `${dayLabel}\n${formatMpsPdfDate(dia.fecha)}`,
                "Sin programacion",
                "",
                "",
                "",
                "",
                "",
                "",
            ]];
        }
        return dia.items.map((item) => buildItemPdfRow(dayLabel, dia.fecha, item));
    });

    return rows.length > 0 ? rows : [["Sin programacion semanal", "", "", "", "", "", "", ""]];
}
