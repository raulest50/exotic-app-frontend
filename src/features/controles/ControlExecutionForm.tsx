import {
    Alert,
    Badge,
    Box,
    Button,
    Field,
    HStack,
    Input,
    NativeSelect,
    Table,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useState } from "react";

import { useAppToast } from "../../components/ui/use-app-toast";
import { apiFailureDetail, type ControlDomainApi } from "./api";
import { CONTROL_NOUN, formatDecimalScale, formatEnumLabel } from "./controlUi";
import type { CaracteristicaPlanControl, ControlRequerido, MuestraControlWrite } from "./types";

interface ControlExecutionFormProps {
    api: ControlDomainApi;
    requirement: ControlRequerido;
    onSaved: () => void;
    onCancel: () => void;
}

const range = (length: number) => Array.from({ length }, (_, index) => index + 1);
const valueKey = (characteristicId: number, sample: number, unit: number) => `${characteristicId}:${sample}:${unit}`;

function acceptanceText(characteristic: CaracteristicaPlanControl) {
    if (characteristic.tipo === "BOOLEANA") {
        return `Esperado: ${characteristic.valorBooleanoEsperado ? "Sí / verdadero" : "No / falso"}`;
    }
    const unit = characteristic.unidadSimbolo ?? characteristic.unidadCodigo ?? "";
    const lower = characteristic.limiteInferior == null ? "−∞" : formatDecimalScale(characteristic.limiteInferior, characteristic.escala);
    const upper = characteristic.limiteSuperior == null ? "+∞" : formatDecimalScale(characteristic.limiteSuperior, characteristic.escala);
    return `Aceptación inclusiva: ${lower} a ${upper} ${unit}`;
}

function normalizeReading(raw: string, characteristic: CaracteristicaPlanControl) {
    const normalized = raw.trim().replace(",", ".");
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
        throw new Error(`${characteristic.nombre}: ingrese un decimal válido.`);
    }
    const unsigned = normalized.startsWith("-") ? normalized.slice(1) : normalized;
    const [integer, fraction = ""] = unsigned.split(".");
    if (integer.length > 12 || fraction.length > characteristic.escala) {
        throw new Error(`${characteristic.nombre}: máximo 12 dígitos enteros y ${characteristic.escala} decimales.`);
    }
    return normalized;
}

