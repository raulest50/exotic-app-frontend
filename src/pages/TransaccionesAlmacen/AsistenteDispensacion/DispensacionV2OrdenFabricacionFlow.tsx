import { useMemo, useState } from "react";
import axios from "axios";
import {
    Alert,
    Badge,
    Box,
    Button,
    Checkbox,
    Field,
    Flex,
    Heading,
    HStack,
    Input,
    Spinner,
    Table,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import CustomDecimalInput from "../../../components/CustomDecimalInput/CustomDecimalInput";
import DispensacionV2Step1SelectArea, {
    type AreaOperativaDispensacionV2,
} from "./DispensacionV2Step1SelectArea";
import DispensacionV2DetalleLotesModal from "./DispensacionV2DetalleLotesModal";
import {
    asignarLotesOrdenFabricacionDispensacionV2,
    buscarOrdenesFabricacionDispensacionV2,
    finalizarOrdenFabricacionDispensacionV2,
    prepararOrdenFabricacionDispensacionV2,
} from "./DispensacionV2Service";
import type {
    DispensacionV2MaterialDTO,
    DispensacionV2OrdenDTO,
    DispensacionV2OrdenFabricacionOption,
    DispensacionV2OrdenFabricacionPreparacion,
} from "./DispensacionV2Types";
import { formatDispensacionV2Number } from "./DispensacionV2Types";

function apiError(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string } | string | undefined;
        if (typeof data === "string" && data.trim()) return data;
        if (data && typeof data === "object") return data.message || data.error || error.message;
        return error.message || fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function toModalOrder(preparacion: DispensacionV2OrdenFabricacionPreparacion): DispensacionV2OrdenDTO {
    return {
        ordenProduccionId: preparacion.orden.ordenFabricacionId,
        loteAsignado: preparacion.orden.lote,
        productoTerminadoId: preparacion.orden.semiTerminadoId,
        productoTerminadoNombre: preparacion.orden.semiTerminadoNombre,
        cantidadProducir: preparacion.orden.cantidadPlanificada,
        area: preparacion.area,
        materiales: preparacion.materiales,
        warnings: preparacion.warnings,
    };
}

export default function DispensacionV2OrdenFabricacionFlow() {
    const toast = useAppToast();
    const [step, setStep] = useState<"AREA" | "ORDEN" | "MATERIALES" | "RESUMEN">("AREA");
    const [area, setArea] = useState<AreaOperativaDispensacionV2 | null>(null);
    const [search, setSearch] = useState("");
    const [ordenes, setOrdenes] = useState<DispensacionV2OrdenFabricacionOption[]>([]);
    const [preparacion, setPreparacion] = useState<DispensacionV2OrdenFabricacionPreparacion | null>(null);
    const [showLotes, setShowLotes] = useState(false);
    const [observaciones, setObservaciones] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const materialesSeleccionados = useMemo(
        () => preparacion?.materiales.filter((material) => material.checked && material.cantidadADispensar > 0) ?? [],
        [preparacion],
    );

    const buscar = async () => {
        if (!area) return;
        setLoading(true);
        try {
            setOrdenes(await buscarOrdenesFabricacionDispensacionV2(area.areaId, search.trim()));
        } catch (error) {
            toast({ title: "No fue posible buscar OF", description: apiError(error, "Error al buscar órdenes."), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    const seleccionarOrden = async (orden: DispensacionV2OrdenFabricacionOption) => {
        if (!area) return;
        setLoading(true);
        try {
            setPreparacion(await prepararOrdenFabricacionDispensacionV2(
                orden.ordenFabricacionId,
                area.areaId,
            ));
            setStep("MATERIALES");
        } catch (error) {
            toast({ title: "No fue posible preparar la OF", description: apiError(error, "Error al cargar materiales."), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    const updateMaterial = (
        productoId: string,
        updater: (material: DispensacionV2MaterialDTO) => DispensacionV2MaterialDTO,
    ) => {
        setPreparacion((current) => current ? {
            ...current,
            materiales: current.materiales.map((material) =>
                material.productoId === productoId ? updater(material) : material),
        } : current);
    };

    const asignarLotes = async () => {
        if (!preparacion || materialesSeleccionados.length === 0) return;
        setLoading(true);
        try {
            setPreparacion(await asignarLotesOrdenFabricacionDispensacionV2(preparacion));
            setStep("RESUMEN");
        } catch (error) {
            toast({ title: "No fue posible asignar lotes", description: apiError(error, "Error al asignar lotes FEFO."), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    const finalizar = async () => {
        if (!preparacion) return;
        const faltanLotes = preparacion.materiales.some((material) =>
            material.checked
            && material.inventareable
            && material.cantidadADispensar > 0
            && Math.abs(
                (material.lotesOrigen ?? []).reduce((sum, lote) => sum + lote.cantidadAsignada, 0)
                    - material.cantidadADispensar,
            ) > 0.01);
        if (faltanLotes) {
            toast({ title: "Revise los lotes físicos", description: "La suma de lotes debe coincidir con la cantidad a dispensar.", status: "warning" });
            return;
        }
        if (!window.confirm(`¿Registrar la dispensación de la OF ${preparacion.orden.ordenFabricacionId}?`)) return;
        setSubmitting(true);
        try {
            const response = await finalizarOrdenFabricacionDispensacionV2(preparacion, observaciones);
            toast({
                title: "Dispensación de OF registrada",
                description: `Transacción ${response.transaccionId} asociada a OF-${response.ordenFabricacionId}.`,
                status: "success",
            });
            setPreparacion(null);
            setObservaciones("");
            setStep("ORDEN");
            await buscar();
        } catch (error) {
            toast({ title: "No fue posible registrar", description: apiError(error, "Error al finalizar la dispensación."), status: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    if (step === "AREA") {
        return (
            <DispensacionV2Step1SelectArea
                selectedArea={area}
                onSelectArea={(nextArea) => {
                    setArea(nextArea);
                    setOrdenes([]);
                    setPreparacion(null);
                }}
                onNext={() => {
                    setStep("ORDEN");
                    void buscar();
                }}
                nextLabel="Continuar a órdenes de fabricación"
            />
        );
    }

    if (step === "ORDEN") {
        return (
            <VStack align="stretch" gap={4}>
                <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                    <Heading size="md">Orden de fabricación</Heading>
                    <Text mt={1} color="app.textMuted">Área destino: {area?.nombre}</Text>
                    <HStack mt={4} align="end">
                        <Field.Root flex="1">
                            <Field.Label>Buscar por OF, lote o semiterminado</Field.Label>
                            <Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void buscar()} />
                        </Field.Root>
                        <Button onClick={() => void buscar()} loading={loading}>Buscar</Button>
                    </HStack>
                </Box>
                {loading ? <Flex justify="center" py={8}><Spinner /></Flex> : null}
                {!loading && ordenes.length === 0 ? (
                    <Alert.Root status="info"><Alert.Indicator />No hay OF liberadas o en ejecución para esta área.</Alert.Root>
                ) : null}
                {ordenes.map((orden) => (
                    <Box key={orden.ordenFabricacionId} borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                            <Box>
                                <HStack gap={2}><Badge colorPalette="purple">OF-{orden.ordenFabricacionId}</Badge><Badge variant="outline">{orden.lote}</Badge></HStack>
                                <Text mt={2} fontWeight="bold">{orden.semiTerminadoNombre}</Text>
                                <Text fontSize="sm" color="app.textMuted">{orden.semiTerminadoId} · {formatDispensacionV2Number(orden.cantidadPlanificada)} {orden.unidadMedida}</Text>
                            </Box>
                            <Button colorPalette="teal" onClick={() => void seleccionarOrden(orden)}>Seleccionar</Button>
                        </Flex>
                    </Box>
                ))}
                <Flex><Button variant="outline" onClick={() => setStep("AREA")}>Cambiar área</Button></Flex>
            </VStack>
        );
    }

    if (!preparacion) return null;

    return (
        <VStack align="stretch" gap={4}>
            <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                <HStack gap={2} flexWrap="wrap"><Badge colorPalette="purple">OF-{preparacion.orden.ordenFabricacionId}</Badge><Badge variant="outline">{preparacion.orden.lote}</Badge><Badge colorPalette="teal">{preparacion.area.nombre}</Badge></HStack>
                <Heading mt={2} size="md">{preparacion.orden.semiTerminadoNombre}</Heading>
                <Text color="app.textMuted">Materiales congelados en el expediente de fabricación.</Text>
            </Box>

            {preparacion.warnings.length ? (
                <Alert.Root status="warning" alignItems="start"><Alert.Indicator /><Box>{preparacion.warnings.map((warning) => <Text key={warning} fontSize="sm">{warning}</Text>)}</Box></Alert.Root>
            ) : null}

            <Box borderWidth="1px" borderRadius="md" bg="app.surface" overflowX="auto">
                <Table.Root size="sm">
                    <Table.Header><Table.Row><Table.ColumnHeader>Dispensar</Table.ColumnHeader><Table.ColumnHeader>Material</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Receta</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Histórico</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Cantidad actual</Table.ColumnHeader><Table.ColumnHeader>Lotes</Table.ColumnHeader></Table.Row></Table.Header>
                    <Table.Body>{preparacion.materiales.map((material) => (
                        <Table.Row key={material.productoId}>
                            <Table.Cell><Checkbox.Root checked={material.checked} disabled={!material.inventareable && !material.consumoDirecto} onCheckedChange={({ checked }) => updateMaterial(material.productoId, (current) => ({ ...current, checked: checked === true, lotesOrigen: [] }))}><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control></Checkbox.Root></Table.Cell>
                            <Table.Cell><Text fontWeight="semibold">{material.productoNombre}</Text><Text fontSize="xs" color="app.textMuted">{material.productoId} · {material.tipoProducto}</Text>{material.consumoDirecto ? <Badge mt={1} colorPalette="purple">Consumo directo</Badge> : null}</Table.Cell>
                            <Table.Cell textAlign="end">{formatDispensacionV2Number(material.cantidadReceta)} {material.tipoUnidades}</Table.Cell>
                            <Table.Cell textAlign="end">{formatDispensacionV2Number(material.cantidadHistorica)} {material.tipoUnidades}</Table.Cell>
                            <Table.Cell textAlign="end"><Flex justify="end"><CustomDecimalInput value={material.cantidadADispensar} onChange={(value) => updateMaterial(material.productoId, (current) => ({ ...current, cantidadADispensar: value, lotesOrigen: [] }))} min={0} size="sm" width="120px" maxDecimals={4} isDisabled={!material.checked} /></Flex></Table.Cell>
                            <Table.Cell>{material.inventareable && material.checked ? <Badge colorPalette={(material.lotesOrigen?.length ?? 0) > 0 ? "green" : "orange"}>{material.lotesOrigen?.length ?? 0} lotes</Badge> : material.consumoDirecto && material.checked ? <Badge colorPalette="purple">No requiere</Badge> : <Badge colorPalette="gray">No aplica</Badge>}</Table.Cell>
                        </Table.Row>
                    ))}</Table.Body>
                </Table.Root>
            </Box>

            {step === "RESUMEN" ? (
                <Field.Root>
                    <Field.Label>Observaciones de la dispensación (opcionales)</Field.Label>
                    <Textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} maxLength={1000} />
                </Field.Root>
            ) : null}

            <Flex justify="space-between" gap={3} wrap="wrap">
                <Button variant="outline" onClick={() => {
                    if (step === "RESUMEN") setStep("MATERIALES");
                    else {
                        setPreparacion(null);
                        setStep("ORDEN");
                    }
                }}>Atrás</Button>
                <HStack gap={2}>
                    {step === "RESUMEN" && preparacion.materiales.some((material) => material.checked && material.inventareable) ? (
                        <Button variant="outline" onClick={() => setShowLotes(true)}>Editar lotes</Button>
                    ) : null}
                    {step === "MATERIALES" ? (
                        <Button colorPalette="teal" loading={loading} disabled={materialesSeleccionados.length === 0} onClick={() => void asignarLotes()}>Asignar lotes y revisar</Button>
                    ) : (
                        <Button colorPalette="teal" loading={submitting} disabled={materialesSeleccionados.length === 0} onClick={() => void finalizar()}>Registrar dispensación</Button>
                    )}
                </HStack>
            </Flex>

            <DispensacionV2DetalleLotesModal
                orden={showLotes ? toModalOrder(preparacion) : null}
                tipoOrden="OF"
                onClose={() => setShowLotes(false)}
                onSave={(updated) => {
                    setPreparacion((current) => current ? { ...current, materiales: updated.materiales } : current);
                    setShowLotes(false);
                }}
            />
        </VStack>
    );
}
