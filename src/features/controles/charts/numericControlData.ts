interface NumericDraftCharacteristic {
    id: number;
    nombre: string;
    tipo: "NUMERICA" | "BOOLEANA";
    unidad?: string | null;
    limiteInferior?: number | null;
    limiteSuperior?: number | null;
    cantidadMuestras: number;
    unidadesPorMuestra: number;
}

export interface NumericReading {
    indiceUnidad: number;
    valor: number;
    fueraEspecificacion: boolean;
}

export interface NumericSample {
    numeroMuestra: number;
    lecturas: NumericReading[];
    promedio: number;
    promedioFueraEspecificacion: boolean;
}

export interface NumericCharacteristicGroup {
    key: string;
    nombre: string;
    unidad?: string | null;
    limiteInferior?: number | null;
    limiteSuperior?: number | null;
    muestras: NumericSample[];
}

export function isFiniteNumber(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export function isOutsideSpecification(
    value: number,
    lower?: number | null,
    upper?: number | null,
) {
    return (isFiniteNumber(lower) && value < lower)
        || (isFiniteNumber(upper) && value > upper);
}

export function buildDraftNumericControlGroup(
    caracteristica: NumericDraftCharacteristic,
    getValue: (numeroMuestra: number, indiceUnidad: number) => string | undefined,
): NumericCharacteristicGroup {
    const muestras: NumericSample[] = [];

    if (caracteristica.tipo === "NUMERICA" && caracteristica.unidadesPorMuestra > 0) {
        for (let numeroMuestra = 1; numeroMuestra <= caracteristica.cantidadMuestras; numeroMuestra += 1) {
            const lecturas: NumericReading[] = [];
            for (let indiceUnidad = 1; indiceUnidad <= caracteristica.unidadesPorMuestra; indiceUnidad += 1) {
                const rawValue = getValue(numeroMuestra, indiceUnidad)?.trim() ?? "";
                const valor = Number(rawValue);
                if (rawValue === "" || !Number.isFinite(valor)) {
                    lecturas.length = 0;
                    break;
                }
                lecturas.push({
                    indiceUnidad,
                    valor,
                    fueraEspecificacion: isOutsideSpecification(
                        valor,
                        caracteristica.limiteInferior,
                        caracteristica.limiteSuperior,
                    ),
                });
            }
            if (lecturas.length !== caracteristica.unidadesPorMuestra) continue;
            const promedio = lecturas.reduce((total, lectura) => total + lectura.valor, 0) / lecturas.length;
            muestras.push({
                numeroMuestra,
                lecturas,
                promedio,
                promedioFueraEspecificacion: isOutsideSpecification(
                    promedio,
                    caracteristica.limiteInferior,
                    caracteristica.limiteSuperior,
                ),
            });
        }
    }

    return {
        key: String(caracteristica.id),
        nombre: caracteristica.nombre,
        unidad: caracteristica.unidad,
        limiteInferior: caracteristica.limiteInferior,
        limiteSuperior: caracteristica.limiteSuperior,
        muestras,
    };
}

