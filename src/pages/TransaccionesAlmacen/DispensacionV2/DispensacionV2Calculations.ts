import type {
    DispensacionV2MaterialDTO,
    DispensacionV2PreparacionResponseDTO,
    DispensacionV2TotalMaterialDTO,
} from "./DispensacionV2Types";

const TOLERANCE = 0.01;

function buildMaterialWarning(material: DispensacionV2MaterialDTO, excedeReceta: boolean): string | null {
    const warnings: string[] = [];
    if (!material.inventareable) {
        warnings.push("Material no inventariable; no requiere salida de lote.");
    }
    if (excedeReceta) {
        warnings.push("La suma de historico y dispensacion actual excede la receta.");
    }
    if (material.warning?.includes("Stock insuficiente")) {
        warnings.push(material.warning.match(/Stock insuficiente[^.]*\./)?.[0] ?? "Stock insuficiente.");
    }
    return warnings.length > 0 ? warnings.join(" ") : null;
}

export function getCantidadActualEfectiva(material: DispensacionV2MaterialDTO): number {
    return material.checked && material.inventareable ? material.cantidadADispensar : 0;
}

export function recalcularDispensacionV2(
    response: DispensacionV2PreparacionResponseDTO,
): DispensacionV2PreparacionResponseDTO {
    const ordenes = response.ordenes.map((orden) => {
        const materiales = orden.materiales.map((material) => {
            const cantidadActual = getCantidadActualEfectiva(material);
            const totalConHistorico = material.cantidadHistorica + cantidadActual;
            const excedeReceta = totalConHistorico - material.cantidadReceta > TOLERANCE;
            return {
                ...material,
                totalConHistorico,
                excedeReceta,
                warning: buildMaterialWarning(material, excedeReceta),
            };
        });
        const warnings = materiales
            .filter((material) => material.warning)
            .map((material) => `${material.productoNombre}: ${material.warning}`);
        return { ...orden, materiales, warnings };
    });

    const totalsMap = new Map<string, DispensacionV2TotalMaterialDTO>();
    ordenes.forEach((orden) => {
        orden.materiales.forEach((material) => {
            const previous = totalsMap.get(material.productoId);
            const cantidadActual = getCantidadActualEfectiva(material);
            if (!previous) {
                totalsMap.set(material.productoId, {
                    productoId: material.productoId,
                    productoNombre: material.productoNombre,
                    tipoUnidades: material.tipoUnidades,
                    cantidadRecetaTotal: material.cantidadReceta,
                    cantidadADispensarTotal: cantidadActual,
                    cantidadHistoricaTotal: material.cantidadHistorica,
                    totalConHistorico: material.cantidadHistorica + cantidadActual,
                    excedeReceta: false,
                    warning: null,
                });
                return;
            }

            previous.cantidadRecetaTotal += material.cantidadReceta;
            previous.cantidadADispensarTotal += cantidadActual;
            previous.cantidadHistoricaTotal += material.cantidadHistorica;
            previous.totalConHistorico = previous.cantidadHistoricaTotal + previous.cantidadADispensarTotal;
        });
    });

    const totalesMateriales = Array.from(totalsMap.values()).map((total) => {
        const excedeReceta = total.totalConHistorico - total.cantidadRecetaTotal > TOLERANCE;
        return {
            ...total,
            excedeReceta,
            warning: excedeReceta
                ? "La suma global de historico y dispensacion actual excede la receta."
                : null,
        };
    });

    return {
        ...response,
        ordenes,
        totalesMateriales,
        warnings: ordenes.flatMap((orden) =>
            orden.warnings.map((warning) => `OP ${orden.ordenProduccionId} - ${warning}`),
        ),
    };
}
