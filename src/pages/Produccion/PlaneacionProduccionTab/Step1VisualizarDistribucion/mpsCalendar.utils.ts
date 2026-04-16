import type {
    PropuestaMpsCalendarBlockDTO,
    PropuestaMpsCalendarCellDTO,
    PropuestaMpsSemanalCalendarDTO,
    PropuestaMpsUnscheduledBlockDTO,
} from "../PlaneacionProduccionService";

export interface CalendarInsights {
    categoriasProgramadas: number;
    categoriasConSobrecarga: number;
    noProgramados: number;
}

export type MpsDropTarget =
    | { type: "day"; categoriaId: number | null; dayIndex: number }
    | { type: "unscheduled" };

export function formatNumber(value: number): string {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

export function getDayLabel(dayIndex: number): string {
    return ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab"][dayIndex] ?? `Dia ${dayIndex + 1}`;
}

export function getEstadoColorScheme(estado: string): string {
    switch (estado) {
        case "excedida":
            return "red";
        case "al_limite":
            return "yellow";
        case "sin_configurar":
            return "orange";
        default:
            return "green";
    }
}

export function getEstadoLabel(estado: string): string {
    switch (estado) {
        case "excedida":
            return "Excedida";
        case "al_limite":
            return "Al limite";
        case "sin_configurar":
            return "Sin configurar";
        default:
            return "Disponible";
    }
}

export function getDayDroppableId(categoriaId: number | null, dayIndex: number): string {
    return `day::${categoriaId ?? "null"}::${dayIndex}`;
}

export function getUnscheduledDroppableId(): string {
    return "unscheduled";
}

export function parseDropTarget(id: string | null | undefined): MpsDropTarget | null {
    if (!id) {
        return null;
    }
    if (id === getUnscheduledDroppableId()) {
        return { type: "unscheduled" };
    }

    const [type, categoriaIdToken, dayIndexToken] = id.split("::");
    if (type !== "day") {
        return null;
    }

    return {
        type: "day",
        categoriaId: categoriaIdToken === "null" ? null : Number(categoriaIdToken),
        dayIndex: Number(dayIndexToken),
    };
}

export function cloneCalendar(calendar: PropuestaMpsSemanalCalendarDTO): PropuestaMpsSemanalCalendarDTO {
    return JSON.parse(JSON.stringify(calendar)) as PropuestaMpsSemanalCalendarDTO;
}

export function computeCalendarInsights(calendar: PropuestaMpsSemanalCalendarDTO): CalendarInsights {
    return {
        categoriasProgramadas: calendar.rows.filter((row) => row.totalAsignadoSemana > 0).length,
        categoriasConSobrecarga: calendar.rows.filter((row) => row.estadoSemana === "excedida").length,
        noProgramados: calendar.unscheduled.length,
    };
}

export function findBlockById(
    calendar: PropuestaMpsSemanalCalendarDTO,
    blockId: string | null,
): (PropuestaMpsCalendarBlockDTO | PropuestaMpsUnscheduledBlockDTO) | null {
    if (!blockId) {
        return null;
    }

    for (const row of calendar.rows) {
        for (const cell of row.days) {
            const found = cell.blocks.find((block) => block.blockId === blockId);
            if (found) {
                return found;
            }
        }
    }

    return calendar.unscheduled.find((block) => block.blockId === blockId) ?? null;
}

export function moveBlockOnCalendar(
    calendar: PropuestaMpsSemanalCalendarDTO,
    blockId: string,
    target: MpsDropTarget | null,
): PropuestaMpsSemanalCalendarDTO {
    if (!target) {
        return calendar;
    }

    const nextCalendar = cloneCalendar(calendar);
    const extraction = extractBlock(nextCalendar, blockId);
    if (!extraction) {
        return calendar;
    }

    const { block, source } = extraction;

    if (target.type === "day") {
        if (block.categoriaId !== target.categoriaId) {
            return calendar;
        }
        if (source.type === "day" && source.dayIndex === target.dayIndex && source.categoriaId === target.categoriaId) {
            return calendar;
        }

        const row = nextCalendar.rows.find((item) => item.categoriaId === target.categoriaId);
        const cell = row?.days.find((item) => item.dayIndex === target.dayIndex);
        if (!row || !cell) {
            return calendar;
        }

        mergeBlockIntoCell(cell, stripReason(block));
        recalculateCalendar(nextCalendar);
        return nextCalendar;
    }

    if (source.type === "unscheduled") {
        mergeIntoUnscheduled(nextCalendar.unscheduled, block);
    } else {
        mergeIntoUnscheduled(nextCalendar.unscheduled, withReason(block, "Movido manualmente fuera del calendario"));
    }

    recalculateCalendar(nextCalendar);
    return nextCalendar;
}

function extractBlock(calendar: PropuestaMpsSemanalCalendarDTO, blockId: string): {
    block: PropuestaMpsCalendarBlockDTO | PropuestaMpsUnscheduledBlockDTO;
    source: { type: "day"; categoriaId: number | null; dayIndex: number } | { type: "unscheduled" };
} | null {
    for (const row of calendar.rows) {
        for (const cell of row.days) {
            const blockIndex = cell.blocks.findIndex((block) => block.blockId === blockId);
            if (blockIndex >= 0) {
                const [block] = cell.blocks.splice(blockIndex, 1);
                return {
                    block,
                    source: { type: "day", categoriaId: row.categoriaId, dayIndex: cell.dayIndex },
                };
            }
        }
    }

    const unscheduledIndex = calendar.unscheduled.findIndex((block) => block.blockId === blockId);
    if (unscheduledIndex >= 0) {
        const [block] = calendar.unscheduled.splice(unscheduledIndex, 1);
        return {
            block,
            source: { type: "unscheduled" },
        };
    }

    return null;
}

function stripReason(
    block: PropuestaMpsCalendarBlockDTO | PropuestaMpsUnscheduledBlockDTO,
): PropuestaMpsCalendarBlockDTO {
    return {
        blockId: block.blockId,
        productoId: block.productoId,
        productoNombre: block.productoNombre,
        categoriaId: block.categoriaId,
        categoriaNombre: block.categoriaNombre,
        loteSize: block.loteSize,
        lotesAsignados: block.lotesAsignados,
        cantidadAsignada: block.cantidadAsignada,
        warning: block.warning,
    };
}

function withReason(
    block: PropuestaMpsCalendarBlockDTO | PropuestaMpsUnscheduledBlockDTO,
    reason: string,
): PropuestaMpsUnscheduledBlockDTO {
    return {
        ...stripReason(block),
        reason,
    };
}

function mergeBlockIntoCell(cell: PropuestaMpsCalendarCellDTO, block: PropuestaMpsCalendarBlockDTO) {
    const existing = cell.blocks.find((item) => item.productoId === block.productoId);
    if (existing) {
        existing.lotesAsignados += block.lotesAsignados;
        existing.cantidadAsignada += block.cantidadAsignada;
        existing.warning = appendWarning(existing.warning, block.warning);
    } else {
        cell.blocks.push(block);
    }
}

function mergeIntoUnscheduled(
    unscheduled: PropuestaMpsUnscheduledBlockDTO[],
    block: PropuestaMpsUnscheduledBlockDTO | PropuestaMpsCalendarBlockDTO,
) {
    const normalized = "reason" in block ? block : withReason(block, "Movido manualmente fuera del calendario");
    const existing = unscheduled.find(
        (item) => item.productoId === normalized.productoId && item.reason === normalized.reason,
    );
    if (existing) {
        existing.lotesAsignados += normalized.lotesAsignados;
        existing.cantidadAsignada += normalized.cantidadAsignada;
        existing.warning = appendWarning(existing.warning, normalized.warning);
    } else {
        unscheduled.push(normalized);
    }
}

function recalculateCalendar(calendar: PropuestaMpsSemanalCalendarDTO) {
    calendar.rows.forEach((row) => {
        row.days.forEach((cell) => {
            cell.totalAsignado = cell.blocks.reduce((sum, block) => sum + block.cantidadAsignada, 0);
            cell.estado = resolveEstado(cell.totalAsignado, cell.capacidadDiaria);
        });
        row.totalAsignadoSemana = row.days.reduce((sum, cell) => sum + cell.totalAsignado, 0);
        row.estadoSemana = resolveEstado(row.totalAsignadoSemana, row.capacidadTeoricaSemana);
    });
}

function resolveEstado(total: number, capacidad: number): "disponible" | "al_limite" | "excedida" | "sin_configurar" {
    if (capacidad <= 0) {
        return "sin_configurar";
    }
    if (total > capacidad) {
        return "excedida";
    }
    if (total === capacidad) {
        return "al_limite";
    }
    return "disponible";
}

function appendWarning(current: string | null | undefined, next: string | null | undefined): string | null {
    if (!next?.trim()) {
        return current ?? null;
    }
    if (!current?.trim()) {
        return next;
    }
    return `${current} | ${next}`;
}
