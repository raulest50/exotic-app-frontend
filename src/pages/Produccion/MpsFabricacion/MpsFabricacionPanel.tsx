import { Alert, Badge, Box, Button, CloseButton, Dialog, Field, Flex, Heading, Input, NativeSelect, Portal, Spinner, Table, Text, VStack } from "@chakra-ui/react";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { getExactTabNivel, MASTER_EFFECTIVE_NIVEL } from "../../../auth/accessHelpers";
import { useAccessSnapshot } from "../../../auth/usePermissions";
import { useMasterDirectives } from "../../../context/MasterDirectivesContext";
import { MASTER_DIRECTIVE_KEYS, MPS_FABRICACION_DIAS_BLOQUEO_EDICION_DEFAULT, MPS_FABRICACION_PERMITIR_AGREGAR_SEMITERMINADOS_APROBADO_DEFAULT } from "../../../context/masterDirectiveConstants";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";
import MpsObservacionesPanel from "../ProgProdSemanalTab/MpsObservacionesPanel";
import { addLocalDays, buildSemanaMpsCodigo, formatSemanaMpsDisplayDate, getCurrentIsoWeekMonday } from "../ProgProdSemanalTab/semanaMps.utils";
import { buscarSemiterminadosElegibles } from "../OrdenesFabricacion/ordenesFabricacionApi";
import type { OrdenFabricacion, SemiterminadoOrdenFabricacionOption } from "../OrdenesFabricacion/types";
import MpsFabricacionWeekView, { type MpsFabricacionLineView } from "./MpsFabricacionWeekView";
import { atenderObservacionMpsOf, cancelarPropuestaMpsOf, consultarMpsOf, consultarObservacionesMpsOf, consultarOrdenesMpsOf, detalleOrdenMpsOf, guardarMpsOf, guardarPropuestaAprobadaMpsOf, type MpsOfLineaRequest, type MpsOfObservacion, type MpsOfOrdenPage, type MpsOfPrograma, type MpsOfRefreshSignal } from "./mpsFabricacionApi";

function apiError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        return typeof data === "string" ? data : data?.message ?? data?.error ?? error.message;
    }
    return error instanceof Error ? error.message : "No fue posible completar la solicitud.";
}

function toRequest(line: MpsFabricacionLineView): MpsOfLineaRequest {
    return { id: line.id, semiTerminadoId: line.semiTerminadoId, cantidad: line.cantidad, fechaInicio: line.fechaInicio, fechaFinal: line.fechaFinal, observaciones: line.observaciones?.trim() || null };
}

function toEditable(programa: MpsOfPrograma): MpsFabricacionLineView[] {
    return programa.propuestas.map(p => ({ ...p, key: `line-${p.id}`, nombre: p.semiTerminadoNombre, unidad: p.unidadMedida, cantidad: String(p.cantidad) }));
}

function formatDate(value?: string | null): string {
    return value ? new Date(value).toLocaleString("es-CO") : "Sin programar";
}

