import { buildDraftNumericControlGroup } from "./charts/numericControlData";
import type { CaracteristicaPlanControl, ControlRequerido, MuestraControlWrite } from "./types";

export interface ControlRegistrationFormProps {
    requirement: ControlRequerido;
    onSaved: () => void;
    onCancel: () => void;
    onBack?: () => void;
}

export type MeasurementValues = Record<string, string>;

export const measurementKey = (characteristicId: number, sample: number, unit: number) =>
    `${characteristicId}:${sample}:${unit}`;

export class ControlMeasurementValidationError extends Error {
    readonly issues: string[];

    constructor(issues: string[]) {
        super(issues.join("\n"));
        this.issues = issues;
    }
}

export function normalizeControlReading(raw: string, characteristic: CaracteristicaPlanControl): string {
    const normalized = raw.trim().replace(",", ".");
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
        throw new Error("Ingrese un decimal válido.");
    }
    const unsigned = normalized.startsWith("-") ? normalized.slice(1) : normalized;
    const [integer, fraction = ""] = unsigned.split(".");
    if (integer.length > 12 || fraction.length > characteristic.escala) {
        throw new Error(`Máximo 12 dígitos enteros y ${characteristic.escala} decimales.`);
    }
    // Keep decimal strings in the request; Number is only used for chart previews.
    return normalized;
}

export function buildControlSamples(
    characteristics: CaracteristicaPlanControl[],
    values: MeasurementValues,
): MuestraControlWrite[] {
    const issues: string[] = [];
    const samples: MuestraControlWrite[] = [];
    if (!characteristics.length) issues.push("El plan asignado no contiene mediciones.");
    for (const characteristic of characteristics) {
        if (characteristic.id == null) {
            issues.push(`${characteristic.nombre}: falta el identificador de la medición en el plan asignado.`);
            continue;
        }
        if (!Number.isInteger(characteristic.cantidadMuestras) || characteristic.cantidadMuestras < 1
            || !Number.isInteger(characteristic.unidadesPorMuestra) || characteristic.unidadesPorMuestra < 1) {
            issues.push(`${characteristic.nombre}: la cantidad de muestras y unidades del plan no es válida.`);
            continue;
        }
        for (let sample = 1; sample <= characteristic.cantidadMuestras; sample++) {
            const readings: MuestraControlWrite["lecturas"] = [];
            for (let unit = 1; unit <= characteristic.unidadesPorMuestra; unit++) {
                const raw = values[measurementKey(characteristic.id, sample, unit)] ?? "";
                const label = `${characteristic.nombre}, muestra ${sample}, unidad ${unit}`;
                let numeric: string | null = null;
                let boolean: boolean | null = null;
                if (!raw.trim()) {
                    issues.push(`${label}: complete la lectura.`);
                } else if (characteristic.tipo === "NUMERICA") {
                    try {
                        numeric = normalizeControlReading(raw, characteristic);
                    } catch (error) {
                        issues.push(`${label}: ${error instanceof Error ? error.message : "Valor inválido."}`);
                    }
                } else if (raw === "true" || raw === "false") {
                    boolean = raw === "true";
                } else {
                    issues.push(`${label}: seleccione Sí o No.`);
                }
                readings.push({ indiceUnidad: unit, valorNumerico: numeric, valorBooleano: boolean });
            }
            samples.push({ caracteristicaId: characteristic.id, numeroMuestra: sample, lecturas: readings });
        }
    }
    if (issues.length) throw new ControlMeasurementValidationError(issues);
    return samples;
}

export function buildControlMeasurementPreview(characteristic: CaracteristicaPlanControl, values: MeasurementValues) {
    return buildDraftNumericControlGroup({
        id: characteristic.id ?? 0,
        nombre: characteristic.nombre,
        tipo: characteristic.tipo,
        unidad: characteristic.unidadSimbolo ?? characteristic.unidadCodigo,
        limiteInferior: characteristic.limiteInferior == null ? null : Number(characteristic.limiteInferior),
        limiteSuperior: characteristic.limiteSuperior == null ? null : Number(characteristic.limiteSuperior),
        cantidadMuestras: characteristic.cantidadMuestras,
        unidadesPorMuestra: characteristic.unidadesPorMuestra,
    }, (sample, unit) => {
        if (characteristic.id == null) return undefined;
        try {
            return normalizeControlReading(values[measurementKey(characteristic.id, sample, unit)] ?? "", characteristic);
        } catch {
            return undefined;
        }
    });
}
