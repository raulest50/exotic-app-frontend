import { Badge, Box, Field, HStack, Input, NativeSelect, Table, Text, VStack } from "@chakra-ui/react";

import NumericControlChart from "./charts/NumericControlChart";
import { buildControlMeasurementPreview, measurementKey, type MeasurementValues } from "./controlMeasurements";
import { formatDecimalScale } from "./controlUi";
import type { CaracteristicaPlanControl } from "./types";

interface ControlMeasurementFieldsProps {
    characteristics: CaracteristicaPlanControl[];
    values: MeasurementValues;
    onChange: (key: string, value: string) => void;
    disabled: boolean;
}

const range = (length: number) => Array.from({ length }, (_, index) => index + 1);

function acceptanceText(characteristic: CaracteristicaPlanControl) {
    if (characteristic.tipo === "BOOLEANA") {
        return `Esperado: ${characteristic.valorBooleanoEsperado ? "Sí / verdadero" : "No / falso"}`;
    }
    const unit = characteristic.unidadSimbolo ?? characteristic.unidadCodigo ?? "";
    const lower = characteristic.limiteInferior == null ? "−∞" : formatDecimalScale(characteristic.limiteInferior, characteristic.escala);
    const upper = characteristic.limiteSuperior == null ? "+∞" : formatDecimalScale(characteristic.limiteSuperior, characteristic.escala);
    const target = characteristic.objetivo == null ? "" : ` · Objetivo: ${formatDecimalScale(characteristic.objetivo, characteristic.escala)} ${unit}`;
    return `Aceptación inclusiva: ${lower} a ${upper} ${unit}${target}`;
}

export default function ControlMeasurementFields({ characteristics, values, onChange, disabled }: ControlMeasurementFieldsProps) {
    return (
        <VStack align="stretch" gap={4}>
            {characteristics.map((characteristic, index) => (
                <Box key={characteristic.id ?? `missing-${index}`} borderWidth="1px" borderRadius="md" p={{ base: 3, md: 4 }}>
                    <HStack justify="space-between" align="start" mb={3} gap={3} flexWrap="wrap">
                        <Box>
                            <Text fontWeight="semibold">{characteristic.nombre}</Text>
                            <Text fontSize="sm" color="fg.muted">{acceptanceText(characteristic)}</Text>
                        </Box>
                        <HStack flexWrap="wrap">
                            <Badge>{characteristic.tipo === "NUMERICA" ? "Numérica" : "Booleana"}</Badge>
                            <Badge variant="outline">{characteristic.cantidadMuestras} muestras × {characteristic.unidadesPorMuestra} unidades</Badge>
                        </HStack>
                    </HStack>
                    {characteristic.id == null ? <Text color="fg.error">No se pueden cargar las lecturas de esta medición. Vuelva a consultar el control pendiente.</Text> : <>
                        <Box overflowX="auto" mb={4}>
                            <Table.Root size="sm" minW={`${Math.max(360, 90 + characteristic.cantidadMuestras * 175)}px`}>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                                        {range(characteristic.cantidadMuestras).map((sample) => <Table.ColumnHeader key={sample}>Muestra {sample}</Table.ColumnHeader>)}
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {range(characteristic.unidadesPorMuestra).map((unit) => (
                                        <Table.Row key={unit}>
                                            <Table.Cell>{unit}</Table.Cell>
                                            {range(characteristic.cantidadMuestras).map((sample) => {
                                                const key = measurementKey(characteristic.id!, sample, unit);
                                                const label = `${characteristic.nombre}, muestra ${sample}, unidad ${unit}`;
                                                return (
                                                    <Table.Cell key={key}>
                                                        <Field.Root required disabled={disabled}>
                                                            <Field.Label srOnly>{label}</Field.Label>
                                                            {characteristic.tipo === "NUMERICA" ? <>
                                                                <Input aria-label={label} inputMode="decimal" size="sm" value={values[key] ?? ""} onChange={(event) => onChange(key, event.target.value)} />
                                                                <Field.HelperText>Máximo {characteristic.escala} decimales{characteristic.unidadSimbolo ? ` · ${characteristic.unidadSimbolo}` : ""}</Field.HelperText>
                                                            </> : <NativeSelect.Root size="sm" disabled={disabled}>
                                                                <NativeSelect.Field aria-label={label} value={values[key] ?? ""} onChange={(event) => onChange(key, event.target.value)}>
                                                                    <option value="">Seleccionar</option>
                                                                    <option value="true">Sí / verdadero</option>
                                                                    <option value="false">No / falso</option>
                                                                </NativeSelect.Field>
                                                                <NativeSelect.Indicator />
                                                            </NativeSelect.Root>}
                                                        </Field.Root>
                                                    </Table.Cell>
                                                );
                                            })}
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Box>
                        {characteristic.tipo === "NUMERICA" && <NumericControlChart group={buildControlMeasurementPreview(characteristic, values)} preview />}
                    </>}
                </Box>
            ))}
        </VStack>
    );
}