export default function ControlExecutionForm({ api, requirement, onSaved, onCancel }: ControlExecutionFormProps) {
    const toast = useAppToast();
    const [values, setValues] = useState<Record<string, string>>({});
    const [observations, setObservations] = useState("");
    const [repeatReason, setRepeatReason] = useState("");
    const [revalidationMode, setRevalidationMode] = useState<"REVALIDAR" | "REPETIR">(
        api.ambito === "CALIDAD" && requirement.estado === "POR_REVALIDAR" ? "REVALIDAR" : "REPETIR",
    );
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const isRevalidation = api.ambito === "CALIDAD" && requirement.estado === "POR_REVALIDAR" && revalidationMode === "REVALIDAR";
    const isRepeat = !isRevalidation && (requirement.ultimaEjecucionId != null || requirement.estado === "POR_REVALIDAR");

    const buildSamples = (): MuestraControlWrite[] => {
        const missing: string[] = [];
        const result: MuestraControlWrite[] = [];
        for (const characteristic of requirement.caracteristicas) {
            if (characteristic.id == null) {
                missing.push(`${characteristic.nombre}: la versión no contiene identificador de característica.`);
                continue;
            }
            for (const sample of range(characteristic.cantidadMuestras)) {
                const readings = range(characteristic.unidadesPorMuestra).map((unit) => {
                    const raw = values[valueKey(characteristic.id!, sample, unit)] ?? "";
                    if (!raw.trim()) missing.push(`${characteristic.nombre}, muestra ${sample}, unidad ${unit}.`);
                    if (characteristic.tipo === "NUMERICA") {
                        let numeric: string | null = null;
                        if (raw.trim()) {
                            try {
                                numeric = normalizeReading(raw, characteristic);
                            } catch (error) {
                                missing.push(error instanceof Error ? error.message : `${characteristic.nombre}: valor inválido.`);
                            }
                        }
                        return { indiceUnidad: unit, valorNumerico: numeric, valorBooleano: null };
                    }
                    return { indiceUnidad: unit, valorNumerico: null, valorBooleano: raw === "" ? null : raw === "true" };
                });
                result.push({ caracteristicaId: characteristic.id, numeroMuestra: sample, lecturas: readings });
            }
        }
        if (isRepeat && !repeatReason.trim()) missing.push("El motivo de repetición o revalidación es obligatorio.");
        if (missing.length) throw new Error(missing.join("|"));
        return result;
    };

    const save = async () => {
        setErrors([]);
        setSaving(true);
        try {
            if (isRevalidation) {
                if (!repeatReason.trim()) throw new Error("La justificación de revalidación es obligatoria.");
                if (!api.revalidate) throw new Error("La revalidación solo está disponible en el ámbito de Calidad.");
                const result = await api.revalidate(requirement.id, repeatReason.trim());
                toast({
                    title: "Ensayo revalidado",
                    description: `Se confirmó la ejecución #${result.ejecucionRevalidadaId} para el ciclo ${result.cicloRevisionNumero}.`,
                    status: "success",
                });
                onSaved();
                return;
            }
            const saved = await api.execute({
                controlRequeridoId: requirement.id,
                observaciones: observations.trim() || null,
                repeticionDeId: isRepeat ? requirement.ultimaEjecucionId : null,
                motivoRepeticion: isRepeat ? repeatReason.trim() : null,
                muestras: buildSamples(),
            });
            toast({
                title: `${CONTROL_NOUN[api.ambito].singular} registrado`,
                description: `Resultado automático: ${formatEnumLabel(saved.estado)}.`,
                status: saved.estado === "CONFORME" ? "success" : "warning",
            });
            onSaved();
        } catch (error) {
            if (error instanceof Error && (error.message.includes("|") || error.message.startsWith("La justificación"))) {
                setErrors(error.message.split("|").map((item) => item.trim()).filter(Boolean));
            } else {
                const detail = apiFailureDetail(error, "No fue posible registrar las mediciones.");
                setErrors([detail.message, ...detail.bloqueos]);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <VStack align="stretch" gap={4}>
            <Box bg="bg.subtle" borderWidth="1px" borderRadius="md" p={4}>
                <HStack justify="space-between" align="start" gap={3} flexWrap="wrap">
                    <Box><Text fontWeight="bold">{requirement.planCodigo} · {requirement.planNombre}</Text><Text fontSize="sm" color="fg.muted">Versión {requirement.versionNumero}</Text></Box>
                    <HStack><Badge colorPalette={api.ambito === "PROCESO" ? "blue" : "purple"}>{api.ambito}</Badge><Badge>{formatEnumLabel(requirement.puntoExigencia)}</Badge></HStack>
                </HStack>
            </Box>

            {errors.length > 0 && <Alert.Root status="error"><Alert.Indicator /><Box><Text fontWeight="semibold">No se puede guardar</Text>{errors.map((error) => <Text key={error} fontSize="sm">• {error}</Text>)}</Box></Alert.Root>}

            {api.ambito === "CALIDAD" && requirement.estado === "POR_REVALIDAR" && <Field.Root required><Field.Label>Tratamiento del resultado anterior</Field.Label><NativeSelect.Root><NativeSelect.Field value={revalidationMode} onChange={(event) => setRevalidationMode(event.target.value as "REVALIDAR" | "REPETIR")}><option value="REVALIDAR">Confirmar vigencia del último resultado conforme</option><option value="REPETIR">Registrar nuevas mediciones</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Field.HelperText>La revalidación no permite elegir una ejecución: el backend toma la última conforme del requisito.</Field.HelperText></Field.Root>}

            {(isRepeat || isRevalidation) && <Field.Root required invalid={!repeatReason.trim() && errors.length > 0}><Field.Label>{isRevalidation ? "Justificación de revalidación" : "Motivo de repetición"}</Field.Label><Textarea value={repeatReason} onChange={(event) => setRepeatReason(event.target.value)} maxLength={isRevalidation ? 1000 : 500} /><Field.HelperText>La ejecución anterior permanecerá íntegra en el historial.</Field.HelperText></Field.Root>}

            {!isRevalidation && requirement.caracteristicas.map((characteristic) => {
                if (characteristic.id == null) return null;
                return (
                    <Box key={characteristic.id} borderWidth="1px" borderRadius="md" p={{ base: 3, md: 4 }}>
                        <HStack justify="space-between" align="start" mb={3} gap={3} flexWrap="wrap">
                            <Box><Text fontWeight="semibold">{characteristic.nombre}</Text><Text fontSize="sm" color="fg.muted">{acceptanceText(characteristic)}</Text></Box>
                            <HStack><Badge>{characteristic.tipo === "NUMERICA" ? "Numérica" : "Booleana"}</Badge><Badge variant="outline">{characteristic.cantidadMuestras} × {characteristic.unidadesPorMuestra}</Badge></HStack>
                        </HStack>
                        <Box overflowX="auto">
                            <Table.Root size="sm" minW={`${Math.max(520, characteristic.cantidadMuestras * 190)}px`}>
                                <Table.Header><Table.Row><Table.ColumnHeader>Unidad</Table.ColumnHeader>{range(characteristic.cantidadMuestras).map((sample) => <Table.ColumnHeader key={sample}>Muestra {sample}</Table.ColumnHeader>)}</Table.Row></Table.Header>
                                <Table.Body>{range(characteristic.unidadesPorMuestra).map((unit) => <Table.Row key={unit}><Table.Cell>{unit}</Table.Cell>{range(characteristic.cantidadMuestras).map((sample) => {
                                    const key = valueKey(characteristic.id!, sample, unit);
                                    const label = `${characteristic.nombre}, muestra ${sample}, unidad ${unit}${characteristic.unidadSimbolo ? `, ${characteristic.unidadSimbolo}` : ""}`;
                                    return <Table.Cell key={key}>{characteristic.tipo === "NUMERICA" ? <Field.Root required><Field.Label srOnly>{label}</Field.Label><Input aria-label={label} inputMode="decimal" size="sm" value={values[key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /><Field.HelperText>Máximo {characteristic.escala} decimales</Field.HelperText></Field.Root> : <Field.Root required><Field.Label srOnly>{label}</Field.Label><NativeSelect.Root size="sm"><NativeSelect.Field aria-label={label} value={values[key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}><option value="">Seleccionar</option><option value="true">Sí / verdadero</option><option value="false">No / falso</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>}</Table.Cell>;
                                })}</Table.Row>)}</Table.Body>
                            </Table.Root>
                        </Box>
                    </Box>
                );
            })}

            {!isRevalidation && <Field.Root><Field.Label>Observaciones</Field.Label><Textarea value={observations} onChange={(event) => setObservations(event.target.value)} maxLength={5000} /></Field.Root>}
            <HStack justify="flex-end" flexWrap="wrap"><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button colorPalette="teal" loading={saving} onClick={() => void save()}>{isRevalidation ? "Confirmar vigencia" : "Guardar mediciones"}</Button></HStack>
        </VStack>
    );
}
