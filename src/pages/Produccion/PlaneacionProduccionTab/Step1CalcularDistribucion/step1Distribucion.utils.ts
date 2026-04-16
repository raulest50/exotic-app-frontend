import type { TerminadoConVentas } from "../PlaneacionProduccionService";

export type PresetColumnas = "decision" | "analisis";

export type ColumnKey =
    | "index"
    | "codigo"
    | "descripcion"
    | "categoria"
    | "cantidadVendida"
    | "valorTotal"
    | "porcentajeParticipacion"
    | "porcentajeAcumulado"
    | "stockActual"
    | "necesidad";

export type ColumnVisibility = Record<ColumnKey, boolean>;

export interface ColumnDefinition {
    key: ColumnKey;
    label: string;
    isNumeric?: boolean;
    isLocked?: boolean;
}

export interface ResumenCapacidadCategoriaRow {
    categoriaId: number | null;
    categoriaNombre: string;
    capacidadDiaria: number;
    totalAsignado: number;
    porcentajeUso: number | null;
    estado: "disponible" | "al_limite" | "excedida" | "sin_configurar" | "sin_categoria";
}

export const COLUMN_DEFINITIONS: ColumnDefinition[] = [
    { key: "index", label: "#" },
    { key: "codigo", label: "Codigo", isLocked: true },
    { key: "descripcion", label: "Descripcion", isLocked: true },
    { key: "categoria", label: "Categoria" },
    { key: "cantidadVendida", label: "Cantidad Vendida", isNumeric: true },
    { key: "valorTotal", label: "Valor Total", isNumeric: true },
    { key: "porcentajeParticipacion", label: "% Participacion", isNumeric: true },
    { key: "porcentajeAcumulado", label: "% Acumulado", isNumeric: true },
    { key: "stockActual", label: "Stock Actual", isNumeric: true },
    { key: "necesidad", label: "Necesidad", isNumeric: true },
];

export function buildVisibilityFromPreset(preset: PresetColumnas): ColumnVisibility {
    const visibleKeys =
        preset === "decision"
            ? new Set<ColumnKey>([
                "codigo",
                "descripcion",
                "categoria",
                "stockActual",
                "porcentajeParticipacion",
                "porcentajeAcumulado",
                "necesidad",
            ])
            : new Set<ColumnKey>([
                "index",
                "codigo",
                "descripcion",
                "categoria",
                "cantidadVendida",
                "valorTotal",
                "porcentajeParticipacion",
                "porcentajeAcumulado",
                "stockActual",
                "necesidad",
            ]);

    return COLUMN_DEFINITIONS.reduce((acc, column) => {
        acc[column.key] = visibleKeys.has(column.key);
        return acc;
    }, {} as ColumnVisibility);
}

export function formatCantidad(value: number): string {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

export function formatMoneda(value: number): string {
    return `$${formatCantidad(value)}`;
}

export function buildResumenCapacidadPorCategoria(
    distribucion: TerminadoConVentas[],
    necesidades: Record<string, number>,
): ResumenCapacidadCategoriaRow[] {
    const resumenMap = new Map<string, ResumenCapacidadCategoriaRow>();

    distribucion.forEach((fila) => {
        const categoria = fila.terminado.categoria;
        const categoriaId = categoria?.categoriaId ?? null;
        const categoriaNombre = categoria?.categoriaNombre?.trim() || "Sin categoria";
        const capacidadDiaria = categoria?.capacidadProductivaDiaria ?? 0;
        const mapKey = categoriaId !== null ? String(categoriaId) : "sin-categoria";
        const necesidad = Math.max(0, necesidades[fila.terminado.productoId] ?? 0);

        if (!resumenMap.has(mapKey)) {
            resumenMap.set(mapKey, {
                categoriaId,
                categoriaNombre,
                capacidadDiaria,
                totalAsignado: 0,
                porcentajeUso: capacidadDiaria > 0 ? 0 : null,
                estado: categoriaId === null ? "sin_categoria" : capacidadDiaria > 0 ? "disponible" : "sin_configurar",
            });
        }

        const actual = resumenMap.get(mapKey)!;
        actual.totalAsignado += necesidad;
    });

    return Array.from(resumenMap.values()).map((row) => {
        if (row.estado === "sin_categoria") {
            return row;
        }

        if (row.capacidadDiaria <= 0) {
            return {
                ...row,
                porcentajeUso: null,
                estado: "sin_configurar",
            };
        }

        const porcentajeUso = (row.totalAsignado / row.capacidadDiaria) * 100;
        const estado =
            row.totalAsignado > row.capacidadDiaria
                ? "excedida"
                : row.totalAsignado === row.capacidadDiaria
                    ? "al_limite"
                    : "disponible";

        return {
            ...row,
            porcentajeUso,
            estado,
        };
    });
}
