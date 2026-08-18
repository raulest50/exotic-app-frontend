import {
    Alert,
    Badge,
    Box,
    Button,
    CloseButton,
    Dialog,
    Field,
    Flex,
    Heading,
    HStack,
    Input,
    NativeSelect,
    Portal,
    SimpleGrid,
    Table,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useEffect, useState } from "react";
import { getExactTabNivel, MASTER_EFFECTIVE_NIVEL } from "../../../auth/accessHelpers";
import { useAccessSnapshot } from "../../../auth/usePermissions";
import { useMasterDirectives } from "../../../context/MasterDirectivesContext";
import {
    BATCH_RECORD_WORKFLOW_ENABLED_DEFAULT,
    AREA_OPERATIVA_ADMIN_CORRECTION_ENABLED_DEFAULT,
    MASTER_DIRECTIVE_KEYS,
} from "../../../context/masterDirectiveConstants";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";
import {
    buscarOrdenesFabricacion,
    buscarSemiterminadosElegibles,
    cancelarOrdenFabricacion,
    corregirOperacionFabricacion,
    crearOrdenFabricacion,
    detalleOrdenFabricacion,
    liberarOrdenFabricacion,
} from "./ordenesFabricacionApi";
import type {
    OrdenFabricacion,
    OrdenFabricacionPage,
    SemiterminadoOrdenFabricacionOption,
    OrdenFabricacionOperacion,
} from "./types";

