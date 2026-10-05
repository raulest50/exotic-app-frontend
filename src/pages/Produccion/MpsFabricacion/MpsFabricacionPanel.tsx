import {
    Alert, Badge, Box, Button, CloseButton, Dialog, Field, Flex, Heading,
    Input, NativeSelect, Portal, Table, Text, VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { getExactTabNivel, MASTER_EFFECTIVE_NIVEL } from "../../../auth/accessHelpers";
import { useAccessSnapshot } from "../../../auth/usePermissions";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";
import { buscarSemiterminadosElegibles } from "../OrdenesFabricacion/ordenesFabricacionApi";
import type { OrdenFabricacion, SemiterminadoOrdenFabricacionOption } from "../OrdenesFabricacion/types";
import { addLocalDays, buildSemanaMpsCodigo, formatSemanaMpsDisplayDate, getCurrentIsoWeekMonday } from "../ProgProdSemanalTab/semanaMps.utils";
import {
    consultarMpsOf, consultarOrdenesMpsOf, detalleOrdenMpsOf, guardarMpsOf,
    type MpsOfLineaRequest, type MpsOfOrdenPage, type MpsOfPrograma,
} from "./mpsFabricacionApi";

interface EditableLine extends MpsOfLineaRequest {
    key: string;
    nombre: string;
    unidad: string;
    elegible: boolean;
}

function apiError(error: unknown): string {
    if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message;
    return error instanceof Error ? error.message : "No fue posible completar la solicitud.";
}

function formatDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "Sin fecha";
}

function toRequest(lines: EditableLine[]): MpsOfLineaRequest[] {
    return lines.map(({ id, semiTerminadoId, cantidad, fechaInicio, fechaFinal, observaciones }) => ({
        id, semiTerminadoId, cantidad, fechaInicio, fechaFinal, observaciones: observaciones?.trim() || null,
    }));
}

function toEditable(programa: MpsOfPrograma): EditableLine[] {
    return programa.propuestas.map(p => ({
        id: p.id, key: `saved-${p.id}`, semiTerminadoId: p.semiTerminadoId,
        nombre: p.semiTerminadoNombre, unidad: p.unidadMedida, elegible: p.elegible,
        cantidad: String(p.cantidad), fechaInicio: p.fechaInicio, fechaFinal: p.fechaFinal,
        observaciones: p.observaciones,
    }));
}

