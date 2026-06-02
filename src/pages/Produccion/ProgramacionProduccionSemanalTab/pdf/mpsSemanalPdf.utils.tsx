import type {
    MpsSemanalDraftDTO,
    PropuestaMpsCalendarBlockDTO,
    PropuestaMpsCalendarRowDTO,
} from "../../PlaneacionProduccionTab/PlaneacionProduccionService";

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
    return `mps-semanal-${mps.weekStartDate}.pdf`;
}

export function getMpsCalendarRowLabel(row: PropuestaMpsCalendarRowDTO): string {
    return row.poolCapacidadNombre ?? row.categoriaNombre ?? row.rowKey ?? "Sin categoria";
}

export function truncateMpsPdfText(value: string | null | undefined, maxLength: number): string {
    if (!value) {
        return "-";
    }
    return value.length > maxLength ? `${value.slice(0, Math.max(maxLength - 3, 1))}...` : value;
}

export function formatMpsCalendarBlockLine(block: PropuestaMpsCalendarBlockDTO): string {
    const productName = truncateMpsPdfText(block.productoNombre, 34);
    const units = formatMpsPdfNumber(block.cantidadAsignada);
    const lots = formatMpsPdfNumber(block.lotesAsignados);
    return `${block.productoId} - ${productName}\n${units} und | ${lots} lotes`;
}

export function buildMpsCalendarPdfRows(mps: MpsSemanalDraftDTO): string[][] {
    const rows = mps.calendar?.rows ?? [];
    if (rows.length === 0) {
        return [["Sin filas programadas", "", "", "", "", "", ""]];
    }

    return rows.map((row) => {
        const dayCells = MPS_WEEK_DAY_LABELS.map((_, dayIndex) => {
            const cell = row.days?.find((day) => day.dayIndex === dayIndex) ?? row.days?.[dayIndex];
            const blocks = cell?.blocks ?? [];
            if (blocks.length === 0) {
                return "";
            }
            return blocks.map(formatMpsCalendarBlockLine).join("\n\n");
        });

        return [getMpsCalendarRowLabel(row), ...dayCells];
    });
}
