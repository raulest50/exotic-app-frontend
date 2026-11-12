import { Alert, Box, Button, Field, Heading, HStack, Input, NativeSelect, Text, Textarea, VStack } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { consultarDespeje, despejeError, enviarDespeje, guardarDespeje } from "./despejeApi";
import DespejeLineaDetalle from "./DespejeLineaDetalle";
import type { EjecucionDespeje, EjecucionDespejeWrite, RespuestaDespeje } from "./types";

interface Props {
    ejecucion: EjecucionDespeje;
    onUpdated: (ejecucion: EjecucionDespeje) => void;
    onNuevoIntento: () => void;
    disabled?: boolean;
    onBusyChange?: (busy: boolean) => void;
    onDirtyChange?: (dirty: boolean) => void;
    nuevoIntentoDisabled?: boolean;
}

interface RespuestaDraft {
    valor: RespuestaDespeje | "";
    numero: string;
    observacion: string;
}

function crearRespuestas(ejecucion: EjecucionDespeje): Record<number, RespuestaDraft> {
    return Object.fromEntries(ejecucion.plantilla.items.map((item) => {
        const respuesta = ejecucion.respuestas.find((entry) => entry.itemId === item.id);
        return [item.id, {
            valor: respuesta?.valor ?? "",
            numero: respuesta?.numero == null ? "" : String(respuesta.numero),
            observacion: respuesta?.observacion ?? "",
        }];
    }));
}

