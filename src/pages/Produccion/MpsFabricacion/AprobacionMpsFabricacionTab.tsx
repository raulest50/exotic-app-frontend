import { Alert, Badge, Box, Button, Field, Flex, Heading, Input, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { getExactTabNivel, MASTER_EFFECTIVE_NIVEL } from "../../../auth/accessHelpers";
import { useAccessSnapshot } from "../../../auth/usePermissions";
import { useMasterDirectives } from "../../../context/MasterDirectivesContext";
import { BATCH_RECORD_WORKFLOW_ENABLED_DEFAULT, MASTER_DIRECTIVE_KEYS } from "../../../context/masterDirectiveConstants";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";
import MpsObservacionesPanel from "../ProgProdSemanalTab/MpsObservacionesPanel";
import { addLocalDays, buildSemanaMpsCodigo, formatSemanaMpsDisplayDate, getCurrentIsoWeekMonday } from "../ProgProdSemanalTab/semanaMps.utils";
import MpsFabricacionWeekView from "./MpsFabricacionWeekView";
import { aprobarMpsOf, cerrarObservacionMpsOf, consultarMpsOf, consultarObservacionesMpsOf, crearObservacionMpsOf, emitirMpsOf, type MpsOfObservacion, type MpsOfObservacionTipo, type MpsOfPrograma, type MpsOfRefreshSignal } from "./mpsFabricacionApi";

function apiError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        return typeof data === "string" ? data : data?.message ?? data?.error ?? error.message;
    }
    return error instanceof Error ? error.message : "No fue posible completar la solicitud.";
}

function makeToken(): string { return String(Math.floor(1000 + Math.random() * 9000)); }

