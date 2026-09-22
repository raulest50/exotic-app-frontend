export function formatOcmDate(value?: string | null): string {
    if (!value) return "No registrada";
    // Backend LocalDateTime values belong to the application's America/Bogota clock.
    const zoned = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}-05:00`;
    const date = new Date(zoned);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-CO", { timeZone: "America/Bogota" });
}

export function parseOcmDays(value: string): number | null {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const days = Number(trimmed);
    return Number.isInteger(days) && days >= 1 && days <= 2147483647 ? days : null;
}
