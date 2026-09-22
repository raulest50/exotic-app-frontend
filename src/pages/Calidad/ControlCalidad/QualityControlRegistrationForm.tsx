import { Alert, Box, Button, Field, HStack, NativeSelect, Text, Textarea, VStack } from "@chakra-ui/react";
import { useRef, useState } from "react";

import { useAppToast } from "../../../components/ui/use-app-toast";
import { apiFailureDetail, qualityControlApi } from "../../../features/controles/api";
import ControlMeasurementFields from "../../../features/controles/ControlMeasurementFields";
import ControlRegistrationContext from "../../../features/controles/ControlRegistrationContext";
import {
    buildControlSamples,
    ControlMeasurementValidationError,
    type ControlRegistrationFormProps,
    type MeasurementValues,
} from "../../../features/controles/controlMeasurements";
import { ControlRequestKeys } from "../../../features/controles/controlRequestKeys";
import { formatEnumLabel } from "../../../features/controles/controlUi";
import type { EjecucionControlWrite } from "../../../features/controles/types";

export default function QualityControlRegistrationForm({ requirement, onSaved, onCancel }: ControlRegistrationFormProps) {
    const toast = useAppToast();
    const [values, setValues] = useState<MeasurementValues>({});
    const [observations, setObservations] = useState("");
    const [repeatReason, setRepeatReason] = useState("");
    const [revalidationMode, setRevalidationMode] = useState<"REVALIDAR" | "REPETIR">(
        requirement.estado === "POR_REVALIDAR" ? "REVALIDAR" : "REPETIR",
    );
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [requestKeys] = useState(() => new ControlRequestKeys());
    const submitting = useRef(false);
    const isRevalidation = requirement.estado === "POR_REVALIDAR" && revalidationMode === "REVALIDAR";
    const isRepeat = !isRevalidation && (requirement.ultimaEjecucionId != null || requirement.estado === "POR_REVALIDAR");

    const save = async () => {
        if (submitting.current) return;
        submitting.current = true;
        setErrors([]);
        setSaving(true);
        try {
            if (isRevalidation) {
                if (!repeatReason.trim()) {
                    throw new ControlMeasurementValidationError(["La justificación de revalidación es obligatoria."]);
                }
                if (!qualityControlApi.revalidate) throw new Error("La revalidación no está disponible.");
                const request = { controlRequeridoId: requirement.id, justificacion: repeatReason.trim() };
                const result = await qualityControlApi.revalidate(
                    requirement.id, request.justificacion, requestKeys.forRequest("revalidar-calidad", request),
                );
                toast({
                    title: "Ensayo revalidado",
                    description: `Se confirmó la ejecución #${result.ejecucionRevalidadaId} para el ciclo ${result.cicloRevisionNumero}.`,
                    status: "success",
                });
            } else {
                const muestras = buildControlSamples(requirement.caracteristicas, values);
                if (isRepeat && !repeatReason.trim()) {
                    throw new ControlMeasurementValidationError(["El motivo de repetición es obligatorio."]);
                }
                const request: EjecucionControlWrite = {
                    controlRequeridoId: requirement.id,
                    observaciones: observations.trim() || null,
                    repeticionDeId: isRepeat ? requirement.ultimaEjecucionId : null,
                    motivoRepeticion: isRepeat ? repeatReason.trim() : null,
                    muestras,
                };
                const saved = await qualityControlApi.execute(request, requestKeys.forRequest("ejecutar-calidad", request));
                toast({
                    title: "Control de calidad registrado",
                    description: `Resultado automático: ${formatEnumLabel(saved.estado)}.`,
                    status: saved.estado === "CONFORME" ? "success" : "warning",
                });
            }
            onSaved();
        } catch (error) {
            if (error instanceof ControlMeasurementValidationError) {
                setErrors(error.issues);
            } else {
                const detail = apiFailureDetail(error, "No fue posible registrar el control de calidad.");
                setErrors([detail.message, ...detail.bloqueos]);
            }
        } finally {
            submitting.current = false;
            setSaving(false);
        }
    };

    return (
        <VStack align="stretch" gap={4}>
            <ControlRegistrationContext requirement={requirement} />
            {errors.length > 0 && <Alert.Root status="error"><Alert.Indicator /><Box><Text fontWeight="semibold">No se puede guardar</Text>{errors.map((error, index) => <Text key={index} fontSize="sm">• {error}</Text>)}</Box></Alert.Root>}
            {requirement.estado === "POR_REVALIDAR" && <Field.Root required disabled={saving}>
                <Field.Label>Tratamiento del resultado anterior</Field.Label>
                <NativeSelect.Root disabled={saving}>
                    <NativeSelect.Field value={revalidationMode} onChange={(event) => setRevalidationMode(event.target.value as "REVALIDAR" | "REPETIR")}>
                        <option value="REVALIDAR">Confirmar vigencia del último resultado conforme</option>
                        <option value="REPETIR">Registrar nuevas mediciones</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Field.HelperText>Se confirma la vigencia del último resultado conforme asociado a este control.</Field.HelperText>
            </Field.Root>}
            {(isRepeat || isRevalidation) && <Field.Root required disabled={saving} invalid={!repeatReason.trim() && errors.length > 0}>
                <Field.Label>{isRevalidation ? "Justificación de revalidación" : "Motivo de repetición"}</Field.Label>
                <Textarea value={repeatReason} onChange={(event) => setRepeatReason(event.target.value)} maxLength={isRevalidation ? 1000 : 500} />
                <Field.HelperText>La ejecución anterior permanecerá íntegra en el historial.</Field.HelperText>
            </Field.Root>}
            {!isRevalidation && <>
                <ControlMeasurementFields characteristics={requirement.caracteristicas} values={values} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} disabled={saving} />
                <Field.Root disabled={saving}>
                    <Field.Label>Observaciones</Field.Label>
                    <Textarea value={observations} onChange={(event) => setObservations(event.target.value)} maxLength={5000} />
                </Field.Root>
            </>}
            <HStack justify="flex-end" flexWrap="wrap">
                <Button variant="ghost" disabled={saving} onClick={onCancel}>Cancelar</Button>
                <Button colorPalette="teal" loading={saving} disabled={saving} onClick={() => void save()}>{isRevalidation ? "Confirmar vigencia" : "Guardar mediciones"}</Button>
            </HStack>
        </VStack>
    );
}
