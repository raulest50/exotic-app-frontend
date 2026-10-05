import { Field, NativeSelect, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { useId } from "react";
import {
    ALCANCE_MPS_LABELS, VISIBILIDAD_MPS_LABELS,
    type AlcanceMps, type VisibilidadMps,
} from "../../../api/mpsAreaConfig";

interface Props {
    visibilidad: VisibilidadMps;
    alcance: AlcanceMps;
    readOnly?: boolean;
    disabled?: boolean;
    onVisibilidadChange?: (value: VisibilidadMps) => void;
    onAlcanceChange?: (value: AlcanceMps) => void;
}

export default function AreaMpsSettings({ visibilidad, alcance, readOnly, disabled, onVisibilidadChange, onAlcanceChange }: Props) {
    const id = useId();
    return (
        <VStack align="stretch" gap={3}>
            <Text fontWeight="semibold">Consulta de MPS</Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Field.Root disabled={disabled}>
                    <Field.Label htmlFor={`${id}-visibilidad`}>MPS visibles</Field.Label>
                    {readOnly ? <Text>{VISIBILIDAD_MPS_LABELS[visibilidad]}</Text> : (
                        <NativeSelect.Root>
                            <NativeSelect.Field id={`${id}-visibilidad`} value={visibilidad}
                                onChange={e => onVisibilidadChange?.(e.target.value as VisibilidadMps)}>
                                {Object.entries(VISIBILIDAD_MPS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    )}
                </Field.Root>
                <Field.Root disabled={disabled}>
                    <Field.Label htmlFor={`${id}-alcance`}>Productos visibles</Field.Label>
                    {readOnly ? <Text>{ALCANCE_MPS_LABELS[alcance]}</Text> : (
                        <NativeSelect.Root>
                            <NativeSelect.Field id={`${id}-alcance`} value={alcance}
                                onChange={e => onAlcanceChange?.(e.target.value as AlcanceMps)}>
                                {Object.entries(ALCANCE_MPS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    )}
                </Field.Root>
            </SimpleGrid>
            <Text fontSize="sm" color="app.textSubtle">Define la planificación que consulta el área. Las tareas asignadas y los permisos para ejecutarlas se conservan.</Text>
        </VStack>
    );
}