export default function AprobacionMpsFabricacionTab({ onMpsChanged, refreshSignal }: { onMpsChanged?: (week: string) => void; refreshSignal?: MpsOfRefreshSignal | null }) {
    const toast = useAppToast();
    const access = useAccessSnapshot();
    const directives = useMasterDirectives();
    const nivel = access.isMasterLike ? MASTER_EFFECTIVE_NIVEL : getExactTabNivel(access.moduloAccesos, Modulo.PRODUCCION, "APROBACION_MPS_OF") ?? 0;
    const batchEnabled = !directives.loading && directives.getBooleanDirective(MASTER_DIRECTIVE_KEYS.BATCH_RECORD_WORKFLOW_ENABLED, BATCH_RECORD_WORKFLOW_ENABLED_DEFAULT);
    const [week, setWeek] = useState(getCurrentIsoWeekMonday);
    const [refresh, setRefresh] = useState(0);
    const [programa, setPrograma] = useState<MpsOfPrograma | null>(null);
    const [observaciones, setObservaciones] = useState<MpsOfObservacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [observacionesLoading, setObservacionesLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [observacionesError, setObservacionesError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [conflict, setConflict] = useState(false);
    const [token, setToken] = useState(makeToken);
    const [inputToken, setInputToken] = useState("");
    const receivedRefresh = useRef(0);

    useEffect(() => {
        if (!refreshSignal || refreshSignal.origin === "aprobacion" || refreshSignal.weekStartDate !== week || refreshSignal.sequence <= receivedRefresh.current) return;
        receivedRefresh.current = refreshSignal.sequence;
        setRefresh(r => r + 1);
    }, [refreshSignal, week]);

    const refreshAfterMutation = useCallback(async () => {
        const [next, observations] = await Promise.all([consultarMpsOf(week, false), consultarObservacionesMpsOf(week)]);
        setPrograma(next); setObservaciones(observations); setObservacionesError(null); setConflict(false);
        setToken(makeToken()); setInputToken("");
        onMpsChanged?.(week);
    }, [week, onMpsChanged]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError(null); setPrograma(null); setConflict(false); setInputToken(""); setToken(makeToken());
        setObservaciones([]); setObservacionesLoading(true); setObservacionesError(null);
        consultarMpsOf(week, false, controller.signal)
            .then(next => { if (!controller.signal.aborted) setPrograma(next); })
            .catch(err => { if (!controller.signal.aborted) setError(apiError(err)); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        consultarObservacionesMpsOf(week, controller.signal)
            .then(next => { if (!controller.signal.aborted) setObservaciones(next); })
            .catch(err => { if (!controller.signal.aborted) setObservacionesError(apiError(err)); })
            .finally(() => { if (!controller.signal.aborted) setObservacionesLoading(false); });
        return () => controller.abort();
    }, [week, refresh]);

    const mutationError = (err: unknown) => {
        if (axios.isAxiosError(err) && err.response?.status === 409) setConflict(true);
        toast({ title: "No fue posible completar la acción", description: apiError(err), status: "error" });
    };
    const createObservation = async (tipo: MpsOfObservacionTipo, mensaje: string) => {
        if (!programa || busy || conflict || nivel < 1) throw new Error("Actualice la revisión antes de registrar la observación.");
        setBusy(true);
        try { await crearObservacionMpsOf(week, programa.version, tipo, mensaje); await refreshAfterMutation(); toast({ title: "Observación registrada", status: "success" }); }
        catch (err) { mutationError(err); throw err; }
        finally { setBusy(false); }
    };
    const closeObservation = async (id: number) => {
        if (!programa || busy || conflict || nivel < 1) throw new Error("Actualice la revisión antes de aceptar la corrección.");
        setBusy(true);
        try { await cerrarObservacionMpsOf(id, programa.version); await refreshAfterMutation(); toast({ title: "Corrección aceptada", status: "success" }); }
        catch (err) { mutationError(err); throw err; }
        finally { setBusy(false); }
    };
    const active = programa?.propuestas.filter(p => p.estado !== "CANCELADO") ?? [];
    const emitted = active.filter(p => p.ordenFabricacionId !== null).length;
    const pendingObservations = observaciones.filter(o => o.estado !== "CERRADA").length;
    const ready = !!programa && programa.weekStartDate === week && !loading && !error && !busy && !conflict && nivel >= 1;
    const canApprove = ready && programa.estado === "BORRADOR" && active.length > 0 && !observacionesLoading && !observacionesError && pendingObservations === 0 && programa.observacionesPendientes === 0;
    const canEmit = ready && programa.estado === "APROBADO" && active.length > emitted && batchEnabled;
    const approve = async () => {
        if (!canApprove || inputToken !== token) return;
        setBusy(true);
        try { setPrograma(await aprobarMpsOf(week, programa.version)); await refreshAfterMutation(); toast({ title: "MPS OF aprobado", status: "success" }); }
        catch (err) { mutationError(err); }
        finally { setBusy(false); }
    };
    const emit = async () => {
        if (!canEmit || !window.confirm(`¿Emitir las ${active.length - emitted} tandas pendientes de esta revisión como órdenes de fabricación?`)) return;
        setBusy(true);
        try { setPrograma(await emitirMpsOf(week, programa.version)); await refreshAfterMutation(); toast({ title: "OF emitidas", status: "success" }); }
        catch (err) { mutationError(err); }
        finally { setBusy(false); }
    };

    return <VStack align="stretch" gap={5}>
        <Flex justify="space-between" align="end" gap={3} wrap="wrap">
            <Box><Heading size="lg">Aprobación MPS OF</Heading><Text color="app.textSubtle">Revisión de fabricación para stock · {buildSemanaMpsCodigo(week)}</Text></Box>
            <Flex gap={3} align="end"><Field.Root w="auto"><Field.Label htmlFor="mps-of-approval-week">Semana: seleccione un día</Field.Label><Input id="mps-of-approval-week" type="date" value={week} disabled={busy} onChange={e => { const date = e.target.value; if (date) setWeek(addLocalDays(date, -((new Date(`${date}T12:00:00`).getDay() + 6) % 7))); }} /></Field.Root><Button variant="outline" disabled={busy || loading} onClick={() => setRefresh(r => r + 1)}>Actualizar</Button></Flex>
        </Flex>
        <Text fontSize="sm">{formatSemanaMpsDisplayDate(week)} al {formatSemanaMpsDisplayDate(addLocalDays(week, 6))}</Text>
        {loading ? <Spinner aria-label="Cargando aprobación MPS OF" /> : error ? <Alert.Root status="error"><Alert.Indicator /><Text>{error}</Text></Alert.Root> : programa && <>
            <Flex align="center" gap={3} wrap="wrap"><Badge colorPalette={programa.estado === "BORRADOR" ? "orange" : "green"}>{programa.estado}</Badge><Badge>Revisión {programa.revisionNumero ?? 0}</Badge></Flex>
            {!programa.id && <Alert.Root status="info"><Alert.Indicator /><Alert.Description>No hay una programación guardada para revisar, aprobar o convertir en OF.</Alert.Description></Alert.Root>}
            {conflict && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>La revisión cambió. Actualice la semana antes de aprobar, emitir o registrar decisiones.</Alert.Description></Alert.Root>}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Tandas activas</Text><Text fontWeight="bold">{active.length}</Text></Box>
                <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">OF vinculadas</Text><Text fontWeight="bold">{emitted} / {active.length}</Text></Box>
                <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Observaciones pendientes</Text><Text fontWeight="bold">{programa.observacionesPendientes}</Text></Box>
            </SimpleGrid>
            {programa.fechaAprobacion && <Text fontSize="sm">Aprobado por {programa.aprobadoPorUsername} · {new Date(programa.fechaAprobacion).toLocaleString("es-CO")}</Text>}
            {programa.fechaGeneracionOfs && <Text fontSize="sm">OF emitidas por {programa.generadoPorUsername} · {new Date(programa.fechaGeneracionOfs).toLocaleString("es-CO")}</Text>}
            {programa.estado === "APROBADO" && <Text fontSize="sm" color="app.textSubtle">Emitir genera las órdenes de fabricación. Las tandas futuras se habilitan en su fecha de inicio.</Text>}
            {programa.estado === "CERRADO" && <Text fontSize="sm" color="app.textSubtle">Las órdenes fueron emitidas; este estado no significa que la fabricación haya finalizado. Los cambios permitidos se gestionan en MPS OF.</Text>}
            <MpsFabricacionWeekView week={week} lines={programa.propuestas.map(p => ({ ...p, key: `review-${p.id}`, nombre: p.semiTerminadoNombre, unidad: p.unidadMedida }))} />
            <MpsObservacionesPanel mode="aprobacion" mps={programa.id ? programa : null} observaciones={observaciones} isLoading={observacionesLoading} error={observacionesError} disabled={busy || conflict || loading} onRetry={() => setRefresh(r => r + 1)} onCreateObservacion={nivel >= 1 ? createObservation : undefined} onCerrarObservacion={nivel >= 1 ? closeObservation : undefined} />
            {programa.estado === "BORRADOR" && (pendingObservations > 0 || programa.observacionesPendientes > 0) && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>Cierre las observaciones antes de aprobar el programa.</Alert.Description></Alert.Root>}
            {programa.estado === "BORRADOR" && (!active.length || observacionesError) && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>{!active.length ? "No se puede aprobar una semana sin tandas activas." : "Las observaciones deben estar disponibles antes de aprobar."}</Alert.Description></Alert.Root>}
            {canApprove && <Field.Root w={{ base: "full", md: "320px" }}><Field.Label htmlFor="mps-of-approval-token">Confirmación de aprobación</Field.Label><Field.HelperText>Digite {token} para confirmar esta revisión.</Field.HelperText><Input id="mps-of-approval-token" aria-label="Token de aprobación MPS OF" inputMode="numeric" maxLength={4} value={inputToken} onChange={e => setInputToken(e.target.value.replace(/\D/g, "").slice(0, 4))} autoComplete="off" /></Field.Root>}
            {programa.estado === "APROBADO" && !batchEnabled && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>El flujo de Batch Record está deshabilitado. La emisión de OF permanece bloqueada.</Alert.Description></Alert.Root>}
            <Flex gap={3} justify="end" wrap="wrap">
                {programa.estado === "BORRADOR" && <Button colorPalette="green" disabled={!canApprove || inputToken !== token} loading={busy} onClick={() => void approve()}>Aprobar MPS OF</Button>}
                {programa.estado === "APROBADO" && <Button colorPalette="teal" disabled={!canEmit} loading={busy} onClick={() => void emit()}>Emitir OF</Button>}
            </Flex>
        </>}
    </VStack>;
}
