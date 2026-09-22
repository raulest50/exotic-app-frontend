import { Stack } from "@chakra-ui/react";
import { useMemo } from "react";
import type { MuestraResponse } from "../types";
import NumericControlChart from "../../../features/controles/charts/NumericControlChart";
import {
    isFiniteNumber,
    isOutsideSpecification,
    type NumericCharacteristicGroup,
    type NumericReading,
    type NumericSample,
} from "./controlProcesoNumericData";

export { NumericControlChart as ControlProcesoNumericChart };

function buildNumericGroups(muestras: MuestraResponse[]): NumericCharacteristicGroup[] {
    const grouped = new Map<number, MuestraResponse[]>();
    for (const muestra of muestras) {
        if (muestra.tipo !== "NUMERICA") continue;
        grouped.set(muestra.caracteristicaId, [
            ...(grouped.get(muestra.caracteristicaId) ?? []),
            muestra,
        ]);
    }

    return Array.from(grouped.entries()).flatMap(([caracteristicaId, items]) => {
        const ordered = [...items].sort(
            (left, right) => left.numeroMuestra - right.numeroMuestra,
        );
        const first = ordered[0];
        if (!first) return [];

        const muestrasNumericas = ordered.flatMap((muestra): NumericSample[] => {
            const lecturas = muestra.lecturas.flatMap((lectura): NumericReading[] => {
                const valor = lectura.valorNumerico;
                if (!isFiniteNumber(valor)) return [];
                return [{
                    indiceUnidad: lectura.indiceUnidad,
                    valor,
                    fueraEspecificacion: isOutsideSpecification(
                        valor,
                        muestra.limiteInferior,
                        muestra.limiteSuperior,
                    ),
                }];
            });
            if (lecturas.length === 0) return [];
            const promedio = lecturas.reduce(
                (total, lectura) => total + lectura.valor,
                0,
            ) / lecturas.length;
            return [{
                numeroMuestra: muestra.numeroMuestra,
                lecturas,
                promedio,
                promedioFueraEspecificacion: isOutsideSpecification(
                    promedio,
                    muestra.limiteInferior,
                    muestra.limiteSuperior,
                ),
            }];
        });
        if (muestrasNumericas.length === 0) return [];

        return [{
            key: String(caracteristicaId),
            nombre: first.caracteristicaNombre,
            unidad: first.unidad,
            limiteInferior: first.limiteInferior,
            limiteSuperior: first.limiteSuperior,
            muestras: muestrasNumericas,
        }];
    });
}

export default function ControlProcesoNumericCharts({
    muestras,
}: {
    muestras: MuestraResponse[];
}) {
    const groups = useMemo(() => buildNumericGroups(muestras), [muestras]);

    if (groups.length === 0) return null;

    return (
        <Stack gap={4}>
            {groups.map((group) => (
                <NumericControlChart key={group.key} group={group} />
            ))}
        </Stack>
    );
}
