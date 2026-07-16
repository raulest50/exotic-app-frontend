import type {
    ConsolidadoProductoProduccion,
    EdicionReporteProduccion,
    ReporteProduccionPendiente,
} from "./types";

export function consolidarProductos(
    reportes: ReporteProduccionPendiente[],
    ediciones?: Record<number, EdicionReporteProduccion>,
): ConsolidadoProductoProduccion[] {
    const byProduct = new Map<string, ConsolidadoProductoProduccion>();
    reportes.forEach((reporte) => {
        const current = byProduct.get(reporte.productoId) ?? {
            productoId: reporte.productoId,
            productoNombre: reporte.productoNombre,
            tipoUnidades: reporte.tipoUnidades,
            cantidadReportada: 0,
            cantidadConfirmada: 0,
            lotes: 0,
        };
        current.cantidadReportada += reporte.cantidadReportada;
        current.cantidadConfirmada += ediciones?.[reporte.reporteId]?.cantidadConfirmada
            ?? reporte.cantidadReportada;
        current.lotes += 1;
        byProduct.set(reporte.productoId, current);
    });
    return Array.from(byProduct.values()).sort((a, b) =>
        a.productoNombre.localeCompare(b.productoNombre, "es"));
}

export function formatCantidad(value: number): string {
    return value.toLocaleString("es-CO", { maximumFractionDigits: 4 });
}

export function sameCantidad(left: number, right: number): boolean {
    return Math.abs(left - right) < 0.00005;
}