export default function DespejeLineaFormulario({ ejecucion: initial, onUpdated, onNuevoIntento, disabled = false, onBusyChange, onDirtyChange, nuevoIntentoDisabled = false }: Props) {
    const [ejecucion, setEjecucion] = useState(initial);
    const [recibida, setRecibida] = useState(initial);
    const [respuestas, setRespuestas] = useState(() => crearRespuestas(initial));
    const [confirmaAntecedente, setConfirmaAntecedente] = useState(initial.confirmaAntecedenteDesconocido);
    const [observacionAntecedente, setObservacionAntecedente] = useState(initial.observacionAntecedente ?? "");
    const [observaciones, setObservaciones] = useState(initial.observaciones ?? "");
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [confirmarRecarga, setConfirmarRecarga] = useState(false);
    const [detalleLoad, setDetalleLoad] = useState(0);
    const submitting = useRef(false);
    const blocked = disabled || saving;

    const cambioRecibido = recibida.id !== initial.id || recibida.version !== initial.version || recibida.estado !== initial.estado;
    // No reconocer un snapshot pendiente hasta poder aplicarlo sin perder cambios locales.
    if (cambioRecibido && !dirty && !saving && !submitting.current
        && (initial.id !== ejecucion.id || initial.version >= ejecucion.version)) {
        setRecibida(initial);
        setEjecucion(initial);
        setRespuestas(crearRespuestas(initial));
        setConfirmaAntecedente(initial.confirmaAntecedenteDesconocido);
        setObservacionAntecedente(initial.observacionAntecedente ?? "");
        setObservaciones(initial.observaciones ?? "");
        setErrors([]);
        setMessage(null);
        setConfirmarRecarga(false);
    }

    const cambiarDirty = (value: boolean) => {
        setDirty(value);
        onDirtyChange?.(value);
    };

    const actualizarRespuesta = (itemId: number, patch: Partial<RespuestaDraft>) => {
        setRespuestas((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
        cambiarDirty(true);
    };

    const actualizar = (updated: EjecucionDespeje) => {
        // El eco de una escritura propia no es una recarga externa.
        setRecibida(updated);
        setEjecucion(updated);
        onUpdated(updated);
    };

    const guardar = async (enviar: boolean) => {
        if (submitting.current || disabled || ejecucion.estado !== "BORRADOR") return;
        const issues: string[] = [];
        const request: EjecucionDespejeWrite = {
            version: ejecucion.version,
            confirmaAntecedenteDesconocido: confirmaAntecedente,
            observacionAntecedente: observacionAntecedente.trim() || null,
            observaciones: observaciones.trim() || null,
            respuestas: ejecucion.plantilla.items.map((item) => {
                const draft = respuestas[item.id];
                const numero = item.tipo === "NUMERO" && draft.valor !== "NA" && draft.numero.trim() !== ""
                    ? Number(draft.numero.replace(",", ".")) : null;
                const noConforme = item.tipo === "SI_NO_NA"
                    ? draft.valor !== "" && draft.valor !== "NA" && draft.valor !== item.respuestaConforme
                    : numero !== null && ((item.minimo != null && numero < item.minimo) || (item.maximo != null && numero > item.maximo));
                const sinRespuesta = item.tipo === "NUMERO" ? numero === null && draft.valor !== "NA" : draft.valor === "";
                if (numero !== null && !Number.isFinite(numero)) issues.push(`Ítem ${item.orden}: ingrese un número válido.`);
                if (enviar && item.obligatorio && sinRespuesta) issues.push(`Ítem ${item.orden}: falta una respuesta obligatoria.`);
                if (draft.valor === "NA" && !item.permiteNa) issues.push(`Ítem ${item.orden}: No aplica no está permitido.`);
                if (enviar && (draft.valor === "NA" || noConforme) && !draft.observacion.trim()) issues.push(`Ítem ${item.orden}: justifique la respuesta o medición.`);
                return { itemId: item.id, valor: item.tipo === "NUMERO" && draft.valor !== "NA" ? null : draft.valor || null, numero, observacion: draft.observacion.trim() || null };
            }),
        };
        if (enviar && !ejecucion.antecedenteConocido && (!confirmaAntecedente || !observacionAntecedente.trim())) {
            issues.push("Confirme y justifique el antecedente desconocido antes de enviar.");
        }
        setErrors(issues);
        setMessage(null);
        if (issues.length) return;
        submitting.current = true;
        setSaving(true);
        onBusyChange?.(true);
        try {
            const saved = await guardarDespeje(ejecucion.id, request);
            actualizar(saved);
            cambiarDirty(false);
            setConfirmarRecarga(false);
            if (enviar) {
                const sent = await enviarDespeje(saved.id, saved.version);
                actualizar(sent);
                setMessage(sent.estado === "APROBADA" ? "Despeje aprobado. Confirme nuevamente el inicio para verificar su vigencia." : "Despeje enviado. Consulte su estado antes de iniciar.");
            } else {
                setMessage("Borrador guardado en el servidor. El inicio de la operación todavía no se ha registrado.");
            }
        } catch (cause) {
            setErrors([despejeError(cause)]);
        } finally {
            submitting.current = false;
            setSaving(false);
            onBusyChange?.(false);
        }
    };

    const recargar = async (descartar = false) => {
        if (submitting.current || disabled) return;
        if (dirty && !descartar) {
            setConfirmarRecarga(true);
            return;
        }
        submitting.current = true;
        setSaving(true);
        onBusyChange?.(true);
        setErrors([]);
        setMessage(null);
        try {
            const updated = await consultarDespeje(ejecucion.id);
            setRespuestas(crearRespuestas(updated));
            setConfirmaAntecedente(updated.confirmaAntecedenteDesconocido);
            setObservacionAntecedente(updated.observacionAntecedente ?? "");
            setObservaciones(updated.observaciones ?? "");
            cambiarDirty(false);
            setConfirmarRecarga(false);
            actualizar(updated);
            setDetalleLoad((current) => current + 1);
            setMessage("Estado actualizado desde el servidor.");
        } catch (cause) {
            setErrors([despejeError(cause)]);
        } finally {
            submitting.current = false;
            setSaving(false);
            onBusyChange?.(false);
        }
    };

    return (
        <VStack align="stretch" gap={4}>
            {errors.length > 0 && <Alert.Root status="error"><Alert.Indicator /><Box>{errors.map((error, index) => <Text key={index}>{error}</Text>)}<Text fontSize="sm" mt={1}>Las respuestas locales se conservan. Si el contexto cambió, actualice el estado antes de continuar.</Text></Box></Alert.Root>}
            {message && <Alert.Root status="info"><Alert.Indicator />{message}</Alert.Root>}
            {ejecucion.estado === "BORRADOR" ? <>
                <Box bg="app.surfaceSubtle" borderWidth="1px" borderRadius="md" p={4}>
                    <Heading size="sm">Despeje de {ejecucion.areaNombre}</Heading>
                    <Text fontSize="sm" fontWeight="semibold">Plantilla: {ejecucion.familiaNombre ?? ejecucion.plantilla.familiaNombre ?? ejecucion.plantilla.nombre}</Text>
                    <Text fontSize="sm">{ejecucion.ordenFabricacionId != null ? `OF-${ejecucion.ordenFabricacionId}` : `OP-${ejecucion.ordenProduccionId}`} · {ejecucion.productoActualNombre ?? ejecucion.productoActualId} · Lote {ejecucion.loteActualNumero}</Text>
                    <Text fontSize="sm">Anterior: {ejecucion.antecedenteConocido ? `${ejecucion.productoAnteriorNombre ?? ejecucion.productoAnteriorId ?? "Sin producto anterior"} · ${ejecucion.loteAnteriorNumero ?? "Sin lote anterior"}` : "Antecedente desconocido"}</Text>
                    <Text fontSize="sm">{ejecucion.plantilla.nombre} · v{ejecucion.plantilla.numero} · Intento {ejecucion.intento}</Text>
                    <Text fontSize="xs" color="app.textMuted">El contexto y la versión fueron fijados por el servidor.</Text>
                </Box>
                {!ejecucion.antecedenteConocido && <VStack align="stretch" gap={3}>
                    <Field.Root required disabled={blocked}><Field.Label>Confirmación del antecedente desconocido</Field.Label><NativeSelect.Root><NativeSelect.Field value={confirmaAntecedente ? "CONFIRMADO" : ""} onChange={(event) => { setConfirmaAntecedente(event.target.value === "CONFIRMADO"); cambiarDirty(true); }}><option value="">Seleccione una opción</option><option value="CONFIRMADO">Confirmo la verificación física ante el antecedente desconocido</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                    <Field.Root required disabled={blocked}><Field.Label>Justificación del antecedente</Field.Label><Textarea value={observacionAntecedente} onChange={(event) => { setObservacionAntecedente(event.target.value); cambiarDirty(true); }} maxLength={2000} /></Field.Root>
                </VStack>}
                {[...ejecucion.plantilla.items].sort((a, b) => a.orden - b.orden).map((item) => {
                    const draft = respuestas[item.id];
                    return <VStack key={item.id} align="stretch" gap={3} p={4} borderWidth="1px" borderRadius="md">
                        <Field.Root required={item.obligatorio} disabled={blocked}>
                            <Field.Label>{item.orden}. {item.texto}</Field.Label>
                            {item.tipo === "SI_NO_NA" ? <NativeSelect.Root><NativeSelect.Field value={draft.valor} onChange={(event) => actualizarRespuesta(item.id, { valor: event.target.value as RespuestaDespeje | "" })}><option value="">Sin responder</option><option value="SI">Sí</option><option value="NO">No</option>{item.permiteNa && <option value="NA">No aplica</option>}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root> : <>
                                {draft.valor !== "NA" && <Input inputMode="decimal" value={draft.numero} onChange={(event) => actualizarRespuesta(item.id, { numero: event.target.value })} />}
                            </>}
                            <Field.HelperText color="app.textMuted">{item.tipo === "SI_NO_NA" ? `Respuesta conforme: ${item.respuestaConforme === "NO" ? "No" : "Sí"}` : `Límites inclusivos: ${item.minimo ?? "sin mínimo"} a ${item.maximo ?? "sin máximo"}`}</Field.HelperText>
                        </Field.Root>
                        <Field.Root disabled={blocked}><Field.Label>Observación del ítem {item.orden}</Field.Label><Textarea value={draft.observacion} onChange={(event) => actualizarRespuesta(item.id, { observacion: event.target.value })} maxLength={2000} /><Field.HelperText color="app.textMuted">Obligatoria para No aplica o una respuesta no conforme.</Field.HelperText></Field.Root>
                    </VStack>;
                })}
                <Field.Root disabled={blocked}><Field.Label>Observaciones del despeje</Field.Label><Textarea value={observaciones} onChange={(event) => { setObservaciones(event.target.value); cambiarDirty(true); }} maxLength={5000} /></Field.Root>
                <HStack justify="flex-end" flexWrap="wrap"><Button variant="outline" disabled={blocked} onClick={() => void guardar(false)}>Guardar borrador</Button><Button colorPalette="teal" loading={saving} disabled={blocked} onClick={() => void guardar(true)}>Guardar y enviar despeje</Button></HStack>
            </> : <DespejeLineaDetalle key={`${ejecucion.id}-${detalleLoad}`} ejecucion={ejecucion} permitirRevision disabled={blocked} onUpdated={actualizar} onBusyChange={(value) => { submitting.current = value; setSaving(value); onBusyChange?.(value); }} onDirtyChange={cambiarDirty} />}
            <HStack flexWrap="wrap"><Button size="sm" variant="outline" disabled={blocked} onClick={() => void recargar()}>Recargar desde el servidor</Button>{["RECHAZADA", "INVALIDADA"].includes(ejecucion.estado) && <Button size="sm" variant="outline" disabled={blocked || nuevoIntentoDisabled} onClick={onNuevoIntento}>Preparar nuevo intento</Button>}</HStack>
            {confirmarRecarga && <Alert.Root status="warning"><Alert.Indicator /><VStack align="stretch" gap={2}><Text>Recargar descartará los cambios locales sin guardar.</Text><HStack flexWrap="wrap"><Button size="sm" variant="outline" disabled={blocked} onClick={() => setConfirmarRecarga(false)}>Conservar cambios</Button><Button size="sm" variant="outline" disabled={blocked} onClick={() => void recargar(true)}>Descartar y recargar</Button></HStack></VStack></Alert.Root>}
            {ejecucion.estado === "BORRADOR" && <Text fontSize="xs" color="app.textMuted">Recargar sustituye los cambios locales por el último borrador guardado.</Text>}
        </VStack>
    );
}
