import type { MuestraResponse } from "../types";
import { isFiniteNumber } from "../../../features/controles/charts/numericControlData";

export {
    buildDraftNumericControlGroup,
    isFiniteNumber,
    isOutsideSpecification,
    type NumericCharacteristicGroup,
    type NumericReading,
    type NumericSample,
} from "../../../features/controles/charts/numericControlData";

export function hasNumericControlSamples(muestras: MuestraResponse[]) {
    return muestras.some((muestra) =>
        muestra.tipo === "NUMERICA"
        && muestra.lecturas.some((lectura) => isFiniteNumber(lectura.valorNumerico)));
}
