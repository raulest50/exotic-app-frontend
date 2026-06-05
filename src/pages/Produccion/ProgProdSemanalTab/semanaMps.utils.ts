import type { SemanaMPSDTO } from "../ProgProdMensualTab/PlaneacionProduccionService";

export function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function getCurrentDateString(): string {
    return formatLocalDate(new Date());
}

export function getIsoWeekYear(dateString: string): number {
    const parsed = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().getFullYear();
    }

    const day = parsed.getDay();
    const isoDay = day === 0 ? 7 : day;
    const thursday = new Date(parsed);
    thursday.setDate(parsed.getDate() + (4 - isoDay));
    return thursday.getFullYear();
}

export function getIsoWeekNumber(dateString: string): number {
    const parsed = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return 0;
    }

    const day = parsed.getDay();
    const isoDay = day === 0 ? 7 : day;
    const thursday = new Date(parsed);
    thursday.setDate(parsed.getDate() + (4 - isoDay));

    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const diffDays = Math.floor((thursday.getTime() - yearStart.getTime()) / 86400000) + 1;
    return Math.ceil(diffDays / 7);
}

export function buildSemanaMpsCodigo(dateString: string): string {
    const weekNumber = getIsoWeekNumber(dateString);
    const weekYear = getIsoWeekYear(dateString);
    if (!weekNumber) {
        return dateString;
    }
    return `S${String(weekNumber).padStart(2, "0")}-${weekYear}`;
}

export function getCurrentIsoWeekMonday(): string {
    const today = new Date();
    const currentDay = today.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    return formatLocalDate(monday);
}

export function addLocalDays(dateString: string, days: number): string {
    const parsed = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return dateString;
    }
    parsed.setDate(parsed.getDate() + days);
    return formatLocalDate(parsed);
}

export function formatSemanaMpsDisplayDate(value: string): string {
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

export function sortSemanasByStartDate(semanas: SemanaMPSDTO[]): SemanaMPSDTO[] {
    return [...semanas].sort((left, right) => left.startDate.localeCompare(right.startDate));
}
