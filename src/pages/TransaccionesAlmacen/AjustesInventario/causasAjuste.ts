export type CausaAjusteInventario =
    | "PRODUCCION_CONTINGENCIA"
    | "DIFERENCIA_CONTEO"
    | "MERMA_DANO_PERDIDA"
    | "CORRECCION_REGISTRO"
    | "OTRA_REGULARIZACION";

export interface CausaAjusteOption {
    value: CausaAjusteInventario;
    label: string;
    description: string;
    onlyNegative: boolean;
    requiresObservations: boolean;
}

export const CAUSAS_AJUSTE: CausaAjusteOption[] = [
    {
        value: "PRODUCCION_CONTINGENCIA",
        label: "Salida de producción por contingencia",
        description:
            "Salida excepcional usada en producción sin dispensación formal. Solo admite cantidades negativas y puede incluirse en el escenario ampliado de cobertura.",
        onlyNegative: true,
        requiresObservations: true,
    },
    {
        value: "DIFERENCIA_CONTEO",
        label: "Diferencia de conteo físico",
        description:
            "Corrige la diferencia entre el conteo físico y el saldo del sistema. No representa consumo.",
        onlyNegative: false,
        requiresObservations: false,
    },
    {
        value: "MERMA_DANO_PERDIDA",
        label: "Merma, daño o pérdida",
        description:
            "Disminuye el stock por deterioro, pérdida o merma. No representa consumo productivo.",
        onlyNegative: true,
        requiresObservations: false,
    },
    {
        value: "CORRECCION_REGISTRO",
        label: "Corrección de registro",
        description:
            "Corrige un movimiento previo equivocado o duplicado. No representa consumo.",
        onlyNegative: false,
        requiresObservations: false,
    },
    {
        value: "OTRA_REGULARIZACION",
        label: "Otra regularización excepcional",
        description:
            "Caso no cubierto por las opciones anteriores. Exige una explicación en Observaciones y no representa consumo.",
        onlyNegative: false,
        requiresObservations: true,
    },
];

export function getCausaAjuste(
    value?: CausaAjusteInventario | null,
): CausaAjusteOption | undefined {
    return CAUSAS_AJUSTE.find((option) => option.value === value);
}

export function causaAjusteLabel(value?: CausaAjusteInventario | null): string {
    return getCausaAjuste(value)?.label ?? "Sin clasificar";
}
