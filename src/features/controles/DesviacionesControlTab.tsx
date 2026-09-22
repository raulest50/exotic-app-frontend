import {
    Alert,
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
    Spinner,
    Table,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

import { useAppToast } from "../../components/ui/use-app-toast";
import { apiFailureDetail, type ControlDomainApi } from "./api";
import { formatControlDate, formatEnumLabel } from "./controlUi";
import { ControlRequestKeys } from "./controlRequestKeys";
import StatusBadge from "./StatusBadge";
import type { DesviacionControl, DisposicionDesviacion, PageResponse } from "./types";

interface DesviacionesControlTabProps {
    api: ControlDomainApi;
    nivel: number;
}

export default function DesviacionesControlTab({ api, nivel }: DesviacionesControlTabProps) {
    const toast = useAppToast();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [result, setResult] = useState<PageResponse<DesviacionControl> | null>(null);
    const [selected, setSelected] = useState<DesviacionControl | null>(null);
    const [investigation, setInvestigation] = useState("");
    const [resolution, setResolution] = useState("");
    const [disposition, setDisposition] = useState<DisposicionDesviacion>("REPETIR");
    const [justification, setJustification] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [requestKeys] = useState(() => new ControlRequestKeys());

    const load = async (page = 0) => {
        setLoading(true);
        try {
            setResult(await api.listDesviaciones({ search: search.trim() || undefined, estado: status || undefined, page, size: 20 }));
        } catch (error) {
            toast({ title: "No fue posible cargar las desviaciones", description: apiFailureDetail(error, "Error de consulta.").message, status: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        api.listDesviaciones({ page: 0, size: 20 })
            .then((next) => mounted && setResult(next))
            .catch((error) => mounted && toast({ title: "No fue posible cargar las desviaciones", description: apiFailureDetail(error, "Error de consulta.").message, status: "error" }))
            .finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [api, toast]);

    const open = (item: DesviacionControl) => {
        setSelected(item);
        setInvestigation(item.investigacion ?? "");
        setResolution(item.resolucion ?? "");
        setDisposition(item.disposicion ?? "REPETIR");
        setJustification(item.justificacionDisposicion ?? "");
    };

    const resolve = async () => {
        if (!selected || !investigation.trim() || !resolution.trim()) return;
        setSaving(true);
        try {
            const request = {
                investigacion: investigation.trim(),
                resolucion: resolution.trim(),
                disposicion: disposition,
            };
            await api.resolveDesviacion(selected.id, request,
                requestKeys.forRequest(`${api.ambito}:resolver:${selected.id}`, request));
            toast({ title: "Desviación resuelta", description: "El resultado original permanece sin modificación.", status: "success" });
            setSelected(null);
            await load(result?.number ?? 0);
        } catch (error) {
            toast({ title: "No fue posible resolver", description: apiFailureDetail(error, "Error de operación.").message, status: "error" });
        } finally {
            setSaving(false);
        }
    };

    const close = async () => {
        if (!selected || !justification.trim() || !disposition) return;
        setSaving(true);
        try {
            const request = {
                disposicion: disposition,
                justificacionDisposicion: justification.trim(),
            };
            await api.closeDesviacion(selected.id, request,
                requestKeys.forRequest(`${api.ambito}:cerrar:${selected.id}`, request));
            toast({ title: "Desviación cerrada", status: "success" });
            setSelected(null);
            await load(result?.number ?? 0);
        } catch (error) {
            toast({ title: "No fue posible cerrar", description: apiFailureDetail(error, "Compruebe la segregación de funciones.").message, status: "error" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <VStack align="stretch" gap={5}>
            <Box><Heading size="md">Desviaciones de {api.ambito === "PROCESO" ? "proceso" : "calidad"}</Heading><Text mt={1} color="fg.muted">Una disposición no reemplaza ni oculta el resultado no conforme que originó la desviación.</Text></Box>
            <Flex gap={3} align="end" flexWrap="wrap">
                <Field.Root flex="1" minW={{ base: "full", md: "260px" }}><Field.Label>Buscar</Field.Label><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} placeholder="Código, requisito o ejecución" /></Field.Root>
                <Field.Root w={{ base: "full", sm: "210px" }}><Field.Label>Estado</Field.Label><NativeSelect.Root><NativeSelect.Field value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="ABIERTA">Abierta</option><option value="EN_INVESTIGACION">En investigación</option><option value="RESUELTA">Resuelta</option><option value="CERRADA">Cerrada</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                <Button loading={loading} onClick={() => void load()}>Buscar</Button>
            </Flex>

            <Box borderWidth="1px" borderRadius="lg" overflowX="auto">
                <Table.Root size="sm" minW="820px"><Table.Header><Table.Row><Table.ColumnHeader>Desviación</Table.ColumnHeader><Table.ColumnHeader>Origen inmutable</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader>Disposición</Table.ColumnHeader><Table.ColumnHeader>Responsables</Table.ColumnHeader><Table.ColumnHeader /></Table.Row></Table.Header><Table.Body>{result?.content.map((item) => <Table.Row key={item.id}><Table.Cell><Text fontWeight="semibold">{item.codigo}</Text><Text fontSize="sm">{formatControlDate(item.abiertaEn)}</Text></Table.Cell><Table.Cell><Text fontWeight="semibold">{item.planCodigo} · {item.planNombre}</Text><Text fontSize="sm">Lote {item.contexto.lote} · requisito #{item.controlRequeridoId}</Text><Text fontSize="sm" color="fg.muted">Ejecución #{item.ejecucionId}</Text></Table.Cell><Table.Cell><StatusBadge status={item.estado} /></Table.Cell><Table.Cell>{item.disposicion ? formatEnumLabel(item.disposicion) : "Pendiente"}</Table.Cell><Table.Cell><Text fontSize="sm">Abrió: {item.abiertaPor}</Text>{item.resueltaPor && <Text fontSize="sm">Resolvió: {item.resueltaPor}</Text>}{item.cerradaPor && <Text fontSize="sm">Cerró: {item.cerradaPor}</Text>}</Table.Cell><Table.Cell textAlign="end"><Button size="xs" variant="outline" onClick={() => open(item)}>Ver / gestionar</Button></Table.Cell></Table.Row>)}</Table.Body></Table.Root>
                {!loading && result?.content.length === 0 && <Alert.Root status="info" m={4}><Alert.Indicator />No se encontraron desviaciones.</Alert.Root>}
                {loading && !result && <HStack justify="center" py={8}><Spinner size="sm" /><Text>Cargando…</Text></HStack>}
            </Box>

            {result && result.totalPages > 1 && <HStack justify="flex-end"><Button size="sm" disabled={result.number === 0} onClick={() => void load(result.number - 1)}>Anterior</Button><Text fontSize="sm">Página {result.number + 1} de {result.totalPages}</Text><Button size="sm" disabled={result.number + 1 >= result.totalPages} onClick={() => void load(result.number + 1)}>Siguiente</Button></HStack>}

            <Dialog.Root open={selected != null} onOpenChange={({ open: isOpen }) => !isOpen && setSelected(null)} size="lg" scrollBehavior="inside">
                <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content><Dialog.Header><Dialog.Title>{selected?.codigo} · investigación y disposición</Dialog.Title></Dialog.Header><Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar desviación" size="sm" /></Dialog.CloseTrigger><Dialog.Body><VStack align="stretch" gap={4}><Alert.Root status="warning"><Alert.Indicator />El resultado no conforme original no se puede editar ni eliminar.</Alert.Root><Field.Root required readOnly={nivel < 2 || selected?.estado === "CERRADA"}><Field.Label>Investigación</Field.Label><Textarea value={investigation} onChange={(event) => setInvestigation(event.target.value)} readOnly={nivel < 2 || selected?.estado === "CERRADA"} maxLength={10000} /></Field.Root><Field.Root required readOnly={nivel < 2 || selected?.estado === "CERRADA"}><Field.Label>Resolución</Field.Label><Textarea value={resolution} onChange={(event) => setResolution(event.target.value)} readOnly={nivel < 2 || selected?.estado === "CERRADA"} maxLength={10000} /></Field.Root><Field.Root required><Field.Label>Disposición</Field.Label><NativeSelect.Root disabled={nivel < 2 || selected?.estado === "CERRADA"}><NativeSelect.Field value={disposition} onChange={(event) => setDisposition(event.target.value as DisposicionDesviacion)}><option value="REPETIR">Repetir medición</option><option value="CORREGIR_REPROCESAR">Corregir / reprocesar</option><option value="ACEPTAR_JUSTIFICADAMENTE">Aceptar justificadamente</option><option value="RECHAZAR">Rechazar</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root><Field.Root required={disposition === "ACEPTAR_JUSTIFICADAMENTE" || selected?.estado === "RESUELTA"}><Field.Label>Justificación de la disposición</Field.Label><Textarea value={justification} onChange={(event) => setJustification(event.target.value)} readOnly={nivel < 2 || selected?.estado === "CERRADA"} maxLength={10000} /></Field.Root></VStack></Dialog.Body><Dialog.Footer><Button variant="ghost" onClick={() => setSelected(null)}>Cerrar</Button>{nivel >= 2 && ["ABIERTA", "EN_INVESTIGACION"].includes(selected?.estado ?? "") && <Button colorPalette="teal" loading={saving} disabled={!investigation.trim() || !resolution.trim()} onClick={() => void resolve()}>Resolver</Button>}{api.ambito === "CALIDAD" && nivel >= 3 && selected?.estado === "RESUELTA" && <Button colorPalette="purple" loading={saving} disabled={!justification.trim()} onClick={() => void close()}>Cerrar con segregación</Button>}</Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal>
            </Dialog.Root>
        </VStack>
    );
}
