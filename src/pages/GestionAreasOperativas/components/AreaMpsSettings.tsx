import { Box, Field, NativeSelect, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { useId } from "react";
import {
    ALCANCE_EJECUCION_LABELS, ALCANCE_MPS_LABELS, VISIBILIDAD_MPS_LABELS,
    type AlcanceEjecucion, type AlcanceMps, type VisibilidadMps,
} from "../../../api/mpsAreaConfig";

interface Props {
    visibilidad: VisibilidadMps;
    alcance: AlcanceMps;
    alcanceEjecucion: AlcanceEjecucion;
    readOnly?: boolean;
    disabled?: boolean;
    onVisibilidadChange?: (value: VisibilidadMps) => void;
    onAlcanceChange?: (value: AlcanceMps) => void;
    onAlcanceEjecucionChange?: (value: AlcanceEjecucion) => void;
}

export default function AreaMpsSettings({ visibilidad, alcance, alcanceEjecucion, readOnly, disabled, onVisibilidadChange, onAlcanceChange, onAlcanceEjecucionChange }: Props) {
    const id = useId();
    return (
        <VStack align="stretch" gap={5}>
            <Box>
                <Text fontWeight="semibold" mb={3}>Ejecución de órdenes</Text>
                <Field.Root disabled={disabled}>
                    <Field.Label htmlFor={`${id}-ejecucion`}>Órdenes que ejecuta el área</Field.Label>
                    {readOnly ? <Text>{ALCANCE_EJECUCION_LABELS[alcanceEjecucion]}</Text> : (
                        <NativeSelect.Root>
                            <NativeSelect.Field id={`${id}-ejecucion`} value={alcanceEjecucion}
                                onChange={e => onAlcanceEjecucionChange?.(e.target.value as AlcanceEjecucion)}>
                                {Object.entries(ALCANCE_EJECUCION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    )}
                    <Field.HelperText>Aplica a nuevas órdenes. Las órdenes existentes conservan su flujo. Es independiente de los MPS que consulta el área.</Field.HelperText>
                </Field.Root>
            </Box>
            <VStack align="stretch" gap={3} borderTopWidth="1px" borderColor="app.border" pt={4}>
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
        </VStack>
    );
}
