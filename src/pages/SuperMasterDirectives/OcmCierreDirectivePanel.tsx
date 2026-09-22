import { useCallback, useEffect, useState } from "react";
import { Box, Button, Dialog, Field, HStack, Input, NativeSelect, Portal, Spinner, Stack, Switch, Table, Text } from "@chakra-ui/react";
import { useAppToast } from "../../components/ui/use-app-toast";
import { useAuth } from "../../context/AuthContext";
import { useMasterDirectives } from "../../context/MasterDirectivesContext";
import { ENABLE_MASTER_SUPERMASTER_DIRECTIVES_ACCESS_DEFAULT, MASTER_DIRECTIVE_KEYS } from "../../context/masterDirectiveConstants";
import { cerrarOcmCompletas, consultarCierreConfig, guardarCierreConfig, ocmErrorMessage, previsualizarOcmCompletas } from "../../features/ocmCierre/api";
import { formatOcmDate, parseOcmDays } from "../../features/ocmCierre/format";
import type { OcmCierreCandidata, OcmCierreConfig, OcmCierreModo, OcmCierreResultado } from "../../features/ocmCierre/types";

const pageSize = 10;

export default function OcmCierreDirectivePanel() {
    const { user } = useAuth();
    const { getBooleanDirective, refreshDirectives } = useMasterDirectives();
    const username = user?.trim().toLowerCase();
    const canManage = username === "super_master" || (username === "master" && getBooleanDirective(
        MASTER_DIRECTIVE_KEYS.ENABLE_MASTER_SUPERMASTER_DIRECTIVES_ACCESS, ENABLE_MASTER_SUPERMASTER_DIRECTIVES_ACCESS_DEFAULT));
    const toast = useAppToast();
    const [config, setConfig] = useState<OcmCierreConfig | null>(null);
    const [modo, setModo] = useState<OcmCierreModo>("DESACTIVADO");
    const [dias, setDias] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configError, setConfigError] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [candidatas, setCandidatas] = useState<OcmCierreCandidata[]>([]);
    const [page, setPage] = useState(0);
    const [closing, setClosing] = useState(false);
    const [processed, setProcessed] = useState(0);
    const [resultado, setResultado] = useState<OcmCierreResultado | null>(null);
    const [bulkError, setBulkError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setConfigError("");
        try {
            const data = await consultarCierreConfig();
            setConfig(data);
            setModo(data.modo);
            setDias(data.dias == null ? "" : String(data.dias));
        } catch (error) {
            setConfig(null);
            setConfigError(ocmErrorMessage(error, "No fue posible consultar la configuración de cierre."));
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const days = modo === "PLAZO" ? parseOcmDays(dias) : null;
    const invalidDays = modo === "PLAZO" && days == null;
    const changed = config != null && (modo !== config.modo || (modo === "PLAZO" && days !== config.dias));
    const busy = saving || closing || previewLoading;

    async function save() {
        if (!canManage || !config || invalidDays || !changed || busy) return;
        setSaving(true);
        setConfigError("");
        try {
            const data = await guardarCierreConfig({ modo, dias: days });
            setConfig(data);
            setModo(data.modo);
            setDias(data.dias == null ? "" : String(data.dias));
            toast({ title: "Configuración de cierre guardada", status: "success" });
            await refreshDirectives();
        } catch (error) {
            setConfigError(ocmErrorMessage(error, "No fue posible guardar la configuración de cierre."));
        } finally { setSaving(false); }
    }

    async function preview() {
        if (!canManage || busy) return;
        setPreviewLoading(true);
        setResultado(null);
        setBulkError("");
        setProcessed(0);
        try {
            setCandidatas(await previsualizarOcmCompletas());
            setPage(0);
            setOpen(true);
        } catch (error) {
            toast({ title: "No se pudo cargar la previsualización", description: ocmErrorMessage(error, "Intente nuevamente."), status: "error" });
        } finally { setPreviewLoading(false); }
    }

    async function closeConfirmed() {
        if (!canManage || closing || resultado || candidatas.length === 0) return;
        setClosing(true);
        const ids = candidatas.map(orden => orden.ordenCompraId);
        const total: OcmCierreResultado = { cerradas: [], omitidas: [], fallidas: [] };
        try {
            for (let offset = 0; offset < ids.length; offset += 100) {
                const batch = ids.slice(offset, offset + 100);
                try {
                    const result = await cerrarOcmCompletas(batch);
                    total.cerradas.push(...result.cerradas);
                    total.omitidas.push(...result.omitidas);
                    total.fallidas.push(...result.fallidas);
                    setProcessed(Math.min(offset + batch.length, ids.length));
                } catch (error) {
                    setBulkError(`${ocmErrorMessage(error, "No se pudo confirmar el resultado de la solicitud.")} `
                        + `Resultado sin confirmar para OCM: ${batch.join(", ")}. `
                        + `${ids.length - offset - batch.length} OCM no enviadas. Actualice la previsualización antes de reintentar.`);
                    break;
                }
            }
        } finally {
            setResultado(total);
            setClosing(false);
        }
    }

    const pages = Math.max(1, Math.ceil(candidatas.length / pageSize));

    return (
        <Box borderWidth="1px" borderRadius="lg" p={5} mb={6}>
            <Stack gap={4}>
                <Text fontSize="lg" fontWeight="bold">Cierre de órdenes de compra de materiales</Text>
                <Text fontSize="sm">Cada activación aplica a OCM cuya recepción se complete desde ese momento. Las que ya estaban completas se pueden cerrar con el botón de cierre manual.</Text>
                {loading ? <HStack><Spinner size="sm" /><Text>Cargando configuración…</Text></HStack> : <>
                    {config && <>
                        <Switch.Root checked={modo !== "DESACTIVADO"} disabled={!canManage || busy}
                            onCheckedChange={event => setModo(event.checked ? "RECEPCION_COMPLETA" : "DESACTIVADO")}>
                            <Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control>
                            <Switch.Label>Habilitar cierre automático</Switch.Label>
                        </Switch.Root>
                        {modo !== "DESACTIVADO" && <HStack align="start" flexWrap="wrap" gap={4}>
                            <Field.Root maxW="lg">
                                <Field.Label>Cuándo cerrar la OCM</Field.Label>
                                <NativeSelect.Root disabled={!canManage || busy}>
                                    <NativeSelect.Field value={modo} onChange={event => setModo(event.target.value as OcmCierreModo)}>
                                        <option value="RECEPCION_COMPLETA">Al completar la recepción</option>
                                        <option value="PLAZO">Días después de completar la recepción</option>
                                    </NativeSelect.Field><NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </Field.Root>
                            {modo === "PLAZO" && <Field.Root invalid={invalidDays} maxW="240px">
                                <Field.Label>Días de espera</Field.Label>
                                <Input inputMode="numeric" value={dias} disabled={!canManage || busy} onChange={event => setDias(event.target.value)} />
                                <Field.ErrorText>Ingrese un número entero mayor o igual a 1.</Field.ErrorText>
                            </Field.Root>}
                        </HStack>}
                        <Text fontSize="sm">El plazo se cuenta desde la hora de recepción completa, en hora de Colombia. Los cambios de modo o días se aplican a las OCM abiertas que cumplan el corte de activación. Desactivar detiene los cierres automáticos; volver a activar establece un nuevo corte.</Text>
                        {config.activadoDesde && <Text fontSize="sm">Activación vigente: {formatOcmDate(config.activadoDesde)} (hora de Colombia).</Text>}
                        <Button alignSelf="start" colorPalette="teal" loading={saving} disabled={!canManage || busy || invalidDays || !changed} onClick={() => void save()}>
                            Guardar configuración de cierre
                        </Button>
                        <Text fontSize="xs">Esta configuración se guarda con su propio botón.</Text>
                    </>}
                    {configError && <Text role="alert">{configError}</Text>}
                    {!config && <Button alignSelf="start" variant="outline" onClick={() => void load()}>Reintentar consulta</Button>}
                </>}
                <Box borderTopWidth="1px" pt={4}>
                    <Text mb={3} fontSize="sm">El cierre manual incluye todas las OCM abiertas con recepción completa, incluso las históricas y las que aún esperan su plazo automático. Podrá revisar la lista antes de confirmar.</Text>
                    <Button variant="outline" loading={previewLoading} disabled={!canManage || busy} onClick={() => void preview()}>
                        Cerrar OCM con recepción completa
                    </Button>
                </Box>
            </Stack>

            <Dialog.Root open={open} size="xl" scrollBehavior="inside" closeOnEscape={!closing} closeOnInteractOutside={!closing}
                onOpenChange={event => { if (!closing) setOpen(event.open); }}>
                <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
                    <Dialog.Header><Dialog.Title>Confirmar cierre de OCM completas</Dialog.Title></Dialog.Header>
                    <Dialog.Body>
                        <Text mb={3}>Se cerrarán las {candidatas.length} OCM de esta lista, en todas sus páginas. Las cantidades y el estado se comprobarán nuevamente al cerrar cada orden.</Text>
                        <Text mb={3} fontSize="sm">El cierre no registra nuevas recepciones, pagos ni asientos contables. Las fechas de recepción históricas desconocidas permanecerán sin registrar.</Text>
                        <Box overflowX="auto">
                            <Table.Root size="sm">
                                <Table.Header><Table.Row>
                                    <Table.ColumnHeader>OCM</Table.ColumnHeader><Table.ColumnHeader>Proveedor</Table.ColumnHeader>
                                    <Table.ColumnHeader>Recepción completa</Table.ColumnHeader><Table.ColumnHeader>Cierre automático previsto</Table.ColumnHeader>
                                </Table.Row></Table.Header>
                                <Table.Body>{candidatas.slice(page * pageSize, (page + 1) * pageSize).map(orden => <Table.Row key={orden.ordenCompraId}>
                                    <Table.Cell>{orden.ordenCompraId}</Table.Cell><Table.Cell>{orden.proveedor || "Sin proveedor"}</Table.Cell>
                                    <Table.Cell>{formatOcmDate(orden.fechaRecepcionCompleta)}</Table.Cell>
                                    <Table.Cell>{orden.fechaCierreAutomaticoPrevista ? formatOcmDate(orden.fechaCierreAutomaticoPrevista) : "Sin programación"}</Table.Cell>
                                </Table.Row>)}</Table.Body>
                            </Table.Root>
                        </Box>
                        {candidatas.length === 0 && <Text my={3}>No hay OCM abiertas con recepción completa.</Text>}
                        <HStack my={3} justify="space-between">
                            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Anterior</Button>
                            <Text>Página {page + 1} de {pages}</Text>
                            <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)}>Siguiente</Button>
                        </HStack>
                        {closing && <Text role="status">Procesadas: {processed} de {candidatas.length}. Espere a que finalice el cierre.</Text>}
                        {resultado && <Box aria-live="polite" mt={4}>
                            <Text fontWeight="semibold">Cerradas: {resultado.cerradas.length}. Omitidas: {resultado.omitidas.length}. Fallidas: {resultado.fallidas.length}.</Text>
                            {resultado.cerradas.length > 0 && <Text>OCM cerradas: {resultado.cerradas.join(", ")}.</Text>}
                            {[...resultado.omitidas, ...resultado.fallidas].map(item => <Text key={item.ordenCompraId}>OCM {item.ordenCompraId}: {item.motivo}</Text>)}
                        </Box>}
                        {bulkError && <Text role="alert" mt={3}>{bulkError}</Text>}
                    </Dialog.Body>
                    <Dialog.Footer flexWrap="wrap">
                        <Button variant="outline" disabled={closing} onClick={() => setOpen(false)}>{resultado ? "Cerrar" : "Cancelar"}</Button>
                        {!resultado && <Button colorPalette="teal" loading={closing} disabled={!canManage || closing || candidatas.length === 0} onClick={() => void closeConfirmed()}>
                            Confirmar cierre de {candidatas.length} OCM
                        </Button>}
                    </Dialog.Footer>
                </Dialog.Content></Dialog.Positioner></Portal>
            </Dialog.Root>
        </Box>
    );
}
