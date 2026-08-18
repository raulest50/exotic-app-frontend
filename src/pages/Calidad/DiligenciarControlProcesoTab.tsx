import {
    Badge,
    Box,
    Button,
    HStack,
    Input,
    NativeSelect,
    Table,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { useState } from "react";
import {
    extractApiError,
    guardarEjecucion,
    prepararEjecucion,
    searchLotesProduccion,
} from "./calidadApi";
import CalidadAreaOperativaPicker from "./CalidadAreaOperativaPicker";
import {
    buildDraftNumericControlGroup,
    ControlProcesoNumericChart,
} from "./charts/ControlProcesoNumericCharts";
import type {
    AreaOperativaOption,
    CaracteristicaResponse,
    EjecucionRequest,
    LoteProduccionResumen,
    MuestraRequest,
    PrepararEjecucionResponse,
} from "./types";

function valueKey(caracteristicaId: number, muestra: number, unidad: number) {
    return `${caracteristicaId}:${muestra}:${unidad}`;
}

function numberRange(size: number) {
    return Array.from({ length: size }, (_, index) => index + 1);
}

function loteLabel(lote: LoteProduccionResumen) {
    const producto = lote.producto ? ` - ${lote.producto.productoId} ${lote.producto.nombre}` : "";
    return `${lote.batchNumber}${producto}`;
}

export default function DiligenciarControlProcesoTab() {
    const toast = useAppToast();
    const [selectedArea, setSelectedArea] = useState<AreaOperativaOption | null>(null);
    const [loteSearch, setLoteSearch] = useState("");
    const [lotes, setLotes] = useState<LoteProduccionResumen[]>([]);
    const [selectedLote, setSelectedLote] = useState<LoteProduccionResumen | null>(null);
    const [preparacion, setPreparacion] = useState<PrepararEjecucionResponse | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [observaciones, setObservaciones] = useState("");
    const [loadingLotes, setLoadingLotes] = useState(false);
    const [loadingPreparacion, setLoadingPreparacion] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleAreaChange = (area: AreaOperativaOption | null) => {
        setSelectedArea(area);
        setPreparacion(null);
        setValues({});
        setObservaciones("");
    };

    const buscarLotes = async () => {
        setLoadingLotes(true);
        try {
            setLotes(await searchLotesProduccion(loteSearch));
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible buscar lotes de produccion."),
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setLoadingLotes(false);
        }
    };

    const preparar = async () => {
        if (!selectedArea || !selectedLote) return;
        setLoadingPreparacion(true);
        try {
            const data = await prepararEjecucion(selectedArea.areaId, selectedLote.id);
            setPreparacion(data);
            setValues({});
            setObservaciones("");
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible preparar el control de proceso."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoadingPreparacion(false);
        }
    };

    const updateValue = (key: string, value: string) => {
        setValues((current) => ({ ...current, [key]: value }));
    };

    const buildMuestras = (): MuestraRequest[] => {
        if (!preparacion) return [];
        const muestras: MuestraRequest[] = [];

        for (const caracteristica of preparacion.plantilla.caracteristicas) {
            for (const numeroMuestra of numberRange(caracteristica.cantidadMuestras)) {
                const lecturas = numberRange(caracteristica.unidadesPorMuestra).map((indiceUnidad) => {
                    const rawValue = values[valueKey(caracteristica.id, numeroMuestra, indiceUnidad)] ?? "";
                    if (rawValue === "") {
                        throw new Error(`Falta diligenciar ${caracteristica.nombre}, muestra ${numeroMuestra}, unidad ${indiceUnidad}.`);
                    }
                    if (caracteristica.tipo === "NUMERICA") {
                        const valorNumerico = Number(rawValue);
                        if (!Number.isFinite(valorNumerico)) {
                            throw new Error(`Valor numerico invalido en ${caracteristica.nombre}.`);
                        }
                        return { indiceUnidad, valorNumerico, valorBooleano: null };
                    }
                    return { indiceUnidad, valorNumerico: null, valorBooleano: rawValue === "true" };
                });
                muestras.push({
                    caracteristicaId: caracteristica.id,
                    numeroMuestra,
                    lecturas,
                });
            }
        }

        return muestras;
    };

    const guardar = async () => {
        if (!preparacion) return;
        setSaving(true);
        try {
            const request: EjecucionRequest = {
                plantillaId: preparacion.plantilla.id,
                loteId: preparacion.lote.id,
                batchRecordEtapaId: preparacion.batchRecordEtapaId,
                observaciones: observaciones.trim() || null,
                muestras: buildMuestras(),
            };
            await guardarEjecucion(request);
            toast({ title: "Control de proceso guardado", status: "success", duration: 2500, isClosable: true });
            setPreparacion(null);
            setSelectedLote(null);
            setValues({});
            setObservaciones("");
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible guardar el control."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    const renderMatriz = (caracteristica: CaracteristicaResponse) => {
        const chartGroup = caracteristica.tipo === "NUMERICA"
            ? buildDraftNumericControlGroup(
                caracteristica,
                (muestra, unidad) => values[valueKey(caracteristica.id, muestra, unidad)],
            )
            : null;

        return (
            <Box key={caracteristica.id} borderWidth="1px" borderRadius="md" p={4}>
                <HStack justify="space-between" mb={3}>
                    <HStack>
                        <Text fontWeight="semibold">{caracteristica.nombre}</Text>
                        <Badge>{caracteristica.tipo === "NUMERICA" ? "Numerica" : "Cumple/No cumple"}</Badge>
                        {caracteristica.unidad && <Badge variant="outline">{caracteristica.unidad}</Badge>}
                    </HStack>
                    <Text fontSize="sm" color="gray.600">
                        {caracteristica.cantidadMuestras} muestras x {caracteristica.unidadesPorMuestra} unidades
                    </Text>
                </HStack>
                <Table.Root size="sm">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                            {numberRange(caracteristica.cantidadMuestras).map((muestra) => (
                                <Table.ColumnHeader key={muestra}>Muestra {muestra}</Table.ColumnHeader>
                            ))}
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {numberRange(caracteristica.unidadesPorMuestra).map((unidad) => (
                            <Table.Row key={unidad}>
                                <Table.Cell>{unidad}</Table.Cell>
                                {numberRange(caracteristica.cantidadMuestras).map((muestra) => {
                                    const key = valueKey(caracteristica.id, muestra, unidad);
                                    return (
                                        <Table.Cell key={key}>
                                            {caracteristica.tipo === "NUMERICA" ? (
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    value={values[key] ?? ""}
                                                    onChange={(event) => updateValue(key, event.target.value)}
                                                />
                                            ) : (
                                                <NativeSelect.Root size="sm">
                                                    <NativeSelect.Field
                                                        value={values[key] ?? ""}
                                                        onChange={(event) => updateValue(key, event.target.value)}>
                                                        <option value="">Seleccionar</option>
                                                        <option value="true">Cumple</option>
                                                        <option value="false">No cumple</option>
                                                    </NativeSelect.Field>
                                                    <NativeSelect.Indicator />
                                                </NativeSelect.Root>
                                            )}
                                        </Table.Cell>
                                    );
                                })}
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
                {chartGroup ? (
                    <Box mt={4}>
                        <ControlProcesoNumericChart group={chartGroup} preview />
                    </Box>
                ) : null}
            </Box>
        );
    };

    return (
        <VStack align="stretch" gap={5}>
            <CalidadAreaOperativaPicker
                value={selectedArea}
                onChange={handleAreaChange}
                helperText="El lote seleccionado aporta el producto terminado del control."
            />

            <Box borderWidth="1px" borderRadius="md" p={4}>
                <HStack align="end" gap={3}>
                    <Box flex="1">
                        <Text fontWeight="semibold" mb={1}>Lote de produccion</Text>
                        <Input
                            value={loteSearch}
                            onChange={(event) => setLoteSearch(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && buscarLotes()}
                            placeholder="Buscar por lote o producto"
                        />
                    </Box>
                    <Button onClick={buscarLotes} loading={loadingLotes}>Buscar</Button>
                </HStack>
                {lotes.length > 0 && (
                    <VStack align="stretch" mt={3} gap={2}>
                        {lotes.map((lote) => (
                            <Button
                                key={lote.id}
                                size="sm"
                                justifyContent="flex-start"
                                variant={selectedLote?.id === lote.id ? "solid" : "outline"}
                                colorPalette={selectedLote?.id === lote.id ? "teal" : "gray"}
                                onClick={() => {
                                    setSelectedLote(lote);
                                    setPreparacion(null);
                                }}
                            >
                                {loteLabel(lote)}
                            </Button>
                        ))}
                    </VStack>
                )}
            </Box>

            <HStack justify="flex-end">
                <Button
                    colorPalette="teal"
                    onClick={preparar}
                    loading={loadingPreparacion}
                    disabled={!selectedArea || !selectedLote}
                >
                    Preparar control
                </Button>
            </HStack>

            {preparacion && (
                <VStack align="stretch" gap={4}>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <HStack justify="space-between">
                            <Text fontWeight="semibold">
                                Version {preparacion.plantilla.version} - {preparacion.plantilla.areaOperativa.nombre}
                            </Text>
                            <Text fontSize="sm" color="gray.600">{loteLabel(preparacion.lote)}</Text>
                        </HStack>
                    </Box>

                    {preparacion.plantilla.caracteristicas.map(renderMatriz)}

                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <Text fontWeight="semibold" mb={2}>Observaciones</Text>
                        <Textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} />
                        <HStack justify="flex-end" mt={4}>
                            <Button colorPalette="teal" onClick={guardar} loading={saving}>
                                Guardar control
                            </Button>
                        </HStack>
                    </Box>
                </VStack>
            )}
        </VStack>
    );
}
