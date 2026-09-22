import {
    Alert,
    Badge,
    Box,
    Button,
    Flex,
    Field,
    Heading,
    HStack,
    Input,
    NativeSelect,
    SimpleGrid,
    Spinner,
    Table,
    Text,
    Textarea,
    VStack,
    chakra,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useEffect, useState } from "react";
import { getExactTabNivel } from "../../../auth/accessHelpers";
import { useAuth } from "../../../context/AuthContext";
import ProcessControlRegistrationForm from "../ControlProcesos/ProcessControlRegistrationForm";
import { apiFailureDetail, processControlApi } from "../../../features/controles/api";
import { formatControlDate } from "../../../features/controles/controlUi";
import StatusBadge from "../../../features/controles/StatusBadge";
import type { ControlRequerido, HistorialControlItem } from "../../../features/controles/types";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";
import {
    atenderSeccionCorreccion,
    buscarBatchRecords,
    descargarPdfBatchRecord,
    detalleBatchRecord,
    enviarBatchRecordCalidad,
    prevalidarEnvioBatchRecord,
    reenviarBatchRecordCalidad,
} from "./batchRecordsApi";
import type { BatchRecordDetail, BatchRecordListItem, BatchRecordSendPrevalidation, PageResponse } from "./types";

const PdfFrame = chakra("iframe");

function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message ?? error.message;
    }
    return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function fecha(value?: string | null): string {
    return value ? new Date(value).toLocaleString("es-CO") : "—";
}

function palette(estado: string): "green" | "red" | "orange" | "gray" {
    if (["APROBADO", "CERRADO", "CONFORME", "LIBERADO", "ACTUALIZADO"].includes(estado)) return "green";
    if (["RECHAZADO", "ANULADO", "NO_CONFORME"].includes(estado)) return "red";
    if (["LISTO_PARA_REVISION", "PENDIENTE_REVISION", "DEVUELTO_PRODUCCION", "EN_CORRECCION", "PENDIENTE", "SINCRONIZANDO", "INCOMPLETO", "ERROR"].includes(estado)) return "orange";
    return "gray";
}

