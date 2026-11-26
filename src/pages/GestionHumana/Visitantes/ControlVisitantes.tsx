import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { Badge, Box, Button, Field, Flex, Heading, Input, Link, NativeSelect, SimpleGrid, Spinner, Stack, Table, Text } from "@chakra-ui/react";
import { QRCodeSVG } from "qrcode.react";
import { LuCopy, LuDownload, LuExternalLink, LuRefreshCw } from "react-icons/lu";
import { deploymentPath } from "../../../utils/deploymentPaths";
import { consultarVisitantes } from "./visitantesApi";
import { ESTADOS_VISITA, GENEROS_VISITANTE, MOTIVOS_VISITA, TIPOS_INGRESO, type FiltrosVisitantes, type PaginaVisitantes, type RegistroVisitante } from "./types";
import FirmaVisitanteDialog from "./FirmaVisitanteDialog";
import VisitanteSalidaDialog from "./VisitanteSalidaDialog";
import { useAccessSnapshot } from "../../../auth/usePermissions";
import { exactTabAccessRuleWithMasterBypass } from "../../../auth/accessHelpers";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";

const fechaVisita = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "medium", timeZone: "America/Bogota" });
const fechaColombia = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Bogota" });

function filtrosDeHoy(): FiltrosVisitantes {
    const partes = fechaColombia.formatToParts(new Date());
    const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value;
    return { fecha: `${valor("year")}-${valor("month")}-${valor("day")}`, horaDesde: "", horaHasta: "", nombre: "", size: 20 };
}

function demoraRegistro(visita: RegistroVisitante): string {
    if (!visita.fechaSalida || !visita.salidaRegistradaEn) return "—";
    const milisegundos = Date.parse(visita.salidaRegistradaEn) - Date.parse(visita.fechaSalida);
    if (!Number.isFinite(milisegundos) || milisegundos < 0) return "—";
    if (milisegundos > 0 && milisegundos < 1000) return "Menos de 1 s";
    let segundos = Math.floor(milisegundos / 1000);
    const dias = Math.floor(segundos / 86400);
    segundos %= 86400;
    const horas = Math.floor(segundos / 3600);
    segundos %= 3600;
    const minutos = Math.floor(segundos / 60);
    segundos %= 60;
    return [dias && `${dias} d`, horas && `${horas} h`, minutos && `${minutos} min`, segundos && `${segundos} s`].filter(Boolean).join(" ") || "0 s";
}

