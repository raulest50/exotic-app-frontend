import {
    Alert,
    Badge,
    Box,
    Button,
    Checkbox,
    Field,
    Flex,
    Heading,
    HStack,
    Input,
    SimpleGrid,
    Spinner,
    Table,
    Tabs,
    Text,
    Textarea,
    VStack,
    chakra,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

import { effectiveExactTabNivelFromSnapshot } from "../../auth/accessHelpers";
import { useAccessSnapshot } from "../../auth/usePermissions";
import { useAppToast } from "../../components/ui/use-app-toast";
import QualityControlRegistrationForm from "./ControlCalidad/QualityControlRegistrationForm";
import { apiFailureDetail, qualityControlApi } from "../../features/controles/api";
import { formatControlDate, formatEnumLabel } from "../../features/controles/controlUi";
import StatusBadge from "../../features/controles/StatusBadge";
import type { ControlRequerido, HistorialControlItem } from "../../features/controles/types";
import { Modulo } from "../Usuarios/GestionUsuarios/types";
import { descargarPdfBatchRecord } from "../Produccion/BatchRecords/batchRecordsApi";
import {
    aprobarReaperturaBatchRecord,
    buscarBatchRecordsCalidad,
    decidirBatchRecordCalidad,
    detalleBatchRecordCalidad,
    extractApiError,
    solicitarReaperturaBatchRecord,
} from "./calidadApi";
import type {
    BatchRecordQualityInboxItem,
    BatchRecordQualityReviewDetail,
    DecisionCalidadBatchRecord,
    PageResponse,
} from "./types";

interface LiberacionLotesTabProps {
    workflowEnabled: boolean;
}

type InboxScope = "pendientes" | "archivo";

const PdfFrame = chakra("iframe");

const documentSections = [
    { id: "DATOS_LOTE", label: "Datos del lote y cantidades" },
    { id: "TRAZABILIDAD_CONSUMOS", label: "Trazabilidad de consumos" },
    { id: "REGISTROS_ETAPA", label: "Registros y firmas de etapa" },
    { id: "DOCUMENTO_PDF", label: "Contenido documental / PDF" },
];

const badgePalette = (value?: string | null): "green" | "red" | "orange" | "purple" | "gray" => {
    if (["CONFORME", "APROBADO", "LIBERADO", "APROBADA"].includes(value ?? "")) return "green";
    if (["NO_CONFORME", "RECHAZADO", "RECHAZADA"].includes(value ?? "")) return "red";
    if (["DEVUELTO_PRODUCCION", "EN_CORRECCION", "POR_REVALIDAR"].includes(value ?? "")) return "purple";
    if (!value || ["PENDIENTE_REVISION", "CUARENTENA", "PENDIENTE"].includes(value)) return "orange";
    return "gray";
};

function orderLabel(item: BatchRecordQualityInboxItem) {
    if (item.ordenFabricacionId != null) return `OF-${item.ordenFabricacionId}`;
    if (item.ordenProduccionId != null) return `OP-${item.ordenProduccionId}`;
    return "Orden sin identificar";
}

function toggleId(current: number[], id: number, checked: boolean) {
    return checked ? [...new Set([...current, id])] : current.filter((value) => value !== id);
}

function toggleText(current: string[], id: string, checked: boolean) {
    return checked ? [...new Set([...current, id])] : current.filter((value) => value !== id);
}

export default function LiberacionLotesTab({ workflowEnabled }: LiberacionLotesTabProps) {
    const toast = useAppToast();
    const access = useAccessSnapshot();
    const decisionLevel = effectiveExactTabNivelFromSnapshot(access, Modulo.CALIDAD, "REVISION_LIBERACION_LOTES");
    const registerLevel = effectiveExactTabNivelFromSnapshot(access, Modulo.CALIDAD, "REGISTRAR_CONTROL_CALIDAD");
    const historyLevel = effectiveExactTabNivelFromSnapshot(access, Modulo.CALIDAD, "HISTORIAL_CONTROL_CALIDAD");
    const [scope, setScope] = useState<InboxScope>(workflowEnabled ? "pendientes" : "archivo");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState<PageResponse<BatchRecordQualityInboxItem> | null>(null);
    const [detail, setDetail] = useState<BatchRecordQualityReviewDetail | null>(null);
    const [qualityRequirements, setQualityRequirements] = useState<ControlRequerido[]>([]);
    const [qualityHistory, setQualityHistory] = useState<HistorialControlItem[]>([]);
    const [selectedRequirement, setSelectedRequirement] = useState<ControlRequerido | null>(null);
    const [reason, setReason] = useState("");
    const [selectedStages, setSelectedStages] = useState<number[]>([]);
    const [selectedRequirements, setSelectedRequirements] = useState<number[]>([]);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [reopenReason, setReopenReason] = useState("");
    const [reopenEvidence, setReopenEvidence] = useState("");
    const [reopenScope, setReopenScope] = useState("");
    const [approvalReason, setApprovalReason] = useState("");
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [acting, setActing] = useState(false);

    useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
    useEffect(() => { if (!workflowEnabled) setScope("archivo"); }, [workflowEnabled]);

    const load = async (nextPage = 0, nextScope = scope) => {
        if (nextScope === "pendientes" && !workflowEnabled) return;
        setLoading(true);
        try {
            setPage(await buscarBatchRecordsCalidad({ scope: nextScope, search: search.trim() || undefined, page: nextPage, size: 20 }));
        } catch (error) {
            toast({ title: "No fue posible cargar los expedientes", description: extractApiError(error, "Error de consulta."), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (scope === "pendientes" && !workflowEnabled) return;
        let mounted = true;
        setLoading(true);
        buscarBatchRecordsCalidad({ scope, page: 0, size: 20 })
            .then((next) => mounted && setPage(next))
            .catch((error) => mounted && toast({ title: "No fue posible cargar los expedientes", description: extractApiError(error, "Error de consulta."), status: "error" }))
            .finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [scope, toast, workflowEnabled]);

    const loadQualityEvidence = async (batchRecordId: number) => {
        const [pendingResult, historyResult] = await Promise.allSettled([
            registerLevel >= 1
                ? qualityControlApi.listPendientes({ batchRecordId, page: 0, size: 100 })
                : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 100 }),
            historyLevel >= 1
                ? qualityControlApi.listHistorial({ batchRecordId, page: 0, size: 100 })
                : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 100 }),
        ]);
        setQualityRequirements(pendingResult.status === "fulfilled" ? pendingResult.value.content : []);
        setQualityHistory(historyResult.status === "fulfilled" ? historyResult.value.content : []);
        if (pendingResult.status === "rejected" || historyResult.status === "rejected") {
            toast({ title: "Expediente abierto con evidencia parcial", description: "No fue posible cargar toda la evidencia del motor de Calidad.", status: "warning" });
        }
    };

    const openRecord = async (id: number) => {
        setLoading(true);
        try {
            const nextDetail = await detalleBatchRecordCalidad(id);
            setDetail(nextDetail);
            setReason("");
            setSelectedStages([]);
            setSelectedRequirements([]);
            setSelectedSections([]);
            setSelectedRequirement(null);
            setReopenReason("");
            setReopenEvidence("");
            setReopenScope("");
            setApprovalReason("");
            setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
            await loadQualityEvidence(id);
        } catch (error) {
            toast({ title: "No fue posible abrir el expediente", description: extractApiError(error, "Error de consulta."), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    const refreshDetail = async () => {
        if (!detail) return;
        const id = detail.evaluacion.batchRecordId;
        setDetail(await detalleBatchRecordCalidad(id));
        await Promise.all([loadQualityEvidence(id), load(page?.number ?? 0)]);
    };

    const decide = async (decision: DecisionCalidadBatchRecord) => {
        if (!detail || !reason.trim()) {
            toast({ title: "La justificación es obligatoria", status: "warning" });
            return;
        }
        if (decision === "DEVOLVER_A_PRODUCCION"
            && selectedStages.length + selectedRequirements.length + selectedSections.length === 0) {
            toast({ title: "Seleccione el alcance de la devolución", status: "warning" });
            return;
        }
        setActing(true);
        try {
            const updated = await decidirBatchRecordCalidad(
                detail.evaluacion.batchRecordId,
                decision,
                reason.trim(),
                decision === "DEVOLVER_A_PRODUCCION" ? {
                    etapaIds: selectedStages,
                    requisitoIds: selectedRequirements,
                    seccionesDocumentales: selectedSections,
                } : {},
            );
            setDetail(updated);
            setReason("");
            setSelectedRequirement(null);
            await Promise.all([loadQualityEvidence(detail.evaluacion.batchRecordId), load(0)]);
            toast({ title: `Decisión registrada: ${formatEnumLabel(decision)}`, status: decision === "LIBERAR" ? "success" : "info" });
        } catch (error) {
            const failure = apiFailureDetail(error, "No fue posible registrar la decisión.");
            toast({ title: "Decisión rechazada", description: [failure.message, ...failure.bloqueos].join(" · "), status: "error" });
        } finally {
            setActing(false);
        }
    };

    const requestReopening = async () => {
        if (!detail || !reopenReason.trim() || !reopenEvidence.trim() || !reopenScope.trim()) return;
        setActing(true);
        try {
            setDetail(await solicitarReaperturaBatchRecord(detail.evaluacion.batchRecordId, {
                motivo: reopenReason.trim(),
                evidencia: reopenEvidence.trim(),
                alcance: reopenScope.trim(),
            }));
            setReopenReason("");
            setReopenEvidence("");
            setReopenScope("");
            toast({ title: "Solicitud de reapertura registrada", description: "Debe aprobarla otra persona con nivel 3.", status: "success" });
            await load(0, "archivo");
        } catch (error) {
            toast({ title: "No fue posible solicitar la reapertura", description: extractApiError(error, "Error de operación."), status: "error" });
        } finally {
            setActing(false);
        }
    };

    const approveReopening = async (requestId: number) => {
        if (!detail || !approvalReason.trim()) return;
        setActing(true);
        try {
            setDetail(await aprobarReaperturaBatchRecord(detail.evaluacion.batchRecordId, requestId, approvalReason.trim()));
            setApprovalReason("");
            toast({ title: "Reapertura aprobada", description: "El rechazo se conserva y el lote vuelve a cuarentena.", status: "success" });
            await load(0, "archivo");
        } catch (error) {
            toast({ title: "No fue posible aprobar", description: extractApiError(error, "Debe aprobar una persona distinta a quien solicitó."), status: "error" });
        } finally {
            setActing(false);
        }
    };

    const viewPdf = async () => {
        if (!detail) return;
        try {
            const result = await descargarPdfBatchRecord(detail.evaluacion.batchRecordId, undefined, detail.evaluacion.estado === "PENDIENTE_REVISION");
            setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(result.blob); });
        } catch (error) {
            toast({ title: "No fue posible reconstruir el PDF", description: extractApiError(error, "Error documental."), status: "error" });
        }
    };

    const processControls = detail?.controlesProceso.filter((item) => item.ambito === "PROCESO") ?? [];
    const canRelease = Boolean(detail?.evaluacion.puedeLiberar);

    return (
        <VStack align="stretch" gap={5}>
            <Box><Heading size="md">Revisión y liberación de lotes</Heading><Text mt={1} color="fg.muted">Los controles de proceso son evidencia de solo lectura; Calidad únicamente ejecuta sus propios ensayos.</Text></Box>
            {!workflowEnabled && <Alert.Root status="info"><Alert.Indicator /><Box><Text fontWeight="semibold">Flujo de Batch Record desactivado</Text><Text fontSize="sm">La bandeja pendiente no recibe nuevos expedientes. El archivo regulatorio continúa disponible.</Text></Box></Alert.Root>}

            <Tabs.Root value={scope} onValueChange={({ value }) => setScope(value as InboxScope)} variant="enclosed" lazyMount>
                <Tabs.List><Tabs.Trigger value="pendientes" disabled={!workflowEnabled}>Pendientes</Tabs.Trigger><Tabs.Trigger value="archivo">Archivo</Tabs.Trigger></Tabs.List>
                <Tabs.Content value={scope} px={0}>
                    <Flex gap={3} align="end" flexWrap="wrap" mb={4}><Field.Root flex="1" minW={{ base: "full", md: "280px" }}><Field.Label>Buscar expediente</Field.Label><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} placeholder="OP, OF, lote, código o producto" /></Field.Root><Button loading={loading} onClick={() => void load()}>Buscar</Button></Flex>
                    <Box borderWidth="1px" borderRadius="lg" overflowX="auto"><Table.Root size="sm" minW="880px"><Table.Header><Table.Row><Table.ColumnHeader>Orden / lote</Table.ColumnHeader><Table.ColumnHeader>Producto</Table.ColumnHeader><Table.ColumnHeader>Ciclo</Table.ColumnHeader><Table.ColumnHeader>Evidencia</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader>Enviado</Table.ColumnHeader><Table.ColumnHeader /></Table.Row></Table.Header><Table.Body>{page?.content.map((item) => <Table.Row key={item.batchRecordId}><Table.Cell><Text fontWeight="bold">{orderLabel(item)}</Text><Text fontSize="sm">{item.lote} · {item.codigo}</Text></Table.Cell><Table.Cell>{item.productoId}<Text fontSize="xs" color="fg.muted">{item.productoNombre}</Text></Table.Cell><Table.Cell>{item.cicloRevisionActual ?? "—"}<Text fontSize="xs" color="fg.muted">{item.estadoCicloRevision ? formatEnumLabel(item.estadoCicloRevision) : "Sin ciclo"}</Text></Table.Cell><Table.Cell><Badge colorPalette={item.controlesPendientes ? "orange" : "green"}>{item.controlesConformes}/{item.controlesRequeridos}</Badge><Badge ml={1} colorPalette={item.desviacionesAbiertas ? "red" : "gray"}>{item.desviacionesAbiertas} desv.</Badge></Table.Cell><Table.Cell><Badge colorPalette={badgePalette(item.estado)}>{formatEnumLabel(item.estado)}</Badge></Table.Cell><Table.Cell>{formatControlDate(item.enviadoRevisionEn)}</Table.Cell><Table.Cell textAlign="end"><Button size="xs" onClick={() => void openRecord(item.batchRecordId)}>Revisar</Button></Table.Cell></Table.Row>)}</Table.Body></Table.Root>{!loading && page?.content.length === 0 && <Alert.Root status="info" m={4}><Alert.Indicator />No hay expedientes en esta vista.</Alert.Root>}{loading && !page && <HStack justify="center" py={8}><Spinner size="sm" /><Text>Cargando…</Text></HStack>}</Box>
                    {page && page.totalPages > 1 && <HStack justify="flex-end" mt={3}><Button size="sm" disabled={page.number === 0} onClick={() => void load(page.number - 1)}>Anterior</Button><Text fontSize="sm">Página {page.number + 1} de {page.totalPages}</Text><Button size="sm" disabled={page.number + 1 >= page.totalPages} onClick={() => void load(page.number + 1)}>Siguiente</Button></HStack>}
                </Tabs.Content>
            </Tabs.Root>

            {detail && <VStack align="stretch" gap={4} borderTopWidth="1px" pt={5}>
                <Flex justify="space-between" flexWrap="wrap" gap={3}><Box><Heading size="md">{orderLabel(detail.evaluacion)} · lote {detail.evaluacion.lote}</Heading><Text color="fg.muted">{detail.evaluacion.productoId} · {detail.evaluacion.productoNombre}</Text></Box><HStack><Badge colorPalette={badgePalette(detail.evaluacion.estado)}>{formatEnumLabel(detail.evaluacion.estado)}</Badge><Badge colorPalette={badgePalette(detail.evaluacion.estadoCalidadLote)}>{detail.evaluacion.estadoCalidadLote}</Badge></HStack></Flex>
                <SimpleGrid columns={{ base: 1, md: 4 }} gap={3}><Box borderWidth="1px" p={3} borderRadius="md"><Text fontSize="sm" color="fg.muted">Ciclo de revisión</Text><Text fontWeight="bold">{detail.evaluacion.cicloRevisionActual ?? "—"}</Text><Text fontSize="xs" color="fg.muted">{detail.evaluacion.origenCicloRevision ? formatEnumLabel(detail.evaluacion.origenCicloRevision) : "Origen no disponible"}</Text></Box><Box borderWidth="1px" p={3} borderRadius="md"><Text fontSize="sm" color="fg.muted">Cantidad obtenida</Text><Text fontWeight="bold">{detail.evaluacion.cantidadObtenida} {detail.evaluacion.unidadMedida}</Text></Box><Box borderWidth="1px" p={3} borderRadius="md"><Text fontSize="sm" color="fg.muted">Firmas</Text><Text fontWeight="bold">{detail.expediente.firmas.length}</Text></Box><Box borderWidth="1px" p={3} borderRadius="md"><Text fontSize="sm" color="fg.muted">Correcciones</Text><Text fontWeight="bold">{detail.expediente.correcciones.length}</Text></Box></SimpleGrid>

                {detail.evaluacion.bloqueos.length ? <Alert.Root status="warning"><Alert.Indicator /><Box><Text fontWeight="semibold">Bloqueos para liberar</Text>{detail.evaluacion.bloqueos.map((item) => <Text key={item} fontSize="sm">• {item}</Text>)}</Box></Alert.Root> : <Alert.Root status="success"><Alert.Indicator />Las validaciones automáticas no reportan bloqueos.</Alert.Root>}

                <Box borderWidth="1px" borderRadius="md" p={4}><Heading size="sm" mb={1}>Controles de proceso · solo lectura</Heading><Text fontSize="sm" color="fg.muted" mb={3}>Fueron ejecutados por Dirección Técnica y de Planta durante la fabricación.</Text><VStack align="stretch" gap={2}>{processControls.length ? processControls.map((control) => <Flex key={control.requisitoId} borderWidth="1px" borderRadius="md" p={3} justify="space-between" align={{ base: "stretch", md: "center" }} flexDir={{ base: "column", md: "row" }} gap={2}><Box><Text fontWeight="semibold">{control.planCodigo} · {control.planNombre}</Text><Text fontSize="sm" color="fg.muted">{control.areaNombre ?? "Lote final"}{control.etapaNombre ? ` · ${control.etapaNombre}` : ""} · versión {control.versionNumero}</Text>{control.ultimaEjecucionId && <Text fontSize="xs" color="fg.muted">Última ejecución #{control.ultimaEjecucionId} · {formatControlDate(control.ultimaEjecucionFecha)} · {control.ultimaEjecucionUsuario ?? "usuario no disponible"}</Text>}</Box><StatusBadge status={control.estado} /></Flex>) : <Text color="fg.muted">El expediente no contiene controles de proceso.</Text>}</VStack></Box>

                <Box borderWidth="1px" borderRadius="md" p={4}><Heading size="sm" mb={1}>Ensayos de Calidad del ciclo</Heading><Text fontSize="sm" color="fg.muted" mb={3}>Los resultados anteriores por revalidar se conservan; confirme su vigencia o repita el ensayo desde esta sección.</Text><VStack align="stretch" gap={2}>{qualityRequirements.map((requirement) => <Flex key={requirement.id} borderWidth="1px" borderRadius="md" p={3} justify="space-between" align={{ base: "stretch", md: "center" }} flexDir={{ base: "column", md: "row" }} gap={2}><Box><Text fontWeight="semibold">{requirement.planCodigo} · {requirement.planNombre}</Text><Text fontSize="sm" color="fg.muted">{formatEnumLabel(requirement.momentoEjecucion)} · v{requirement.versionNumero}</Text></Box><HStack><StatusBadge status={requirement.estado} />{registerLevel >= 2 && <Button size="xs" colorPalette="purple" onClick={() => setSelectedRequirement(requirement)}>{requirement.estado === "POR_REVALIDAR" ? "Revalidar / repetir" : "Registrar ensayo"}</Button>}</HStack></Flex>)}{qualityHistory.map((execution) => <Flex key={`history-${execution.id}`} borderWidth="1px" borderRadius="md" p={3} justify="space-between" gap={2}><Box><Text fontWeight="semibold">{execution.planCodigo} · ejecución #{execution.id}</Text><Text fontSize="sm" color="fg.muted">{formatControlDate(execution.fechaRegistro)} · {execution.usuarioNombreCompleto || execution.usuarioUsername}</Text></Box><StatusBadge status={execution.estado} /></Flex>)}{!qualityRequirements.length && !qualityHistory.length && <Text color="fg.muted">No hay ensayos de Calidad materializados para este expediente.</Text>}</VStack></Box>

                {selectedRequirement && <Box borderWidth="1px" borderRadius="md" p={{ base: 3, md: 4 }}><QualityControlRegistrationForm key={selectedRequirement.id} requirement={selectedRequirement} onCancel={() => setSelectedRequirement(null)} onSaved={() => { setSelectedRequirement(null); void refreshDetail(); }} /></Box>}

                <Box borderWidth="1px" borderRadius="md" p={4}><HStack justify="space-between" mb={3}><Heading size="sm">Vista documental</Heading><Button size="sm" variant="outline" onClick={() => void viewPdf()}>Reconstruir PDF</Button></HStack>{pdfUrl ? <PdfFrame src={pdfUrl} title="Batch record para revisión" w="full" h={{ base: "480px", lg: "720px" }} borderWidth="1px" /> : <Text color="fg.muted">Abra el PDF para revisar el expediente completo y sus firmas.</Text>}</Box>

                {detail.evaluacion.estado === "PENDIENTE_REVISION" && <Box borderWidth="1px" borderRadius="md" p={4}><Heading size="sm" mb={3}>Decisión individual de Calidad</Heading><Field.Root required><Field.Label>Justificación</Field.Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></Field.Root>{decisionLevel >= 2 && <Box mt={4} bg="bg.subtle" borderRadius="md" p={3}><Text fontWeight="semibold" mb={2}>Alcance de una devolución</Text><SimpleGrid columns={{ base: 1, lg: 3 }} gap={4}><VStack align="stretch"><Text fontSize="sm" fontWeight="semibold">Etapas</Text>{detail.expediente.etapas.map((stage) => <Checkbox.Root key={stage.id} checked={selectedStages.includes(stage.id)} onCheckedChange={({ checked }) => setSelectedStages((current) => toggleId(current, stage.id, checked === true))}><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>{stage.nombre}</Checkbox.Label></Checkbox.Root>)}</VStack><VStack align="stretch"><Text fontSize="sm" fontWeight="semibold">Controles de proceso</Text>{processControls.map((control) => <Checkbox.Root key={control.requisitoId} checked={selectedRequirements.includes(control.requisitoId)} onCheckedChange={({ checked }) => setSelectedRequirements((current) => toggleId(current, control.requisitoId, checked === true))}><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>{control.planCodigo} · {control.etapaNombre ?? "lote final"}</Checkbox.Label></Checkbox.Root>)}</VStack><VStack align="stretch"><Text fontSize="sm" fontWeight="semibold">Secciones documentales</Text>{documentSections.map((section) => <Checkbox.Root key={section.id} checked={selectedSections.includes(section.id)} onCheckedChange={({ checked }) => setSelectedSections((current) => toggleText(current, section.id, checked === true))}><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>{section.label}</Checkbox.Label></Checkbox.Root>)}</VStack></SimpleGrid></Box>}<HStack justify="flex-end" mt={4} flexWrap="wrap">{decisionLevel >= 2 && <><Button colorPalette="orange" variant="outline" loading={acting} onClick={() => void decide("DEVOLVER_A_PRODUCCION")}>Devolver alcance seleccionado</Button><Button colorPalette="red" variant="outline" loading={acting} onClick={() => void decide("RECHAZAR")}>Rechazar lote</Button></>}{decisionLevel >= 3 && <Button colorPalette="green" loading={acting} disabled={!canRelease} onClick={() => void decide("LIBERAR")}>Liberar lote</Button>}</HStack></Box>}

                {detail.evaluacion.estado === "RECHAZADO" && <Box borderWidth="1px" borderRadius="md" p={4}><Heading size="sm" mb={2}>Reapertura excepcional de rechazo</Heading><Alert.Root status="warning" mb={3}><Alert.Indicator />La solicitud no elimina el rechazo ni sus firmas y requiere aprobación de otra persona.</Alert.Root>{decisionLevel >= 2 && <SimpleGrid columns={{ base: 1, lg: 3 }} gap={3}><Field.Root required><Field.Label>Motivo</Field.Label><Textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} maxLength={500} /></Field.Root><Field.Root required><Field.Label>Evidencia</Field.Label><Textarea value={reopenEvidence} onChange={(event) => setReopenEvidence(event.target.value)} maxLength={4000} /></Field.Root><Field.Root required><Field.Label>Alcance</Field.Label><Textarea value={reopenScope} onChange={(event) => setReopenScope(event.target.value)} maxLength={4000} /></Field.Root></SimpleGrid>}{decisionLevel >= 2 && <Button mt={3} colorPalette="orange" variant="outline" loading={acting} disabled={!reopenReason.trim() || !reopenEvidence.trim() || !reopenScope.trim()} onClick={() => void requestReopening()}>Solicitar reapertura</Button>}{detail.expediente.solicitudesReapertura?.filter((request) => request.estado === "PENDIENTE").map((request) => <Box key={request.id} mt={4} borderTopWidth="1px" pt={3}><Text fontWeight="semibold">Solicitud #{request.id} · ciclo {request.cicloRevisionNumero} · por {request.solicitadaPor}</Text><Text fontSize="sm">{request.motivo}</Text>{decisionLevel >= 3 && <HStack mt={2} align="end"><Field.Root flex="1" required><Field.Label>Justificación de aprobación</Field.Label><Textarea value={approvalReason} onChange={(event) => setApprovalReason(event.target.value)} maxLength={500} /></Field.Root><Button colorPalette="purple" loading={acting} disabled={!approvalReason.trim()} onClick={() => void approveReopening(request.id)}>Aprobar como segundo usuario</Button></HStack>}</Box>)}</Box>}
            </VStack>}
        </VStack>
    );
}
