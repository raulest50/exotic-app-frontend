export function getTodayIsoDate() {
    return toLocalIsoDate(new Date());
}

export function getCurrentMonthStartIsoDate() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${today.getFullYear()}-${month}-01`;
}

function toLocalIsoDate(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

export function formatHours(value?: number) {
    return Number(value ?? 0).toLocaleString("es-CO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function formatInteger(value?: number) {
    return Number(value ?? 0).toLocaleString("es-CO", {
        maximumFractionDigits: 0,
    });
}