export default function MpsFabricacionPanel({ operativo = false, refreshSignal, onMpsChanged }: { operativo?: boolean; refreshSignal?: MpsOfRefreshSignal | null; onMpsChanged?: (week: string) => void }) {
    const toast = useAppToast();
    const access = useAccessSnapshot();
    const directives = useMasterDirectives();
    const nivel = access.isMasterLike ? MASTER_EFFECTIVE_NIVEL : getExactTabNivel(access.moduloAccesos, Modulo.PRODUCCION, "PROGRAMACION_MPS_OF") ?? 0;
    const canEdit = !operativo && nivel >= 1 && !directives.loading;
    const lockedDays = directives.getNumberDirective(MASTER_DIRECTIVE_KEYS.MPS_FABRICACION_DIAS_BLOQUEO_EDICION, MPS_FABRICACION_DIAS_BLOQUEO_EDICION_DEFAULT, { min: 0, max: 7 });
    const allowNewSemi = directives.getBooleanDirective(MASTER_DIRECTIVE_KEYS.MPS_FABRICACION_PERMITIR_AGREGAR_SEMITERMINADOS_APROBADO, MPS_FABRICACION_PERMITIR_AGREGAR_SEMITERMINADOS_APROBADO_DEFAULT);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const editableFrom = addLocalDays(today, lockedDays);
    const [week, setWeek] = useState(getCurrentIsoWeekMonday);
    const [revision, setRevision] = useState(0);
    const [programa, setPrograma] = useState<MpsOfPrograma | null>(null);
    const [lines, setLines] = useState<MpsFabricacionLineView[]>([]);
    const [baseline, setBaseline] = useState<MpsFabricacionLineView[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [conflict, setConflict] = useState(false);
    const [orderPage, setOrderPage] = useState(0);
    const [orders, setOrders] = useState<MpsOfOrdenPage | null>(null);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [semiSearch, setSemiSearch] = useState("");
    const [semiOptions, setSemiOptions] = useState<SemiterminadoOrdenFabricacionOption[]>([]);
    const [semiId, setSemiId] = useState("");
    const [day, setDay] = useState("");
    const [searching, setSearching] = useState(false);
    const [observaciones, setObservaciones] = useState<MpsOfObservacion[]>([]);
    const [observacionesLoading, setObservacionesLoading] = useState(false);
    const [observacionesError, setObservacionesError] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState<OrdenFabricacion | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);
    const detailRequest = useRef<AbortController | null>(null);
    const receivedRefresh = useRef(0);
    const approved = programa?.estado === "APROBADO" || programa?.estado === "CERRADO";
    const dirtyKeys = new Set(lines.filter(line => JSON.stringify(toRequest(line)) !== JSON.stringify(baseline.find(p => p.key === line.key) ? toRequest(baseline.find(p => p.key === line.key)!) : null)).map(line => line.key));
    const dirty = JSON.stringify(lines.map(toRequest)) !== JSON.stringify(baseline.map(toRequest));
    const ready = programa?.weekStartDate === week && !loading && !error;
    const weekEnd = addLocalDays(week, 6);

    const applyPrograma = useCallback((next: MpsOfPrograma, preserve: MpsFabricacionLineView[] = []) => {
        const fresh = toEditable(next);
        const merged = fresh.map(line => {
            const draft = preserve.find(p => p.id === line.id);
            return draft ? { ...line, ...toRequest(draft), key: draft.key } : line;
        });
        setPrograma(next);
        setBaseline(fresh);
        setLines([...merged, ...preserve.filter(p => p.id === null)]);
        setConflict(false);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError(null); setPrograma(null); setLines([]); setBaseline([]); setConflict(false);
        setDetailOpen(false); detailRequest.current?.abort();
        consultarMpsOf(week, operativo, controller.signal)
            .then(next => { if (!controller.signal.aborted) applyPrograma(next); })
            .catch(err => { if (!controller.signal.aborted) setError(apiError(err)); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        setObservaciones([]); setObservacionesError(null);
        if (!operativo) {
            setObservacionesLoading(true);
            consultarObservacionesMpsOf(week, controller.signal)
                .then(next => { if (!controller.signal.aborted) setObservaciones(next); })
                .catch(err => { if (!controller.signal.aborted) setObservacionesError(apiError(err)); })
                .finally(() => { if (!controller.signal.aborted) setObservacionesLoading(false); });
        }
        return () => { controller.abort(); detailRequest.current?.abort(); };
    }, [week, operativo, revision, applyPrograma]);

    useEffect(() => {
        const controller = new AbortController();
        setOrdersLoading(true); setOrdersError(null); setOrders(null);
        consultarOrdenesMpsOf(week, orderPage, operativo, controller.signal)
            .then(next => { if (!controller.signal.aborted) setOrders(next); })
            .catch(err => { if (!controller.signal.aborted) setOrdersError(apiError(err)); })
            .finally(() => { if (!controller.signal.aborted) setOrdersLoading(false); });
        return () => controller.abort();
    }, [week, orderPage, operativo, revision]);

    useEffect(() => {
        if (!dirty) return;
        const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
        window.addEventListener("beforeunload", preventUnload);
        return () => window.removeEventListener("beforeunload", preventUnload);
    }, [dirty]);

    useEffect(() => {
        if (!refreshSignal || refreshSignal.origin === "programacion" || refreshSignal.weekStartDate !== week || refreshSignal.sequence <= receivedRefresh.current) return;
        receivedRefresh.current = refreshSignal.sequence;
        if (dirty) setConflict(true);
        else setRevision(r => r + 1);
    }, [refreshSignal, week, dirty]);

    const refresh = () => {
        if (saving || (dirty && !window.confirm("Hay propuestas sin guardar. ¿Descartar esos cambios?"))) return;
        setOrderPage(0); setRevision(r => r + 1);
    };
    const changeWeek = (value: string) => {
        if (!value || saving) return;
        const next = addLocalDays(value, -((new Date(`${value}T12:00:00`).getDay() + 6) % 7));
        if (next === week || (dirty && !window.confirm("Hay propuestas sin guardar. ¿Descartar esos cambios?"))) return;
        setWeek(next); setDay(""); setSemiId(""); setSemiOptions([]); setOrderPage(0);
    };
    const searchSemis = async () => {
        setSearching(true);
        try { const result = await buscarSemiterminadosElegibles(semiSearch.trim()); setSemiOptions(result.content); setSemiId(""); if (!result.content.length) toast({ title: "No se encontraron semiterminados marcados para OF", status: "info" }); }
        catch (err) { toast({ title: "No fue posible buscar semiterminados", description: apiError(err), status: "error" }); }
        finally { setSearching(false); }
    };
    const selectedAlreadyPlanned = baseline.some(p => p.semiTerminadoId === semiId);
    const canAdd = canEdit && ready && !conflict && (!approved || allowNewSemi || selectedAlreadyPlanned);
    const addLine = () => {
        const selected = semiOptions.find(option => option.productoId === semiId);
        const date = day || (approved ? week : (editableFrom > week ? editableFrom : week));
        if (!selected || !canAdd || saving || date < week || date > weekEnd || (!approved && date < editableFrom)) return;
        setLines(current => [...current, { key: crypto.randomUUID(), id: null, semiTerminadoId: selected.productoId, nombre: selected.nombre, unidad: selected.unidadMedida, cantidad: "", fechaInicio: `${date}T08:00`, fechaFinal: "", observaciones: null, elegible: true, estado: "ACTIVO", ordenFabricacionId: null, lote: null, estadoOrdenFabricacion: null, editable: true, cancelable: true, motivoBloqueo: null }]);
    };
    const valid = (line: MpsFabricacionLineView) => line.elegible && /^\d{1,14}(\.\d{1,4})?$/.test(line.cantidad) && Number(line.cantidad) > 0 && line.fechaInicio.slice(0, 10) >= week && line.fechaInicio.slice(0, 10) <= weekEnd && Number.isFinite(new Date(line.fechaFinal).getTime()) && new Date(line.fechaFinal).getTime() >= new Date(line.fechaInicio).getTime();
    const save = async (key?: string) => {
        if (!ready || !canEdit || saving || !dirty || conflict) return;
        const selection = key ? lines.filter(line => line.key === key) : lines;
        if (selection.some(line => dirtyKeys.has(line.key) && line.estado !== "CANCELADO" && (!valid(line) || (!approved && line.fechaInicio.slice(0, 10) < editableFrom)))) { toast({ title: "Revise las propuestas", description: "Use cantidades positivas hasta 4 decimales y fechas válidas dentro de la semana y de la ventana de edición. El producto debe estar marcado para OF.", status: "warning" }); return; }
        setSaving(true);
        try {
            if (approved) {
                if (!key || !selection[0]) return;
                const next = await guardarPropuestaAprobadaMpsOf(week, programa!.version, toRequest(selection[0]));
                applyPrograma(next, lines.filter(p => p.key !== key && dirtyKeys.has(p.key)));
            } else applyPrograma(await guardarMpsOf(week, { version: programa!.version, propuestas: lines.map(toRequest) }));
            toast({ title: approved ? "Tanda actualizada" : "Propuestas guardadas", status: "success" });
            onMpsChanged?.(week);
        } catch (err) { if (axios.isAxiosError(err) && err.response?.status === 409) setConflict(true); toast({ title: "No fue posible guardar el MPS OF", description: apiError(err), status: "error" }); }
        finally { setSaving(false); }
    };
    const removeLine = async (key: string) => {
        const line = lines.find(p => p.key === key);
        if (!line || saving || conflict || !canEdit) return;
        if (!approved || line.id === null) { setLines(current => current.filter(p => p.key !== key)); return; }
        if (!line.cancelable || !window.confirm(`¿Cancelar la tanda de ${line.nombre}${line.ordenFabricacionId ? ` y su OF-${line.ordenFabricacionId}` : ""}? Se conservará su historial.`)) return;
        setSaving(true);
        try { const next = await cancelarPropuestaMpsOf(week, line.id, programa!.version); applyPrograma(next, lines.filter(p => p.key !== key && dirtyKeys.has(p.key))); onMpsChanged?.(week); toast({ title: "Tanda cancelada", status: "success" }); }
        catch (err) { if (axios.isAxiosError(err) && err.response?.status === 409) setConflict(true); toast({ title: "No fue posible cancelar la tanda", description: apiError(err), status: "error" }); }
        finally { setSaving(false); }
    };
    const attendObservation = async (id: number, respuesta: string) => {
        if (dirty || saving || !programa || conflict || !canEdit) return;
        setSaving(true);
        try { await atenderObservacionMpsOf(id, programa.version, respuesta); setRevision(r => r + 1); onMpsChanged?.(week); toast({ title: "Observación atendida", status: "success" }); }
        catch (err) { if (axios.isAxiosError(err) && err.response?.status === 409) setConflict(true); toast({ title: "No fue posible atender la observación", description: apiError(err), status: "error" }); throw err; }
        finally { setSaving(false); }
    };
    const openDetail = async (id: number) => {
        detailRequest.current?.abort(); const controller = new AbortController(); detailRequest.current = controller;
        setDetailOpen(true); setDetail(null); setDetailError(null);
        try { const result = await detalleOrdenMpsOf(id, operativo, controller.signal); if (!controller.signal.aborted) setDetail(result); }
        catch (err) { if (!controller.signal.aborted) setDetailError(apiError(err)); }
    };

    return <VStack align="stretch" gap={5}>
        <Flex align="end" justify="space-between" gap={3} wrap="wrap">
            <Box><Heading size="lg">MPS OF</Heading><Text color="app.textSubtle">Programación de semiterminados · {buildSemanaMpsCodigo(week)}</Text></Box>
            <Flex gap={3} align="end"><Field.Root w="auto"><Field.Label htmlFor={`mps-of-week-${operativo}`}>Semana: seleccione un día</Field.Label><Input id={`mps-of-week-${operativo}`} type="date" value={week} disabled={saving} onChange={e => changeWeek(e.target.value)} /></Field.Root><Button variant="outline" disabled={saving || loading} onClick={refresh}>Actualizar</Button></Flex>
        </Flex>
        <Flex gap={3} align="center" wrap="wrap"><Button size="sm" variant="outline" disabled={saving || loading} onClick={() => changeWeek(addLocalDays(week, -7))}>Anterior</Button><Text fontSize="sm">{formatSemanaMpsDisplayDate(week)} al {formatSemanaMpsDisplayDate(weekEnd)}</Text><Button size="sm" variant="outline" disabled={saving || loading} onClick={() => changeWeek(addLocalDays(week, 7))}>Siguiente</Button></Flex>
        {loading ? <Spinner aria-label="Cargando MPS OF" /> : error ? <Alert.Root status="error"><Alert.Indicator /><Text>{error}</Text></Alert.Root> : ready && <>
            <Flex gap={3} align="center" wrap="wrap"><Heading size="md">Propuestas de fabricación</Heading><Badge colorPalette={approved ? "green" : "orange"}>{programa?.estado === "BORRADOR" ? "Borrador" : programa?.estado}</Badge><Badge>Revisión {programa?.revisionNumero ?? 0}</Badge>{dirty && <Badge colorPalette="orange">Sin guardar</Badge>}{approved && <Badge colorPalette="teal">Edición controlada</Badge>}</Flex>
            <Alert.Root status="info"><Alert.Indicator /><Alert.Description>La programación OF es independiente de las OP. Guarde las tandas, revíselas en Aprobación MPS OF y emita sus órdenes desde esa pestaña.</Alert.Description></Alert.Root>
            {conflict && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>La semana cambió. Sus cambios siguen visibles; recargue con Actualizar antes de volver a guardar.</Alert.Description></Alert.Root>}
            {canEdit && <Box borderWidth="1px" borderRadius="md" p={4}>
                <Flex gap={3} align="end" wrap="wrap">
                    <Field.Root w={{ base: "full", md: "240px" }}><Field.Label htmlFor="mps-of-semi-search">Buscar semiterminado</Field.Label><Input id="mps-of-semi-search" value={semiSearch} onChange={e => setSemiSearch(e.target.value)} disabled={saving} placeholder="Nombre o código" /></Field.Root><Button variant="outline" onClick={() => void searchSemis()} disabled={saving || searching} loading={searching}>Buscar</Button>
                    <Field.Root w={{ base: "full", md: "280px" }}><Field.Label htmlFor="mps-of-semi">Semiterminado para OF</Field.Label><NativeSelect.Root disabled={saving || searching}><NativeSelect.Field id="mps-of-semi" value={semiId} onChange={e => setSemiId(e.target.value)}><option value="">Seleccione un semiterminado</option>{semiOptions.map(option => <option key={option.productoId} value={option.productoId}>{option.productoId} · {option.nombre} ({option.unidadMedida})</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                    <Field.Root w="auto"><Field.Label htmlFor="mps-of-day">Día de inicio</Field.Label><Input id="mps-of-day" type="date" min={approved || editableFrom < week ? week : editableFrom} max={weekEnd} value={day} disabled={saving} onChange={e => setDay(e.target.value)} /></Field.Root>
                    <Button onClick={addLine} disabled={!semiId || !canAdd || saving || (!approved && editableFrom > weekEnd)}>Agregar propuesta</Button>
                </Flex>
                {approved && !allowNewSemi && <Text mt={2} fontSize="sm" color="app.textSubtle">La directiva permite agregar tandas de semiterminados ya programados; agregar referencias nuevas está deshabilitado.</Text>}
                {!approved && <Text mt={2} fontSize="sm" color="app.textSubtle">Edición de borrador desde {formatSemanaMpsDisplayDate(editableFrom)}. Las cantidades se expresan en la unidad de cada semiterminado.</Text>}
            </Box>}
            <MpsFabricacionWeekView week={week} lines={lines.map(line => ({ ...line, editable: line.id === null ? true : line.editable && (approved || (baseline.find(p => p.key === line.key)?.fechaInicio ?? line.fechaInicio).slice(0, 10) >= editableFrom) }))} editable={canEdit && !conflict} approved={approved} minStartDate={approved ? undefined : editableFrom} busy={saving} dirtyKeys={dirtyKeys} onChange={(key, values) => setLines(current => current.map(line => line.key === key ? { ...line, ...values } : line))} onRemove={key => void removeLine(key)} onSave={key => void save(key)} onOpenOrder={id => void openDetail(id)} />
            {canEdit && !approved && <Button alignSelf="start" colorPalette="teal" onClick={() => void save()} loading={saving} disabled={!dirty || conflict}>Guardar propuestas</Button>}
            {programa?.actualizadoEn && <Text fontSize="sm" color="app.textSubtle">Último guardado: {formatDate(programa.actualizadoEn)} · {programa.actualizadoPor}</Text>}
            {!operativo && <MpsObservacionesPanel mode="programacion" mps={programa?.id ? programa : null} observaciones={observaciones} isLoading={observacionesLoading} error={observacionesError} hasUnsavedChanges={dirty || saving || conflict} onRetry={refresh} onAtenderObservacion={canEdit ? attendObservation : undefined} />}
        </>}
        <Box borderWidth="1px" borderRadius="md" p={4}>
            <Heading size="md" mb={3}>OF emitidas {orders ? `(${orders.totalElements})` : ""}</Heading>
            {ordersLoading ? <Spinner aria-label="Cargando OF" /> : ordersError ? <Text role="alert" color="red.fg">{ordersError}</Text> : orders && <>
                <Box overflowX="auto"><Table.Root size="sm"><Table.Header><Table.Row>{["OF / Lote", "Semiterminado", "Cantidad", "Inicio", "Final", "Estado", ""].map((title, i) => <Table.ColumnHeader key={i}>{title}</Table.ColumnHeader>)}</Table.Row></Table.Header><Table.Body>{orders.content.map(order => <Table.Row key={order.ordenFabricacionId}><Table.Cell>OF {order.ordenFabricacionId}<Text fontSize="xs">{order.lote ?? "Sin lote"}</Text></Table.Cell><Table.Cell>{order.semiTerminadoNombre}</Table.Cell><Table.Cell>{order.cantidadPlanificada} {order.unidadMedida}</Table.Cell><Table.Cell>{order.usaFechaCreacion ? "Fecha de creación; sin inicio programado" : formatDate(order.fechaInicioSemana)}</Table.Cell><Table.Cell>{formatDate(order.fechaFinalPlanificada)}</Table.Cell><Table.Cell><Badge>{order.estado.replace(/_/g, " ")}</Badge></Table.Cell><Table.Cell><Button size="sm" variant="outline" onClick={() => void openDetail(order.ordenFabricacionId)}>Ver detalle</Button></Table.Cell></Table.Row>)}</Table.Body></Table.Root></Box>
                {!orders.content.length && <Text mt={3}>No hay OF emitidas para esta semana y alcance.</Text>}
                {orders.totalPages > 1 && <Flex gap={3} align="center" justify="end" mt={3}><Button size="sm" aria-label="Página anterior" disabled={orderPage === 0 || saving} onClick={() => setOrderPage(p => p - 1)}>Anterior</Button><Text>Página {orders.number + 1} de {orders.totalPages}</Text><Button size="sm" aria-label="Página siguiente" disabled={orderPage + 1 >= orders.totalPages || saving} onClick={() => setOrderPage(p => p + 1)}>Siguiente</Button></Flex>}
            </>}
        </Box>
        <Dialog.Root open={detailOpen} size="xl" scrollBehavior="inside" onOpenChange={e => { setDetailOpen(e.open); if (!e.open) detailRequest.current?.abort(); }}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content><Dialog.Header><Dialog.Title>{detail ? `OF ${detail.ordenFabricacionId} · ${detail.lote}` : "Detalle de OF"}</Dialog.Title></Dialog.Header><Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar detalle" /></Dialog.CloseTrigger><Dialog.Body>{detailError ? <Text role="alert" color="red.fg">{detailError}</Text> : !detail ? <Spinner aria-label="Cargando detalle" /> : <VStack align="stretch" gap={3}><Text fontWeight="semibold">{detail.semiTerminadoId} · {detail.semiTerminadoNombre}</Text><Text>{detail.cantidadPlanificada} {detail.unidadMedida} · {detail.estado.replace(/_/g, " ")}</Text><Text>Inicio: {formatDate(detail.fechaLanzamiento)} · Final: {formatDate(detail.fechaFinalPlanificada)}</Text>{detail.observaciones && <Text whiteSpace="pre-wrap">{detail.observaciones}</Text>}<Heading size="sm">Operaciones</Heading>{detail.operaciones.map(op => <Box key={op.id} borderBottomWidth="1px" py={2}><Text>{op.areaOperativaNombre} · {op.procesoNombre}</Text><Text fontSize="sm">{op.estadoDescripcion}</Text></Box>)}</VStack>}</Dialog.Body><Dialog.Footer><Dialog.ActionTrigger asChild><Button>Cerrar</Button></Dialog.ActionTrigger></Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
    </VStack>;
}
