import { useEffect, useState } from "react";
import { Box, Button, Field, Flex, Heading, NativeSelect, Stack, Text, Textarea } from "@chakra-ui/react";
import { cancelado, errorPermiso, permisosApi } from "./permisosPersonalApi";
import type { ConfiguracionPermisos } from "./types";

interface Props { onBack: () => void; onUpdate: () => void }
export default function PermisosConfiguracion({ onBack, onUpdate }: Props) {
    const [config, setConfig] = useState<ConfiguracionPermisos | null>(null);
    const [empleadoId, setEmpleadoId] = useState("");
    const [usuarioId, setUsuarioId] = useState("");
    const [jefeId, setJefeId] = useState("");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [busy, setBusy] = useState(false);
    const [revision, setRevision] = useState(0);
    const seleccionado = config?.empleados.find((item) => String(item.empleado.id) === empleadoId);
    useEffect(() => {
        const controller = new AbortController();
        permisosApi.configuracion(controller.signal).then((data) => { setConfig(data); setError(""); }).catch((e: unknown) => { if (!cancelado(e)) setError(errorPermiso(e)); });
        return () => controller.abort();
    }, [revision]);
    const seleccionar = (value: string) => {
        const item = config?.empleados.find((row) => String(row.empleado.id) === value);
        setEmpleadoId(value); setUsuarioId(item?.empleado.usuarioId ? String(item.empleado.usuarioId) : "");
        setJefeId(item?.jefeConfigurado ? String(item.jefeConfigurado.id) : ""); setMotivo(""); setError(""); setMensaje("");
    };
    const guardar = async () => {
        if (!seleccionado || !motivo.trim() || busy) return;
        setBusy(true); setError(""); setMensaje("");
        try {
            await permisosApi.configurar(seleccionado.empleado.id, { version: seleccionado.version, usuarioId: usuarioId ? Number(usuarioId) : null, jefeUsuarioId: jefeId ? Number(jefeId) : null, motivo: motivo.trim() });
            const data = await permisosApi.configuracion(); setConfig(data); setMotivo(""); setMensaje("La vinculación y el responsable quedaron guardados."); onUpdate();
        } catch (e) { setError(errorPermiso(e)); }
        finally { setBusy(false); }
    };
    return <Stack gap={5} as="section" aria-label="Configuración de permisos laborales">
        <Flex justify="space-between" gap={3} flexWrap="wrap"><Heading size="lg">Identidad y responsables</Heading><Button variant="outline" onClick={onBack} disabled={busy}>Volver a la bandeja</Button></Flex>
        <Text>Vincule expresamente cada trabajador con su cuenta y revise su jefe autorizador. Los cambios se registran con un motivo. Las solicitudes ya presentadas conservan su responsable histórico.</Text>
        {error && <Box role="alert"><Text color="fg.error">{error}</Text><Button size="sm" variant="outline" disabled={busy} onClick={() => setRevision((value) => value + 1)}>Recargar configuración</Button></Box>}
        {mensaje && <Text role="status" color="fg.success">{mensaje}</Text>}
        {!config && !error && <Text role="status">Cargando configuración…</Text>}
        {config && <Box borderWidth="1px" p={{ base: 3, md: 5 }} rounded="lg"><Stack gap={4}>
            <Field.Root><Field.Label htmlFor="permiso-config-empleado">Trabajador</Field.Label><NativeSelect.Root disabled={busy}><NativeSelect.Field id="permiso-config-empleado" value={empleadoId} onChange={(e) => seleccionar(e.target.value)}><option value="">Seleccione un trabajador</option>{config.empleados.map(({ empleado }) => <option key={empleado.id} value={empleado.id}>{empleado.nombre} · {empleado.id}{empleado.usuarioId ? " · Vinculado" : " · Sin cuenta"}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
            {seleccionado && <>
                <Text fontSize="sm" color="fg.muted">Cargo: {seleccionado.empleado.cargo ?? "Sin registrar"} · Jefe en organigrama: {seleccionado.jefeOrganigrama?.nombre ?? "Sin responsable disponible"}</Text>
                <Field.Root><Field.Label htmlFor="permiso-config-usuario">Cuenta del trabajador</Field.Label><NativeSelect.Root disabled={busy}><NativeSelect.Field id="permiso-config-usuario" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}><option value="">Sin cuenta vinculada</option>{config.usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nombre} · {usuario.username}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Field.HelperText>Compruebe la identidad antes de vincular. No se realizan asociaciones automáticas por nombre o documento.</Field.HelperText></Field.Root>
                <Field.Root><Field.Label htmlFor="permiso-config-jefe">Jefe autorizador</Field.Label><NativeSelect.Root disabled={busy}><NativeSelect.Field id="permiso-config-jefe" value={jefeId} onChange={(e) => setJefeId(e.target.value)}><option value="">Usar responsable del organigrama</option>{config.usuarios.filter((usuario) => String(usuario.id) !== usuarioId).map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nombre} · {usuario.username}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Field.HelperText>El jefe requiere permiso PERSONAL / PERMISOS de nivel 2 o superior para decidir. Una cuenta no puede aprobar su propia solicitud.</Field.HelperText></Field.Root>
                {!jefeId && !seleccionado.jefeOrganigrama && <Text color="fg.warning">El organigrama no ofrece un jefe para este trabajador. Asigne un responsable para habilitar su presentación.</Text>}
                <Field.Root required><Field.Label htmlFor="permiso-config-motivo">Motivo del cambio</Field.Label><Textarea id="permiso-config-motivo" rows={2} maxLength={1000} value={motivo} disabled={busy} onChange={(e) => setMotivo(e.target.value)} /></Field.Root>
                <Button alignSelf="end" loading={busy} disabled={busy || !motivo.trim()} onClick={() => { void guardar(); }}>Guardar configuración</Button>
            </>}
        </Stack></Box>}
    </Stack>;
}
