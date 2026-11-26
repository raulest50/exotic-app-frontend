import { useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { Button, CloseButton, Dialog, Field, Input, Portal, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import type { RegistroVisitante } from "./types";
import { registrarSalidaVisitante } from "./visitantesApi";

const fechaHoraColombia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
const fechaLegible = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "medium",
});

function valoresIniciales() {
    const ahora = new Date();
    const partes = fechaHoraColombia.formatToParts(ahora);
    const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value;
    return {
        fecha: `${valor("year")}-${valor("month")}-${valor("day")}`,
        hora: `${valor("hour")}:${valor("minute")}:${valor("second")}`,
        instante: ahora.toISOString(),
    };
}

export default function VisitanteSalidaDialog({ visita, onClose, onRegistrada }: {
    visita: RegistroVisitante;
    onClose: () => void;
    onRegistrada: (registro: RegistroVisitante) => void;
}) {
    const [inicial] = useState(valoresIniciales);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const enviando = useRef(false);

    const confirmar = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (enviando.current) return;
        setError("");
        if (!event.currentTarget.reportValidity()) return;
        const datos = new FormData(event.currentTarget);
        const fechaInformada = String(datos.get("fechaSalida") ?? "");
        const horaInformada = String(datos.get("horaSalida") ?? "");
        const horaConSegundos = horaInformada.length === 5 ? `${horaInformada}:00` : horaInformada;
        // Colombia uses UTC−05:00. Explicit offset avoids the device's time zone.
        // Keep the initial instant's milliseconds when the operator has not edited it.
        const fechaSalida = fechaInformada === inicial.fecha && horaConSegundos === inicial.hora
            ? inicial.instante : `${fechaInformada}T${horaInformada}-05:00`;
        if (!Number.isFinite(Date.parse(fechaSalida))) {
            setError("Complete una fecha y hora válidas.");
            return;
        }
        enviando.current = true;
        setGuardando(true);
        try {
            onRegistrada(await registrarSalidaVisitante(visita.id, fechaSalida));
        } catch (cause) {
            const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
            setError(status === 400
                ? "La salida debe ser igual o posterior al ingreso y no puede estar en el futuro. Revise la fecha y la hora de Colombia."
                : status === 403 ? "No tiene permiso para registrar salidas."
                    : status === 404 ? "La visita ya no está disponible. Actualice la bandeja."
                        : status === 409 ? "Esta visita no tiene seguimiento de salida. Actualice la bandeja."
                            : "No se pudo confirmar la salida. Puede reintentar: si ya se guardó, se conservará ese cierre.");
        } finally {
            enviando.current = false;
            setGuardando(false);
        }
    };

    return <Dialog.Root open size="lg" closeOnInteractOutside={!guardando} closeOnEscape={!guardando}
        onOpenChange={({ open }) => { if (!open && !enviando.current) onClose(); }}>
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
            <form onSubmit={(event) => { void confirmar(event); }}>
                <Dialog.Header><Dialog.Title>Registrar salida</Dialog.Title></Dialog.Header>
                <Dialog.Body><Stack gap={4}>
                    <Text fontWeight="medium">{visita.nombreCompleto}</Text>
                    <Text fontSize="sm">Ingreso: {fechaLegible.format(new Date(visita.fechaRegistro))} (Colombia).</Text>
                    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                        <Field.Root required><Field.Label>Fecha de salida informada</Field.Label>
                            <Input name="fechaSalida" type="date" required defaultValue={inicial.fecha} disabled={guardando} />
                        </Field.Root>
                        <Field.Root required><Field.Label>Hora de salida informada</Field.Label>
                            <Input name="horaSalida" type="time" step={1} required defaultValue={inicial.hora} disabled={guardando} />
                        </Field.Root>
                    </SimpleGrid>
                    <Text fontSize="sm" color="fg.muted">Hora de Colombia. Puede informar una salida anterior. Se guardarán también el momento de confirmación y su usuario. El cierre no podrá modificarse.</Text>
                    {error && <Text role="alert" color="fg.error">{error}</Text>}
                </Stack></Dialog.Body>
                <Dialog.Footer>
                    <Button type="button" variant="outline" disabled={guardando} onClick={onClose}>Cancelar</Button>
                    <Button type="submit" colorPalette="teal" loading={guardando} loadingText="Confirmando">Confirmar salida</Button>
                </Dialog.Footer>
            </form>
            <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar registro de salida" size="sm" disabled={guardando} /></Dialog.CloseTrigger>
        </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>;
}
