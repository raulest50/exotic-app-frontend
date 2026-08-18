import {
    Alert,
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    Input,
    SimpleGrid,
    Spinner,
    Table,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { useEffect, useState } from "react";
import { getExactTabNivel } from "../../auth/accessHelpers";
import { useAccessSnapshot, useTabPermission } from "../../auth/usePermissions";
import { Modulo } from "../Usuarios/GestionUsuarios/types";
import { descargarPdfBatchRecord } from "../Produccion/BatchRecords/batchRecordsApi";
import BatchRecordControlForm from "./BatchRecordControlForm";
import {
    buscarBatchRecordsCalidad,
    decidirBatchRecordCalidad,
    detalleBatchRecordCalidad,
    detalleControlBatchRecordCalidad,
    extractApiError,
} from "./calidadApi";
import ControlProcesoNumericCharts, {
    hasNumericControlSamples,
} from "./charts/ControlProcesoNumericCharts";
import type {
    BatchRecordEtapaControl,
    BatchRecordQualityInboxItem,
    BatchRecordQualityReviewDetail,
    DecisionCalidadBatchRecord,
    EjecucionDetalleResponse,
    PageResponse,
} from "./types";

const badgePalette = (value?: string | null): "green" | "red" | "orange" | "gray" => {
    if (["CONFORME", "APROBADO", "LIBERADO"].includes(value ?? "")) return "green";
    if (["NO_CONFORME", "RECHAZADO"].includes(value ?? "")) return "red";
    if (!value || ["PENDIENTE_REVISION", "CUARENTENA"].includes(value)) return "orange";
    return "gray";
};

export default function LiberacionLotesTab() {
    const toast = useAppToast();
    const access = useAccessSnapshot();
    const nivel = getExactTabNivel(
        access.moduloAccesos,
        Modulo.CALIDAD,
        "REVISION_LIBERACION_LOTES",
    ) ?? 0;
    const { nivel: nivelDiligenciar } = useTabPermission(Modulo.CALIDAD, "DILIGENCIAR_CONTROL_PROCESO");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState<PageResponse<BatchRecordQualityInboxItem> | null>(null);
    const [detail, setDetail] = useState<BatchRecordQualityReviewDetail | null>(null);
    const [etapaControl, setEtapaControl] = useState<BatchRecordEtapaControl | null>(null);
    const [motivo, setMotivo] = useState("");
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [controlDetail, setControlDetail] = useState<EjecucionDetalleResponse | null>(null);
    const [loadingControlId, setLoadingControlId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [deciding, setDeciding] = useState(false);

    useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

    const cargar = async (nextPage = 0) => {
        setLoading(true);
        try {
            setPage(await buscarBatchRecordsCalidad({ search: search.trim() || undefined, page: nextPage, size: 20 }));
        } catch (error) {
            toast({ title: "No fue posible cargar la bandeja", description: extractApiError(error, "Error de consulta."), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void cargar(); }, []);

    const abrir = async (id: number) => {
        setLoading(true);
        try {
            setDetail(await detalleBatchRecordCalidad(id));
            setEtapaControl(null);
            setControlDetail(null);
            setMotivo("");
            setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
        } catch (error) {
            toast({ title: "No fue posible abrir el lote", description: extractApiError(error, "Error de consulta."), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    const refrescarDetalle = async () => {
        if (!detail) return;
        try {
            setDetail(await detalleBatchRecordCalidad(detail.evaluacion.batchRecordId));
            setEtapaControl(null);
            setControlDetail(null);
            setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
            await cargar(page?.number ?? 0);
        } catch (error) {
            toast({
                title: "El control se guardó, pero no fue posible refrescar el expediente",
                description: extractApiError(error, "Actualice la bandeja."),
                status: "warning",
            });
        }
    };

    const decidir = async (decision: DecisionCalidadBatchRecord) => {
        if (!detail || !motivo.trim()) {
            toast({ title: "El motivo es obligatorio", status: "warning" });
            return;
        }
        setDeciding(true);
        try {
            const updated = await decidirBatchRecordCalidad(
                detail.evaluacion.batchRecordId,
                decision,
                motivo.trim(),
            );
            setDetail(updated);
            setControlDetail(null);
            setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
            toast({ title: `Decisión registrada: ${decision}`, status: decision === "LIBERAR" ? "success" : "info" });
            await cargar();
        } catch (error) {
            toast({ title: "No fue posible registrar la decisión", description: extractApiError(error, "Revise los bloqueos."), status: "error" });
        } finally {
            setDeciding(false);
        }
    };

    const verPdf = async () => {
        if (!detail) return;
        try {
            const result = await descargarPdfBatchRecord(
                detail.evaluacion.batchRecordId,
                undefined,
                detail.evaluacion.estado === "PENDIENTE_REVISION",
            );
            setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(result.blob); });
        } catch (error) {
            toast({ title: "No fue posible generar el PDF", description: extractApiError(error, "Error al reconstruir."), status: "error" });
        }
    };

    const verCurvaControl = async (control: BatchRecordEtapaControl) => {
        if (!detail || !control.ultimaEjecucionId) return;
        if (controlDetail?.id === control.ultimaEjecucionId) {
            setControlDetail(null);
            return;
        }
        setLoadingControlId(control.ultimaEjecucionId);
        try {
            setControlDetail(await detalleControlBatchRecordCalidad(
                detail.evaluacion.batchRecordId,
                control.ultimaEjecucionId,
            ));
        } catch (error) {
            toast({
                title: "No fue posible cargar las mediciones",
                description: extractApiError(error, "Error de consulta."),
                status: "error",
            });
        } finally {
            setLoadingControlId(null);
        }
    };

    return (
        <VStack align="stretch" gap={5}>
            <Box><Heading size="md">Revisión y liberación de lotes</Heading><Text mt={1} color="app.textSubtle">Cada decisión se registra individualmente, genera una revisión y queda firmada con la sesión autenticada.</Text></Box>
            <Flex gap={3}><Input flex="1" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void cargar()} placeholder="OP, lote, código o producto" /><Button loading={loading} onClick={() => void cargar()}>Buscar</Button></Flex>

            {page?.content.length ? <Box borderWidth="1px" borderRadius="md" overflowX="auto"><Table.Root size="sm"><Table.Header><Table.Row><Table.ColumnHeader>OP / lote</Table.ColumnHeader><Table.ColumnHeader>Producto</Table.ColumnHeader><Table.ColumnHeader>Controles</Table.ColumnHeader><Table.ColumnHeader>Desviaciones</Table.ColumnHeader><Table.ColumnHeader>Enviado</Table.ColumnHeader><Table.ColumnHeader /></Table.Row></Table.Header><Table.Body>{page.content.map((item) => <Table.Row key={item.batchRecordId}><Table.Cell><Text fontWeight="bold">OP {item.ordenProduccionId}</Text><Text fontSize="sm">{item.lote} · {item.codigo}</Text></Table.Cell><Table.Cell>{item.productoId}<Text fontSize="xs" color="app.textSubtle">{item.productoNombre}</Text></Table.Cell><Table.Cell><Badge colorPalette={item.controlesPendientes ? "orange" : "green"}>{item.controlesConformes}/{item.controlesRequeridos} conformes</Badge></Table.Cell><Table.Cell><Badge colorPalette={item.desviacionesAbiertas ? "red" : "gray"}>{item.desviacionesAbiertas}</Badge></Table.Cell><Table.Cell>{new Date(item.enviadoRevisionEn).toLocaleString("es-CO")}</Table.Cell><Table.Cell><Button size="xs" onClick={() => void abrir(item.batchRecordId)}>Revisar</Button></Table.Cell></Table.Row>)}</Table.Body></Table.Root></Box> : page ? <Alert.Root status="info"><Alert.Indicator />No hay lotes pendientes de revisión.</Alert.Root> : null}

            {page && page.totalPages > 1 ? <HStack justify="flex-end"><Button size="sm" disabled={page.number === 0} onClick={() => void cargar(page.number - 1)}>Anterior</Button><Text>Página {page.number + 1} de {page.totalPages}</Text><Button size="sm" disabled={page.number + 1 >= page.totalPages} onClick={() => void cargar(page.number + 1)}>Siguiente</Button></HStack> : null}
            {loading && !detail ? <Spinner alignSelf="center" /> : null}

            {detail ? <VStack align="stretch" gap={4} borderTopWidth="1px" pt={5}>
                <Flex justify="space-between" flexWrap="wrap" gap={3}><Box><Heading size="md">OP {detail.evaluacion.ordenProduccionId} · lote {detail.evaluacion.lote}</Heading><Text color="app.textSubtle">{detail.evaluacion.productoId} · {detail.evaluacion.productoNombre}</Text></Box><HStack><Badge colorPalette={badgePalette(detail.evaluacion.estado)}>{detail.evaluacion.estado}</Badge><Badge colorPalette={badgePalette(detail.evaluacion.estadoCalidadLote)}>{detail.evaluacion.estadoCalidadLote}</Badge></HStack></Flex>
                <SimpleGrid columns={{ base: 1, md: 4 }} gap={3}><Box borderWidth="1px" p={3} borderRadius="md"><Text fontSize="sm">Cantidad obtenida</Text><Text fontWeight="bold">{detail.evaluacion.cantidadObtenida} {detail.evaluacion.unidadMedida}</Text></Box><Box borderWidth="1px" p={3} borderRadius="md"><Text fontSize="sm">Etapas</Text><Text fontWeight="bold">{detail.expediente.etapas.length}</Text></Box><Box borderWidth="1px" p={3} borderRadius="md"><Text fontSize="sm">Firmas</Text><Text fontWeight="bold">{detail.expediente.firmas.length}</Text></Box><Box borderWidth="1px" p={3} borderRadius="md"><Text fontSize="sm">Correcciones</Text><Text fontWeight="bold">{detail.expediente.correcciones.length}</Text></Box></SimpleGrid>

                {detail.evaluacion.estado !== "PENDIENTE_REVISION"
                    ? <Alert.Root status="info"><Alert.Indicator />Decisión registrada: {detail.evaluacion.estado}.</Alert.Root>
                    : detail.evaluacion.bloqueos.length
                        ? <Alert.Root status="warning"><Alert.Indicator /><Box><Text fontWeight="semibold">Bloqueos para liberar</Text>{detail.evaluacion.bloqueos.map((item) => <Text key={item} fontSize="sm">• {item}</Text>)}</Box></Alert.Root>
                        : <Alert.Root status="success"><Alert.Indicator />El expediente cumple las validaciones automáticas para liberación.</Alert.Root>}

                <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Heading size="sm" mb={3}>Controles vinculados a las plantillas congeladas</Heading>
                    <VStack align="stretch" gap={2}>
                        {detail.controles.length ? detail.controles.map((control) => (
                            <Flex
                                key={control.etapaId}
                                borderWidth="1px"
                                borderRadius="md"
                                p={3}
                                justify="space-between"
                                align={{ base: "stretch", md: "center" }}
                                gap={3}
                                flexDir={{ base: "column", md: "row" }}
                            >
                                <Box>
                                    <Text fontWeight="semibold">{control.etapaNombre}</Text>
                                    <Text fontSize="sm" color="app.textSubtle">
                                        {control.areaOperativaNombre} · plantilla v{control.plantillaVersion}
                                    </Text>
                                </Box>
                                <HStack flexWrap="wrap">
                                    <Badge colorPalette={badgePalette(control.ultimoResultado)}>
                                        {control.ultimoResultado ?? "PENDIENTE"}
                                    </Badge>
                                    {control.ultimaEjecucionId ? (
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            loading={loadingControlId === control.ultimaEjecucionId}
                                            onClick={() => void verCurvaControl(control)}
                                        >
                                            {controlDetail?.id === control.ultimaEjecucionId
                                                ? "Ocultar curva"
                                                : "Ver curva"}
                                        </Button>
                                    ) : null}
                                    {nivelDiligenciar >= 1
                                    && detail.evaluacion.estado === "PENDIENTE_REVISION" ? (
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            onClick={() => setEtapaControl(control)}
                                        >
                                            {control.ultimaEjecucionId ? "Repetir control" : "Diligenciar"}
                                        </Button>
                                    ) : null}
                                </HStack>
                            </Flex>
                        )) : (
                            <Text color="app.textSubtle">
                                El expediente no exige controles por plantilla.
                            </Text>
                        )}
                    </VStack>
                </Box>

                {controlDetail ? (
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <HStack justify="space-between" mb={3} gap={3} flexWrap="wrap">
                            <Box>
                                <Heading size="sm">Mediciones del último control</Heading>
                                <Text fontSize="sm" color="app.textSubtle">
                                    {controlDetail.areaOperativa.nombre} · plantilla v{controlDetail.plantillaVersion}
                                </Text>
                            </Box>
                            <Button size="xs" variant="ghost" onClick={() => setControlDetail(null)}>
                                Ocultar
                            </Button>
                        </HStack>
                        {hasNumericControlSamples(controlDetail.muestras) ? (
                            <ControlProcesoNumericCharts muestras={controlDetail.muestras} />
                        ) : (
                            <Alert.Root status="info">
                                <Alert.Indicator />
                                Este control no contiene características numéricas para graficar.
                            </Alert.Root>
                        )}
                    </Box>
                ) : null}

                {etapaControl ? <BatchRecordControlForm loteId={detail.evaluacion.loteId} etapa={etapaControl} onCancel={() => setEtapaControl(null)} onSaved={() => void refrescarDetalle()} /> : null}

                <Box borderWidth="1px" borderRadius="md" p={4}><HStack justify="space-between" mb={3}><Heading size="sm">Vista documental</Heading><Button size="sm" variant="outline" onClick={() => void verPdf()}>Reconstruir PDF</Button></HStack>{pdfUrl ? <Box as="iframe" src={pdfUrl} title="Batch record para revisión" w="full" h="650px" borderWidth="1px" /> : <Text color="app.textSubtle">Abra el PDF para revisar sus páginas y el detalle completo.</Text>}</Box>

                {detail.evaluacion.estado === "PENDIENTE_REVISION" ? <Box borderWidth="1px" borderRadius="md" p={4}><Heading size="sm" mb={2}>Decisión individual de Calidad</Heading><Text fontSize="sm" color="app.textSubtle" mb={2}>Al confirmar, declara que revisó el expediente y que emite personalmente la decisión seleccionada con su sesión autenticada.</Text><Textarea maxLength={500} value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Justificación obligatoria de la decisión" /><HStack justify="flex-end" mt={3} flexWrap="wrap">{nivel >= 2 ? <><Button colorPalette="orange" variant="outline" loading={deciding} onClick={() => void decidir("DEVOLVER_A_PRODUCCION")}>Devolver a Producción</Button><Button colorPalette="red" variant="outline" loading={deciding} onClick={() => void decidir("RECHAZAR")}>Rechazar lote</Button></> : null}{nivel >= 3 ? <Button colorPalette="green" disabled={!detail.evaluacion.puedeLiberar} loading={deciding} onClick={() => void decidir("LIBERAR")}>Liberar lote</Button> : null}</HStack></Box> : <Alert.Root status="info"><Alert.Indicator />La decisión ya fue registrada; el expediente permanece disponible para consulta.</Alert.Root>}
            </VStack> : null}
        </VStack>
    );
}
