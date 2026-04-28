export function getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function formatNumber(value?: number | null, digits: number = 2): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "—";
    }
    return Number(value).toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
    });
}

export function formatDateTime(value?: string | null): string {
    if (!value) {
        return "—";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString("es-CO");
}

export function formatTipoMaterial(tipoMaterial?: number | null): string {
    if (tipoMaterial === 1) return "Materia Prima";
    if (tipoMaterial === 2) return "Material de Empaque";
    return "No especificado";
}

export function isValidPuntoReorden(value: number | undefined): boolean {
    if (value === undefined) return false;
    return Number.isFinite(value) && (value === -1 || value >= 0);
}
