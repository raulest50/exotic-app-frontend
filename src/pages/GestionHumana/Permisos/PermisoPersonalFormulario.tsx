import { useRef, useState } from "react";
import { Box, Button, Field, Flex, Heading, Input, NativeSelect, SimpleGrid, Stack, Text, Textarea } from "@chakra-ui/react";
import { errorPermiso, permisosApi } from "./permisosPersonalApi";
import { MOTIVOS_PERMISO, type BorradorPermiso, type ContextoPermisos, type MotivoPermiso, type PermisoDetalle, type UnidadPermiso } from "./types";

interface Props { contexto: ContextoPermisos; inicial: PermisoDetalle | null; onSaved: (detalle: PermisoDetalle, firmar: boolean) => void; onCancel: () => void }

export default function PermisoPersonalFormulario({ contexto, inicial, onSaved, onCancel }: Props) {
    const actual = useRef(inicial);
    const [datos, setDatos] = useState<BorradorPermiso>({
        version: inicial?.version ?? null, proceso: inicial?.proceso ?? contexto.empleado?.proceso ?? "",
        motivo: inicial?.motivo ?? "", descripcion: inicial?.descripcion ?? "", documentoSoporte: inicial?.documentoSoporte ?? "",
        mecanismoRecuperacion: inicial?.mecanismoRecuperacion ?? "", fechaDesde: inicial?.fechaDesde ?? "", fechaHasta: inicial?.fechaHasta ?? "",
        cantidad: inicial?.cantidad ?? null, unidad: inicial?.unidad ?? "",
    });
    const [archivo, setArchivo] = useState<File | null>(null);
    const [quitarSoporte, setQuitarSoporte] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [errores, setErrores] = useState<Record<string, string>>({});
    const empleado = inicial?.empleado ?? contexto.empleado;
    const jefe = inicial?.jefe ?? contexto.jefe;
    const cambiar = <K extends keyof BorradorPermiso>(key: K, value: BorradorPermiso[K]) => {
        setDatos((prev) => ({ ...prev, [key]: value })); setErrores((prev) => ({ ...prev, [key]: "" }));
    };
    const validar = (presentar: boolean) => {
        const next: Record<string, string> = {};
        if (presentar) {
            if (!datos.proceso.trim()) next.proceso = "Indique el proceso.";
            if (!datos.motivo) next.motivo = "Seleccione un motivo.";
            if (!datos.descripcion.trim()) next.descripcion = "Describa la solicitud.";
            if (!datos.fechaDesde) next.fechaDesde = "Indique la fecha inicial.";
            if (!datos.fechaHasta) next.fechaHasta = "Indique la fecha final.";
            if (datos.cantidad === null) next.cantidad = "Indique la cantidad.";
            if (!datos.unidad) next.unidad = "Seleccione la unidad.";
        }
        if (datos.fechaDesde && datos.fechaHasta && datos.fechaHasta < datos.fechaDesde) next.fechaHasta = "La fecha final debe ser igual o posterior a la inicial.";
        if (datos.cantidad !== null && (!Number.isFinite(datos.cantidad) || datos.cantidad <= 0)) next.cantidad = "La cantidad debe ser mayor que cero.";
        setErrores(next);
        if (Object.keys(next).length > 0) {
            setError("Revise los campos marcados antes de continuar.");
            const ids: Record<string, string> = { proceso: "permiso-proceso", motivo: "permiso-motivo", descripcion: "permiso-descripcion", fechaDesde: "permiso-desde", fechaHasta: "permiso-hasta", cantidad: "permiso-cantidad", unidad: "permiso-unidad" };
            window.requestAnimationFrame(() => document.getElementById(ids[Object.keys(next)[0]])?.focus());
        }
        return Object.keys(next).length === 0;
    };
    const guardar = async (firmar: boolean) => {
        if (busy || !validar(firmar)) return;
        setBusy(true); setError("");
        try {
            let detalle = await permisosApi.guardar(actual.current?.id ?? null, { ...datos, version: actual.current?.version ?? null });
            actual.current = detalle;
            if (archivo) { detalle = await permisosApi.subirSoporte(detalle.id, detalle.version, archivo); actual.current = detalle; setArchivo(null); }
            else if (quitarSoporte && detalle.soporte) { detalle = await permisosApi.borrarSoporte(detalle.id, detalle.version); actual.current = detalle; }
            onSaved(detalle, firmar);
        } catch (e) { setError(errorPermiso(e)); }
        finally { setBusy(false); }
    };
    const seleccionarSoporte = (file?: File) => {
        setError("");
        if (!file) { setArchivo(null); return; }
        if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
            setArchivo(null); setError("El soporte debe ser PDF, PNG o JPG, de hasta 5 MiB. El archivo seleccionado no se guardará."); return;
        }
        setArchivo(file); setQuitarSoporte(false);
    };
    return <Stack gap={6} as="section" aria-label="Formulario de permiso laboral">
        <Flex gap={3} flexWrap="wrap" justify="space-between"><Heading size="lg">{inicial ? `Editar ${inicial.folio}` : "Nueva solicitud de permiso"}</Heading><Button variant="outline" disabled={busy} onClick={onCancel}>Volver a la bandeja</Button></Flex>
        <Text color="fg.muted">Complete la solicitud y revise su expediente antes de firmar. Puede guardar un borrador sin completar todos los campos.</Text>
        <Box borderWidth="1px" rounded="lg" p={{ base: 3, md: 5 }}><Stack gap={4}><Heading size="md">1. Trabajador y solicitud</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Field.Root><Field.Label htmlFor="permiso-trabajador">Trabajador</Field.Label><Input id="permiso-trabajador" readOnly value={empleado?.nombre ?? "Sin trabajador vinculado"} /></Field.Root>
                <Field.Root><Field.Label htmlFor="permiso-cargo">Cargo</Field.Label><Input id="permiso-cargo" readOnly value={empleado?.cargo ?? "Sin cargo registrado"} /></Field.Root>
                <Field.Root><Field.Label htmlFor="permiso-identificacion">Identificación</Field.Label><Input id="permiso-identificacion" readOnly value={empleado?.id ?? "Sin identificación registrada"} /></Field.Root>
                <Field.Root><Field.Label htmlFor="permiso-fecha-solicitud">Fecha de solicitud</Field.Label><Input id="permiso-fecha-solicitud" readOnly value={inicial?.fechaSolicitud ?? "Se asigna al guardar"} /></Field.Root>
                <Field.Root required invalid={!!errores.proceso}><Field.Label htmlFor="permiso-proceso">Proceso</Field.Label><Input id="permiso-proceso" maxLength={200} value={datos.proceso} disabled={busy} onChange={(e) => cambiar("proceso", e.target.value)} /><Field.ErrorText>{errores.proceso}</Field.ErrorText></Field.Root>
            </SimpleGrid>
        </Stack></Box>
        <Box borderWidth="1px" rounded="lg" p={{ base: 3, md: 5 }}><Stack gap={4}><Heading size="md">2. Motivo y soporte</Heading>
            <Field.Root required invalid={!!errores.motivo}><Field.Label htmlFor="permiso-motivo">Motivo</Field.Label><NativeSelect.Root disabled={busy}><NativeSelect.Field id="permiso-motivo" value={datos.motivo} onChange={(e) => cambiar("motivo", e.target.value as MotivoPermiso | "")}><option value="">Seleccione un motivo</option>{Object.entries(MOTIVOS_PERMISO).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Field.ErrorText>{errores.motivo}</Field.ErrorText></Field.Root>
            <Field.Root required invalid={!!errores.descripcion}><Field.Label htmlFor="permiso-descripcion">Descripción de la solicitud</Field.Label><Textarea id="permiso-descripcion" rows={4} maxLength={4000} value={datos.descripcion} disabled={busy} onChange={(e) => cambiar("descripcion", e.target.value)} /><Field.ErrorText>{errores.descripcion}</Field.ErrorText></Field.Root>
            <Field.Root><Field.Label htmlFor="permiso-documento">Documento soporte que presenta</Field.Label><Input id="permiso-documento" maxLength={500} value={datos.documentoSoporte} disabled={busy} onChange={(e) => cambiar("documentoSoporte", e.target.value)} /><Field.HelperText>Describa el soporte, cuando aplique.</Field.HelperText></Field.Root>
            <Field.Root><Field.Label htmlFor="permiso-soporte">Adjuntar soporte</Field.Label><Input id="permiso-soporte" type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={(e) => seleccionarSoporte(e.target.files?.[0])} /><Field.HelperText>Un archivo PDF, PNG o JPG, máximo 5 MiB. {archivo ? `Seleccionado: ${archivo.name}` : ""}</Field.HelperText></Field.Root>
            {inicial?.soporte && !quitarSoporte && <Flex align="center" gap={3} flexWrap="wrap"><Text>Soporte actual: {inicial.soporte.nombre}</Text><Button size="sm" variant="outline" disabled={busy} onClick={() => { setQuitarSoporte(true); setArchivo(null); }}>Quitar al guardar</Button></Flex>}
            {quitarSoporte && <Button alignSelf="start" size="sm" variant="outline" onClick={() => setQuitarSoporte(false)} disabled={busy}>Conservar soporte actual</Button>}
        </Stack></Box>
        <Box borderWidth="1px" rounded="lg" p={{ base: 3, md: 5 }}><Stack gap={4}><Heading size="md">3. Fechas y duración</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Field.Root required invalid={!!errores.fechaDesde}><Field.Label htmlFor="permiso-desde">Desde</Field.Label><Input id="permiso-desde" type="date" value={datos.fechaDesde} disabled={busy} onChange={(e) => cambiar("fechaDesde", e.target.value)} /><Field.ErrorText>{errores.fechaDesde}</Field.ErrorText></Field.Root>
                <Field.Root required invalid={!!errores.fechaHasta}><Field.Label htmlFor="permiso-hasta">Hasta</Field.Label><Input id="permiso-hasta" type="date" min={datos.fechaDesde || undefined} value={datos.fechaHasta} disabled={busy} onChange={(e) => cambiar("fechaHasta", e.target.value)} /><Field.ErrorText>{errores.fechaHasta}</Field.ErrorText></Field.Root>
                <Field.Root required invalid={!!errores.cantidad}><Field.Label htmlFor="permiso-cantidad">Cantidad</Field.Label><Input id="permiso-cantidad" type="number" min="0.01" step="0.01" value={datos.cantidad ?? ""} disabled={busy} onChange={(e) => cambiar("cantidad", e.target.value === "" ? null : Number(e.target.value))} /><Field.ErrorText>{errores.cantidad}</Field.ErrorText></Field.Root>
                <Field.Root required invalid={!!errores.unidad}><Field.Label htmlFor="permiso-unidad">Unidad</Field.Label><NativeSelect.Root disabled={busy}><NativeSelect.Field id="permiso-unidad" value={datos.unidad} onChange={(e) => cambiar("unidad", e.target.value as UnidadPermiso | "")}><option value="">Seleccione unidad</option><option value="HORAS">Horas</option><option value="DIAS">Días</option><option value="MESES">Meses</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Field.ErrorText>{errores.unidad}</Field.ErrorText></Field.Root>
            </SimpleGrid>
            <Text fontSize="sm" color="fg.muted">La cantidad y su unidad se conservan como se solicitan; no se convierten automáticamente a horas.</Text>
            <Field.Root><Field.Label htmlFor="permiso-recuperacion">Mecanismo para recuperar el tiempo</Field.Label><Textarea id="permiso-recuperacion" rows={2} maxLength={2000} value={datos.mecanismoRecuperacion} disabled={busy} onChange={(e) => cambiar("mecanismoRecuperacion", e.target.value)} /><Field.HelperText>Complete cuando aplique.</Field.HelperText></Field.Root>
        </Stack></Box>
        <Box borderWidth="1px" rounded="lg" p={{ base: 3, md: 5 }}><Stack gap={3}><Heading size="md">4. Responsable, revisión y firma</Heading><Text>Jefe autorizador: <strong>{jefe?.nombre ?? "Pendiente de configuración"}</strong></Text><Text fontSize="sm" color="fg.muted">Al continuar se guarda la solicitud y se muestra el expediente completo. Su firma se solicita después de esa revisión.</Text></Stack></Box>
        {error && <Box role="alert" borderWidth="1px" borderColor="border.error" p={3} rounded="md"><Text color="fg.error">{error}</Text>{actual.current && <Button mt={2} variant="outline" size="sm" disabled={busy} onClick={async () => { try { onSaved(await permisosApi.detalle(actual.current!.id), false); } catch (e) { setError(errorPermiso(e)); } }}>Consultar la versión guardada</Button>}</Box>}
        <Flex gap={3} justify="end" flexWrap="wrap"><Button variant="outline" loading={busy} disabled={busy} onClick={() => { void guardar(false); }}>Guardar borrador</Button><Button disabled={busy || !contexto.habilitado} loading={busy} onClick={() => { void guardar(true); }}>Guardar y revisar para firmar</Button></Flex>
    </Stack>;
}
