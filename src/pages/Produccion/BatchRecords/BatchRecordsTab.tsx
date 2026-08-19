import {
    Alert,
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    Input,
    NativeSelect,
    SimpleGrid,
    Spinner,
    Table,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useEffect, useState } from "react";
import { buscarBatchRecords, descargarPdfBatchRecord, detalleBatchRecord } from "./batchRecordsApi";
import type { BatchRecordDetail, BatchRecordListItem, PageResponse } from "./types";

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
    if (["APROBADO", "CERRADO", "CONFORME", "LIBERADO"].includes(estado)) return "green";
    if (["RECHAZADO", "ANULADO", "NO_CONFORME"].includes(estado)) return "red";
    if (["PENDIENTE_REVISION", "DEVUELTO_PRODUCCION"].includes(estado)) return "orange";
    return "gray";
}

export default function BatchRecordsTab() {
    const toast = useAppToast();
    const [ordenInput, setOrdenInput] = useState("");
    const [loteInput, setLoteInput] = useState("");
    const [page, setPage] = useState<PageResponse<BatchRecordListItem> | null>(null);
    const [detail, setDetail] = useState<BatchRecordDetail | null>(null);
    const [revision, setRevision] = useState<string>("");
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [loadingPdf, setLoadingPdf] = useState(false);

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

    const abrir = async (item: BatchRecordListItem) => {
        setLoadingDetail(true);
        setPdfUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return null;
        });
        try {
            const data = await detalleBatchRecord(item.id);
            setDetail(data);
            const latest = data.revisiones[data.revisiones.length - 1];
            setRevision(latest ? String(latest.numero) : "actual");
        } catch (error) {
            toast({ title: "No fue posible abrir el expediente", description: errorMessage(error), status: "error" });
        } finally {
            setLoadingDetail(false);
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
                    Consulte por OP o lote. El PDF se reconstruye desde los datos y revisiones del expediente.
                </Text>
            </Box>

            <Flex gap={3} align="end" flexWrap="wrap">
                <Box minW="180px">
                    <Text fontSize="sm" fontWeight="semibold" mb={1}>Orden de producción</Text>
                    <Input value={ordenInput} onChange={(event) => setOrdenInput(event.target.value)} placeholder="Ej. 1234" />
                </Box>
                <Box flex="1" minW="220px">
                    <Text fontSize="sm" fontWeight="semibold" mb={1}>Número de lote</Text>
                    <Input
                        value={loteInput}
                        onChange={(event) => setLoteInput(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && void buscar()}
                        placeholder="Búsqueda parcial"
                    />
                </Box>
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
                            <Table.ColumnHeader>Estado</Table.ColumnHeader>
                            <Table.ColumnHeader />
                        </Table.Row></Table.Header>
                        <Table.Body>{page.content.map((item) => (
                            <Table.Row key={item.id}>
                                <Table.Cell fontWeight="semibold">{item.codigo}</Table.Cell>
                                <Table.Cell>{item.ordenProduccionId ? `OP ${item.ordenProduccionId}` : `OF ${item.ordenFabricacionId}`}</Table.Cell>
                                <Table.Cell>{item.lote}</Table.Cell>
                                <Table.Cell>{item.productoId} · {item.productoNombre}</Table.Cell>
                                <Table.Cell><Badge colorPalette={palette(item.estado)}>{item.estado}</Badge></Table.Cell>
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
                            <Badge colorPalette={palette(detail.resumen.estado)}>{detail.resumen.estado}</Badge>
                            <Badge colorPalette={palette(detail.resumen.estadoCalidadLote)}>{detail.resumen.estadoCalidadLote}</Badge>
                        </HStack>
                    </Flex>

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
                            <Table.Row key={etapa.id}><Table.Cell>{etapa.secuencia + 1}</Table.Cell><Table.Cell>{etapa.nombre}<Text fontSize="xs" color="app.textSubtle">{etapa.areaOperativaNombre}</Text></Table.Cell><Table.Cell>{etapa.poe ? <Box minW="220px"><Text fontSize="sm" fontWeight="semibold">{etapa.poe.procesoProduccionNombre} · v{etapa.poe.version}</Text><Text fontSize="xs" color="app.textSubtle" overflowWrap="anywhere">{etapa.poe.nombreArchivo}</Text><Text fontSize="xs" color="app.textSubtle" fontFamily="mono" overflowWrap="anywhere">SHA-256 {etapa.poe.sha256}</Text></Box> : "—"}</Table.Cell><Table.Cell><Badge colorPalette={palette(etapa.estado)}>{etapa.estado}</Badge></Table.Cell><Table.Cell>{etapa.reportadaPor ?? "—"}</Table.Cell><Table.Cell>{fecha(etapa.completadaEn)}</Table.Cell></Table.Row>
                        ))}</Table.Body></Table.Root>
                    </Box>

                    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                        <Box borderWidth="1px" borderRadius="md" p={3}>
                            <Heading size="sm" mb={2}>Trazabilidad de consumos ({detail.consumos.length})</Heading>
                            {detail.consumos.length ? detail.consumos.map((consumo) => <Text key={consumo.id} fontSize="sm">{consumo.tipo}: {consumo.productoId} · lote {consumo.loteOrigen ?? "sin lote"} · {consumo.cantidad} {consumo.unidadMedida}</Text>) : <Text color="app.textSubtle">Sin consumos sincronizados.</Text>}
                        </Box>
                        <Box borderWidth="1px" borderRadius="md" p={3}>
                            <Heading size="sm" mb={2}>Controles de Calidad ({detail.controles.length})</Heading>
                            {detail.controles.length ? detail.controles.map((control) => <HStack key={control.id} justify="space-between"><Text fontSize="sm">{control.areaOperativaNombre} · v{control.plantillaVersion}</Text><Badge colorPalette={palette(control.resultado ?? "")}>{control.resultado ?? "SIN EVALUAR"}</Badge></HStack>) : <Text color="app.textSubtle">Sin controles registrados.</Text>}
                        </Box>
                    </SimpleGrid>

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
                        {pdfUrl ? <Box as="iframe" title="Vista previa del expediente" src={pdfUrl} w="full" h="760px" mt={4} borderWidth="1px" /> : null}
                    </Box>
                </VStack>
            ) : null}
        </VStack>
    );
}
