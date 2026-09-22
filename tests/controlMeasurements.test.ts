import { expect, test } from "bun:test";
import {
    buildControlMeasurementPreview,
    buildControlSamples,
    ControlMeasurementValidationError,
    type MeasurementValues,
} from "../src/features/controles/controlMeasurements";
import type { CaracteristicaPlanControl } from "../src/features/controles/types";

const weight: CaracteristicaPlanControl = {
    id: 13, nombre: "Peso", tipo: "NUMERICA", escala: 2, unidadSimbolo: "g",
    limiteInferior: "9", limiteSuperior: "11", cantidadMuestras: 2, unidadesPorMuestra: 2, orden: 1,
};
const readings: MeasurementValues = { "13:1:1": "9,25", "13:1:2": "10.75", "13:2:1": "11", "13:2:2": "12" };

test("envía todas las muestras y unidades del plan con IDs y decimales exactos", () => {
    const samples = buildControlSamples([weight], readings);
    expect(samples).toEqual([
        { caracteristicaId: 13, numeroMuestra: 1, lecturas: [
            { indiceUnidad: 1, valorNumerico: "9.25", valorBooleano: null },
            { indiceUnidad: 2, valorNumerico: "10.75", valorBooleano: null },
        ] },
        { caracteristicaId: 13, numeroMuestra: 2, lecturas: [
            { indiceUnidad: 1, valorNumerico: "11", valorBooleano: null },
            { indiceUnidad: 2, valorNumerico: "12", valorBooleano: null },
        ] },
    ]);
    expect(readings["13:1:1"]).toBe("9,25");
    const precise = { ...weight, cantidadMuestras: 1, unidadesPorMuestra: 1, escala: 8 };
    expect(buildControlSamples([precise], { "13:1:1": "999999999999.12345678" })[0].lecturas[0].valorNumerico)
        .toBe("999999999999.12345678");
});

test("false y cero son lecturas completas; una selección vacía no equivale a false", () => {
    const inspection: CaracteristicaPlanControl = {
        ...weight, id: 14, nombre: "Inspección visual", tipo: "BOOLEANA", valorBooleanoEsperado: false,
        cantidadMuestras: 1, unidadesPorMuestra: 1,
    };
    expect(buildControlSamples([inspection], { "14:1:1": "false" })[0].lecturas[0])
        .toEqual({ indiceUnidad: 1, valorBooleano: false, valorNumerico: null });
    expect(() => buildControlSamples([inspection], {})).toThrow(ControlMeasurementValidationError);
    expect(() => buildControlSamples([inspection], { "14:1:1": "incorrecto" })).toThrow("seleccione Sí o No");
    expect(buildControlSamples([{ ...weight, cantidadMuestras: 1, unidadesPorMuestra: 1 }], { "13:1:1": "0" })[0].lecturas[0].valorNumerico).toBe("0");
});

test("el guardado rechaza vacíos, formatos inválidos y exceso de precisión e identifica cada celda", () => {
    for (const invalid of ["", " ", "1e2", "Infinity", "10,2,3", "9.251", "1000000000000"]) {
        expect(() => buildControlSamples([weight], { ...readings, "13:2:2": invalid }))
            .toThrow("Peso, muestra 2, unidad 2");
    }
    expect(() => buildControlSamples([{ ...weight, id: undefined }], readings)).toThrow("identificador");
    expect(() => buildControlSamples([], {})).toThrow("no contiene mediciones");
});

test("la curva muestra promedios, lecturas y límites inclusivos de las muestras completas", () => {
    const preview = buildControlMeasurementPreview(weight, readings);
    expect(preview.unidad).toBe("g");
    expect(preview.muestras.map((sample) => sample.promedio)).toEqual([10, 11.5]);
    expect(preview.muestras[1].lecturas.map((reading) => reading.fueraEspecificacion)).toEqual([false, true]);
    expect(preview.muestras[1].promedioFueraEspecificacion).toBe(true);
    const partial = buildControlMeasurementPreview(weight, { ...readings, "13:1:2": "" });
    expect(partial.muestras.map((sample) => sample.numeroMuestra)).toEqual([2]);
    const invalid = buildControlMeasurementPreview(weight, { ...readings, "13:2:2": "12.123" });
    expect(invalid.muestras.map((sample) => sample.numeroMuestra)).toEqual([1]);
    expect(buildControlMeasurementPreview(weight, {}).muestras).toEqual([]);
});

test("un promedio conforme no oculta las lecturas individuales fuera de especificación", () => {
    const preview = buildControlMeasurementPreview(weight, { "13:1:1": "8", "13:1:2": "12" });
    expect(preview.muestras[0].promedio).toBe(10);
    expect(preview.muestras[0].promedioFueraEspecificacion).toBe(false);
    expect(preview.muestras[0].lecturas.every((reading) => reading.fueraEspecificacion)).toBe(true);
});
