import { Alert, Badge, Box, Field, Heading, Input, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import type { CalculoPuntosReorden, ParametrosPuntosReorden } from "./types";
import CalendarioDiasReorden from "./CalendarioDiasReorden";

interface Props {
    parametros: ParametrosPuntosReorden;
    calculo: CalculoPuntosReorden | null;
    diasConDispensacion: string[];
    errorParametros: string | null;
    disabled: boolean;
    hoy: string;
    onChange: (parametros: ParametrosPuntosReorden) => void;
}

export default function PuntosReordenConfiguracion({ parametros, calculo, diasConDispensacion, errorParametros, disabled, hoy, onChange }: Props) {
    const cambiarFecha = (campo: "fechaDesde" | "fechaHasta", value: string) => {
        const siguientes = { ...parametros, [campo]: value };
        siguientes.fechasExcluidas = siguientes.fechasExcluidas.filter((fecha) => fecha >= siguientes.fechaDesde && fecha <= siguientes.fechaHasta);
        onChange(siguientes);
    };
    return (
        <VStack align="stretch" gap={4}>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
                <Field.Root disabled={disabled}>
                    <Field.Label>Fecha inicial</Field.Label>
                    <Input type="date" value={parametros.fechaDesde} max={parametros.fechaHasta || hoy} onChange={(e) => cambiarFecha("fechaDesde", e.target.value)} />
                    <Field.HelperText>Rango inclusivo de 45 a 3660 días calendario.</Field.HelperText>
                </Field.Root>
                <Field.Root disabled={disabled}>
                    <Field.Label>Fecha final</Field.Label>
                    <Input type="date" value={parametros.fechaHasta} min={parametros.fechaDesde} max={hoy} onChange={(e) => cambiarFecha("fechaHasta", e.target.value)} />
                    <Field.HelperText>Fecha de Bogotá. El día actual puede tener datos parciales.</Field.HelperText>
                </Field.Root>
                <Field.Root disabled={disabled}>
                    <Field.Label>Stock de seguridad (%)</Field.Label>
                    <Input type="number" min={0} max={100} step="0.000001" value={parametros.porcentajeSeguridad} onChange={(e) => onChange({ ...parametros, porcentajeSeguridad: Number(e.target.value) })} />
                    <Field.HelperText>De 0 a 100 %. Se aplica sobre consumo diario × plazo negociado.</Field.HelperText>
                </Field.Root>
                <Field.Root disabled={disabled}>
                    <Field.Label>Mínimo de días con dispensación</Field.Label>
                    <Input type="number" min={1} max={3660} step={1} value={parametros.minimoDiasEfectivos} onChange={(e) => onChange({ ...parametros, minimoDiasEfectivos: Number(e.target.value) })} />
                    <Field.HelperText>De 1 a 3660 días efectivos. Puede ajustar este criterio para su análisis.</Field.HelperText>
                </Field.Root>
            </SimpleGrid>
            {errorParametros && <Alert.Root status="error"><Alert.Indicator /><Alert.Description>{errorParametros}</Alert.Description></Alert.Root>}
            {parametros.fechaHasta === hoy && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>El rango incluye hoy en Bogotá. Las dispensaciones del día pueden estar incompletas.</Alert.Description></Alert.Root>}
            <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
                <Box borderWidth="1px" borderColor="app.border" borderRadius="md" p={4}>
                    <Heading size="sm" mb={2}>Excluir días atípicos</Heading>
                    <CalendarioDiasReorden key={`${parametros.fechaDesde}:${parametros.fechaHasta}`} fechaDesde={parametros.fechaDesde} fechaHasta={parametros.fechaHasta}
                        fechasExcluidas={parametros.fechasExcluidas} diasConDispensacion={diasConDispensacion}
                        disabled={disabled} onChange={(fechasExcluidas) => onChange({ ...parametros, fechasExcluidas })} />
                </Box>
                <Box borderWidth="1px" borderColor="app.border" borderRadius="md" p={4}>
                    <Heading size="sm" mb={3}>Criterios del cálculo</Heading>
                    <VStack align="stretch" gap={2} fontSize="sm">
                        <Text>Consumo diario = consumo del rango, sin fechas excluidas, / días globales con dispensación.</Text>
                        <Text>El promedio usa días con dispensación; el plazo negociado del proveedor está expresado en días calendario.</Text>
                        <Text>PR nuevo = (consumo diario × plazo negociado) + stock de seguridad.</Text>
                        <Text>Las exclusiones afectan a todos los materiales. El mínimo de días efectivos es el criterio que haya indicado para este análisis.</Text>
                        <Text>El proveedor inicial es el más frecuente en OCM enviadas o cerradas; un empate se resuelve por compra más reciente y luego por identificador.</Text>
                        <Text>Cambiar el proveedor aquí solo modifica la propuesta. No cambia la ficha del proveedor.</Text>
                        <Text>Las unidades U se redondean hacia arriba al entero; las demás, hacia arriba a seis decimales.</Text>
                        {calculo && <Box aria-live="polite" mt={2}>
                            <Badge mr={2}>Calendario: {calculo.diasCalendario}</Badge>
                            <Badge mr={2}>Excluidos: {calculo.diasExcluidos}</Badge>
                            <Badge colorPalette={calculo.diasEfectivos >= calculo.minimoDiasEfectivos ? "teal" : "orange"}>Días efectivos: {calculo.diasEfectivos} / mínimo {calculo.minimoDiasEfectivos}</Badge>
                        </Box>}
                    </VStack>
                </Box>
            </SimpleGrid>
        </VStack>
    );
}