export default function BatchRecordsTab() {
    const toast = useAppToast();
    const { moduloAccesos } = useAuth();
    const nivelExpedientes = getExactTabNivel(moduloAccesos, Modulo.PRODUCCION, "CONSULTAR_BATCH_RECORD") ?? 0;
    const nivelControlesProceso = getExactTabNivel(
        moduloAccesos, Modulo.PRODUCCION, "REGISTRAR_CONTROL_PROCESO",
    ) ?? 0;
    const nivelHistorialProceso = getExactTabNivel(
        moduloAccesos, Modulo.PRODUCCION, "HISTORIAL_CONTROL_PROCESO",
    ) ?? 0;
    const [ordenInput, setOrdenInput] = useState("");
    const [loteInput, setLoteInput] = useState("");
    const [page, setPage] = useState<PageResponse<BatchRecordListItem> | null>(null);
    const [detail, setDetail] = useState<BatchRecordDetail | null>(null);
    const [revision, setRevision] = useState<string>("");
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [motivoEnvio, setMotivoEnvio] = useState("");
    const [sending, setSending] = useState(false);
    const [prevalidation, setPrevalidation] = useState<BatchRecordSendPrevalidation | null>(null);
    const [prevalidating, setPrevalidating] = useState(false);
    const [correctionReasons, setCorrectionReasons] = useState<Record<number, string>>({});
    const [attendingSectionId, setAttendingSectionId] = useState<number | null>(null);
    const [processRequirements, setProcessRequirements] = useState<ControlRequerido[]>([]);
    const [processHistory, setProcessHistory] = useState<HistorialControlItem[]>([]);
    const [selectedProcessRequirement, setSelectedProcessRequirement] = useState<ControlRequerido | null>(null);

    useEffect(() => () => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    }, [pdfUrl]);

    const buscar = async (nextPage = 0) => {
        const orden = ordenInput.trim();
        if (orden && (!/^\d+$/.test(orden) || Number(orden) <= 0)) {
            toast({ title: "OP inválida", description: "Ingrese un número entero positivo.", status: "warning" });
            return;
        }
        setLoading(true);
        try {
            setPage(await buscarBatchRecords({
                ordenProduccionId: orden ? Number(orden) : undefined,
                lote: loteInput.trim() || undefined,
                page: nextPage,
                size: 20,
            }));
        } catch (error) {
            toast({ title: "No fue posible consultar", description: errorMessage(error), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    const refreshPrevalidation = async (current = detail) => {
        if (!current || !["LISTO_PARA_REVISION", "DEVUELTO_PRODUCCION", "EN_CORRECCION"].includes(current.resumen.estado)) {
            setPrevalidation(null);
            return;
        }
        setPrevalidating(true);
        try {
            setPrevalidation(await prevalidarEnvioBatchRecord(
                current.resumen.id,
                current.resumen.estado !== "LISTO_PARA_REVISION",
            ));
        } catch (error) {
            setPrevalidation(null);
            toast({ title: "No fue posible prevalidar el envío", description: errorMessage(error), status: "error" });
        } finally {
            setPrevalidating(false);
        }
    };

    const loadProcessEvidence = async (batchRecordId: number) => {
        if (nivelControlesProceso < 1 && nivelHistorialProceso < 1) {
            setProcessRequirements([]);
            setProcessHistory([]);
            return;
        }
        const [pendingResult, historyResult] = await Promise.allSettled([
            nivelControlesProceso >= 1
                ? processControlApi.listPendientes({ batchRecordId, page: 0, size: 100 })
                : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 100 }),
            nivelHistorialProceso >= 1
                ? processControlApi.listHistorial({ batchRecordId, page: 0, size: 100 })
                : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 100 }),
        ]);
        setProcessRequirements(pendingResult.status === "fulfilled" ? pendingResult.value.content : []);
        setProcessHistory(historyResult.status === "fulfilled" ? historyResult.value.content : []);
        if (pendingResult.status === "rejected" || historyResult.status === "rejected") {
            const cause = pendingResult.status === "rejected"
                ? pendingResult.reason
                : historyResult.status === "rejected" ? historyResult.reason : null;
            toast({
                title: "Evidencia de proceso incompleta",
                description: apiFailureDetail(cause, "No fue posible cargar todos los controles neutrales.").message,
                status: "warning",
            });
        }
    };

    const atenderSeccion = async (sectionId: number) => {
        if (!detail) return;
        const justificacion = correctionReasons[sectionId]?.trim();
        if (!justificacion) {
            toast({ title: "La justificación es obligatoria", status: "warning" });
            return;
        }
        setAttendingSectionId(sectionId);
        try {
            const updated = await atenderSeccionCorreccion(detail.resumen.id, sectionId, justificacion);
            setDetail(updated);
            setCorrectionReasons((current) => ({ ...current, [sectionId]: "" }));
            await Promise.all([refreshPrevalidation(updated), loadProcessEvidence(updated.resumen.id), buscar(page?.number ?? 0)]);
            toast({ title: "Sección documental atendida", description: "La justificación quedó registrada en el ciclo de corrección.", status: "success" });
        } catch (error) {
            toast({ title: "No fue posible atender la sección", description: errorMessage(error), status: "error" });
        } finally {
            setAttendingSectionId(null);
        }
    };

    const abrir = async (item: BatchRecordListItem) => {
        setLoadingDetail(true);
        setPdfUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return null;
        });
        try {
            const data = await detalleBatchRecord(item.id);
            setDetail(data);
            setMotivoEnvio("");
            setCorrectionReasons({});
            setSelectedProcessRequirement(null);
            await Promise.all([refreshPrevalidation(data), loadProcessEvidence(data.resumen.id)]);
            const latest = data.revisiones[data.revisiones.length - 1];
            setRevision(latest ? String(latest.numero) : "actual");
        } catch (error) {
            toast({ title: "No fue posible abrir el expediente", description: errorMessage(error), status: "error" });
        } finally {
            setLoadingDetail(false);
        }
    };

    const enviarRevision = async () => {
        if (!detail || !motivoEnvio.trim()) {
            toast({ title: "El motivo es obligatorio", status: "warning" });
            return;
        }
        setSending(true);
        try {
            const isResubmission = ["DEVUELTO_PRODUCCION", "EN_CORRECCION"].includes(detail.resumen.estado);
            const updated = isResubmission
                ? await reenviarBatchRecordCalidad(detail.resumen.id, motivoEnvio.trim())
                : await enviarBatchRecordCalidad(detail.resumen.id, motivoEnvio.trim());
            setDetail(updated);
            setPrevalidation(null);
            setMotivoEnvio("");
            await buscar(page?.number ?? 0);
            toast({
                title: isResubmission ? "Expediente reenviado a Calidad" : "Expediente enviado a Calidad",
                description: "Se creó una revisión inmutable firmada con la sesión autenticada.",
                status: "success",
            });
        } catch (error) {
            const message = errorMessage(error);
            const body = axios.isAxiosError(error) ? error.response?.data as { bloqueos?: Array<{ mensaje?: string } | string> } | undefined : undefined;
            const bloqueos = (body?.bloqueos ?? []).map((item) => typeof item === "string" ? item : item.mensaje ?? "Bloqueo sin descripción");
            toast({ title: "No fue posible enviar el expediente", description: [message, ...bloqueos].join(" · "), status: "error" });
        } finally {
            setSending(false);
        }
    };

    const cargarPdf = async (download: boolean) => {
        if (!detail) return;
        setLoadingPdf(true);
        try {
            const result = await descargarPdfBatchRecord(
                detail.resumen.id,
                revision === "actual" ? undefined : Number(revision),
                revision === "actual",
            );
            if (download) {
                const url = URL.createObjectURL(result.blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = result.filename;
                anchor.click();
                URL.revokeObjectURL(url);
            } else {
                setPdfUrl((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return URL.createObjectURL(result.blob);
                });
            }
        } catch (error) {
            toast({ title: "No fue posible generar el PDF", description: errorMessage(error), status: "error" });
        } finally {
            setLoadingPdf(false);
        }
    };

    return (
        <VStack align="stretch" gap={5}>
            <Box>
                <Heading size="md">Expedientes digitales de fabricación</Heading>
                <Text color="app.textSubtle" mt={1}>
                    Consulte por OP o lote. El expediente documenta la historia disponible y no autoriza ni bloquea la operación del lote.
                </Text>
            </Box>

            <Flex gap={3} align="end" flexWrap="wrap">
                <Field.Root minW="180px">
                    <Field.Label>Orden de producción</Field.Label>
                    <Input value={ordenInput} onChange={(event) => setOrdenInput(event.target.value)} placeholder="Ej. 1234" />
                </Field.Root>
                <Field.Root flex="1" minW="220px">
                    <Field.Label>Número de lote</Field.Label>
                    <Input
                        value={loteInput}
                        onChange={(event) => setLoteInput(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && void buscar()}
                        placeholder="Búsqueda parcial"
                    />
                </Field.Root>
                <Button colorPalette="teal" onClick={() => void buscar()} loading={loading}>Buscar</Button>
            </Flex>

            {page && page.content.length === 0 ? (
                <Alert.Root status="info"><Alert.Indicator />No se encontraron expedientes.</Alert.Root>
            ) : null}

            {page?.content.length ? (
                <Box overflowX="auto" borderWidth="1px" borderRadius="md">
                    <Table.Root size="sm">
                        <Table.Header><Table.Row>
                            <Table.ColumnHeader>Código</Table.ColumnHeader>
                            <Table.ColumnHeader>OP / OF</Table.ColumnHeader>
                            <Table.ColumnHeader>Lote</Table.ColumnHeader>
                            <Table.ColumnHeader>Producto</Table.ColumnHeader>
                            <Table.ColumnHeader>Expediente</Table.ColumnHeader>
                            <Table.ColumnHeader>Sincronización</Table.ColumnHeader>
                            <Table.ColumnHeader />
                        </Table.Row></Table.Header>
                        <Table.Body>{page.content.map((item) => (
                            <Table.Row key={item.id}>
                                <Table.Cell fontWeight="semibold">{item.codigo}</Table.Cell>
                                <Table.Cell>{item.ordenProduccionId ? `OP ${item.ordenProduccionId}` : `OF ${item.ordenFabricacionId}`}</Table.Cell>
                                <Table.Cell>{item.lote}</Table.Cell>
                                <Table.Cell>{item.productoId} · {item.productoNombre}</Table.Cell>
                                <Table.Cell><Badge colorPalette={palette(item.estado)}>{item.estado}</Badge></Table.Cell>
                                <Table.Cell><Badge colorPalette={palette(item.estadoSincronizacion)}>{item.estadoSincronizacion}</Badge></Table.Cell>
                                <Table.Cell><Button size="xs" variant="outline" onClick={() => void abrir(item)}>Abrir</Button></Table.Cell>
                            </Table.Row>
                        ))}</Table.Body>
                    </Table.Root>
                </Box>
            ) : null}

            {page && page.totalPages > 1 ? (
                <HStack justify="flex-end">
                    <Button size="sm" variant="outline" disabled={page.number === 0} onClick={() => void buscar(page.number - 1)}>Anterior</Button>
                    <Text fontSize="sm">Página {page.number + 1} de {page.totalPages}</Text>
                    <Button size="sm" variant="outline" disabled={page.number + 1 >= page.totalPages} onClick={() => void buscar(page.number + 1)}>Siguiente</Button>
                </HStack>
            ) : null}

            {loadingDetail ? <Spinner alignSelf="center" /> : null}
            {detail ? (
                <VStack align="stretch" gap={4} borderTopWidth="1px" pt={5}>
                    <Flex justify="space-between" gap={3} flexWrap="wrap">
                        <Box>
                            <Heading size="md">{detail.resumen.codigo}</Heading>
                            <Text color="app.textSubtle">{detail.resumen.productoId} · {detail.resumen.productoNombre} · lote {detail.resumen.lote}</Text>
                        </Box>
                        <HStack>
                            <Badge colorPalette={palette(detail.resumen.estado)}>Expediente: {detail.resumen.estado}</Badge>
                            <Badge colorPalette={palette(detail.resumen.estadoSincronizacion)}>Sincronización: {detail.resumen.estadoSincronizacion}</Badge>
                            <Badge colorPalette={palette(detail.resumen.estadoCalidadLote)}>Calidad: {detail.resumen.estadoCalidadLote}</Badge>
                        </HStack>
                    </Flex>

                    {detail.resumen.advertenciasDocumentales.length ? (
                        <Alert.Root status="warning">
                            <Alert.Indicator />
                            <Box>
                                <Text fontWeight="semibold">Expediente documental incompleto</Text>
                                {detail.resumen.advertenciasDocumentales.map((warning, index) => (
                                    <Text key={`${index}-${warning}`} fontSize="sm">• {warning}</Text>
                                ))}
                            </Box>
                        </Alert.Root>
                    ) : null}

                    <SimpleGrid columns={{ base: 1, md: 4 }} gap={3}>
                        <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Orden</Text><Text fontWeight="bold">{detail.resumen.ordenProduccionId ? `OP ${detail.resumen.ordenProduccionId}` : `OF ${detail.resumen.ordenFabricacionId}`}</Text></Box>
                        <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Versión manufactura</Text><Text fontWeight="bold">v{detail.manufacturingVersionNumber}</Text></Box>
                        <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Planificado</Text><Text fontWeight="bold">{detail.resumen.cantidadPlanificada} {detail.resumen.unidadMedida}</Text></Box>
                        <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="app.textSubtle">Obtenido</Text><Text fontWeight="bold">{detail.resumen.cantidadObtenida ?? "—"} {detail.resumen.unidadMedida}</Text></Box>
                    </SimpleGrid>

                    <Box borderWidth="1px" borderRadius="md" overflowX="auto">
                        <Heading size="sm" p={3}>Etapas y firmas operativas</Heading>
                        <Table.Root size="sm"><Table.Header><Table.Row>
                            <Table.ColumnHeader>#</Table.ColumnHeader><Table.ColumnHeader>Etapa</Table.ColumnHeader><Table.ColumnHeader>POE aplicado</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader>Responsable</Table.ColumnHeader><Table.ColumnHeader>Terminada</Table.ColumnHeader>
                        </Table.Row></Table.Header><Table.Body>{detail.etapas.map((etapa) => (
                            <Table.Row key={etapa.id}><Table.Cell>{etapa.secuencia + 1}</Table.Cell><Table.Cell>{etapa.nombre}<Text fontSize="xs" color="app.textSubtle">{etapa.areaOperativaNombre}</Text>{etapa.cicloCorreccionHabilitado && <Badge mt={1} colorPalette="purple">Corrección solicitada</Badge>}</Table.Cell><Table.Cell>{etapa.poe ? <Box minW="220px"><Text fontSize="sm" fontWeight="semibold">{etapa.poe.procesoProduccionNombre} · v{etapa.poe.version}</Text><Text fontSize="xs" color="app.textSubtle" overflowWrap="anywhere">{etapa.poe.nombreArchivo}</Text><Text fontSize="xs" color="app.textSubtle" fontFamily="mono" overflowWrap="anywhere">SHA-256 {etapa.poe.sha256}</Text></Box> : "—"}</Table.Cell><Table.Cell><Badge colorPalette={palette(etapa.estado)}>{etapa.estado}</Badge></Table.Cell><Table.Cell>{etapa.reportadaPor ?? "—"}</Table.Cell><Table.Cell>{fecha(etapa.completadaEn)}</Table.Cell></Table.Row>
                        ))}</Table.Body></Table.Root>
                    </Box>

                    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                        <Box borderWidth="1px" borderRadius="md" p={3}>
                            <Heading size="sm" mb={2}>Trazabilidad de consumos ({detail.consumos.length})</Heading>
                            {detail.consumos.length ? detail.consumos.map((consumo) => <Text key={consumo.id} fontSize="sm">{consumo.tipo}: {consumo.productoId} · lote {consumo.loteOrigen ?? "sin lote"} · {consumo.cantidad} {consumo.unidadMedida}</Text>) : <Text color="app.textSubtle">Sin consumos sincronizados.</Text>}
                        </Box>
                        <Box borderWidth="1px" borderRadius="md" p={3}>
                            <Heading size="sm" mb={2}>Evidencia de controles legados ({detail.controles.length})</Heading>
                            {detail.controles.length ? detail.controles.map((control) => <HStack key={control.id} justify="space-between"><Text fontSize="sm">{control.areaOperativaNombre} · plantilla v{control.plantillaVersion}</Text><Badge colorPalette={palette(control.resultado ?? "")}>{control.resultado ?? "SIN EVALUAR"}</Badge></HStack>) : <Text color="app.textSubtle">Sin controles de proceso registrados.</Text>}
                        </Box>
                    </SimpleGrid>

                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <Heading size="sm" mb={1}>Controles de proceso del expediente</Heading>
                        <Text fontSize="sm" color="fg.muted" mb={3}>El contexto, plan y versión fueron congelados por el backend. Calidad no puede modificar estas mediciones.</Text>
                        {nivelControlesProceso < 1 && nivelHistorialProceso < 1 ? <Alert.Root status="info"><Alert.Indicator />Se requiere acceso al registro o al historial de controles de proceso para consultar esta evidencia neutral.</Alert.Root> : <VStack align="stretch" gap={2}>
                            {processRequirements.map((requirement) => <Flex key={requirement.id} borderWidth="1px" borderRadius="md" p={3} justify="space-between" align={{ base: "stretch", md: "center" }} flexDir={{ base: "column", md: "row" }} gap={2}><Box><Text fontWeight="semibold">{requirement.planCodigo} · {requirement.planNombre}</Text><Text fontSize="sm" color="fg.muted">{requirement.contexto.areaOperativaNombre ?? "Lote final"}{requirement.contexto.etapaNombre ? ` · ${requirement.contexto.etapaNombre}` : ""} · v{requirement.versionNumero}</Text></Box><HStack><StatusBadge status={requirement.estado} />{nivelControlesProceso >= 2 && <Button size="xs" colorPalette="teal" onClick={() => setSelectedProcessRequirement(requirement)}>{requirement.ultimaEjecucionId ? "Repetir / revalidar" : "Registrar"}</Button>}</HStack></Flex>)}
                            {processHistory.map((execution) => <Flex key={`process-history-${execution.id}`} borderWidth="1px" borderRadius="md" p={3} justify="space-between" gap={2}><Box><Text fontWeight="semibold">{execution.planCodigo} · ejecución #{execution.id}</Text><Text fontSize="sm" color="fg.muted">{formatControlDate(execution.fechaRegistro)} · {execution.usuarioNombreCompleto || execution.usuarioUsername}</Text></Box><StatusBadge status={execution.estado} /></Flex>)}
                            {!processRequirements.length && !processHistory.length && <Text color="fg.muted">No hay controles neutrales materializados para este expediente.</Text>}
                        </VStack>}
                    </Box>

                    {selectedProcessRequirement && <Box borderWidth="1px" borderRadius="md" p={{ base: 3, md: 4 }}><ProcessControlRegistrationForm key={selectedProcessRequirement.id} requirement={selectedProcessRequirement} onCancel={() => setSelectedProcessRequirement(null)} onSaved={() => { const id = detail.resumen.id; setSelectedProcessRequirement(null); void Promise.all([loadProcessEvidence(id), refreshPrevalidation(detail)]); }} /></Box>}

                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <Heading size="sm" mb={2}>Envío formal a Calidad</Heading>
                        {["DEVUELTO_PRODUCCION", "EN_CORRECCION"].includes(detail.resumen.estado) && detail.seccionesCorreccion?.length ? (
                            <VStack align="stretch" gap={3} mb={4}>
                                <Text fontWeight="semibold">Secciones documentales devueltas</Text>
                                {detail.seccionesCorreccion.map((section) => (
                                    <Box key={section.id} borderWidth="1px" borderRadius="md" p={3}>
                                        <HStack justify="space-between" align="start">
                                            <Box><Text fontWeight="semibold">{section.seccion}</Text><Text fontSize="sm" color="fg.muted">Ciclo {section.cicloRevisionNumero} · solicitada por {section.solicitadaPor} · {fecha(section.solicitadaEn)}</Text></Box>
                                            <Badge colorPalette={section.estado === "ATENDIDA" ? "green" : "orange"}>{section.estado}</Badge>
                                        </HStack>
                                        {section.estado === "PENDIENTE" && nivelExpedientes >= 2 ? (
                                            <HStack mt={3} align="end" flexWrap="wrap">
                                                <Field.Root flex="1" minW="260px" required><Field.Label>Justificación de la corrección</Field.Label><Textarea value={correctionReasons[section.id] ?? ""} onChange={(event) => setCorrectionReasons((current) => ({ ...current, [section.id]: event.target.value }))} maxLength={500} /></Field.Root>
                                                <Button colorPalette="purple" loading={attendingSectionId === section.id} disabled={!correctionReasons[section.id]?.trim()} onClick={() => void atenderSeccion(section.id)}>Marcar atendida</Button>
                                            </HStack>
                                        ) : section.justificacion ? <Text fontSize="sm" mt={2}>{section.justificacion}</Text> : null}
                                    </Box>
                                ))}
                            </VStack>
                        ) : null}
                        {prevalidating ? <HStack mb={3}><Spinner size="sm" /><Text>Verificando bloqueos…</Text></HStack> : prevalidation ? (
                            prevalidation.permitido
                                ? <Alert.Root status="success" mb={3}><Alert.Indicator />El expediente cumple la prevalidación. La acción volverá a validarlo dentro de la transacción.</Alert.Root>
                                : <Alert.Root status="warning" mb={3}><Alert.Indicator /><Box><Text fontWeight="semibold">Corrija estos bloqueos antes de enviar</Text>{prevalidation.bloqueosGenerales.map((message, index) => <Text key={`general-${index}`} fontSize="sm">• {message}</Text>)}{prevalidation.bloqueosControl.map((block) => <Text key={`${block.controlRequeridoId}-${block.puntoExigencia}`} fontSize="sm">• {block.planCodigo} · {block.mensaje}</Text>)}</Box></Alert.Root>
                        ) : ["LISTO_PARA_REVISION", "DEVUELTO_PRODUCCION", "EN_CORRECCION"].includes(detail.resumen.estado) ? <Alert.Root status="warning" mb={3}><Alert.Indicator />La prevalidación no está disponible. Actualícela antes de enviar.</Alert.Root> : null}
                        {["LISTO_PARA_REVISION", "DEVUELTO_PRODUCCION", "EN_CORRECCION"].includes(detail.resumen.estado) ? (
                            <VStack align="stretch" gap={3}>
                                <Field.Root required><Field.Label>Motivo del {detail.resumen.estado === "LISTO_PARA_REVISION" ? "envío" : "reenvío"}</Field.Label><Textarea value={motivoEnvio} onChange={(event) => setMotivoEnvio(event.target.value)} maxLength={500} /><Field.HelperText>La revisión y la firma conservarán este texto.</Field.HelperText></Field.Root>
                                <HStack justify="flex-end" flexWrap="wrap"><Button variant="outline" loading={prevalidating} onClick={() => void refreshPrevalidation()}>Actualizar prevalidación</Button><Button colorPalette="teal" loading={sending} disabled={nivelExpedientes < 2 || !motivoEnvio.trim() || prevalidation?.permitido !== true} onClick={() => void enviarRevision()}>{detail.resumen.estado === "LISTO_PARA_REVISION" ? "Enviar a Calidad" : "Reenviar a Calidad"}</Button></HStack>
                                {nivelExpedientes < 2 && <Text fontSize="sm" color="fg.muted">Se requiere nivel 2 en Expedientes digitales.</Text>}
                            </VStack>
                        ) : <Text color="fg.muted">Estado actual: {detail.resumen.estado.replace(/_/g, " ")}.</Text>}
                    </Box>

                    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                        <Box borderWidth="1px" borderRadius="md" p={3}>
                            <Heading size="sm" mb={2}>Lotes origen</Heading>
                            {detail.lotesOrigen?.length ? detail.lotesOrigen.map((vinculo, index) => (
                                <Box key={`origen-${vinculo.loteId}-${vinculo.batchRecordId ?? "externo"}-${index}`} py={2} borderBottomWidth="1px">
                                    <HStack justify="space-between" align="start">
                                        <Box><Text fontWeight="semibold">{vinculo.lote}</Text><Text fontSize="sm" color="app.textMuted">{vinculo.productoId} · {vinculo.productoNombre}</Text></Box>
                                        <Badge colorPalette="purple">{vinculo.ordenFabricacionId ? `OF-${vinculo.ordenFabricacionId}` : vinculo.ordenProduccionId ? `OP-${vinculo.ordenProduccionId}` : "Externo"}</Badge>
                                    </HStack>
                                    {vinculo.cantidad != null ? <Text fontSize="sm">Consumido: {vinculo.cantidad} {vinculo.unidadMedida ?? ""}</Text> : null}
                                    {vinculo.batchRecordCodigo ? <Text fontSize="xs" color="app.textSubtle">Expediente {vinculo.batchRecordCodigo}</Text> : null}
                                </Box>
                            )) : <Text color="app.textSubtle">No se registran lotes de origen.</Text>}
                        </Box>
                        <Box borderWidth="1px" borderRadius="md" p={3}>
                            <Heading size="sm" mb={2}>Lotes destino alimentados</Heading>
                            {detail.lotesDestino?.length ? detail.lotesDestino.map((vinculo, index) => (
                                <Box key={`destino-${vinculo.loteId}-${vinculo.batchRecordId ?? "externo"}-${index}`} py={2} borderBottomWidth="1px">
                                    <HStack justify="space-between" align="start">
                                        <Box><Text fontWeight="semibold">{vinculo.lote}</Text><Text fontSize="sm" color="app.textMuted">{vinculo.productoId} · {vinculo.productoNombre}</Text></Box>
                                        <Badge colorPalette="teal">{vinculo.ordenFabricacionId ? `OF-${vinculo.ordenFabricacionId}` : vinculo.ordenProduccionId ? `OP-${vinculo.ordenProduccionId}` : "Destino"}</Badge>
                                    </HStack>
                                    {vinculo.cantidad != null ? <Text fontSize="sm">Cantidad vinculada: {vinculo.cantidad} {vinculo.unidadMedida ?? ""}</Text> : null}
                                    {vinculo.batchRecordCodigo ? <Text fontSize="xs" color="app.textSubtle">Expediente {vinculo.batchRecordCodigo}</Text> : null}
                                </Box>
                            )) : <Text color="app.textSubtle">Este lote aún no alimenta otro expediente.</Text>}
                        </Box>
                    </SimpleGrid>

                    <Box borderWidth="1px" borderRadius="md" p={3}>
                        <Heading size="sm" mb={2}>Firmas electrónicas ({detail.firmas.length})</Heading>
                        {detail.firmas.map((firma) => <Box key={firma.id} py={2} borderBottomWidth="1px"><HStack justify="space-between"><Text fontWeight="semibold">{firma.nombreFirmante}</Text><Badge>{firma.alcance}</Badge></HStack><Text fontSize="sm">{firma.rolFirmante} · {fecha(firma.firmadoEn)}</Text><Text fontSize="xs" color="app.textSubtle" overflowWrap="anywhere">SHA-256 {firma.hashContenidoFirmado}</Text></Box>)}
                    </Box>

                    <Box borderWidth="1px" borderRadius="md" p={3}>
                        <Flex align="end" gap={3} flexWrap="wrap">
                            <Box minW="220px">
                                <Text fontSize="sm" fontWeight="semibold" mb={1}>Versión PDF</Text>
                                <NativeSelect.Root>
                                    <NativeSelect.Field value={revision} onChange={(event) => { setRevision(event.target.value); setPdfUrl(null); }}>
                                        <option value="actual">Vista actual (no controlada)</option>
                                        {detail.revisiones.map((item) => <option key={item.id} value={item.numero}>Revisión {item.numero} · {item.tipo}</option>)}
                                    </NativeSelect.Field><NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </Box>
                            <Button variant="outline" onClick={() => void cargarPdf(false)} loading={loadingPdf}>Visualizar páginas</Button>
                            <Button colorPalette="teal" onClick={() => void cargarPdf(true)} loading={loadingPdf}>Descargar PDF</Button>
                        </Flex>
                        {pdfUrl ? <PdfFrame title="Vista previa del expediente" src={pdfUrl} w="full" h="760px" mt={4} borderWidth="1px" /> : null}
                    </Box>
                </VStack>
            ) : null}
        </VStack>
    );
}
