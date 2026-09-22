import { Alert, Box, Button, Field, HStack, Text, Textarea, VStack } from "@chakra-ui/react";
import { useRef, useState } from "react";

import { useAppToast } from "../../../components/ui/use-app-toast";
import { apiFailureDetail, processControlApi } from "../../../features/controles/api";
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

export default function ProcessControlRegistrationForm({ requirement, onSaved, onCancel }: ControlRegistrationFormProps) {
    const toast = useAppToast();
    const [values, setValues] = useState<MeasurementValues>({});
    const [observations, setObservations] = useState("");
    const [repeatReason, setRepeatReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [requestKeys] = useState(() => new ControlRequestKeys());
    const submitting = useRef(false);
    const isRepeat = requirement.ultimaEjecucionId != null || requirement.estado === "POR_REVALIDAR";

    const save = async () => {
        if (submitting.current) return;
        submitting.current = true;
        setErrors([]);
        setSaving(true);
        try {
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
            const saved = await processControlApi.execute(request, requestKeys.forRequest("ejecutar-proceso", request));
            toast({
                title: "Control de proceso registrado",
                description: `Resultado automático: ${formatEnumLabel(saved.estado)}.`,
                status: saved.estado === "CONFORME" ? "success" : "warning",
            });
            onSaved();
        } catch (error) {
            if (error instanceof ControlMeasurementValidationError) {
                setErrors(error.issues);
            } else {
                const detail = apiFailureDetail(error, "No fue posible registrar el control de proceso.");
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
            {isRepeat && <Field.Root required disabled={saving} invalid={!repeatReason.trim() && errors.length > 0}>
                <Field.Label>Motivo de repetición</Field.Label>
                <Textarea value={repeatReason} onChange={(event) => setRepeatReason(event.target.value)} maxLength={500} />
                <Field.HelperText>La ejecución anterior permanecerá íntegra en el historial.</Field.HelperText>
            </Field.Root>}
            <ControlMeasurementFields characteristics={requirement.caracteristicas} values={values} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} disabled={saving} />
            <Field.Root disabled={saving}>
                <Field.Label>Observaciones</Field.Label>
                <Textarea value={observations} onChange={(event) => setObservations(event.target.value)} maxLength={5000} />
            </Field.Root>
            <HStack justify="flex-end" flexWrap="wrap">
                <Button variant="ghost" disabled={saving} onClick={onCancel}>Cancelar</Button>
                <Button colorPalette="teal" loading={saving} disabled={saving} onClick={() => void save()}>Guardar mediciones</Button>
            </HStack>
        </VStack>
    );
}