export default function MpsFabricacionPanel({ operativo = false }: { operativo?: boolean }) {
    const toast = useAppToast();
    const access = useAccessSnapshot();
    const nivel = access.isMasterLike ? MASTER_EFFECTIVE_NIVEL
        : getExactTabNivel(access.moduloAccesos, Modulo.PRODUCCION, "CREAR_ORDEN_FABRICACION") ?? 0;
    const canEdit = !operativo && nivel >= 2;
    const [week, setWeek] = useState(getCurrentIsoWeekMonday);
    const [revision, setRevision] = useState(0);
    const [programa, setPrograma] = useState<MpsOfPrograma | null>(null);
    const [lines, setLines] = useState<EditableLine[]>([]);
    const [baseline, setBaseline] = useState("[]");
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
    const [searching, setSearching] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState<OrdenFabricacion | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);
    const detailRequest = useRef<AbortController | null>(null);
    const dirty = JSON.stringify(toRequest(lines)) !== baseline;
    const ready = programa?.weekStartDate === week && !loading && !error;
    const weekEnd = addLocalDays(week, 6);

    const applyPrograma = useCallback((next: MpsOfPrograma) => {
        const editable = toEditable(next);
        setPrograma(next);
        setLines(editable);
        setBaseline(JSON.stringify(toRequest(editable)));
        setConflict(false);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        setPrograma(null);
        setLines([]);
        setBaseline("[]");
        setConflict(false);
        setDetailOpen(false);
        detailRequest.current?.abort();
        consultarMpsOf(week, operativo, controller.signal)
            .then(next => { if (!controller.signal.aborted) applyPrograma(next); })
            .catch(err => { if (!controller.signal.aborted) setError(apiError(err)); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => { controller.abort(); detailRequest.current?.abort(); };
    }, [week, operativo, revision, applyPrograma]);

    useEffect(() => {
        const controller = new AbortController();
        setOrdersLoading(true);
        setOrdersError(null);
        setOrders(null);
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

    const canDiscard = () => !dirty || window.confirm("Hay propuestas sin guardar. ¿Descartar esos cambios?");
    const changeWeek = (next: string) => {
        if (!next || next === week || saving || !canDiscard()) return;
        setWeek(next);
        setOrderPage(0);
    };
    const refresh = () => {
        if (saving || !canDiscard()) return;
        setOrderPage(0);
        setRevision(r => r + 1);
    };
    const updateLine = (key: string, values: Partial<MpsOfLineaRequest>) => {
        setLines(current => current.map(line => line.key === key ? { ...line, ...values } : line));
    };
    const searchSemis = async () => {
        setSearching(true);
        try {
            const result = await buscarSemiterminadosElegibles(semiSearch.trim());
            setSemiOptions(result.content);
            setSemiId("");
            if (!result.content.length) toast({ title: "No se encontraron semiterminados marcados para OF", status: "info" });
        } catch (err) {
            toast({ title: "No fue posible buscar semiterminados", description: apiError(err), status: "error" });
        } finally { setSearching(false); }
    };
    const addLine = () => {
        const selected = semiOptions.find(option => option.productoId === semiId);
        if (!selected || !ready || !canEdit || saving) return;
        setLines(current => [...current, {
            key: crypto.randomUUID(), id: null, semiTerminadoId: selected.productoId,
            nombre: selected.nombre, unidad: selected.unidadMedida, cantidad: "",
            fechaInicio: `${week}T08:00`, fechaFinal: "", observaciones: null, elegible: true,
        }]);
    };
    const save = async () => {
        if (!ready || !canEdit || saving || !dirty || conflict) return;
        const invalid = lines.find(line => !line.elegible || !/^\d{1,14}(\.\d{1,4})?$/.test(line.cantidad)
            || Number(line.cantidad) <= 0 || !line.fechaInicio || !line.fechaFinal
            || line.fechaInicio.slice(0, 10) < week || line.fechaInicio.slice(0, 10) > weekEnd
            || new Date(line.fechaFinal).getTime() < new Date(line.fechaInicio).getTime());
        if (invalid) {
            toast({ title: "Revise las propuestas", description: "Use cantidades positivas de hasta 4 decimales, inicio dentro de la semana y fecha final igual o posterior. El producto debe estar marcado para OF.", status: "warning" });
            return;
        }
        setSaving(true);
        try {
            const next = await guardarMpsOf(week, { version: programa!.version, propuestas: toRequest(lines) });
            applyPrograma(next);
            toast({ title: "Propuestas guardadas", status: "success" });
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 409) setConflict(true);
            toast({ title: "No fue posible guardar el MPS OF", description: apiError(err), status: "error" });
        } finally { setSaving(false); }
    };
    const openDetail = async (id: number) => {
        detailRequest.current?.abort();
        const controller = new AbortController();
        detailRequest.current = controller;
        setDetail(null);
        setDetailError(null);
        setDetailOpen(true);
        try {
            const result = await detalleOrdenMpsOf(id, operativo, controller.signal);
            if (!controller.signal.aborted) setDetail(result);
        } catch (err) { if (!controller.signal.aborted) setDetailError(apiError(err)); }
    };

    return (
        <VStack align="stretch" gap={5} p={{ base: 2, md: 4 }}>
            <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                <Box><Heading size="lg">MPS OF</Heading><Text color="app.textSubtle">Programación de semiterminados · {buildSemanaMpsCodigo(week)}</Text></Box>
                <Button variant="outline" onClick={refresh} disabled={saving}>Actualizar</Button>
            </Flex>
            <Flex align="end" gap={3} wrap="wrap">
                <Button variant="outline" onClick={() => changeWeek(addLocalDays(week, -7))} disabled={saving}>Anterior</Button>
                <Field.Root w="auto"><Field.Label htmlFor={`mps-of-week-${operativo}`}>Semana: seleccione un día</Field.Label>
                    <Input id={`mps-of-week-${operativo}`} type="date" value={week} disabled={saving} onChange={e => {
                        const value = e.target.value;
                        if (!value) return;
                        const day = new Date(`${value}T12:00:00`).getDay();
                        changeWeek(addLocalDays(value, day === 0 ? -6 : 1 - day));
                    }} /></Field.Root>
                <Button variant="outline" onClick={() => changeWeek(addLocalDays(week, 7))} disabled={saving}>Siguiente</Button>
                <Text fontSize="sm">{formatSemanaMpsDisplayDate(week)} al {formatSemanaMpsDisplayDate(weekEnd)}</Text>
            </Flex>

            <Box borderWidth="1px" borderColor="app.border" borderRadius="lg" p={4}>
                <Heading size="md" mb={3}>OF emitidas {orders ? `(${orders.totalElements})` : ""}</Heading>
                {ordersLoading && <Text role="status">Cargando órdenes…</Text>}
                {ordersError && <Text role="alert" color="red.600">{ordersError}</Text>}
                {orders && <>
                    <Box overflowX="auto"><Table.Root size="sm"><Table.Header><Table.Row>
                        {["OF / Lote", "Semiterminado", "Cantidad", "Inicio", "Final", "Estado", ""].map((title, i) => <Table.ColumnHeader key={i}>{title}</Table.ColumnHeader>)}
                    </Table.Row></Table.Header><Table.Body>
                        {orders.content.map(order => <Table.Row key={order.ordenFabricacionId}>
                            <Table.Cell>OF {order.ordenFabricacionId}<Text fontSize="xs">{order.lote ?? "Sin lote"}</Text></Table.Cell>
                            <Table.Cell>{order.semiTerminadoNombre}<Text fontSize="xs">{order.semiTerminadoId}</Text></Table.Cell>
                            <Table.Cell whiteSpace="nowrap">{order.cantidadPlanificada} {order.unidadMedida}</Table.Cell>
                            <Table.Cell>{formatDate(order.fechaInicioSemana)}{order.usaFechaCreacion && <Text fontSize="xs" color="app.textSubtle">Fecha de creación; sin inicio programado</Text>}</Table.Cell>
                            <Table.Cell>{formatDate(order.fechaFinalPlanificada)}</Table.Cell>
                            <Table.Cell><Badge>{order.estado.replaceAll("_", " ")}</Badge></Table.Cell>
                            <Table.Cell><Button size="sm" variant="outline" onClick={() => void openDetail(order.ordenFabricacionId)}>Ver detalle</Button></Table.Cell>
                        </Table.Row>)}
                    </Table.Body></Table.Root></Box>
                    {!orders.content.length && <Text mt={3}>No hay OF emitidas para esta semana y alcance.</Text>}
                    <Flex gap={3} align="center" mt={3}>
                        <Button size="sm" variant="outline" disabled={orderPage === 0 || ordersLoading} onClick={() => setOrderPage(p => p - 1)}>Página anterior</Button>
                        <Text fontSize="sm">Página {orders.totalPages ? orders.number + 1 : 0} de {orders.totalPages}</Text>
                        <Button size="sm" variant="outline" disabled={orderPage + 1 >= orders.totalPages || ordersLoading} onClick={() => setOrderPage(p => p + 1)}>Página siguiente</Button>
                    </Flex>
                </>}
            </Box>

            <Box borderWidth="1px" borderColor="app.border" borderRadius="lg" p={4}>
                <Flex align="center" gap={3} wrap="wrap" mb={3}><Heading size="md">Propuestas de fabricación</Heading><Badge colorPalette="orange">Borrador</Badge>{dirty && <Badge>Sin guardar</Badge>}</Flex>
                <Alert.Root status="info" mb={4}><Alert.Indicator /><Alert.Content>
                    <Alert.Description>Estas propuestas no autorizan fabricación ni crean órdenes. Las OF emitidas se consultan por separado.</Alert.Description>
                </Alert.Content></Alert.Root>
                {loading && <Text role="status">Cargando propuestas…</Text>}
                {error && <Text role="alert" color="red.600">{error}</Text>}
                {conflict && <Alert.Root status="warning" mb={3}><Alert.Indicator /><Alert.Content><Alert.Description>La semana cambió. Sus cambios siguen visibles; recargue con Actualizar antes de volver a guardar.</Alert.Description></Alert.Content></Alert.Root>}
                {ready && <>
                    {canEdit && <Flex align="end" gap={3} wrap="wrap" mb={4}>
                        <Field.Root w={{ base: "full", md: "260px" }}><Field.Label htmlFor="mps-of-semi-search">Buscar semiterminado</Field.Label>
                            <Input id="mps-of-semi-search" value={semiSearch} onChange={e => setSemiSearch(e.target.value)} disabled={saving} placeholder="Nombre o código" /></Field.Root>
                        <Button variant="outline" onClick={() => void searchSemis()} loading={searching} disabled={saving}>Buscar</Button>
                        <Field.Root w={{ base: "full", md: "320px" }}><Field.Label htmlFor="mps-of-semi">Semiterminado para OF</Field.Label>
                            <NativeSelect.Root><NativeSelect.Field id="mps-of-semi" value={semiId} disabled={saving || searching} onChange={e => setSemiId(e.target.value)}>
                                <option value="">Seleccione un semiterminado</option>{semiOptions.map(option => <option key={option.productoId} value={option.productoId}>{option.productoId} · {option.nombre} ({option.unidadMedida})</option>)}
                            </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                        <Button onClick={addLine} disabled={!semiId || saving || searching}>Agregar propuesta</Button>
                    </Flex>}
                    <Box overflowX="auto"><Table.Root size="sm"><Table.Header><Table.Row>
                        {["Semiterminado", "Cantidad", "Inicio", "Final", "Observaciones", ...(canEdit ? [""] : [])].map((title, i) => <Table.ColumnHeader key={i}>{title}</Table.ColumnHeader>)}
                    </Table.Row></Table.Header><Table.Body>
                        {lines.map((line, i) => <Table.Row key={line.key}>
                            <Table.Cell minW="190px">{line.nombre}<Text fontSize="xs">{line.semiTerminadoId}</Text>{!line.elegible && <Text color="red.600" fontSize="xs">Ya no está marcado para OF</Text>}</Table.Cell>
                            <Table.Cell minW="150px">{canEdit ? <Input aria-label={`Cantidad propuesta ${i + 1}`} type="number" min="0.0001" step="0.0001" value={line.cantidad} disabled={saving} onChange={e => updateLine(line.key, { cantidad: e.target.value })} /> : line.cantidad}<Text fontSize="xs">{line.unidad}</Text></Table.Cell>
                            <Table.Cell minW="220px">{canEdit ? <Input aria-label={`Inicio propuesta ${i + 1}`} type="datetime-local" step="1" min={`${week}T00:00`} max={`${weekEnd}T23:59:59`} value={line.fechaInicio} disabled={saving} onChange={e => updateLine(line.key, { fechaInicio: e.target.value })} /> : formatDate(line.fechaInicio)}</Table.Cell>
                            <Table.Cell minW="220px">{canEdit ? <Input aria-label={`Final propuesta ${i + 1}`} type="datetime-local" step="1" min={line.fechaInicio} value={line.fechaFinal} disabled={saving} onChange={e => updateLine(line.key, { fechaFinal: e.target.value })} /> : formatDate(line.fechaFinal)}</Table.Cell>
                            <Table.Cell minW="180px">{canEdit ? <Input aria-label={`Observaciones propuesta ${i + 1}`} maxLength={2000} value={line.observaciones ?? ""} disabled={saving} onChange={e => updateLine(line.key, { observaciones: e.target.value })} /> : line.observaciones || "—"}</Table.Cell>
                            {canEdit && <Table.Cell><Button size="sm" variant="outline" colorPalette="red" disabled={saving} onClick={() => setLines(current => current.filter(p => p.key !== line.key))}>Quitar</Button></Table.Cell>}
                        </Table.Row>)}
                    </Table.Body></Table.Root></Box>
                    {!lines.length && <Text mt={3}>No hay propuestas para esta semana y alcance.</Text>}
                    <Flex mt={4} align="center" gap={4} wrap="wrap">
                        {canEdit && <Button colorPalette="teal" onClick={() => void save()} loading={saving} disabled={!dirty || conflict || saving}>Guardar propuestas</Button>}
                        {programa?.actualizadoEn && <Text fontSize="sm" color="app.textSubtle">Último guardado: {formatDate(programa.actualizadoEn)} · {programa.actualizadoPor}</Text>}
                    </Flex>
                </>}
            </Box>

            <Dialog.Root open={detailOpen} size="xl" scrollBehavior="inside" onOpenChange={e => {
                setDetailOpen(e.open);
                if (!e.open) detailRequest.current?.abort();
            }}>
                <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
                    <Dialog.Header><Dialog.Title>{detail ? `OF ${detail.ordenFabricacionId} · ${detail.lote}` : "Detalle de OF"}</Dialog.Title></Dialog.Header>
                    <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar detalle" /></Dialog.CloseTrigger>
                    <Dialog.Body>
                        {detailError ? <Text role="alert" color="red.600">{detailError}</Text> : !detail ? <Text>Cargando detalle…</Text> : <VStack align="stretch" gap={3}>
                            <Text fontWeight="semibold">{detail.semiTerminadoId} · {detail.semiTerminadoNombre}</Text>
                            <Text>{detail.cantidadPlanificada} {detail.unidadMedida} · {detail.estado.replaceAll("_", " ")}</Text>
                            <Text>Inicio: {formatDate(detail.fechaLanzamiento)} · Final: {formatDate(detail.fechaFinalPlanificada)}</Text>
                            {detail.ordenProduccionOrigenId && <Text>OP origen: {detail.ordenProduccionOrigenId}</Text>}
                            {detail.observaciones && <Text whiteSpace="pre-wrap">{detail.observaciones}</Text>}
                            <Heading size="sm">Operaciones</Heading>
                            {detail.operaciones.map(op => <Box key={op.id} borderBottomWidth="1px" borderColor="app.border" py={2}>
                                <Text>{op.areaOperativaNombre} · {op.procesoNombre}</Text><Text fontSize="sm">{op.estadoDescripcion}</Text>
                            </Box>)}
                        </VStack>}
                    </Dialog.Body>
                    <Dialog.Footer><Dialog.ActionTrigger asChild><Button minW="100px" px={5}>Cerrar</Button></Dialog.ActionTrigger></Dialog.Footer>
                </Dialog.Content></Dialog.Positioner></Portal>
            </Dialog.Root>
        </VStack>
    );
}
