import { useEffect, useRef, useState } from "react";
import { Box, Button, Field, Flex, Heading, Input, NativeSelect, Spinner, Stack, Table, Text } from "@chakra-ui/react";
import PermisoPersonalFormulario from "./PermisoPersonalFormulario";
import PermisoPersonalDetalle from "./PermisoPersonalDetalle";
import PermisosConfiguracion from "./PermisosConfiguracion";
import { cancelado, errorPermiso, permisosApi } from "./permisosPersonalApi";
import { ESTADOS_PERMISO, type ContextoPermisos, type EstadoPermiso, type ModoPermisos, type PermisoDetalle, type PermisoPage, type PermisoResumen, type ScopePermiso } from "./types";

type Vista = "bandeja" | "formulario" | "detalle" | "configuracion";
export default function PermisosPersonal({ modo }: { modo: ModoPermisos }) {
    const solicitudes = modo === "solicitudes";
    const filtroId = `permiso-${modo}-filtro`;
    const [contexto, setContexto] = useState<ContextoPermisos | null>(null);
    const [errorContexto, setErrorContexto] = useState("");
    const [revisionContexto, setRevisionContexto] = useState(0);
    const [vista, setVista] = useState<Vista>("bandeja");
    const [scope, setScope] = useState<ScopePermiso>(solicitudes ? "MIAS" : "POR_REVISAR");
    const [estado, setEstado] = useState<EstadoPermiso | "">("");
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [q, setQ] = useState("");
    const [filtros, setFiltros] = useState<{ q: string; estado: EstadoPermiso | ""; desde: string; hasta: string }>({ q: "", estado: "", desde: "", hasta: "" });
    const [page, setPage] = useState(0);
    const [pagina, setPagina] = useState<PermisoPage<PermisoResumen> | null>(null);
    const [revision, setRevision] = useState(0);
    const [loading, setLoading] = useState(false);
    const [abriendo, setAbriendo] = useState(false);
    const [error, setError] = useState("");
    const [detalle, setDetalle] = useState<PermisoDetalle | null>(null);
    const [paraFirmar, setParaFirmar] = useState(false);
    const abrirController = useRef<AbortController | null>(null);
    const scopeActivo = solicitudes ? "MIAS" : scope === "TODAS" && contexto?.puedeConsultarTodas ? "TODAS" : "POR_REVISAR";
    const puedeEntrar = solicitudes ? contexto?.puedeSolicitar : contexto?.puedeRevisar;

    useEffect(() => {
        const controller = new AbortController();
        permisosApi.contexto(controller.signal).then((data) => { setContexto(data); setErrorContexto(""); }).catch((e: unknown) => { if (!cancelado(e)) setErrorContexto(errorPermiso(e)); });
        return () => controller.abort();
    }, [revisionContexto]);
    useEffect(() => {
        if (!contexto || !puedeEntrar || vista !== "bandeja") return;
        const controller = new AbortController();
        const consultar = async () => {
            setLoading(true); setError("");
            try { const data = await permisosApi.listar({ ...filtros, scope: scopeActivo, estado: scopeActivo === "POR_REVISAR" ? "SOLICITADA" : filtros.estado, q: solicitudes ? "" : filtros.q, page, size: 10 }, controller.signal); setPagina(data); }
            catch (e) { if (!cancelado(e)) { setError(errorPermiso(e)); setPagina(null); } }
            finally { if (!controller.signal.aborted) setLoading(false); }
        };
        void consultar(); return () => controller.abort();
    }, [contexto, puedeEntrar, vista, scopeActivo, solicitudes, filtros, page, revision]);
    useEffect(() => () => abrirController.current?.abort(), []);

    const abrir = async (id: number) => {
        abrirController.current?.abort(); const controller = new AbortController(); abrirController.current = controller;
        setAbriendo(true); setError("");
        try { const data = await permisosApi.detalle(id, controller.signal); setDetalle(data); setParaFirmar(false); setVista("detalle"); }
        catch (e) { if (!cancelado(e)) setError(errorPermiso(e)); }
        finally { if (!controller.signal.aborted) setAbriendo(false); }
    };
    const volver = () => { setVista("bandeja"); setDetalle(null); setRevision((value) => value + 1); };
    const guardar = (data: PermisoDetalle, firmar: boolean) => { setDetalle(data); setParaFirmar(firmar); setVista("detalle"); };
    const filtrar = () => {
        if (desde && hasta && hasta < desde) { setError("La fecha final del filtro debe ser igual o posterior a la inicial."); return; }
        setPage(0); setFiltros({ q: q.trim(), estado, desde, hasta });
    };
    const cambiarScope = (value: ScopePermiso) => {
        setPage(0); setScope(value); setEstado(""); setFiltros((actuales) => ({ ...actuales, estado: "" })); setPagina(null); setError("");
    };
    if (!contexto) return <Stack gap={3}>{errorContexto ? <><Text role="alert" color="fg.error">{errorContexto}</Text><Button alignSelf="start" variant="outline" onClick={() => setRevisionContexto((value) => value + 1)}>Reintentar</Button></> : <Text role="status"><Spinner size="sm" mr={2} />Cargando permisos laborales…</Text>}</Stack>;
    if (!puedeEntrar) return <Text role="alert" color="fg.error">No tiene acceso a {solicitudes ? "Permisos" : "Aprobaciones"}. Solicite la asignación específica de esta pestaña.</Text>;
    if (!solicitudes && vista === "configuracion" && contexto.puedeConfigurar) return <PermisosConfiguracion onBack={volver} onUpdate={() => setRevisionContexto((value) => value + 1)} />;
    if (solicitudes && vista === "formulario") return <PermisoPersonalFormulario key={detalle?.id ?? "nueva"} contexto={contexto} inicial={detalle} onSaved={guardar} onCancel={volver} />;
    if (vista === "detalle" && detalle) return <PermisoPersonalDetalle key={detalle.id} modo={modo} puedeAnularAdministrativamente={!solicitudes && contexto.puedeConfigurar} detalle={detalle} paraFirmar={solicitudes && paraFirmar} onChange={(data) => { setDetalle(data); setParaFirmar(false); }} onEdit={() => { if (solicitudes) setVista("formulario"); }} onBack={volver} />;
    return <Stack gap={5} minW={0} as="section" aria-label={solicitudes ? "Permisos laborales" : "Aprobaciones de Gestión Humana"}>
        <Flex justify="space-between" gap={3} flexWrap="wrap"><Box><Heading size="lg">{solicitudes ? "Permisos laborales" : "Aprobaciones"}</Heading><Text color="fg.muted">{solicitudes ? "Cree, firme y consulte sus solicitudes de permiso y su historial." : "Bandeja de solicitudes de permiso para revisión y seguimiento."}</Text></Box><Flex gap={2} flexWrap="wrap">{!solicitudes && contexto.puedeConfigurar && <Button variant="outline" onClick={() => setVista("configuracion")}>Configurar identidad y jefes</Button>}{solicitudes && <Button disabled={!contexto.habilitado || abriendo} onClick={() => { setDetalle(null); setVista("formulario"); }}>Nueva solicitud</Button>}</Flex></Flex>
        {solicitudes && !contexto.habilitado && <Box p={4} borderWidth="1px" rounded="md" bg="bg.subtle"><Text fontWeight="semibold">Configuración pendiente para presentar solicitudes</Text><Stack as="ul" ps={5} gap={1} mt={2}>{contexto.impedimentos.map((item) => <Text as="li" key={item}>{item}</Text>)}</Stack><Text mt={2} fontSize="sm">Solicite al administrador de Aprobaciones la vinculación de su cuenta y la asignación de su jefe.</Text></Box>}
        {solicitudes ? <Text fontWeight="semibold">Mis solicitudes</Text> : <Flex gap={2} wrap="wrap" role="group" aria-label="Alcance de la consulta">
            {([{ value: "POR_REVISAR", label: "Pendientes asignadas", visible: true }, { value: "TODAS", label: "Todas", visible: contexto.puedeConsultarTodas }] as const).filter((item) => item.visible).map((item) => <Button key={item.value} variant={scopeActivo === item.value ? "solid" : "outline"} aria-pressed={scopeActivo === item.value} disabled={abriendo} onClick={() => cambiarScope(item.value)}>{item.label}</Button>)}
        </Flex>}
        {!solicitudes && <Text fontSize="sm" color="fg.muted">{scopeActivo === "POR_REVISAR" ? "Solo solicitudes pendientes asignadas a usted como jefe autorizador. Aprobar o rechazar requiere el nivel 2 de Aprobaciones y ser una persona distinta del solicitante." : "Consulta general de expedientes. Las decisiones siguen limitadas al jefe asignado y requieren el nivel 2 de Aprobaciones."}</Text>}
        <Flex gap={3} flexWrap="wrap" align="end">
            {!solicitudes && <Field.Root w={{ base: "full", md: "260px" }}><Field.Label htmlFor={`${filtroId}-trabajador`}>Buscar trabajador</Field.Label><Input id={`${filtroId}-trabajador`} placeholder="Nombre o identificación" maxLength={120} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") filtrar(); }} /></Field.Root>}
            {scopeActivo !== "POR_REVISAR" && <Field.Root w={{ base: "full", md: "200px" }}><Field.Label htmlFor={`${filtroId}-estado`}>Estado</Field.Label><NativeSelect.Root><NativeSelect.Field id={`${filtroId}-estado`} value={estado} onChange={(e) => setEstado(e.target.value as EstadoPermiso | "")}><option value="">Todos los estados</option>{Object.entries(ESTADOS_PERMISO).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>}
            <Field.Root w={{ base: "full", md: "180px" }}><Field.Label htmlFor={`${filtroId}-desde`}>Permiso desde</Field.Label><Input id={`${filtroId}-desde`} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field.Root>
            <Field.Root w={{ base: "full", md: "180px" }}><Field.Label htmlFor={`${filtroId}-hasta`}>Permiso hasta</Field.Label><Input id={`${filtroId}-hasta`} type="date" min={desde || undefined} value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field.Root>
            <Button variant="outline" disabled={loading || abriendo} onClick={filtrar}>Consultar</Button>
        </Flex>
        {errorContexto && <Text role="alert" color="fg.error">{errorContexto}</Text>}{error && <Box role="alert"><Text color="fg.error">{error}</Text><Button size="sm" variant="outline" onClick={() => setRevision((value) => value + 1)}>Reintentar consulta</Button></Box>}
        {(loading || abriendo) && <Text role="status"><Spinner size="sm" mr={2} />{abriendo ? "Abriendo expediente…" : "Consultando solicitudes…"}</Text>}
        {!loading && !error && pagina?.content.length === 0 && <Box p={8} borderWidth="1px" rounded="lg"><Text>No hay solicitudes para este alcance y los filtros seleccionados.</Text></Box>}
        {!!pagina?.content.length && <Box overflowX="auto" aria-busy={loading}><Table.Root size="sm"><Table.Header><Table.Row><Table.ColumnHeader>Folio</Table.ColumnHeader>{!solicitudes && <Table.ColumnHeader>Trabajador</Table.ColumnHeader>}<Table.ColumnHeader>Fecha de solicitud</Table.ColumnHeader><Table.ColumnHeader>Fechas del permiso</Table.ColumnHeader><Table.ColumnHeader>Duración</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader>Acciones</Table.ColumnHeader></Table.Row></Table.Header><Table.Body>{pagina.content.map((item) => <Table.Row key={item.id}><Table.Cell>{item.folio}</Table.Cell>{!solicitudes && <Table.Cell>{item.empleadoNombre}</Table.Cell>}<Table.Cell whiteSpace="nowrap">{item.fechaSolicitud}</Table.Cell><Table.Cell whiteSpace="nowrap">{item.fechaDesde ?? "Sin fecha"} → {item.fechaHasta ?? "Sin fecha"}</Table.Cell><Table.Cell>{item.cantidad !== null ? `${item.cantidad} ${item.unidad?.toLowerCase() ?? ""}` : "Sin registrar"}</Table.Cell><Table.Cell>{ESTADOS_PERMISO[item.estado]}</Table.Cell><Table.Cell><Button size="sm" variant="outline" aria-label={`Ver solicitud ${item.folio}`} disabled={loading || abriendo} onClick={() => { void abrir(item.id); }}>Ver solicitud</Button></Table.Cell></Table.Row>)}</Table.Body></Table.Root></Box>}
        {pagina && pagina.totalPages > 1 && <Flex align="center" justify="center" gap={3} flexWrap="wrap"><Button variant="outline" disabled={loading || page === 0} onClick={() => setPage((value) => value - 1)}>Anterior</Button><Text>Página {pagina.number + 1} de {pagina.totalPages} · {pagina.totalElements} solicitudes</Text><Button variant="outline" disabled={loading || page >= pagina.totalPages - 1} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></Flex>}
    </Stack>;
}
