import {
    Alert,
    Box,
    Button,
    Field,
    Flex,
    Heading,
    HStack,
    Input,
    NativeSelect,
    Spinner,
    Table,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

import { useAppToast } from "../../components/ui/use-app-toast";
import { apiFailureDetail, type ControlDomainApi } from "./api";
import { CONTROL_NOUN, contextOrderLabel, formatControlDate, formatEnumLabel } from "./controlUi";
import StatusBadge from "./StatusBadge";
import ControlExecutionForm from "./ControlExecutionForm";
import QualityAssayPickerDialog from "./QualityAssayPickerDialog";
import type {
    ControlRequerido,
    EnsayoPendienteOption,
    PageResponse,
    PendientesFilters,
} from "./types";

interface PendientesControlTabProps {
    api: ControlDomainApi;
    nivel: number;
}

export default function PendientesControlTab({ api, nivel }: PendientesControlTabProps) {
    const toast = useAppToast();
    const [search, setSearch] = useState("");
    const [tipoOrden, setTipoOrden] = useState("");
    const [areaId, setAreaId] = useState("");
    const [stageId, setStageId] = useState("");
    const [expirationFrom, setExpirationFrom] = useState("");
    const [expirationTo, setExpirationTo] = useState("");
    const [result, setResult] = useState<PageResponse<ControlRequerido> | null>(null);
    const [selected, setSelected] = useState<ControlRequerido | null>(null);
    const [selectedAssay, setSelectedAssay] = useState<EnsayoPendienteOption | null>(null);
    const [assayPickerOpen, setAssayPickerOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const load = async (page = 0) => {
        setLoading(true);
        try {
            const filters: PendientesFilters = {
                planId: api.ambito === "CALIDAD" ? selectedAssay?.planId : undefined,
                search: search.trim() || undefined,
                tipoOrden: (tipoOrden || undefined) as PendientesFilters["tipoOrden"],
                areaId: areaId && /^\d+$/.test(areaId) ? Number(areaId) : undefined,
                batchRecordEtapaId: stageId && /^\d+$/.test(stageId) ? Number(stageId) : undefined,
                vencimientoDesde: expirationFrom || undefined,
                vencimientoHasta: expirationTo || undefined,
                page,
                size: 20,
            };
            setResult(await api.listPendientes(filters));
        } catch (error) {
            toast({ title: "No fue posible cargar la bandeja", description: apiFailureDetail(error, "Error de consulta.").message, status: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        api.listPendientes({
            page: 0,
            size: 20,
        })
            .then((next) => mounted && setResult(next))
            .catch((error) => mounted && toast({ title: "No fue posible cargar la bandeja", description: apiFailureDetail(error, "Error de consulta.").message, status: "error" }))
            .finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [api, toast]);

    return (
        <VStack align="stretch" gap={5}>
            <Box><Heading size="md">{CONTROL_NOUN[api.ambito].pending}</Heading><Text mt={1} color="fg.muted">Solo aparecen requisitos resueltos por el backend para el producto, la orden y la etapa correspondientes.</Text></Box>
            <Flex gap={3} align="end" flexWrap="wrap">
                <Field.Root flex="1" minW={{ base: "full", md: "260px" }}><Field.Label>Lote, producto, orden o plan</Field.Label><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} placeholder="Búsqueda por texto" /></Field.Root>
                {api.ambito === "CALIDAD" && (
                    <Field.Root minW={{ base: "full", md: "260px" }} flex={{ md: "1" }}>
                        <Field.Label>Ensayo de calidad</Field.Label>
                        <HStack align="stretch">
                            <Button
                                flex="1"
                                minW={0}
                                minH="10"
                                h="auto"
                                py={2}
                                variant="outline"
                                justifyContent="flex-start"
                                textAlign="left"
                                aria-haspopup="dialog"
                                onClick={() => setAssayPickerOpen(true)}
                            >
                                <Box minW={0} overflow="hidden">
                                    <Text truncate fontWeight={selectedAssay ? "semibold" : "normal"}>
                                        {selectedAssay?.nombre ?? "Todos los ensayos"}
                                    </Text>
                                    {selectedAssay && (
                                        <Text truncate fontSize="xs" color="fg.muted">
                                            {selectedAssay.codigo}
                                        </Text>
                                    )}
                                </Box>
                            </Button>
                            {selectedAssay && (
                                <Button
                                    variant="ghost"
                                    aria-label="Quitar filtro de ensayo"
                                    onClick={() => setSelectedAssay(null)}
                                >
                                    Quitar
                                </Button>
                            )}
                        </HStack>
                    </Field.Root>
                )}
                <Field.Root w={{ base: "full", sm: "160px" }}><Field.Label>Tipo de orden</Field.Label><NativeSelect.Root><NativeSelect.Field value={tipoOrden} onChange={(event) => setTipoOrden(event.target.value)}><option value="">Todas</option><option value="OP">OP</option><option value="OF">OF</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                <Field.Root w={{ base: "full", sm: "150px" }}><Field.Label>ID de área</Field.Label><Input inputMode="numeric" value={areaId} onChange={(event) => setAreaId(event.target.value)} placeholder="Todas" /></Field.Root>
                {api.ambito === "PROCESO" && <><Field.Root w={{ base: "full", sm: "150px" }}><Field.Label>ID de etapa</Field.Label><Input inputMode="numeric" value={stageId} onChange={(event) => setStageId(event.target.value)} placeholder="Todas" /></Field.Root><Field.Root w={{ base: "full", sm: "180px" }}><Field.Label>Vencimiento de lote desde</Field.Label><Input type="date" value={expirationFrom} onChange={(event) => setExpirationFrom(event.target.value)} /></Field.Root><Field.Root w={{ base: "full", sm: "180px" }}><Field.Label>Vencimiento de lote hasta</Field.Label><Input type="date" value={expirationTo} onChange={(event) => setExpirationTo(event.target.value)} /></Field.Root></>}
                <Button loading={loading} onClick={() => void load()}>Buscar</Button>
            </Flex>

            <Box borderWidth="1px" borderRadius="lg" overflowX="auto">
                <Table.Root size="sm" minW="960px">
                    <Table.Header><Table.Row><Table.ColumnHeader>Orden / lote</Table.ColumnHeader><Table.ColumnHeader>Producto</Table.ColumnHeader><Table.ColumnHeader>Plan congelado</Table.ColumnHeader><Table.ColumnHeader>Área / etapa</Table.ColumnHeader><Table.ColumnHeader>Política</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader /></Table.Row></Table.Header>
                    <Table.Body>{result?.content.map((item) => <Table.Row key={item.id}><Table.Cell><Text fontWeight="semibold">{contextOrderLabel(item.contexto.tipoOrden, item.contexto.ordenId, item.contexto.ordenCodigo)}</Text><Text color="fg.muted">Lote {item.contexto.lote}</Text></Table.Cell><Table.Cell>{item.contexto.productoId}<Text fontSize="xs" color="fg.muted">{item.contexto.productoNombre}</Text></Table.Cell><Table.Cell><Text fontWeight="semibold">{item.planCodigo}</Text><Text fontSize="sm">{item.planNombre} · v{item.versionNumero}</Text></Table.Cell><Table.Cell>{item.contexto.areaOperativaNombre ?? "Lote final"}<Text fontSize="xs" color="fg.muted">{item.contexto.etapaNombre ?? item.contexto.batchRecordCodigo ?? "Registro legado"}</Text></Table.Cell><Table.Cell>{api.ambito === "CALIDAD" ? (item.momentoEjecucion === "DURANTE_FABRICACION" ? "Control intermedio" : "Producto terminado") : formatEnumLabel(item.momentoEjecucion)}<Text fontSize="xs" color="fg.muted">Exigencia: {formatEnumLabel(item.puntoExigencia)}</Text>{item.fechaVencimientoLote && <Text fontSize="xs">Vencimiento del lote: {formatControlDate(item.fechaVencimientoLote)}</Text>}</Table.Cell><Table.Cell><StatusBadge status={item.estado} /></Table.Cell><Table.Cell textAlign="end">{nivel >= 2 ? <Button size="xs" colorPalette="teal" onClick={() => setSelected(item)}>{item.ultimaEjecucionId ? "Repetir / revalidar" : "Registrar"}</Button> : <Text fontSize="xs" color="fg.muted">Solo consulta</Text>}</Table.Cell></Table.Row>)}</Table.Body>
                </Table.Root>
                {!loading && result?.content.length === 0 && <Alert.Root status="info" m={4}><Alert.Indicator />No hay {CONTROL_NOUN[api.ambito].plural} pendientes con estos filtros.</Alert.Root>}
                {loading && !result && <HStack py={8} justify="center"><Spinner size="sm" /><Text>Cargando…</Text></HStack>}
            </Box>

            {result && result.totalPages > 1 && <HStack justify="flex-end"><Button size="sm" disabled={result.number === 0} onClick={() => void load(result.number - 1)}>Anterior</Button><Text fontSize="sm">Página {result.number + 1} de {result.totalPages}</Text><Button size="sm" disabled={result.number + 1 >= result.totalPages} onClick={() => void load(result.number + 1)}>Siguiente</Button></HStack>}

            {selected && <Box borderWidth="1px" borderRadius="lg" p={{ base: 3, md: 5 }}><ControlExecutionForm api={api} requirement={selected} onCancel={() => setSelected(null)} onSaved={() => { setSelected(null); void load(result?.number ?? 0); }} /></Box>}

            {api.ambito === "CALIDAD" && api.listEnsayosPendientes && (
                <QualityAssayPickerDialog
                    open={assayPickerOpen}
                    selected={selectedAssay}
                    tipoOrden={(tipoOrden || undefined) as PendientesFilters["tipoOrden"]}
                    areaId={areaId && /^\d+$/.test(areaId) ? Number(areaId) : undefined}
                    loadOptions={api.listEnsayosPendientes}
                    onClose={() => setAssayPickerOpen(false)}
                    onConfirm={setSelectedAssay}
                />
            )}
        </VStack>
    );
}
