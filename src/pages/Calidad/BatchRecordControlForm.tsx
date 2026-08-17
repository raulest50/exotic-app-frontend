import {
    Alert,
    Badge,
    Box,
    Button,
    HStack,
    Input,
    NativeSelect,
    Spinner,
    Table,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { useEffect, useState } from "react";
import { extractApiError, guardarEjecucion, prepararEjecucion } from "./calidadApi";
import type {
    BatchRecordEtapaControl,
    CaracteristicaResponse,
    MuestraRequest,
    PrepararEjecucionResponse,
} from "./types";

interface Props {
    loteId: number;
    etapa: BatchRecordEtapaControl;
    onSaved: () => void;
    onCancel: () => void;
}

const range = (size: number) => Array.from({ length: size }, (_, index) => index + 1);
const keyOf = (caracteristica: number, muestra: number, unidad: number) => `${caracteristica}:${muestra}:${unidad}`;

export default function BatchRecordControlForm({ loteId, etapa, onSaved, onCancel }: Props) {
    const toast = useAppToast();
    const [preparacion, setPreparacion] = useState<PrepararEjecucionResponse | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [observaciones, setObservaciones] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        prepararEjecucion(etapa.areaOperativaId, loteId, etapa.etapaId)
            .then((data) => mounted && setPreparacion(data))
            .catch((cause) => mounted && setError(extractApiError(cause, "No fue posible preparar el control.")))
            .finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [etapa.areaOperativaId, etapa.etapaId, loteId]);

    const buildMuestras = (): MuestraRequest[] => {
        if (!preparacion) return [];
        const result: MuestraRequest[] = [];
        for (const caracteristica of preparacion.plantilla.caracteristicas) {
            for (const muestra of range(caracteristica.cantidadMuestras)) {
                result.push({
                    caracteristicaId: caracteristica.id,
                    numeroMuestra: muestra,
                    lecturas: range(caracteristica.unidadesPorMuestra).map((unidad) => {
                        const raw = values[keyOf(caracteristica.id, muestra, unidad)] ?? "";
                        if (!raw) throw new Error(`Falta ${caracteristica.nombre}, muestra ${muestra}, unidad ${unidad}.`);
                        if (caracteristica.tipo === "NUMERICA") {
                            const numeric = Number(raw);
                            if (!Number.isFinite(numeric)) throw new Error(`Valor inválido en ${caracteristica.nombre}.`);
                            return { indiceUnidad: unidad, valorNumerico: numeric, valorBooleano: null };
                        }
                        return { indiceUnidad: unidad, valorNumerico: null, valorBooleano: raw === "true" };
                    }),
                });
            }
        }
        return result;
    };

    const guardar = async () => {
        if (!preparacion) return;
        setSaving(true);
        try {
            const saved = await guardarEjecucion({
                plantillaId: preparacion.plantilla.id,
                loteId: preparacion.lote.id,
                batchRecordEtapaId: etapa.etapaId,
                observaciones: observaciones.trim() || null,
                muestras: buildMuestras(),
            });
            toast({
                title: "Control guardado",
                description: `Resultado automático: ${saved.resultado ?? "sin evaluar"}.`,
                status: saved.resultado === "CONFORME" ? "success" : "warning",
            });
            onSaved();
        } catch (cause) {
            toast({ title: "No fue posible guardar", description: extractApiError(cause, "Revise las lecturas."), status: "error" });
        } finally {
            setSaving(false);
        }
    };

    const matrix = (caracteristica: CaracteristicaResponse) => (
        <Box key={caracteristica.id} borderWidth="1px" borderRadius="md" p={3}>
            <HStack justify="space-between" mb={2} flexWrap="wrap">
                <Text fontWeight="semibold">{caracteristica.nombre}</Text>
                <HStack><Badge>{caracteristica.tipo}</Badge>{caracteristica.unidad ? <Badge variant="outline">{caracteristica.unidad}</Badge> : null}</HStack>
            </HStack>
            <Box overflowX="auto"><Table.Root size="sm"><Table.Header><Table.Row><Table.ColumnHeader>Unidad</Table.ColumnHeader>{range(caracteristica.cantidadMuestras).map((sample) => <Table.ColumnHeader key={sample}>Muestra {sample}</Table.ColumnHeader>)}</Table.Row></Table.Header>
                <Table.Body>{range(caracteristica.unidadesPorMuestra).map((unit) => <Table.Row key={unit}><Table.Cell>{unit}</Table.Cell>{range(caracteristica.cantidadMuestras).map((sample) => {
                    const key = keyOf(caracteristica.id, sample, unit);
                    return <Table.Cell key={key}>{caracteristica.tipo === "NUMERICA" ? <Input size="sm" type="number" value={values[key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /> : <NativeSelect.Root size="sm"><NativeSelect.Field value={values[key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}><option value="">Seleccionar</option><option value="true">Cumple</option><option value="false">No cumple</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>}</Table.Cell>;
                })}</Table.Row>)}</Table.Body>
            </Table.Root></Box>
        </Box>
    );

    if (loading) return <HStack><Spinner size="sm" /><Text>Preparando plantilla congelada…</Text></HStack>;
    if (error || !preparacion) return (
        <VStack align="stretch">
            <Alert.Root status="error"><Alert.Indicator />{error ?? "No existe plantilla para esta etapa."}</Alert.Root>
            <Button alignSelf="flex-end" variant="outline" onClick={onCancel}>Cerrar</Button>
        </VStack>
    );

    return (
        <VStack align="stretch" gap={3} bg="app.surfaceSubtle" borderRadius="md" p={4}>
            <Box><Text fontWeight="bold">{etapa.etapaNombre}</Text><Text fontSize="sm">{etapa.areaOperativaNombre} · plantilla v{preparacion.plantilla.version}</Text></Box>
            {preparacion.plantilla.caracteristicas.map(matrix)}
            <Box><Text fontWeight="semibold" mb={1}>Observaciones</Text><Textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} /></Box>
            <HStack justify="flex-end"><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button colorPalette="teal" loading={saving} onClick={() => void guardar()}>Guardar control</Button></HStack>
        </VStack>
    );
}
