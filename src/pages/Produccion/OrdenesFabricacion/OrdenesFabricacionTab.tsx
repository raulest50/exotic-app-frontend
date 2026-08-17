import {
    Alert,
    Badge,
    Box,
    Button,
    Field,
    Flex,
    Heading,
    HStack,
    Input,
    SimpleGrid,
    Table,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useEffect, useState } from "react";
import { getExactTabNivel, MASTER_EFFECTIVE_NIVEL } from "../../../auth/accessHelpers";
import { useAccessSnapshot } from "../../../auth/usePermissions";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";
import {
    buscarOrdenesFabricacion,
    buscarSemiterminadosElegibles,
    cancelarOrdenFabricacion,
    crearOrdenFabricacion,
} from "./ordenesFabricacionApi";
import type { OrdenFabricacionPage, SemiterminadoOrdenFabricacionOption } from "./types";

function apiError(error: unknown): string {
    if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message;
    return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

export default function OrdenesFabricacionTab() {
    const toast = useAppToast();
    const access = useAccessSnapshot();
    const nivel = access.isMasterLike
        ? MASTER_EFFECTIVE_NIVEL
        : (getExactTabNivel(
            access.moduloAccesos,
            Modulo.PRODUCCION,
            "CREAR_ORDEN_FABRICACION",
        ) ?? 0);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState<OrdenFabricacionPage | null>(null);
    const [semiSearch, setSemiSearch] = useState("");
    const [options, setOptions] = useState<SemiterminadoOrdenFabricacionOption[]>([]);
    const [selected, setSelected] = useState<SemiterminadoOrdenFabricacionOption | null>(null);
    const [cantidad, setCantidad] = useState("");
    const [lote, setLote] = useState("");
    const [fechaLanzamiento, setFechaLanzamiento] = useState("");
    const [fechaFinal, setFechaFinal] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const cargar = async (nextPage = 0) => {
        setLoading(true);
        try {
            setPage(await buscarOrdenesFabricacion(search.trim(), nextPage));
        } catch (error) {
            toast({ title: "No fue posible consultar las OF", description: apiError(error), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void cargar(); }, []);

    const buscarSemis = async () => {
        try {
            const response = await buscarSemiterminadosElegibles(semiSearch.trim());
            setOptions(response.content);
        } catch (error) {
            toast({ title: "No fue posible buscar semiterminados", description: apiError(error), status: "error" });
        }
    };

    const crear = async () => {
        const numeric = Number(cantidad);
        if (!selected || !Number.isFinite(numeric) || numeric <= 0 || !lote.trim()) {
            toast({ title: "Complete semiterminado, cantidad y lote", status: "warning" });
            return;
        }
        if (fechaLanzamiento && fechaFinal && fechaFinal < fechaLanzamiento) {
            toast({ title: "La fecha final no puede ser anterior al lanzamiento", status: "warning" });
            return;
        }
        setSaving(true);
        try {
            const created = await crearOrdenFabricacion({
                semiTerminadoId: selected.productoId,
                cantidadPlanificada: numeric,
                lote: lote.trim(),
                fechaLanzamiento: fechaLanzamiento || null,
                fechaFinalPlanificada: fechaFinal || null,
                observaciones: observaciones.trim() || null,
            });
            toast({
                title: `OF ${created.ordenFabricacionId} creada`,
                description: `Se creó el lote ${created.lote} y el expediente ${created.batchRecordCodigo}.`,
                status: "success",
            });
            setSelected(null);
            setOptions([]);
            setCantidad("");
            setLote("");
            setFechaLanzamiento("");
            setFechaFinal("");
            setObservaciones("");
            await cargar();
        } catch (error) {
            toast({ title: "No fue posible crear la OF", description: apiError(error), status: "error" });
        } finally {
            setSaving(false);
        }
    };

    const cancelar = async (id: number) => {
        if (!window.confirm(`¿Cancelar definitivamente la OF ${id} y anular su expediente?`)) {
            return;
        }
        try {
            await cancelarOrdenFabricacion(id);
            toast({ title: `OF ${id} cancelada`, status: "success" });
            await cargar(page?.number ?? 0);
        } catch (error) {
            toast({ title: "No fue posible cancelar la OF", description: apiError(error), status: "error" });
        }
    };

    return (
        <VStack align="stretch" gap={5}>
            <Box>
                <Heading size="md">Órdenes de fabricación independientes</Heading>
                <Text mt={1} color="app.textSubtle">
                    Para semiterminados configurados con lote propio. Esta primera fase crea la OF, congela la versión de manufactura y abre su expediente.
                </Text>
            </Box>

            {nivel >= 2 ? (
                <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Heading size="sm" mb={4}>Nueva orden de fabricación</Heading>
                    <Flex gap={3} align="end" flexWrap="wrap">
                        <Field.Root flex="1" minW="260px">
                            <Field.Label>Semiterminado</Field.Label>
                            <Input value={semiSearch} onChange={(event) => setSemiSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void buscarSemis()} placeholder="Código o nombre" />
                        </Field.Root>
                        <Button variant="outline" onClick={() => void buscarSemis()}>Buscar</Button>
                    </Flex>
                    {options.length ? <VStack align="stretch" mt={2} gap={1}>{options.map((option) => (
                        <Button key={option.productoId} size="sm" justifyContent="flex-start" variant={selected?.productoId === option.productoId ? "solid" : "ghost"} colorPalette={selected?.productoId === option.productoId ? "teal" : "gray"} onClick={() => setSelected(option)}>
                            {option.productoId} · {option.nombre} ({option.unidadMedida})
                        </Button>
                    ))}</VStack> : null}
                    {selected ? <Alert.Root status="info" mt={3}><Alert.Indicator />Seleccionado: {selected.productoId} · {selected.nombre}</Alert.Root> : null}

                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mt={4}>
                        <Field.Root required><Field.Label>Cantidad planificada</Field.Label><Input type="number" min="0.0001" step="0.0001" value={cantidad} onChange={(event) => setCantidad(event.target.value)} /></Field.Root>
                        <Field.Root required><Field.Label>Número de lote propio</Field.Label><Input maxLength={80} value={lote} onChange={(event) => setLote(event.target.value)} /></Field.Root>
                        <Field.Root><Field.Label>Fecha de lanzamiento</Field.Label><Input type="datetime-local" value={fechaLanzamiento} onChange={(event) => setFechaLanzamiento(event.target.value)} /></Field.Root>
                        <Field.Root><Field.Label>Fecha final planificada</Field.Label><Input type="datetime-local" value={fechaFinal} onChange={(event) => setFechaFinal(event.target.value)} /></Field.Root>
                    </SimpleGrid>
                    <Field.Root mt={4}><Field.Label>Observaciones</Field.Label><Textarea maxLength={2000} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} /></Field.Root>
                    <HStack justify="flex-end" mt={4}><Button colorPalette="teal" loading={saving} onClick={() => void crear()}>Crear OF y expediente</Button></HStack>
                </Box>
            ) : (
                <Alert.Root status="info"><Alert.Indicator />Su nivel permite consultar, pero no crear ni cancelar órdenes.</Alert.Root>
            )}

            <Flex gap={3} align="end">
                <Field.Root flex="1"><Field.Label>Buscar OF, lote o semiterminado</Field.Label><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void cargar()} /></Field.Root>
                <Button onClick={() => void cargar()} loading={loading}>Buscar</Button>
            </Flex>

            {page?.content.length ? (
                <Box overflowX="auto" borderWidth="1px" borderRadius="md">
                    <Table.Root size="sm"><Table.Header><Table.Row>
                        <Table.ColumnHeader>OF</Table.ColumnHeader><Table.ColumnHeader>Semiterminado</Table.ColumnHeader><Table.ColumnHeader>Lote</Table.ColumnHeader><Table.ColumnHeader>Cantidad</Table.ColumnHeader><Table.ColumnHeader>Expediente</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader />
                    </Table.Row></Table.Header><Table.Body>{page.content.map((orden) => (
                        <Table.Row key={orden.ordenFabricacionId}>
                            <Table.Cell fontWeight="bold">{orden.ordenFabricacionId}</Table.Cell>
                            <Table.Cell>{orden.semiTerminadoId}<Text fontSize="xs" color="app.textSubtle">{orden.semiTerminadoNombre}</Text></Table.Cell>
                            <Table.Cell>{orden.lote}</Table.Cell>
                            <Table.Cell>{orden.cantidadPlanificada} {orden.unidadMedida}</Table.Cell>
                            <Table.Cell>{orden.batchRecordCodigo}</Table.Cell>
                            <Table.Cell><Badge colorPalette={orden.estado === "CANCELADA" ? "red" : "blue"}>{orden.estado}</Badge></Table.Cell>
                            <Table.Cell>{nivel >= 2 && ["BORRADOR", "PLANIFICADA"].includes(orden.estado) ? <Button size="xs" colorPalette="red" variant="outline" onClick={() => void cancelar(orden.ordenFabricacionId)}>Cancelar</Button> : null}</Table.Cell>
                        </Table.Row>
                    ))}</Table.Body></Table.Root>
                </Box>
            ) : page ? <Alert.Root status="info"><Alert.Indicator />No hay órdenes de fabricación para mostrar.</Alert.Root> : null}

            {page && page.totalPages > 1 ? <HStack justify="flex-end"><Button size="sm" disabled={page.number === 0} onClick={() => void cargar(page.number - 1)}>Anterior</Button><Text>Página {page.number + 1} de {page.totalPages}</Text><Button size="sm" disabled={page.number + 1 >= page.totalPages} onClick={() => void cargar(page.number + 1)}>Siguiente</Button></HStack> : null}
        </VStack>
    );
}