export default function ControlVisitantes() {
    const acceso = useAccessSnapshot();
    const puedeCerrar = exactTabAccessRuleWithMasterBypass(Modulo.GESTION_HUMANA, "CONTROL_VISITANTES", 2)(acceso);
    const urlRegistro = new URL(deploymentPath("/visitantes-registro"), window.location.origin).href;
    const qrRef = useRef<SVGSVGElement>(null);
    const [mensajeEnlace, setMensajeEnlace] = useState("");
    const [filtros, setFiltros] = useState<FiltrosVisitantes>(filtrosDeHoy);
    const [aplicados, setAplicados] = useState(filtros);
    const [erroresFiltros, setErroresFiltros] = useState<{ fecha?: string; horas?: string }>({});
    const [page, setPage] = useState(0);
    const [revision, setRevision] = useState(0);
    const [pagina, setPagina] = useState<PaginaVisitantes | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [firmaId, setFirmaId] = useState<number | null>(null);
    const [visitaSalida, setVisitaSalida] = useState<RegistroVisitante | null>(null);
    const [mensajeSalida, setMensajeSalida] = useState("");

    const salidaRegistrada = (visita: RegistroVisitante) => {
        setVisitaSalida(null);
        setMensajeSalida(`Salida de ${visita.nombreCompleto}: ${visita.fechaSalida ? fechaVisita.format(new Date(visita.fechaSalida)) : "sin informar"}. Registrada el ${visita.salidaRegistradaEn ? fechaVisita.format(new Date(visita.salidaRegistradaEn)) : "sin informar"} por ${visita.salidaRegistradaPorUsername}. Demora de registro: ${demoraRegistro(visita)}.`);
        setRevision((value) => value + 1);
    };

    useEffect(() => {
        const controller = new AbortController();
        const consultar = async () => {
            setLoading(true);
            setError("");
            try {
                const data = await consultarVisitantes(page, controller.signal, aplicados);
                if (!controller.signal.aborted) {
                    if (page > 0 && page >= data.totalPages) setPage(Math.max(0, data.totalPages - 1));
                    else setPagina(data);
                }
            } catch (cause) {
                if (controller.signal.aborted) return;
                setPagina(null);
                setError(axios.isAxiosError(cause) && cause.response?.status === 403
                    ? "No tiene permiso para consultar el control de visitantes."
                    : axios.isAxiosError(cause) && cause.response?.status === 400
                        ? "Revise la fecha, el rango de horas y el nombre de la consulta."
                        : "No fue posible consultar los registros. Intente nuevamente.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        void consultar();
        return () => controller.abort();
    }, [page, aplicados, revision]);

    const aplicarFiltros = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const errores: typeof erroresFiltros = {};
        if (!filtros.fecha) errores.fecha = "Seleccione una fecha para consultar.";
        const horaInvalida = ["horaDesde", "horaHasta"].some((nombre) =>
            (event.currentTarget.elements.namedItem(nombre) as HTMLInputElement).validity.badInput);
        if (horaInvalida) errores.horas = "Complete las horas con el formato HH:mm.";
        else if (filtros.horaDesde && filtros.horaHasta && filtros.horaDesde > filtros.horaHasta) {
            errores.horas = "La hora desde no puede ser posterior a la hora hasta.";
        }
        setErroresFiltros(errores);
        if (errores.fecha || errores.horas) {
            (event.currentTarget.elements.namedItem(errores.fecha ? "fecha" : "horaDesde") as HTMLInputElement).focus();
            return;
        }
        setPage(0);
        setAplicados({ ...filtros, nombre: filtros.nombre.trim() });
    };

    const restablecerFiltros = () => {
        const hoy = filtrosDeHoy();
        setFiltros(hoy);
        setAplicados(hoy);
        setErroresFiltros({});
        setPage(0);
    };

    const copiarEnlace = async () => {
        try {
            await navigator.clipboard.writeText(urlRegistro);
            setMensajeEnlace("Enlace copiado.");
        } catch {
            setMensajeEnlace("Seleccione y copie el enlace que aparece arriba.");
        }
    };
    const descargarQR = () => {
        if (!qrRef.current) return;
        const blob = new Blob([new XMLSerializer().serializeToString(qrRef.current)], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "registro-visitantes-qr.svg";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <Stack as="section" aria-label="Control de visitantes" gap={6} minW={0}>
            <Box>
                <Heading size="xl">Control de visitantes</Heading>
                <Text color="fg.muted">Registro de ingresos y salidas de visitantes a la planta.</Text>
            </Box>
            <Flex borderWidth="1px" rounded="lg" p={{ base: 4, md: 6 }} gap={6} direction={{ base: "column", md: "row" }} align={{ base: "center", md: "start" }}>
                <Box bg="white" rounded="md" flexShrink={0}>
                    <QRCodeSVG ref={qrRef} value={urlRegistro} size={220} level="M" marginSize={4} title="Escanee para abrir el registro de visitantes" />
                </Box>
                <Stack gap={3} flex={1} minW={0} w="full">
                    <Heading as="h2" size="lg">Escanee para registrar su visita</Heading>
                    <Text>El QR abre un formulario público. El visitante puede completarlo desde su teléfono sin iniciar sesión.</Text>
                    <Input aria-label="Enlace público de registro de visitantes" value={urlRegistro} readOnly onFocus={(event) => event.target.select()} />
                    <Flex gap={2} wrap="wrap">
                        <Button variant="outline" onClick={() => { void copiarEnlace(); }}><LuCopy />Copiar enlace</Button>
                        <Button variant="outline" onClick={descargarQR}><LuDownload />Descargar QR</Button>
                        <Link href={urlRegistro} target="_blank" rel="noopener noreferrer" fontWeight="medium"><LuExternalLink />Abrir formulario</Link>
                    </Flex>
                    <Text role="status" fontSize="sm">{mensajeEnlace}</Text>
                </Stack>
            </Flex>
            <Stack gap={3}>
                <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                    <Box><Heading as="h2" size="lg">Visitas registradas</Heading><Text fontSize="sm" color="fg.muted">Filtros por ingreso · hora de Colombia · la hora final incluye todo el minuto seleccionado.</Text></Box>
                    <Button variant="outline" disabled={loading} onClick={() => { setPage(0); setRevision((value) => value + 1); }}><LuRefreshCw />Actualizar</Button>
                </Flex>
                <form onSubmit={aplicarFiltros} noValidate>
                    <Stack gap={4} borderWidth="1px" rounded="lg" p={4}>
                        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
                            <Field.Root required invalid={!!erroresFiltros.fecha}>
                                <Field.Label>Fecha de ingreso</Field.Label>
                                <Input name="fecha" type="date" value={filtros.fecha} onChange={(event) => setFiltros({ ...filtros, fecha: event.target.value })} />
                                <Field.ErrorText>{erroresFiltros.fecha}</Field.ErrorText>
                            </Field.Root>
                            <Field.Root invalid={!!erroresFiltros.horas}>
                                <Field.Label>Hora desde</Field.Label>
                                <Input name="horaDesde" type="time" step={60} value={filtros.horaDesde} onChange={(event) => setFiltros({ ...filtros, horaDesde: event.target.value })} />
                                <Field.HelperText>Opcional. Sin indicar: desde las 00:00.</Field.HelperText>
                                <Field.ErrorText>{erroresFiltros.horas}</Field.ErrorText>
                            </Field.Root>
                            <Field.Root invalid={!!erroresFiltros.horas}>
                                <Field.Label>Hora hasta</Field.Label>
                                <Input name="horaHasta" type="time" step={60} value={filtros.horaHasta} onChange={(event) => setFiltros({ ...filtros, horaHasta: event.target.value })} />
                                <Field.HelperText>Opcional. Sin indicar: hasta finalizar el día.</Field.HelperText>
                                <Field.ErrorText>{erroresFiltros.horas}</Field.ErrorText>
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Nombre del visitante</Field.Label>
                                <Input type="search" maxLength={160} placeholder="Nombre completo o parte del nombre" value={filtros.nombre} onChange={(event) => setFiltros({ ...filtros, nombre: event.target.value })} />
                                <Field.HelperText>Coincidencia parcial, sin distinguir mayúsculas.</Field.HelperText>
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Registros por página</Field.Label>
                                <NativeSelect.Root><NativeSelect.Field value={filtros.size} onChange={(event) => setFiltros({ ...filtros, size: Number(event.target.value) })}>
                                    {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
                                </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                            </Field.Root>
                        </SimpleGrid>
                        <Flex gap={2} wrap="wrap">
                            <Button type="submit" colorPalette="teal">Aplicar filtros</Button>
                            <Button type="button" variant="outline" onClick={restablecerFiltros}>Hoy y limpiar filtros</Button>
                        </Flex>
                    </Stack>
                </form>
                <Text fontSize="sm" color="fg.muted">Ingresos: {aplicados.fecha} · {aplicados.horaDesde || "00:00"} a {aplicados.horaHasta || "23:59"}{aplicados.nombre && ` · nombre: ${aplicados.nombre}`}. Orden: pendientes, salieron e históricos; ingresos más antiguos primero en cada grupo.</Text>
                {mensajeSalida && <Text role="status" color="fg.success">{mensajeSalida}</Text>}
                {loading && <Text role="status"><Spinner size="sm" mr={2} />Consultando visitas…</Text>}
                {error && <Text role="alert" color="fg.error">{error}</Text>}
                {!loading && !error && pagina?.content.length === 0 && <Box borderWidth="1px" rounded="md" p={6}><Text role="status">No hay visitas para los filtros seleccionados.</Text></Box>}
                {!loading && !error && !!pagina?.content.length && <Box overflowX="auto"><Table.Root size="sm">
                    <Table.Header><Table.Row>
                        <Table.ColumnHeader>Fecha y hora de llegada</Table.ColumnHeader><Table.ColumnHeader>Estado y salida</Table.ColumnHeader><Table.ColumnHeader>Cédula / documento</Table.ColumnHeader><Table.ColumnHeader>Nombre completo</Table.ColumnHeader><Table.ColumnHeader>Edad</Table.ColumnHeader><Table.ColumnHeader>Género</Table.ColumnHeader><Table.ColumnHeader>Motivo de la visita</Table.ColumnHeader>
                        <Table.ColumnHeader>Tipo de ingreso</Table.ColumnHeader><Table.ColumnHeader>Cargo / empresa</Table.ColumnHeader><Table.ColumnHeader>Área o persona a visitar</Table.ColumnHeader><Table.ColumnHeader>Firma</Table.ColumnHeader>
                    </Table.Row></Table.Header>
                    <Table.Body>{pagina.content.map((item) => <Table.Row key={item.id}>
                        <Table.Cell whiteSpace="nowrap">{fechaVisita.format(new Date(item.fechaRegistro))}</Table.Cell>
                        <Table.Cell minW="280px"><Stack gap={1} align="start" lineHeight="moderate">
                            {item.estado === "PENDIENTE_SALIDA" ? <Button size="sm" colorPalette="orange" variant="outline"
                                disabled={!puedeCerrar} title={!puedeCerrar ? "Requiere nivel 2 en Control de visitantes" : undefined}
                                aria-label={`Pendiente salida: ${item.nombreCompleto}`} onClick={() => setVisitaSalida(item)}>Pendiente salida</Button>
                                : <Badge colorPalette={item.estado === "SALIO" ? "green" : "gray"}>{ESTADOS_VISITA[item.estado]}</Badge>}
                            {item.estado === "SALIO" && <>
                                <Text>Salida informada: {item.fechaSalida && fechaVisita.format(new Date(item.fechaSalida))}</Text>
                                <Text>Registrada el: {item.salidaRegistradaEn && fechaVisita.format(new Date(item.salidaRegistradaEn))}</Text>
                                <Text>Por: {item.salidaRegistradaPorUsername} (#{item.salidaRegistradaPorId})</Text>
                                <Text>Demora de registro: {demoraRegistro(item)}</Text>
                            </>}
                        </Stack></Table.Cell>
                        <Table.Cell>{item.cedula}</Table.Cell><Table.Cell>{item.nombreCompleto}</Table.Cell><Table.Cell>{item.edad ?? "Sin informar"}</Table.Cell><Table.Cell>{item.genero ? GENEROS_VISITANTE[item.genero] : "Sin informar"}</Table.Cell>
                        <Table.Cell minW="220px">{item.motivo ? MOTIVOS_VISITA[item.motivo] : "Sin motivo registrado"}{item.motivo === "OTROS" && item.motivoOtro && <Text fontSize="sm" color="fg.muted" whiteSpace="pre-wrap" overflowWrap="anywhere">{item.motivoOtro}</Text>}</Table.Cell>
                        <Table.Cell>{item.tipoIngreso ? TIPOS_INGRESO[item.tipoIngreso] : "Sin informar"}</Table.Cell>
                        <Table.Cell minW="160px" overflowWrap="anywhere">{item.cargoEmpresa || "Sin informar"}</Table.Cell>
                        <Table.Cell minW="180px" overflowWrap="anywhere">{item.areaPersonaVisita || "Sin informar"}</Table.Cell>
                        <Table.Cell>{item.firmaRegistrada ? <Button size="xs" variant="outline" aria-label={`Ver firma de ${item.nombreCompleto}`} onClick={() => setFirmaId(item.id)}>Ver firma</Button> : "Sin firma"}</Table.Cell>
                    </Table.Row>)}</Table.Body>
                </Table.Root></Box>}
                {!loading && !error && pagina && pagina.totalElements > 0 && <Flex as="nav" aria-label="Paginación de visitantes" align="center" justify="center" gap={3} wrap="wrap">
                    <Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
                    <Text role="status">Página {pagina.number + 1} de {pagina.totalPages} · {pagina.totalElements} visitas</Text>
                    <Button variant="outline" disabled={page >= pagina.totalPages - 1} onClick={() => setPage((value) => value + 1)}>Siguiente</Button>
                </Flex>}
            </Stack>
            {firmaId !== null && <FirmaVisitanteDialog key={firmaId} id={firmaId} onClose={() => setFirmaId(null)} />}
            {visitaSalida !== null && puedeCerrar && <VisitanteSalidaDialog key={visitaSalida.id} visita={visitaSalida} onClose={() => setVisitaSalida(null)} onRegistrada={salidaRegistrada} />}
        </Stack>
    );
}
