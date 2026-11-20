import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert, Badge, Box, Button, Checkbox, CloseButton, Dialog, Field, Flex, Heading, HStack,
    Input, Portal, Spinner, Steps, Table, Text, VStack,
} from "@chakra-ui/react";
import { LuCheck } from "react-icons/lu";
import { useTabPermission } from "../../../auth/usePermissions";
import { useAuth } from "../../../context/AuthContext";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";
import ProveedorPicker from "../components/ProveedorPicker";
import type { Proveedor } from "../types";
import PuntosReordenConfiguracion from "./PuntosReordenConfiguracion";
import FiltroColumna from "./FiltroColumna";
import { calcularPuntosReorden, cancelarPuntosReorden, confirmarPuntosReorden, continuarPuntosReorden, prepararPuntosReorden, puntosReordenError } from "./puntosReordenApi";
import { descargarPuntosReordenPdf } from "./puntosReordenPdf";
import type { CalculoPuntosReorden, FilaPuntoReorden, ParametrosPuntosReorden, PreparacionPuntosReorden, ResultadoPuntosReorden } from "./types";

const PAGE_SIZE = 25;
const STEPS = ["Configurar y seleccionar", "Revisar y confirmar", "Resultado y PDF"];
const ESTADOS = {
    LISTO: "Listo", SIN_CONSUMO: "Sin consumo", SIN_PROVEEDOR: "Sin proveedor",
    SIN_LEAD_TIME: "Sin plazo negociado", SIN_DIAS: "Días insuficientes",
};
const COLUMNAS = [
    { key: "productoId", label: "ID" }, { key: "nombre", label: "Material" }, { key: "proveedor", label: "Proveedor" },
    { key: "unidad", label: "Unidad" }, { key: "leadTimeNegociado", label: "LT (días)" },
    { key: "consumoDiario", label: "Consumo diario" }, { key: "puntoReordenActual", label: "PR actual" },
    { key: "puntoReordenNuevo", label: "PR nuevo" }, { key: "diferencia", label: "Diferencia" }, { key: "estado", label: "Estado" },
] as const;
type Columna = typeof COLUMNAS[number]["key"];
type Filtros = Partial<Record<Columna, string[]>>;

function hoyBogota() {
    const partes = new Intl.DateTimeFormat("en", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    return ["year", "month", "day"].map((tipo) => partes.find((parte) => parte.type === tipo)?.value).join("-");
}
function desplazarFecha(fecha: string, dias: number) {
    return new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * 86400000).toISOString().slice(0, 10);
}
function iniciales(): ParametrosPuntosReorden {
    const fechaHasta = desplazarFecha(hoyBogota(), -1);
    return { fechaDesde: desplazarFecha(fechaHasta, -89), fechaHasta, porcentajeSeguridad: 10, minimoDiasEfectivos: 30, fechasExcluidas: [], proveedoresPorMaterial: {} };
}
function errorParametros(parametros: ParametrosPuntosReorden, hoy: string): string | null {
    const dias = (Date.parse(`${parametros.fechaHasta}T00:00:00Z`) - Date.parse(`${parametros.fechaDesde}T00:00:00Z`)) / 86400000 + 1;
    if (!Number.isFinite(dias) || dias < 45 || dias > 3660) return "Elija un rango inclusivo de 45 a 3660 días calendario.";
    if (parametros.fechaHasta > hoy) return "La fecha final no puede ser posterior a hoy en Bogotá.";
    if (!Number.isFinite(parametros.porcentajeSeguridad) || parametros.porcentajeSeguridad < 0 || parametros.porcentajeSeguridad > 100
        || Math.abs(parametros.porcentajeSeguridad * 1e6 - Math.round(parametros.porcentajeSeguridad * 1e6)) > 1e-6) {
        return "La seguridad debe estar entre 0 y 100 %, con hasta seis decimales.";
    }
    if (!Number.isInteger(parametros.minimoDiasEfectivos) || parametros.minimoDiasEfectivos < 1 || parametros.minimoDiasEfectivos > 3660) return "El mínimo de días efectivos debe ser un entero entre 1 y 3660.";
    return null;
}
function numero(value: number | null): string {
    return value === null ? "Sin dato" : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 6 }).format(value);
}
function elegible(fila: FilaPuntoReorden) {
    return fila.estado === "LISTO" && fila.leadTimeNegociado !== null && fila.puntoReordenNuevo !== null;
}
function valorColumna(fila: FilaPuntoReorden, columna: Columna): string {
    if (columna === "proveedor") return fila.proveedorNombre ? `${fila.proveedorNombre} (${fila.proveedorId})` : "Sin proveedor";
    if (columna === "estado") return ESTADOS[fila.estado];
    if (columna === "diferencia") return fila.puntoReordenNuevo === null ? "Sin dato"
        : fila.puntoReordenActual < 0 ? "Activar umbral" : numero(fila.puntoReordenNuevo - fila.puntoReordenActual);
    const value = fila[columna];
    return typeof value === "number" || value === null ? numero(value) : value;
}