function apiError(error: unknown): string {
    if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message;
    return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function estadoColor(estado: OrdenFabricacion["estado"]): string {
    if (estado === "CANCELADA") return "red";
    if (estado === "CERRADA") return "green";
    if (estado === "EN_EJECUCION") return "blue";
    if (estado === "LIBERADA") return "teal";
    return "gray";
}

function formatDateTime(value?: string | null): string {
    if (!value) return "-";
    return new Date(value).toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export default function OrdenesFabricacionTab() {
    const toast = useAppToast();
    const access = useAccessSnapshot();
    const { loading: directivesLoading, getBooleanDirective } = useMasterDirectives();
    const batchRecordWorkflowEnabled = !directivesLoading && getBooleanDirective(
        MASTER_DIRECTIVE_KEYS.BATCH_RECORD_WORKFLOW_ENABLED,
        BATCH_RECORD_WORKFLOW_ENABLED_DEFAULT,
    );
    const correctionEnabled = !directivesLoading && getBooleanDirective(
        MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_ADMIN_CORRECTION_ENABLED,
        AREA_OPERATIVA_ADMIN_CORRECTION_ENABLED_DEFAULT,
    );
    const nivel = access.isMasterLike
        ? MASTER_EFFECTIVE_NIVEL
        : (getExactTabNivel(
            access.moduloAccesos,
            Modulo.PRODUCCION,
            "CREAR_ORDEN_FABRICACION",
        ) ?? 0);
    const nivelMonitoreo = access.isMasterLike
        ? MASTER_EFFECTIVE_NIVEL
        : (getExactTabNivel(
            access.moduloAccesos,
            Modulo.PRODUCCION,
            "MONITOREAR_AREAS_OPERATIVAS",
        ) ?? 0);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState<OrdenFabricacionPage | null>(null);
    const [semiSearch, setSemiSearch] = useState("");
    const [options, setOptions] = useState<SemiterminadoOrdenFabricacionOption[]>([]);
    const [selected, setSelected] = useState<SemiterminadoOrdenFabricacionOption | null>(null);
    const [cantidad, setCantidad] = useState("");
    const [lote, setLote] = useState("");
    const [fechaLanzamiento, setFechaLanzamiento] = useState("");
    const [fechaFinal, setFechaFinal] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<OrdenFabricacion | null>(null);
    const [transitioningId, setTransitioningId] = useState<number | null>(null);
    const [correctionOperation, setCorrectionOperation] = useState<OrdenFabricacionOperacion | null>(null);
    const [correctionTarget, setCorrectionTarget] = useState("");
    const [correctionReason, setCorrectionReason] = useState("");
    const [correctionSaving, setCorrectionSaving] = useState(false);

    const cargar = async (nextPage = 0) => {
        setLoading(true);
        try {
            setPage(await buscarOrdenesFabricacion(search.trim(), nextPage));
        } catch (error) {
            toast({ title: "No fue posible consultar las OF", description: apiError(error), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void cargar(); }, []);

    const buscarSemis = async () => {
        try {
            const response = await buscarSemiterminadosElegibles(semiSearch.trim());
            setOptions(response.content);
        } catch (error) {
            toast({ title: "No fue posible buscar semiterminados", description: apiError(error), status: "error" });
        }
    };

    const crear = async () => {
        if (!batchRecordWorkflowEnabled) {
            toast({
                title: "Flujo de Batch Record deshabilitado",
                description: "Active la directiva maestra antes de crear órdenes de fabricación.",
                status: "warning",
            });
            return;
        }
        const numeric = Number(cantidad);
        if (!selected || !Number.isFinite(numeric) || numeric <= 0 || !lote.trim()) {
            toast({ title: "Complete semiterminado, cantidad y lote", status: "warning" });
            return;
        }
        if (fechaLanzamiento && fechaFinal && fechaFinal < fechaLanzamiento) {
            toast({ title: "La fecha final no puede ser anterior al lanzamiento", status: "warning" });
            return;
        }
        setSaving(true);
        try {
            const created = await crearOrdenFabricacion({
                semiTerminadoId: selected.productoId,
                cantidadPlanificada: numeric,
                lote: lote.trim(),
                fechaLanzamiento: fechaLanzamiento || null,
                fechaFinalPlanificada: fechaFinal || null,
                observaciones: observaciones.trim() || null,
            });
            toast({
                title: `OF ${created.ordenFabricacionId} creada`,
                description: `Se creó el lote ${created.lote} y el expediente ${created.batchRecordCodigo}.`,
                status: "success",
            });
            setSelected(null);
            setOptions([]);
            setCantidad("");
            setLote("");
            setFechaLanzamiento("");
            setFechaFinal("");
            setObservaciones("");
            await cargar();
        } catch (error) {
            toast({ title: "No fue posible crear la OF", description: apiError(error), status: "error" });
        } finally {
            setSaving(false);
        }
    };

    const cancelar = async (id: number) => {
        if (!window.confirm(`¿Cancelar definitivamente la OF ${id} y anular su expediente?`)) {
            return;
        }
        try {
            await cancelarOrdenFabricacion(id);
            toast({ title: `OF ${id} cancelada`, status: "success" });
            await cargar(page?.number ?? 0);
        } catch (error) {
            toast({ title: "No fue posible cancelar la OF", description: apiError(error), status: "error" });
        }
    };

    const liberar = async (id: number) => {
        if (!window.confirm(`¿Liberar la OF ${id} para ejecución en las áreas operativas?`)) return;
        setTransitioningId(id);
        try {
            const updated = await liberarOrdenFabricacion(id);
            toast({ title: `OF ${id} liberada`, status: "success" });
            if (selectedDetail?.ordenFabricacionId === id) setSelectedDetail(updated);
            await cargar(page?.number ?? 0);
        } catch (error) {
            toast({ title: "No fue posible liberar la OF", description: apiError(error), status: "error" });
        } finally {
            setTransitioningId(null);
        }
    };

    const openCorrection = (operation: OrdenFabricacionOperacion) => {
        const firstTarget = [0, 1, 4].find((candidate) => candidate !== operation.estado);
        setCorrectionOperation(operation);
        setCorrectionTarget(firstTarget == null ? "" : String(firstTarget));
        setCorrectionReason("");
    };

    const saveCorrection = async () => {
        if (!correctionOperation || !correctionTarget || !correctionReason.trim()) return;
        setCorrectionSaving(true);
        try {
            await corregirOperacionFabricacion(
                correctionOperation.id,
                correctionOperation.estado,
                Number(correctionTarget),
                correctionReason.trim(),
            );
            const ordenFabricacionId = correctionOperation.ordenFabricacionId;
            setSelectedDetail(await detalleOrdenFabricacion(ordenFabricacionId));
            setCorrectionOperation(null);
            toast({ title: "Corrección registrada en el historial", status: "success" });
            await cargar(page?.number ?? 0);
        } catch (error) {
            toast({ title: "No fue posible corregir la operación", description: apiError(error), status: "error" });
        } finally {
            setCorrectionSaving(false);
        }
    };

    return (
        <VStack align="stretch" gap={5}>
            <Box>
                <Heading size="md">Órdenes de fabricación independientes</Heading>
                <Text mt={1} color="app.textSubtle">
                    Para semiterminados configurados con lote propio. Cada OF congela su manufactura, se ejecuta por áreas y conserva su expediente digital.
                </Text>
            </Box>

            {!batchRecordWorkflowEnabled ? (
                <Alert.Root status={directivesLoading ? "info" : "warning"}>
                    <Alert.Indicator />
                    {directivesLoading
                        ? "Consultando la directiva de Batch Record."
                        : "El flujo de Batch Record está apagado. La creación de OF permanece bloqueada; el histórico continúa disponible."}
                </Alert.Root>
            ) : nivel >= 2 ? (
                <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Heading size="sm" mb={4}>Nueva orden de fabricación independiente</Heading>
                    <Flex gap={3} align="end" flexWrap="wrap">
                        <Field.Root flex="1" minW="260px">
                            <Field.Label>Semiterminado</Field.Label>
                            <Input value={semiSearch} onChange={(event) => setSemiSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void buscarSemis()} placeholder="Código o nombre" />
                        </Field.Root>
                        <Button variant="outline" onClick={() => void buscarSemis()}>Buscar</Button>
                    </Flex>
                    {options.length ? <VStack align="stretch" mt={2} gap={1}>{options.map((option) => (
                        <Button key={option.productoId} size="sm" justifyContent="flex-start" variant={selected?.productoId === option.productoId ? "solid" : "ghost"} colorPalette={selected?.productoId === option.productoId ? "teal" : "gray"} onClick={() => setSelected(option)}>
                            {option.productoId} · {option.nombre} ({option.unidadMedida})
                        </Button>
                    ))}</VStack> : null}
                    {selected ? <Alert.Root status="info" mt={3}><Alert.Indicator />Seleccionado: {selected.productoId} · {selected.nombre}</Alert.Root> : null}

                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mt={4}>
                        <Field.Root required><Field.Label>Cantidad planificada</Field.Label><Input type="number" min="0.0001" step="0.0001" value={cantidad} onChange={(event) => setCantidad(event.target.value)} /></Field.Root>
                        <Field.Root required><Field.Label>Número de lote propio</Field.Label><Input maxLength={80} value={lote} onChange={(event) => setLote(event.target.value)} /></Field.Root>
                        <Field.Root><Field.Label>Fecha de lanzamiento</Field.Label><Input type="datetime-local" value={fechaLanzamiento} onChange={(event) => setFechaLanzamiento(event.target.value)} /></Field.Root>
                        <Field.Root><Field.Label>Fecha final planificada</Field.Label><Input type="datetime-local" value={fechaFinal} onChange={(event) => setFechaFinal(event.target.value)} /></Field.Root>
                    </SimpleGrid>
                    <Field.Root mt={4}><Field.Label>Observaciones</Field.Label><Textarea maxLength={2000} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} /></Field.Root>
                    <HStack justify="flex-end" mt={4}><Button colorPalette="teal" loading={saving} onClick={() => void crear()}>Crear OF y expediente</Button></HStack>
                </Box>
            ) : (
                <Alert.Root status="info"><Alert.Indicator />Su nivel permite consultar, pero no crear ni cancelar órdenes.</Alert.Root>
            )}

            <Flex gap={3} align="end">
                <Field.Root flex="1"><Field.Label>Buscar OF, lote o semiterminado</Field.Label><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void cargar()} /></Field.Root>
                <Button onClick={() => void cargar()} loading={loading}>Buscar</Button>
            </Flex>

            {page?.content.length ? (
                <Box overflowX="auto" borderWidth="1px" borderRadius="md">
                    <Table.Root size="sm"><Table.Header><Table.Row>
                        <Table.ColumnHeader>OF</Table.ColumnHeader><Table.ColumnHeader>Semiterminado</Table.ColumnHeader><Table.ColumnHeader>Lote</Table.ColumnHeader><Table.ColumnHeader>Cantidad</Table.ColumnHeader><Table.ColumnHeader>Origen</Table.ColumnHeader><Table.ColumnHeader>Dispensación</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader />
                    </Table.Row></Table.Header><Table.Body>{page.content.map((orden) => (
                        <Table.Row key={orden.ordenFabricacionId}>
                            <Table.Cell fontWeight="bold">{orden.ordenFabricacionId}</Table.Cell>
                            <Table.Cell>{orden.semiTerminadoId}<Text fontSize="xs" color="app.textSubtle">{orden.semiTerminadoNombre}</Text></Table.Cell>
                            <Table.Cell>{orden.lote}</Table.Cell>
                            <Table.Cell>{orden.cantidadPlanificada} {orden.unidadMedida}</Table.Cell>
                            <Table.Cell>{orden.ordenProduccionOrigenId ? `OP-${orden.ordenProduccionOrigenId}` : "Independiente"}</Table.Cell>
                            <Table.Cell><Badge colorPalette={orden.estadoDispensacionMateriales === "COMPLETA" ? "green" : orden.estadoDispensacionMateriales === "PARCIAL" ? "orange" : "gray"}>{orden.estadoDispensacionMateriales}</Badge></Table.Cell>
                            <Table.Cell><Badge colorPalette={estadoColor(orden.estado)}>{orden.estado}</Badge></Table.Cell>
                            <Table.Cell>
                                <HStack gap={2} justify="flex-end">
                                    <Button size="xs" variant="outline" onClick={() => setSelectedDetail(orden)}>Detalle</Button>
                                    {batchRecordWorkflowEnabled && nivel >= 2 && orden.estado === "PLANIFICADA" ? (
                                        <Button size="xs" colorPalette="teal" loading={transitioningId === orden.ordenFabricacionId} onClick={() => void liberar(orden.ordenFabricacionId)}>Liberar</Button>
                                    ) : null}
                                    {batchRecordWorkflowEnabled && nivel >= 2 && ["BORRADOR", "PLANIFICADA", "LIBERADA"].includes(orden.estado) ? <Button size="xs" colorPalette="red" variant="outline" onClick={() => void cancelar(orden.ordenFabricacionId)}>Cancelar</Button> : null}
                                </HStack>
                            </Table.Cell>
                        </Table.Row>
                    ))}</Table.Body></Table.Root>
                </Box>
            ) : page ? <Alert.Root status="info"><Alert.Indicator />No hay órdenes de fabricación para mostrar.</Alert.Root> : null}

            {page && page.totalPages > 1 ? <HStack justify="flex-end"><Button size="sm" disabled={page.number === 0} onClick={() => void cargar(page.number - 1)}>Anterior</Button><Text>Página {page.number + 1} de {page.totalPages}</Text><Button size="sm" disabled={page.number + 1 >= page.totalPages} onClick={() => void cargar(page.number + 1)}>Siguiente</Button></HStack> : null}

            <Dialog.Root open={Boolean(selectedDetail)} size="xl" scrollBehavior="inside" onOpenChange={(event) => {
                if (!event.open) setSelectedDetail(null);
            }}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar" size="sm" /></Dialog.CloseTrigger>
                            <Dialog.Header><Dialog.Title>Detalle de OF-{selectedDetail?.ordenFabricacionId}</Dialog.Title></Dialog.Header>
                            <Dialog.Body>
                                {selectedDetail ? (
                                    <VStack align="stretch" gap={5}>
                                        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                                            <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Expediente</Text><Text>{selectedDetail.batchRecordCodigo}</Text></Box>
                                            <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Versión manufactura</Text><Text>v{selectedDetail.manufacturingVersionNumber}</Text></Box>
                                            <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Creación</Text><Text>{formatDateTime(selectedDetail.fechaCreacion)}</Text></Box>
                                            <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Lanzamiento</Text><Text>{formatDateTime(selectedDetail.fechaLanzamiento)}</Text></Box>
                                            <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Origen</Text><Text>{selectedDetail.ordenProduccionOrigenId ? `OP-${selectedDetail.ordenProduccionOrigenId}` : "Creación manual independiente"}</Text></Box>
                                            <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Política de inicio</Text><Text>{selectedDetail.politicaDispensacionInicio}</Text></Box>
                                        </SimpleGrid>
                                        <Box>
                                            <Heading size="sm" mb={3}>Ruta operativa congelada</Heading>
                                            <VStack align="stretch" gap={2}>
                                                {selectedDetail.operaciones.map((operacion, index) => (
                                                    <Box key={operacion.id} borderWidth="1px" borderRadius="md" p={3}>
                                                        <HStack justify="space-between" align="start">
                                                            <Box><Text fontWeight="bold">{index + 1}. {operacion.procesoNombre}</Text><Text fontSize="sm" color="app.textMuted">{operacion.areaOperativaNombre}</Text></Box>
                                                            <Badge colorPalette={operacion.estado === 2 ? "green" : operacion.estado === 4 ? "blue" : operacion.estado === 1 ? "yellow" : "gray"}>{operacion.estadoDescripcion}</Badge>
                                                        </HStack>
                                                        <Text mt={2} fontSize="sm">Último cambio: {formatDateTime(operacion.fechaEstadoActual)}</Text>
                                                        {operacion.usuarioReporta ? <Text fontSize="sm">Responsable: {operacion.usuarioReporta}</Text> : null}
                                                        {correctionEnabled
                                                            && nivelMonitoreo >= 3
                                                            && ["LIBERADA", "EN_EJECUCION"].includes(selectedDetail.estado) ? (
                                                                <Button mt={2} size="xs" colorPalette="purple" variant="outline" onClick={() => openCorrection(operacion)}>Corregir estado</Button>
                                                            ) : null}
                                                    </Box>
                                                ))}
                                            </VStack>
                                        </Box>
                                    </VStack>
                                ) : null}
                            </Dialog.Body>
                            <Dialog.Footer><Button variant="outline" onClick={() => setSelectedDetail(null)}>Cerrar</Button></Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            <Dialog.Root open={Boolean(correctionOperation)} size="md" onOpenChange={(event) => {
                if (!event.open && !correctionSaving) setCorrectionOperation(null);
            }}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar" size="sm" /></Dialog.CloseTrigger>
                            <Dialog.Header><Dialog.Title>Corregir estado operativo</Dialog.Title></Dialog.Header>
                            <Dialog.Body>
                                <VStack align="stretch" gap={4}>
                                    <Alert.Root status="warning"><Alert.Indicator />La corrección no borra la evidencia original: agrega un evento firmado al historial.</Alert.Root>
                                    <Box><Text fontWeight="semibold">{correctionOperation?.procesoNombre}</Text><Text fontSize="sm" color="app.textMuted">Estado actual: {correctionOperation?.estadoDescripcion}</Text></Box>
                                    <Field.Root required><Field.Label>Estado destino</Field.Label><NativeSelect.Root><NativeSelect.Field value={correctionTarget} onChange={(event) => setCorrectionTarget(event.target.value)}><option value="">Seleccione</option><option value="0">En cola</option><option value="1">En espera</option><option value="4">En proceso</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                                    <Field.Root required><Field.Label>Motivo documentado</Field.Label><Textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} maxLength={500} /></Field.Root>
                                </VStack>
                            </Dialog.Body>
                            <Dialog.Footer><Button variant="ghost" disabled={correctionSaving} onClick={() => setCorrectionOperation(null)}>Cancelar</Button><Button colorPalette="purple" loading={correctionSaving} disabled={!correctionTarget || !correctionReason.trim()} onClick={() => void saveCorrection()}>Registrar corrección</Button></Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </VStack>
    );
}
