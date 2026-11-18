export interface CatalogoProducto {
    productoId: string;
    nombre: string;
    tipoProducto: "T" | "S";
    tipoUnidades: string | null;
    fotoUrl: string | null;
    categoriaNombre: string | null;
    status: number | null;
}

export interface FormulacionInsumo {
    insumoId: number;
    productoId: string | null;
    nombre: string | null;
    tipoProducto: "T" | "S" | "M" | null;
    tipoUnidades: string | null;
    /** Coeficiente de receta por una unidad de salida del padre inmediato. */
    cantidadPorUnidad: number | null;
    requiereOrdenFabricacion: boolean;
    subInsumos: FormulacionInsumo[];
    observacion: string | null;
}

export interface CatalogoFormulacion {
    producto: CatalogoProducto;
    insumos: FormulacionInsumo[];
    advertencias: string[];
    recetaHistorica: boolean;
    cantidadSalidaReceta: number | null;
}

export interface FormulacionFila {
    key: string;
    parentKeys: string[];
    depth: number;
    insumo: FormulacionInsumo;
    cantidadBase: number | null;
    cantidadSimulada: number | null;
    expandable: boolean;
    observacion: string | null;
}

export function parseCantidadSimulada(value: string): number | null {
    const trimmed = value.trim();
    if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null;
    const cantidad = Number(trimmed.replace(",", "."));
    return Number.isFinite(cantidad) && cantidad > 0 ? cantidad : null;
}

function multiplicarCantidad(left: number | null, right: number | null): number | null {
    if (left === null || right === null || !Number.isFinite(left) || !Number.isFinite(right)
        || left <= 0 || right <= 0) return null;
    const result = left * right;
    return Number.isFinite(result) && result > 0 ? result : null;
}

/** Expande la receta por ruta; no suma padres e hijos ni aplica reglas de stock. */
export function calcularFilasFormulacion(insumos: FormulacionInsumo[], cantidad: number | null): FormulacionFila[] {
    const rows: FormulacionFila[] = [];
    function visit(nodes: FormulacionInsumo[], factor: number | null, parentKeys: string[], ancestors: string[]) {
        nodes.forEach((insumo, index) => {
            const key = `${parentKeys[parentKeys.length - 1] ?? "raiz"}/${index}:${insumo.insumoId}`;
            const repeated = insumo.productoId !== null && ancestors.includes(insumo.productoId);
            const truncated = parentKeys.length >= 50;
            const cantidadBase = multiplicarCantidad(factor, insumo.cantidadPorUnidad);
            const blocked = repeated || truncated;
            rows.push({
                key, parentKeys, depth: parentKeys.length, insumo,
                cantidadBase,
                cantidadSimulada: multiplicarCantidad(cantidadBase, cantidad),
                expandable: !blocked && insumo.subInsumos.length > 0,
                observacion: repeated ? "Referencia circular: no se puede completar el desglose."
                    : truncated ? "El desglose supera el límite de profundidad de visualización."
                        : insumo.observacion,
            });
            if (!blocked) visit(insumo.subInsumos, cantidadBase, [...parentKeys, key], insumo.productoId === null ? ancestors : [...ancestors, insumo.productoId]);
        });
    }
    visit(insumos, 1, [], []);
    return rows;
}

const formatter = new Intl.NumberFormat("es-CO", { maximumSignificantDigits: 12 });

export function formatCantidadFormulacion(value: number | null): string {
    if (value === null || !Number.isFinite(value) || value <= 0) return "No disponible";
    // Evita representar como cero un consumo positivo menor que la precisión decimal habitual.
    return value < 0.000001 ? value.toExponential(5).replace(".", ",") : formatter.format(value);
}

export function unidadFormulacion(value: string | null): string {
    return value?.trim() || "unidad no registrada";
}
