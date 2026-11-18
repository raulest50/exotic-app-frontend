import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Box, Button, Flex, Heading, Input, Link, Spinner, Stack, Table, Text } from "@chakra-ui/react";
import { QRCodeSVG } from "qrcode.react";
import { LuCopy, LuDownload, LuExternalLink, LuRefreshCw } from "react-icons/lu";
import { deploymentPath } from "../../../utils/deploymentPaths";
import { consultarVisitantes } from "./visitantesApi";
import { GENEROS_VISITANTE, type PaginaVisitantes } from "./types";

const fechaVisita = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

export default function ControlVisitantes() {
    const urlRegistro = new URL(deploymentPath("/visitantes-registro"), window.location.origin).href;
    const qrRef = useRef<SVGSVGElement>(null);
    const [mensajeEnlace, setMensajeEnlace] = useState("");
    const [page, setPage] = useState(0);
    const [revision, setRevision] = useState(0);
    const [pagina, setPagina] = useState<PaginaVisitantes | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        const consultar = async () => {
            setLoading(true);
            setError("");
            try {
                const data = await consultarVisitantes(page, controller.signal);
                if (!controller.signal.aborted) setPagina(data);
            } catch (cause) {
                if (controller.signal.aborted) return;
                setPagina(null);
                setError(axios.isAxiosError(cause) && cause.response?.status === 403
                    ? "No tiene permiso para consultar el control de visitantes."
                    : "No fue posible consultar los registros. Intente nuevamente.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        void consultar();
        return () => controller.abort();
    }, [page, revision]);

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
                <Text color="fg.muted">Registro de llegada de visitantes a la planta.</Text>
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
                    <Box><Heading as="h2" size="lg">Visitas registradas</Heading><Text fontSize="sm" color="fg.muted">Más recientes primero · hora de Colombia</Text></Box>
                    <Button variant="outline" disabled={loading} onClick={() => { setPage(0); setRevision((value) => value + 1); }}><LuRefreshCw />Actualizar</Button>
                </Flex>
                {loading && <Text role="status"><Spinner size="sm" mr={2} />Consultando visitas…</Text>}
                {error && <Text role="alert" color="fg.error">{error}</Text>}
                {!loading && !error && pagina?.content.length === 0 && <Box borderWidth="1px" rounded="md" p={6}><Text>Aún no hay visitas registradas.</Text></Box>}
                {!loading && !error && !!pagina?.content.length && <Box overflowX="auto"><Table.Root size="sm">
                    <Table.Header><Table.Row>
                        <Table.ColumnHeader>Fecha y hora de llegada</Table.ColumnHeader><Table.ColumnHeader>Cédula / documento</Table.ColumnHeader><Table.ColumnHeader>Nombre completo</Table.ColumnHeader><Table.ColumnHeader>Edad</Table.ColumnHeader><Table.ColumnHeader>Género</Table.ColumnHeader>
                    </Table.Row></Table.Header>
                    <Table.Body>{pagina.content.map((item) => <Table.Row key={item.id}>
                        <Table.Cell whiteSpace="nowrap">{fechaVisita.format(new Date(item.fechaRegistro))}</Table.Cell><Table.Cell>{item.cedula}</Table.Cell><Table.Cell>{item.nombreCompleto}</Table.Cell><Table.Cell>{item.edad ?? "Sin informar"}</Table.Cell><Table.Cell>{item.genero ? GENEROS_VISITANTE[item.genero] : "Sin informar"}</Table.Cell>
                    </Table.Row>)}</Table.Body>
                </Table.Root></Box>}
                {!loading && !error && pagina && pagina.totalElements > 0 && <Flex align="center" justify="center" gap={3} wrap="wrap">
                    <Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
                    <Text>Página {pagina.number + 1} de {pagina.totalPages} · {pagina.totalElements} visitas</Text>
                    <Button variant="outline" disabled={page >= pagina.totalPages - 1} onClick={() => setPage((value) => value + 1)}>Siguiente</Button>
                </Flex>}
            </Stack>
        </Stack>
    );
}
