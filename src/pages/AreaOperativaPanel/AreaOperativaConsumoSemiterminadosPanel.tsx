import { Alert, Badge, Box, Button, Field, Flex, Heading, Input, SimpleGrid, Spinner, Stack, Table, Text, Textarea } from "@chakra-ui/react";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { ConsumoSemiterminadoLoteDTO, ConsumoSemiterminadosContextoDTO } from "./areaOperativaPanel.types";
import {
    consultarConsumosSemiterminados,
    consultarLotesSemiterminado,
    registrarConsumosSemiterminados,
    type RegistrarConsumoSemiterminadosRequest,
} from "./consumoSemiterminadosApi";

interface Props {
    ordenId: number;
    seguimientoId: number;
    active: boolean;
    onRegistrado?: () => void | Promise<void>;
}

type Cantidades = Record<string, Record<number, string>>;

// Compare four-decimal quantities without introducing floating-point rounding.
function unidades(value: string): bigint | null {
    if (!/^\d{1,14}(?:\.\d{1,4})?$/.test(value)) return null;
    const [entero, decimal = ""] = value.split(".");
    return BigInt(entero) * 10000n + BigInt(decimal.padEnd(4, "0"));
}

function saldoUnidades(value: string): bigint | null {
    const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
    return match ? unidades(`${match[1]}.${(match[2] ?? "").padEnd(4, "0").slice(0, 4)}`) : null;
}

function cantidadTexto(value: bigint): string {
    return `${value / 10000n}.${String(value % 10000n).padStart(4, "0")}`;
}

function mensajeError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string } | string | undefined;
        if (typeof data === "string" && data.trim()) return data;
        return data && typeof data === "object" ? data.message ?? data.error ?? error.message : error.message;
    }
    return error instanceof Error ? error.message : "No fue posible completar la solicitud.";
}

function recuperarIntento(key: string): { request: RegistrarConsumoSemiterminadosRequest | null; error: string | null } {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return { request: null, error: null };
        const request = JSON.parse(raw) as RegistrarConsumoSemiterminadosRequest;
        if (typeof request.idempotencyKey !== "string" || !Array.isArray(request.lotes) || request.lotes.length === 0
            || request.lotes.some((item) => typeof item.productoId !== "string" || !Number.isInteger(item.loteId)
                || typeof item.cantidad !== "string" || unidades(item.cantidad) === null)) {
            throw new Error("Intento pendiente inválido.");
        }
        return { request, error: null };
    } catch {
        return { request: null, error: "No se pudo recuperar la confirmación pendiente de esta OP. Revise el historial y solicite revisar esta confirmación antes de registrar otro consumo." };
    }
}

