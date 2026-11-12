import { useState } from "react";
import { Badge, Box, Button, CloseButton, Dialog, Field, Flex, Heading, Image, Portal, SimpleGrid, Stack, Text, Textarea } from "@chakra-ui/react";
import PermisoFirmaDialog from "./PermisoFirmaDialog";
import { descargarPermiso, errorPermiso, imagenFirma, permisosApi } from "./permisosPersonalApi";
import { ESTADOS_PERMISO, MOTIVOS_PERMISO, type FirmaPermisoRequest, type PermisoDetalle } from "./types";

interface Props { detalle: PermisoDetalle; paraFirmar: boolean; onChange: (detalle: PermisoDetalle) => void; onEdit: () => void; onBack: () => void }
function Dato({ label, value }: { label: string; value: string | number | null | undefined }) {
    return <Box><Text color="fg.muted" fontSize="sm">{label}</Text><Text whiteSpace="pre-wrap" overflowWrap="anywhere">{value === null || value === undefined || value === "" ? "Sin registrar" : value}</Text></Box>;
}
function fechaHora(value: string): string {
    const conZona = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}-05:00`;
    return new Date(conZona).toLocaleString("es-CO", { timeZone: "America/Bogota" });
}

export default function PermisoPersonalDetalle({ detalle, paraFirmar, onChange, onEdit, onBack }: Props) {
    const [firma, setFirma] = useState<"presentar" | "aprobar" | null>(null);
    const [accion, setAccion] = useState<"RECHAZAR" | "ANULAR" | null>(null);
    const [motivo, setMotivo] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const firmar = async (seleccion: FirmaPermisoRequest) => {
        setBusy(true); setError("");
        try {
            const result = firma === "presentar"
                ? await permisosApi.presentar(detalle.id, detalle.version, seleccion)
                : await permisosApi.decidir(detalle.id, detalle.version, "APROBAR", motivo.trim(), seleccion);
            onChange(result); setFirma(null); setMotivo("");
        } finally { setBusy(false); }
    };
    const resolver = async () => {
        if (!accion || !motivo.trim() || busy) return;
        setBusy(true); setError("");
        try {
            const result = accion === "ANULAR" ? await permisosApi.anular(detalle.id, detalle.version, motivo.trim()) : await permisosApi.decidir(detalle.id, detalle.version, "RECHAZAR", motivo.trim());
            onChange(result); setAccion(null); setMotivo("");
        } catch (e) { setError(errorPermiso(e)); }
        finally { setBusy(false); }
    };
    const archivo = async (tipo: "pdf" | "soporte") => {
        if (busy) return;
        setBusy(true); setError("");
        try { descargarPermiso(await permisosApi.archivo(detalle.id, tipo), tipo === "pdf" ? `${detalle.folio}.pdf` : detalle.soporte?.nombre ?? "soporte"); }
        catch (e) { setError(errorPermiso(e)); }
        finally { setBusy(false); }
    };
    const recargar = async () => {
        setBusy(true); setError("");
        try { onChange(await permisosApi.detalle(detalle.id)); } catch (e) { setError(errorPermiso(e)); } finally { setBusy(false); }
    };
    return <Stack gap={5} as="article" aria-label={`Expediente ${detalle.folio}`}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <Box><Heading size="lg">{detalle.folio}</Heading><Badge mt={1} variant="outline">{ESTADOS_PERMISO[detalle.estado]}</Badge></Box>
            <Flex gap={2} flexWrap="wrap">
                <Button variant="outline" disabled={busy} onClick={onBack}>Volver a la bandeja</Button>
                <Button variant="outline" disabled={busy} onClick={() => { void recargar(); }}>Recargar</Button>
                <Button variant="outline" disabled={busy || detalle.estado === "BORRADOR"} onClick={() => { void archivo("pdf"); }}>Descargar PDF</Button>
                {detalle.puedeEditar && <Button disabled={busy} onClick={onEdit}>Editar borrador</Button>}
            </Flex>
        </Flex>
        {detalle.estado === "BORRADOR" && <Text fontSize="sm" color="fg.muted">El PDF histórico estará disponible después de firmar y presentar la solicitud.</Text>}
        {paraFirmar && detalle.puedePresentar && <Box bg="bg.subtle" p={4} rounded="md"><Text>Su borrador quedó guardado. Revise este expediente completo; después seleccione «Firmar y presentar».</Text></Box>}
        {error && <Text role="alert" color="fg.error">{error}</Text>}
        <Box borderWidth="1px" rounded="lg" p={{ base: 3, md: 5 }}><Stack gap={4}><Heading size="md">Solicitud</Heading><SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
            <Dato label="Trabajador" value={detalle.empleado.nombre} /><Dato label="Identificación" value={detalle.empleado.id} /><Dato label="Cargo" value={detalle.empleado.cargo} />
            <Dato label="Fecha de solicitud" value={detalle.fechaSolicitud} /><Dato label="Proceso" value={detalle.proceso} /><Dato label="Jefe autorizador" value={detalle.jefe?.nombre} />
            <Dato label="Motivo" value={detalle.motivo ? MOTIVOS_PERMISO[detalle.motivo] : null} /><Dato label="Desde" value={detalle.fechaDesde} /><Dato label="Hasta" value={detalle.fechaHasta} />
            <Dato label="Duración solicitada" value={detalle.cantidad !== null ? `${detalle.cantidad} ${detalle.unidad?.toLowerCase() ?? ""}` : null} />
        </SimpleGrid><Dato label="Descripción" value={detalle.descripcion} /><Dato label="Documento soporte que presenta" value={detalle.documentoSoporte} /><Dato label="Mecanismo de recuperación del tiempo" value={detalle.mecanismoRecuperacion} />
            {detalle.soporte && <Flex align="center" gap={3} flexWrap="wrap"><Text>Soporte: {detalle.soporte.nombre} ({Math.ceil(detalle.soporte.tamanoBytes / 1024)} KiB)</Text><Button variant="outline" size="sm" disabled={busy} onClick={() => { void archivo("soporte"); }}>Descargar soporte</Button></Flex>}
        </Stack></Box>
        <Box borderWidth="1px" rounded="lg" p={{ base: 3, md: 5 }}><Stack gap={4}><Heading size="md">Firmas y decisión</Heading>
            {detalle.firmas.length === 0 && <Text color="fg.muted">Todavía no hay firmas sobre esta solicitud.</Text>}
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>{detalle.firmas.map((item) => <Box key={item.rol} borderWidth="1px" rounded="md" p={3}><Text fontWeight="semibold">{item.rol === "SOLICITANTE" ? "Solicitante" : "Jefe inmediato"}: {item.nombre}</Text><Image src={imagenFirma(item.imagenBase64)} alt={`Firma de ${item.nombre}`} bg="white" maxH="140px" w="full" objectFit="contain" my={2} /><Text fontSize="sm">{fechaHora(item.firmadoEn)}</Text></Box>)}</SimpleGrid>
            {detalle.motivoDecision && <Dato label="Observaciones de la decisión" value={detalle.motivoDecision} />}{detalle.motivoAnulacion && <Dato label="Motivo de anulación" value={detalle.motivoAnulacion} />}
            {detalle.puedePresentar && <Button alignSelf="start" disabled={busy} onClick={() => { setError(""); setFirma("presentar"); }}>Firmar y presentar</Button>}
            {detalle.puedeDecidir && <Stack gap={3}><Field.Root><Field.Label htmlFor="permiso-decision-nota">Observaciones del jefe</Field.Label><Textarea id="permiso-decision-nota" maxLength={2000} value={motivo} disabled={busy} onChange={(e) => setMotivo(e.target.value)} /><Field.HelperText>Para rechazar, el motivo es obligatorio.</Field.HelperText></Field.Root><Flex flexWrap="wrap" gap={3}><Button disabled={busy} onClick={() => { setError(""); setFirma("aprobar"); }}>Firmar y aprobar</Button><Button variant="outline" disabled={busy} onClick={() => { setError(""); setAccion("RECHAZAR"); }}>Rechazar</Button></Flex></Stack>}
            {detalle.puedeAnular && <Button variant="outline" alignSelf="start" disabled={busy} onClick={() => { setError(""); setMotivo(""); setAccion("ANULAR"); }}>Anular solicitud</Button>}
        </Stack></Box>
        <Box borderWidth="1px" rounded="lg" p={{ base: 3, md: 5 }}><Stack gap={4}><Heading size="md">Historial</Heading>{detalle.eventos.length === 0 ? <Text color="fg.muted">Sin eventos registrados.</Text> : <Stack as="ol" ps={5} gap={3}>{detalle.eventos.map((evento) => <Box as="li" key={evento.id}><Text fontWeight="medium">{evento.tipo.replace(/_/g, " ")}</Text><Text fontSize="sm" color="fg.muted">{fechaHora(evento.creadoEn)} · {evento.actorNombre}</Text>{evento.detalle && <Text whiteSpace="pre-wrap">{evento.detalle}</Text>}</Box>)}</Stack>}</Stack></Box>
        {firma && <PermisoFirmaDialog titulo={firma === "presentar" ? "Firmar y presentar solicitud" : "Firmar y aprobar permiso"} descripcion={`${detalle.folio} · ${detalle.empleado.nombre} · ${detalle.fechaDesde ?? ""} a ${detalle.fechaHasta ?? ""} · ${detalle.cantidad ?? ""} ${detalle.unidad ?? ""}. ${firma === "presentar" ? "La solicitud se enviará al jefe autorizado." : "La aprobación se registrará sobre la solicitud presentada por el trabajador."}`} busy={busy} onClose={() => setFirma(null)} onReload={async () => { setFirma(null); await recargar(); }} onConfirm={firmar} />}
        <Dialog.Root open={accion !== null} onOpenChange={({ open }) => { if (!open && !busy) setAccion(null); }} closeOnInteractOutside={!busy}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content><Dialog.Header><Dialog.Title>{accion === "ANULAR" ? "Anular solicitud" : "Rechazar solicitud"}</Dialog.Title></Dialog.Header><Dialog.Body><Stack gap={3}><Text>La acción quedará registrada en el historial de {detalle.folio}.</Text><Field.Root required><Field.Label htmlFor="permiso-decision-motivo">Motivo</Field.Label><Textarea id="permiso-decision-motivo" maxLength={2000} value={motivo} disabled={busy} onChange={(e) => setMotivo(e.target.value)} /></Field.Root>{error && <Text role="alert" color="fg.error">{error}</Text>}</Stack></Dialog.Body><Dialog.Footer><Button variant="outline" disabled={busy} onClick={() => setAccion(null)}>Cancelar</Button><Button loading={busy} disabled={busy || !motivo.trim()} onClick={() => { void resolver(); }}>Confirmar {accion === "ANULAR" ? "anulación" : "rechazo"}</Button></Dialog.Footer><Dialog.CloseTrigger asChild><CloseButton disabled={busy} /></Dialog.CloseTrigger></Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
    </Stack>;
}