export default function PuntosReordenTab() {
    const permiso = useTabPermission(Modulo.COMPRAS, "PUNTOS_REORDEN");
    const { user } = useAuth();
    const puedeAplicar = permiso.ready && permiso.nivel >= 2;
    const [paso, setPaso] = useState(0);
    const [parametros, setParametros] = useState<ParametrosPuntosReorden>(iniciales);
    const [calculo, setCalculo] = useState<CalculoPuntosReorden | null>(null);
    const [claveCalculada, setClaveCalculada] = useState("");
    const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
    const [filtros, setFiltros] = useState<Filtros>({});
    const [pagina, setPagina] = useState(0);
    const [calculando, setCalculando] = useState(false);
    const [ocupado, setOcupado] = useState(false);
    const [generandoPdf, setGenerandoPdf] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avisoCancelacion, setAvisoCancelacion] = useState<string | null>(null);
    const [preparacion, setPreparacion] = useState<PreparacionPuntosReorden | null>(null);
    const [resultado, setResultado] = useState<ResultadoPuntosReorden | null>(null);
    const [dialogoToken, setDialogoToken] = useState(false);
    const [tokenIngresado, setTokenIngresado] = useState("");
    const [errorToken, setErrorToken] = useState<string | null>(null);
    const [filaProveedor, setFilaProveedor] = useState<string | null>(null);
    const [ahora, setAhora] = useState(Date.now());
    const [reintento, setReintento] = useState(0);
    const propietario = useRef(user);
    const revision = useRef(0);
    const solicitud = useRef<AbortController | null>(null);
    const idsConocidos = useRef<Set<string>>(new Set());
    const titulo = useRef<HTMLHeadingElement | null>(null);
    const tokenInput = useRef<HTMLInputElement | null>(null);
    const parametrosKey = JSON.stringify(parametros);
    const hoy = hoyBogota();
    const errorFormulario = errorParametros(parametros, hoy);
    const actual = calculo !== null && claveCalculada === parametrosKey;
    const preparacionId = preparacion?.preparacionId;

    useEffect(() => {
        if (propietario.current === user) return;
        propietario.current = user;
        revision.current++;
        solicitud.current?.abort();
        idsConocidos.current = new Set();
        setCalculo(null); setClaveCalculada(""); setSeleccion(new Set()); setFiltros({}); setParametros(iniciales());
        setPreparacion(null); setResultado(null); setPaso(0); setDialogoToken(false); setTokenIngresado("");
        setError(null); setAvisoCancelacion(null); setErrorToken(null); setFilaProveedor(null); setPagina(0);
        setReintento((anterior) => anterior + 1);
    }, [user]);

    useEffect(() => {
        if (!preparacionId) return;
        return () => { void cancelarPuntosReorden(preparacionId).catch(() => undefined); };
    }, [preparacionId]);

    useEffect(() => {
        if (!permiso.ready || !permiso.canSee || paso !== 0 || preparacion) return;
        const version = ++revision.current;
        const controller = new AbortController();
        solicitud.current?.abort();
        solicitud.current = controller;
        if (errorFormulario) {
            setCalculando(false);
            return () => controller.abort();
        }
        setCalculando(true);
        setError(null);
        const timer = window.setTimeout(async () => {
            try {
                const respuesta = await calcularPuntosReorden(JSON.parse(parametrosKey) as ParametrosPuntosReorden, controller.signal);
                if (controller.signal.aborted || version !== revision.current) return;
                setCalculo(respuesta);
                setClaveCalculada(parametrosKey);
                const conocidosAntes = idsConocidos.current;
                setSeleccion((anterior) => new Set(respuesta.filas.filter((fila) => elegible(fila)
                    && (conocidosAntes.has(fila.productoId) ? anterior.has(fila.productoId) : fila.seleccionadaPorDefecto)).map((fila) => fila.productoId)));
                idsConocidos.current = new Set(respuesta.filas.map((fila) => fila.productoId));
            } catch (fallo) {
                if (!controller.signal.aborted && version === revision.current) setError(puntosReordenError(fallo));
            } finally {
                if (!controller.signal.aborted && version === revision.current) setCalculando(false);
            }
        }, 350);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [parametrosKey, errorFormulario, permiso.ready, permiso.canSee, paso, preparacion, reintento]);

    useEffect(() => {
        if (!preparacion) return;
        setAhora(Date.now());
        const timer = window.setInterval(() => setAhora(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [preparacion]);
    useEffect(() => { titulo.current?.focus(); }, [paso]);
    useEffect(() => {
        const advertir = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        if (!preparacion || resultado) return;
        window.addEventListener("beforeunload", advertir);
        return () => window.removeEventListener("beforeunload", advertir);
    }, [preparacion, resultado]);

    const cambiarParametros = useCallback((siguientes: ParametrosPuntosReorden) => {
        revision.current++;
        solicitud.current?.abort();
        setParametros(siguientes);
        setClaveCalculada("");
        setPagina(0);
        setError(null);
        setAvisoCancelacion(null);
    }, []);
    const cambiarProveedor = (proveedor: Proveedor) => {
        if (!filaProveedor) return;
        cambiarParametros({ ...parametros, proveedoresPorMaterial: { ...parametros.proveedoresPorMaterial, [filaProveedor]: String(proveedor.id) } });
        setFilaProveedor(null);
    };
    const filas = useMemo(() => calculo?.filas ?? [], [calculo]);
    const opciones = useMemo(() => Object.fromEntries(COLUMNAS.map((columna) => [columna.key,
        [...new Set(filas.map((fila) => valorColumna(fila, columna.key)))].sort((a, b) => a.localeCompare(b, "es", { numeric: true })),
    ])) as Record<Columna, string[]>, [filas]);
    const filtradas = useMemo(() => filas.filter((fila) => COLUMNAS.every((columna) =>
        !filtros[columna.key] || filtros[columna.key]?.includes(valorColumna(fila, columna.key)))), [filas, filtros]);
    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
    const paginaActual = Math.min(pagina, totalPaginas - 1);
    const visibles = filtradas.slice(paginaActual * PAGE_SIZE, (paginaActual + 1) * PAGE_SIZE);
    const seleccionadas = filas.filter((fila) => seleccion.has(fila.productoId) && elegible(fila));
    const elegiblesFiltradas = filtradas.filter(elegible);
    const marcadasFiltradas = elegiblesFiltradas.filter((fila) => seleccion.has(fila.productoId)).length;
    const congelado = ocupado || preparacion !== null;
    const puedePreparar = actual && !calculando && !error && !errorFormulario && puedeAplicar && seleccionadas.length > 0
        && seleccionadas.some((fila) => fila.puntoReordenNuevo !== fila.puntoReordenActual)
        && (calculo?.diasEfectivos ?? 0) >= (calculo?.minimoDiasEfectivos ?? 1);
    const tokenVencido = !preparacion || Date.parse(preparacion.tokenExpiraEn) <= ahora || Date.parse(preparacion.expiraEn) <= ahora;
    const segundosToken = preparacion ? Math.max(0, Math.ceil((Date.parse(preparacion.tokenExpiraEn) - ahora) / 1000)) : 0;

    const preparar = async () => {
        if (!puedePreparar || !calculo) return;
        setOcupado(true); setError(null); setErrorToken(null);
        try {
            const respuesta = await prepararPuntosReorden(parametros, seleccionadas.map((fila) => fila.productoId), calculo.calculoHash);
            setPreparacion(respuesta); setTokenIngresado(""); setDialogoToken(true);
        } catch (fallo) { setError(puntosReordenError(fallo)); }
        finally { setOcupado(false); }
    };
    const cancelarPreparacion = async () => {
        if (!preparacion || ocupado) return;
        setOcupado(true); setErrorToken(null);
        try {
            await cancelarPuntosReorden(preparacion.preparacionId);
        } catch (fallo) {
            setAvisoCancelacion(`No se confirmó la cancelación en el servidor: ${puntosReordenError(fallo)} Puede seguir editando; la preparación pendiente conserva su vencimiento.`);
        } finally {
            setPreparacion(null); setDialogoToken(false); setTokenIngresado(""); setPaso(0); setOcupado(false);
        }
    };
    const validarToken = async () => {
        if (!preparacion || !puedeAplicar || tokenVencido || !/^\d{4}$/.test(tokenIngresado) || ocupado) return;
        setOcupado(true); setErrorToken(null);
        try {
            if (paso === 0) {
                const respuesta = await continuarPuntosReorden(preparacion.preparacionId, tokenIngresado);
                setPreparacion(respuesta); setPaso(1);
            } else {
                const respuesta = await confirmarPuntosReorden(preparacion.preparacionId, tokenIngresado);
                setResultado(respuesta); setPaso(2); setPreparacion(null);
            }
            setDialogoToken(false); setTokenIngresado("");
        } catch (fallo) { setErrorToken(puntosReordenError(fallo)); tokenInput.current?.focus(); tokenInput.current?.select(); }
        finally { setOcupado(false); }
    };
    const descargar = async () => {
        if (!resultado) return;
        setGenerandoPdf(true); setError(null);
        try { await descargarPuntosReordenPdf(resultado); }
        catch (fallo) { setError(puntosReordenError(fallo)); }
        finally { setGenerandoPdf(false); }
    };
    const marcarFiltradas = (checked: boolean) => setSeleccion((anterior) => {
        const siguiente = new Set(anterior);
        elegiblesFiltradas.forEach((fila) => { if (checked) siguiente.add(fila.productoId); else siguiente.delete(fila.productoId); });
        return siguiente;
    });
    const resumenParametros = (datos: CalculoPuntosReorden) => (
        <Box borderWidth="1px" borderColor="app.border" borderRadius="md" p={4}>
            <Text>Rango inclusivo: {datos.parametros.fechaDesde} a {datos.parametros.fechaHasta}.</Text>
            <Text>Seguridad: {numero(datos.parametros.porcentajeSeguridad)} %. Días efectivos: {datos.diasEfectivos}; mínimo: {datos.minimoDiasEfectivos}.</Text>
            <Text fontSize="sm" overflowWrap="anywhere">Excluidos: {datos.parametros.fechasExcluidas.join(", ") || "Ninguno"}.</Text>
            <Text fontSize="sm">PR = consumo diario × plazo negociado + seguridad. Unidades U: redondeo hacia arriba al entero; demás unidades: hacia arriba a seis decimales.</Text>
        </Box>
    );
    const tablaRevision = (datos: CalculoPuntosReorden) => (
        <Table.ScrollArea borderWidth="1px" borderColor="app.border">
            <Table.Root size="sm" variant="line">
                <Table.Caption>Materiales {paso === 2 ? "asignados" : "seleccionados para aplicar"}</Table.Caption>
                <Table.Header><Table.Row>
                    {["ID", "Material", "Proveedor", "Unidad", "LT (días)", "Consumo diario", "Seguridad", "PR anterior", "PR nuevo"].map((columna) => <Table.ColumnHeader key={columna}>{columna}</Table.ColumnHeader>)}
                </Table.Row></Table.Header>
                <Table.Body>{datos.filas.map((fila) => <Table.Row key={fila.productoId}>
                    <Table.Cell>{fila.productoId}</Table.Cell><Table.Cell>{fila.nombre}</Table.Cell>
                    <Table.Cell>{fila.proveedorNombre} ({fila.proveedorId}){fila.proveedorManual ? " · manual" : ""}</Table.Cell>
                    <Table.Cell>{fila.unidad}</Table.Cell><Table.Cell>{numero(fila.leadTimeNegociado)}</Table.Cell>
                    <Table.Cell>{numero(fila.consumoDiario)}</Table.Cell><Table.Cell>{numero(fila.stockSeguridad)}</Table.Cell>
                    <Table.Cell>{numero(fila.puntoReordenActual)}</Table.Cell><Table.Cell fontWeight="bold">{numero(fila.puntoReordenNuevo)}</Table.Cell>
                </Table.Row>)}</Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    );

    if (!permiso.ready || propietario.current !== user) return <Text p={4}>Cargando permisos…</Text>;
    if (!permiso.canSee) return <Text p={4}>No tiene acceso a Puntos de reorden.</Text>;

    return (
        <VStack align="stretch" gap={5} py={4}>
            <Heading ref={titulo} tabIndex={-1} size="lg">Puntos de reorden · {STEPS[paso]}</Heading>
            <Steps.Root step={paso} count={STEPS.length} orientation="horizontal">
                <Steps.List flexWrap="wrap">{STEPS.map((nombre, indice) => <Steps.Item index={indice} key={nombre}>
                    <Steps.Indicator><Steps.Status complete={<LuCheck />} incomplete={<Steps.Number />} current={<Steps.Number />} /></Steps.Indicator>
                    <Steps.Title>{nombre}</Steps.Title><Steps.Separator />
                </Steps.Item>)}</Steps.List>
            </Steps.Root>
            {error && <Alert.Root status="error"><Alert.Indicator /><Alert.Description>{error}</Alert.Description></Alert.Root>}
            {avisoCancelacion && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>{avisoCancelacion}</Alert.Description></Alert.Root>}
            {paso === 0 && <>
                <PuntosReordenConfiguracion parametros={parametros} calculo={actual ? calculo : null} diasConDispensacion={calculo?.diasConDispensacion ?? []} errorParametros={errorFormulario} disabled={congelado} hoy={hoy} onChange={cambiarParametros} />
                {!puedeAplicar && <Alert.Root status="info"><Alert.Indicator /><Alert.Description>Puede consultar y calcular. Aplicar nuevos puntos de reorden requiere nivel 2 en esta pestaña.</Alert.Description></Alert.Root>}
                <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
                    <Text aria-live="polite">{calculando ? "Calculando propuesta…" : `${filtradas.length} de ${filas.length} materiales. Seleccionados: ${seleccionadas.length}.`}</Text>
                    <HStack flexWrap="wrap">
                        {calculando && <Spinner size="sm" />}
                        <Button size="sm" variant="outline" disabled={congelado || calculando || Boolean(errorFormulario)} onClick={() => { setClaveCalculada(""); setReintento((n) => n + 1); }}>Recalcular</Button>
                        <Button size="sm" variant="outline" disabled={congelado} onClick={() => { setFiltros({}); setPagina(0); }}>Limpiar filtros de columnas</Button>
                    </HStack>
                </Flex>
                {calculo && !actual && <Text color="app.textSubtle">La tabla corresponde al cálculo anterior. Espere la actualización antes de seleccionar o continuar.</Text>}
                {actual && calculo && calculo.diasEfectivos < calculo.minimoDiasEfectivos && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>Hay {calculo.diasEfectivos} días con dispensación después de las exclusiones; se requieren {calculo.minimoDiasEfectivos}. Ajuste el rango, las exclusiones o el mínimo.</Alert.Description></Alert.Root>}
                <Text fontSize="sm">Los filtros cambian qué filas se muestran. La selección se conserva al filtrar y paginar; la revisión incluye todos los materiales seleccionados, incluso los ocultos. Sin consumo o con PR −1 no se seleccionan inicialmente.</Text>
                {seleccionadas.some((fila) => fila.puntoReordenActual === -1 && (fila.puntoReordenNuevo ?? 0) > 0) && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>La selección incluye materiales con PR −1. Aplicar los valores nuevos positivos activará sus alertas de reorden.</Alert.Description></Alert.Root>}
                {seleccionadas.some((fila) => fila.puntoReordenNuevo === 0) && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>Hay materiales seleccionados con PR nuevo igual a cero. Ese valor deja el material sin umbral de reorden definido.</Alert.Description></Alert.Root>}
                <Table.ScrollArea borderWidth="1px" borderColor="app.border" maxH="38rem">
                    <Table.Root size="sm" variant="line" stickyHeader>
                        <Table.Caption>Propuesta de puntos de reorden. Valores expresados en la unidad de inventario de cada material.</Table.Caption>
                        <Table.Header><Table.Row>
                            <Table.ColumnHeader><Checkbox.Root checked={marcadasFiltradas === 0 ? false : marcadasFiltradas === elegiblesFiltradas.length ? true : "indeterminate"} disabled={congelado || !actual || calculando || elegiblesFiltradas.length === 0} onCheckedChange={({ checked }) => marcarFiltradas(checked === true)}>
                                <Checkbox.HiddenInput aria-label="Seleccionar todos los materiales filtrados" /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                            </Checkbox.Root></Table.ColumnHeader>
                            {COLUMNAS.map((columna) => <Table.ColumnHeader key={columna.key}><FiltroColumna label={columna.label} opciones={opciones[columna.key]} seleccion={filtros[columna.key]} disabled={congelado} onChange={(values) => { setFiltros((prev) => ({ ...prev, [columna.key]: values })); setPagina(0); }} /></Table.ColumnHeader>)}
                            <Table.ColumnHeader>Proveedor de la propuesta</Table.ColumnHeader>
                        </Table.Row></Table.Header>
                        <Table.Body>
                            {visibles.map((fila) => <Table.Row key={fila.productoId}>
                                <Table.Cell><Checkbox.Root checked={seleccion.has(fila.productoId)} disabled={congelado || !actual || calculando || !elegible(fila)} onCheckedChange={({ checked }) => setSeleccion((prev) => { const next = new Set(prev); if (checked === true) next.add(fila.productoId); else next.delete(fila.productoId); return next; })}>
                                    <Checkbox.HiddenInput aria-label={`Seleccionar ${fila.productoId}, ${fila.nombre}`} /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                </Checkbox.Root></Table.Cell>
                                <Table.Cell>{fila.productoId}</Table.Cell><Table.Cell minW="170px">{fila.nombre}</Table.Cell>
                                <Table.Cell minW="170px">{fila.proveedorNombre ?? "Sin proveedor"}{fila.proveedorId && <Text fontSize="xs">{fila.proveedorId} · {fila.proveedorManual ? "selección manual" : `${fila.comprasProveedor} compras`}</Text>}</Table.Cell>
                                <Table.Cell>{fila.unidad}</Table.Cell><Table.Cell textAlign="end">{numero(fila.leadTimeNegociado)}</Table.Cell>
                                <Table.Cell textAlign="end">{numero(fila.consumoDiario)}</Table.Cell><Table.Cell textAlign="end">{numero(fila.puntoReordenActual)}</Table.Cell>
                                <Table.Cell textAlign="end" fontWeight="bold">{numero(fila.puntoReordenNuevo)}</Table.Cell>
                                <Table.Cell textAlign="end">{valorColumna(fila, "diferencia")}</Table.Cell>
                                <Table.Cell><Badge colorPalette={fila.estado === "LISTO" ? "teal" : "orange"}>{ESTADOS[fila.estado]}</Badge></Table.Cell>
                                <Table.Cell><VStack align="stretch" gap={1}>
                                    <Button size="xs" variant="outline" aria-label={`Cambiar proveedor de ${fila.productoId}`} disabled={congelado || calculando || !actual} onClick={() => setFilaProveedor(fila.productoId)}>Cambiar proveedor</Button>
                                    {fila.proveedorManual && <Button size="xs" variant="ghost" disabled={congelado || calculando || !actual} onClick={() => { const mapa = { ...parametros.proveedoresPorMaterial }; delete mapa[fila.productoId]; cambiarParametros({ ...parametros, proveedoresPorMaterial: mapa }); }}>Usar más frecuente</Button>}
                                </VStack></Table.Cell>
                            </Table.Row>)}
                            {visibles.length === 0 && <Table.Row><Table.Cell colSpan={12}>{calculando ? "Cargando materiales…" : "No hay materiales que mostrar con estos filtros."}</Table.Cell></Table.Row>}
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>
                <Flex justify="space-between" gap={3} flexWrap="wrap" align="center">
                    <HStack><Button variant="outline" size="sm" disabled={paginaActual === 0} onClick={() => setPagina(paginaActual - 1)}>Página anterior</Button>
                        <Text fontSize="sm">Página {paginaActual + 1} de {totalPaginas}</Text>
                        <Button variant="outline" size="sm" disabled={paginaActual + 1 >= totalPaginas} onClick={() => setPagina(paginaActual + 1)}>Página siguiente</Button></HStack>
                    <Button colorPalette="teal" loading={ocupado} disabled={!puedePreparar || congelado} onClick={preparar}>Continuar con {seleccionadas.length} materiales</Button>
                </Flex>
            </>}
            {paso === 1 && preparacion && <>
                {resumenParametros(preparacion.calculo)}
                <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>Revise los {preparacion.calculo.filas.length} materiales. Confirmar sustituye sus puntos de reorden. Volver conserva los parámetros y la selección, y cancela esta preparación.</Alert.Description></Alert.Root>
                {preparacion.calculo.filas.some((fila) => fila.puntoReordenActual === -1 && (fila.puntoReordenNuevo ?? 0) > 0) && <Text fontWeight="semibold">Se activarán las alertas de los materiales cuyo PR anterior es −1 y su nuevo valor es positivo.</Text>}
                {preparacion.calculo.filas.some((fila) => fila.puntoReordenNuevo === 0) && <Alert.Root status="warning"><Alert.Indicator /><Alert.Description>Confirmar PR nuevo igual a cero deja esos materiales sin umbral de reorden definido.</Alert.Description></Alert.Root>}
                {tablaRevision(preparacion.calculo)}
                <Flex justify="space-between" gap={3} flexWrap="wrap">
                    <Button variant="outline" disabled={ocupado} onClick={cancelarPreparacion}>Anterior: conservar y editar</Button>
                    <Button colorPalette="teal" disabled={ocupado || !puedeAplicar} onClick={() => { setErrorToken(null); setTokenIngresado(""); setDialogoToken(true); }}>Confirmar con segundo token</Button>
                </Flex>
            </>}
            {paso === 2 && resultado && <>
                <Alert.Root status="success"><Alert.Indicator /><Alert.Description>Se actualizaron {resultado.actualizados} materiales. Operación {resultado.operacionId}.</Alert.Description></Alert.Root>
                <Text>Usuario: {resultado.usuario}. Aplicado: {new Date(resultado.aplicadoEn).toLocaleString("es-CO", { timeZone: "America/Bogota" })} (Bogotá).</Text>
                {resumenParametros(resultado.calculo)}
                {tablaRevision(resultado.calculo)}
                <HStack flexWrap="wrap"><Button colorPalette="teal" loading={generandoPdf} onClick={descargar}>Descargar comprobante PDF</Button>
                    <Button variant="outline" disabled={generandoPdf} onClick={() => { setResultado(null); setPaso(0); setClaveCalculada(""); setReintento((n) => n + 1); }}>Nuevo análisis</Button></HStack>
            </>}
            <ProveedorPicker isOpen={filaProveedor !== null} onClose={() => setFilaProveedor(null)} onSelectProveedor={cambiarProveedor} />
            <Dialog.Root open={dialogoToken} placement="center" closeOnInteractOutside={false} initialFocusEl={() => tokenInput.current} finalFocusEl={() => titulo.current} onOpenChange={({ open }) => {
                if (!open && !ocupado) { if (paso === 0) void cancelarPreparacion(); else { setDialogoToken(false); setErrorToken(null); setTokenIngresado(""); } }
            }}>
                <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content maxW="lg">
                    <Dialog.Header><Dialog.Title>{paso === 0 ? "Primer token: pasar a revisión" : "Segundo token: aplicar puntos de reorden"}</Dialog.Title></Dialog.Header>
                    <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar confirmación" position="absolute" top={2} right={2} disabled={ocupado} /></Dialog.CloseTrigger>
                    <Dialog.Body><VStack align="stretch" gap={4}>
                        <Text>{paso === 0 ? "Esta confirmación prepara la revisión y todavía no guarda nuevos puntos de reorden." : `Se aplicarán los valores revisados a ${preparacion?.calculo.filas.length ?? 0} materiales.`}</Text>
                        <Text fontSize="sm">Usuario actual: {user}.</Text>
                        <Box borderWidth="1px" borderColor="app.border" borderRadius="md" p={4} textAlign="center"><Text>Token de confirmación</Text>
                            <Text fontSize="3xl" fontWeight="bold" letterSpacing="widest" aria-label={`Token ${preparacion?.token.split("").join(" ")}`}>{preparacion?.token}</Text>
                            <Text fontSize="sm" aria-live="off">{tokenVencido ? "El token o la preparación han vencido. Regrese a configurar y vuelva a continuar." : `Vigencia del token: ${Math.floor(segundosToken / 60)}:${String(segundosToken % 60).padStart(2, "0")}`}</Text>
                        </Box>
                        <Field.Root invalid={Boolean(errorToken)} disabled={ocupado || tokenVencido} ids={{ errorText: "puntos-reorden-token-error" }}>
                            <Field.Label htmlFor="puntos-reorden-token">Escriba el token de cuatro dígitos</Field.Label>
                            <Input id="puntos-reorden-token" ref={tokenInput} inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={4} value={tokenIngresado} onChange={(e) => setTokenIngresado(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") void validarToken(); }} />
                            <Field.HelperText>Máximo {preparacion?.intentosPermitidos ?? 5} intentos por token. El servidor valida la vigencia y los intentos.</Field.HelperText>
                            {errorToken && <Field.ErrorText>{errorToken}</Field.ErrorText>}
                        </Field.Root>
                        {errorToken && tokenVencido && <Alert.Root status="error"><Alert.Indicator /><Alert.Description>{errorToken}</Alert.Description></Alert.Root>}
                    </VStack></Dialog.Body>
                    <Dialog.Footer gap={3} flexWrap="wrap">
                        <Button variant="outline" disabled={ocupado} onClick={() => { if (paso === 0) void cancelarPreparacion(); else { setDialogoToken(false); setTokenIngresado(""); } }}>Volver sin aplicar</Button>
                        <Button colorPalette="teal" loading={ocupado} disabled={!puedeAplicar || tokenVencido || tokenIngresado.length !== 4} onClick={validarToken}>{paso === 0 ? "Continuar a revisión" : "Aplicar valores revisados"}</Button>
                    </Dialog.Footer>
                </Dialog.Content></Dialog.Positioner></Portal>
            </Dialog.Root>
        </VStack>
    );
}