export default function AreaOperativaConsumoSemiterminadosPanel({ ordenId, seguimientoId, active, onRegistrado }: Props) {
    const { meProfile, user } = useAuth();
    const usuario = meProfile?.username ?? user;
    const storageKey = `exotic:consumo-semiterminados:${usuario ?? "sin-usuario"}:${ordenId}:${seguimientoId}`;
    const [recuperado] = useState(() => recuperarIntento(storageKey));
    const [intento, setIntento] = useState(recuperado.request);
    const [contexto, setContexto] = useState<ConsumoSemiterminadosContextoDTO | null>(null);
    const [lotes, setLotes] = useState<Record<string, ConsumoSemiterminadoLoteDTO[]>>({});
    const [cantidades, setCantidades] = useState<Cantidades>({});
    const [observaciones, setObservaciones] = useState("");
    const [loading, setLoading] = useState(false);
    const [productoCargando, setProductoCargando] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(recuperado.error);
    const [notice, setNotice] = useState<string | null>(null);
    const submittingRef = useRef(false);

    const cargarContexto = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            const response = await consultarConsumosSemiterminados(ordenId, seguimientoId, signal);
            if (!signal?.aborted) setContexto(response);
        } catch (err) {
            if (!signal?.aborted) setError(mensajeError(err));
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [ordenId, seguimientoId]);

    useEffect(() => {
        if (!active) return;
        const controller = new AbortController();
        void cargarContexto(controller.signal);
        return () => controller.abort();
    }, [active, cargarContexto]);

    const cargarLotes = async (productoId: string) => {
        setProductoCargando(productoId);
        setError(null);
        try {
            const response = await consultarLotesSemiterminado(ordenId, seguimientoId, productoId);
            setLotes((current) => ({ ...current, [productoId]: response }));
            setCantidades((current) => ({
                ...current,
                [productoId]: Object.fromEntries(Object.entries(current[productoId] ?? {})
                    .filter(([loteId]) => response.some((lote) => lote.loteId === Number(loteId)))),
            }));
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setProductoCargando(null);
        }
    };

    const confirmar = async () => {
        if (submittingRef.current || recuperado.error || !usuario) return;
        let request = intento;
        if (!request) {
            if (!contexto?.puedeRegistrar || loading) return;
            const asignaciones: RegistrarConsumoSemiterminadosRequest["lotes"] = [];
            for (const requerimiento of contexto.requerimientos) {
                let total = 0n;
                for (const [loteIdTexto, value] of Object.entries(cantidades[requerimiento.productoId] ?? {})) {
                    if (!value.trim()) continue;
                    const cantidad = unidades(value);
                    const loteId = Number(loteIdTexto);
                    const lote = lotes[requerimiento.productoId]?.find((item) => item.loteId === loteId);
                    const disponible = lote ? saldoUnidades(lote.cantidadDisponible) : null;
                    if (cantidad === null || cantidad <= 0n || disponible === null || cantidad > disponible) {
                        setError(`Revise la cantidad de ${requerimiento.productoNombre}: debe ser positiva, tener hasta 4 decimales y no superar el saldo del lote.`);
                        return;
                    }
                    total += cantidad;
                    asignaciones.push({ productoId: requerimiento.productoId, loteId, cantidad: cantidadTexto(cantidad) });
                }
                const pendiente = saldoUnidades(requerimiento.cantidadPendiente);
                if (pendiente === null || total > pendiente) {
                    setError(`La cantidad seleccionada de ${requerimiento.productoNombre} supera el pendiente de esta área.`);
                    return;
                }
            }
            if (asignaciones.length === 0) {
                setError("Indique la cantidad a consumir de al menos un lote disponible.");
                return;
            }
            if (asignaciones.length > 200) {
                setError("Registre hasta 200 lotes por consumo. Puede completar el pendiente con otro registro parcial.");
                return;
            }
            request = {
                idempotencyKey: crypto.randomUUID(),
                lotes: asignaciones,
                ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
            };
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(request));
            } catch {
                setError("No fue posible preparar la confirmación en esta sesión. No se envió el consumo; vuelva a intentarlo.");
                return;
            }
            setIntento(request);
        }
        submittingRef.current = true;
        setSubmitting(true);
        setError(null);
        setNotice(null);
        try {
            const response = await registrarConsumosSemiterminados(ordenId, seguimientoId, request);
            // A confirmed response resolves this attempt, even if the later refresh fails.
            sessionStorage.removeItem(storageKey);
            setIntento(null);
            setContexto(response.contexto);
            setCantidades({});
            setObservaciones("");
            setLotes({});
            setNotice(`${response.reutilizado ? "Consumo ya registrado" : "Consumo registrado"}. Transacción ${response.transaccionId}.`);
            try {
                await onRegistrado?.();
            } catch {
                setNotice(`Consumo confirmado en la transacción ${response.transaccionId}. Actualice el tablero para consultar su estado reciente.`);
            }
        } catch (err) {
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            if (status === 400 || status === 404 || status === 409 || status === 422) {
                sessionStorage.removeItem(storageKey);
                setIntento(null);
                setLotes({});
                void cargarContexto();
                setError(`${status === 409 ? "La disponibilidad o el estado de la OP cambió. " : ""}${mensajeError(err)} Consulte de nuevo los lotes y corrija la selección.`);
            } else {
                setError(`${mensajeError(err)} La confirmación permanece pendiente. Reintente para consultar o registrar el mismo consumo sin duplicarlo.`);
            }
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const bloqueado = !contexto?.puedeRegistrar || contexto.legacy || loading || submitting || productoCargando !== null || intento !== null || recuperado.error !== null || !usuario;
    return (
        <Stack gap={3} mt={4} p={{ base: 3, md: 4 }} borderWidth="1px" borderRadius="md" bg="app.surface">
            <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                <Heading as="h3" size="sm">Consumo de semiterminados por lote</Heading>
                <Button size="xs" variant="outline" disabled={submitting || loading} onClick={() => void cargarContexto()}>Actualizar consumo</Button>
            </Flex>
            <Text fontSize="sm" color="app.textMuted">Requerimientos de la receta guardada en esta OP para esta área. Registrar descuenta el inventario físico del lote una sola vez.</Text>
            {loading && <Flex gap={2} align="center"><Spinner size="sm" /><Text fontSize="sm">Consultando consumo…</Text></Flex>}
            {error && <Alert.Root status="error"><Alert.Indicator /><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert.Root>}
            {notice && <Alert.Root status="success"><Alert.Indicator /><Alert.Content><Alert.Description>{notice}</Alert.Description></Alert.Content></Alert.Root>}
            {intento && <Alert.Root status="warning"><Alert.Indicator /><Alert.Content>
                <Alert.Title>Confirmación pendiente</Alert.Title>
                <Alert.Description>Se conserva la selección enviada. Reintente su confirmación antes de preparar otro consumo, aunque haya cerrado el detalle.</Alert.Description>
                {intento.lotes.map((item) => <Text fontSize="sm" key={`${item.productoId}:${item.loteId}`}>{item.productoId} · Lote #{item.loteId}: {item.cantidad}</Text>)}
                {intento.observaciones && <Text fontSize="sm" whiteSpace="pre-wrap">{intento.observaciones}</Text>}
            </Alert.Content></Alert.Root>}
            {contexto?.legacy ? <Text fontSize="sm">Esta OP anterior conserva su flujo de dispensación original; no se le asignan consumos por área de forma retroactiva.</Text> : contexto && <>
                {contexto.motivoBloqueo && <Text fontSize="sm" color="app.textMuted">{contexto.motivoBloqueo}</Text>}
                {contexto.requerimientos.length === 0 && <Text fontSize="sm">Esta área no tiene semiterminados asignados en los requerimientos de la OP.</Text>}
                {contexto.requerimientos.map((requerimiento) => {
                    const disponibles = lotes[requerimiento.productoId];
                    const seleccionado = Object.values(cantidades[requerimiento.productoId] ?? {}).reduce((total, value) => total + (unidades(value) ?? 0n), 0n);
                    return <Stack gap={3} key={requerimiento.productoId} borderWidth="1px" borderRadius="md" p={3}>
                        <Box><Text fontWeight="semibold">{requerimiento.productoNombre}</Text><Text fontSize="xs" color="app.textMuted">{requerimiento.productoId} · {requerimiento.unidadMedida}</Text></Box>
                        <SimpleGrid columns={{ base: 2, md: 4 }} gap={2} fontSize="sm">
                            <Box><Text color="app.textMuted">Requerido</Text><Text>{requerimiento.cantidadRequerida}</Text></Box>
                            <Box><Text color="app.textMuted">Registrado</Text><Text>{requerimiento.cantidadRegistrada}</Text></Box>
                            <Box><Text color="app.textMuted">Pendiente</Text><Text>{requerimiento.cantidadPendiente}</Text></Box>
                            <Box><Text color="app.textMuted">Seleccionado</Text><Text>{cantidadTexto(seleccionado)}</Text></Box>
                        </SimpleGrid>
                        {contexto.puedeRegistrar && <Button size="sm" variant="outline" alignSelf="start" disabled={bloqueado || productoCargando !== null} loading={productoCargando === requerimiento.productoId} onClick={() => void cargarLotes(requerimiento.productoId)}>{disponibles ? "Actualizar lotes y saldos" : "Seleccionar lotes"}</Button>}
                        {disponibles?.length === 0 && <Text fontSize="sm">No hay lotes disponibles para este semiterminado.</Text>}
                        {disponibles && disponibles.length > 0 && <Table.ScrollArea><Table.Root size="sm">
                            <Table.Header><Table.Row><Table.ColumnHeader>Lote</Table.ColumnHeader><Table.ColumnHeader>Calidad / vencimiento</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Disponible</Table.ColumnHeader><Table.ColumnHeader>Cantidad a consumir</Table.ColumnHeader></Table.Row></Table.Header>
                            <Table.Body>{disponibles.map((lote) => <Table.Row key={lote.loteId}>
                                <Table.Cell>{lote.batchNumber}</Table.Cell>
                                <Table.Cell><Badge variant="subtle">{lote.estadoCalidad ?? "Sin estado"}</Badge><Text fontSize="xs">{lote.fechaVencimiento ?? "Sin vencimiento"}</Text></Table.Cell>
                                <Table.Cell textAlign="end" whiteSpace="nowrap">{lote.cantidadDisponible} {requerimiento.unidadMedida}</Table.Cell>
                                <Table.Cell><Field.Root minW="32"><Field.Label srOnly>Cantidad de {requerimiento.productoNombre}, lote {lote.batchNumber}</Field.Label><Input size="sm" inputMode="decimal" maxLength={19} disabled={bloqueado} value={cantidades[requerimiento.productoId]?.[lote.loteId] ?? ""} placeholder="0.0000" onChange={(event) => {
                                    const value = event.target.value.replace(/,/g, ".");
                                    setCantidades((current) => ({ ...current, [requerimiento.productoId]: { ...current[requerimiento.productoId], [lote.loteId]: value } }));
                                }} /></Field.Root></Table.Cell>
                            </Table.Row>)}</Table.Body>
                        </Table.Root></Table.ScrollArea>}
                    </Stack>;
                })}
                {contexto.requerimientos.length > 0 && (contexto.puedeRegistrar || intento) && <Field.Root>
                    <Field.Label>Observaciones del consumo</Field.Label>
                    <Textarea value={observaciones} disabled={bloqueado} maxLength={255} onChange={(event) => setObservaciones(event.target.value)} />
                    <Field.HelperText>Puede registrar consumos parciales y usar varios lotes sin superar el pendiente.</Field.HelperText>
                </Field.Root>}
            </>}
            {(contexto?.puedeRegistrar && (contexto.requerimientos.length > 0) || intento !== null) && <Button alignSelf="start" colorPalette="teal" loading={submitting} disabled={submitting || recuperado.error !== null || !usuario || (!intento && bloqueado)} onClick={() => void confirmar()}>{intento ? "Reintentar confirmación" : "Registrar consumo por lotes"}</Button>}
            {contexto && contexto.registros.length > 0 && <Stack gap={2}>
                <Text fontWeight="semibold" fontSize="sm">Consumos registrados</Text>
                {contexto.registros.map((registro) => <Box key={registro.transaccionId} borderWidth="1px" borderRadius="md" p={3} fontSize="sm">
                    <Text fontWeight="medium">Transacción {registro.transaccionId} · {new Date(registro.fecha).toLocaleString("es-CO")} · {registro.usuario}</Text>
                    {registro.items.map((item) => <Text key={`${item.productoId}:${item.loteId}`}>{contexto.requerimientos.find((req) => req.productoId === item.productoId)?.productoNombre ?? item.productoId} · Lote {item.batchNumber}: {item.cantidad}</Text>)}
                    {registro.observaciones && <Text whiteSpace="pre-wrap" color="app.textMuted">{registro.observaciones}</Text>}
                </Box>)}
            </Stack>}
        </Stack>
    );
}
