import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    ButtonGroup,
    Checkbox,
    Flex,
    Menu,
    Spinner,
    Text,
    VStack,
    Portal,
} from "@chakra-ui/react";
import EndPointsURL from "../../../../api/EndPointsURL";
import BetterPagination from "../../../../components/BetterPagination/BetterPagination";
import { useAccessSnapshot } from "../../../../auth/usePermissions";
import {
    CalcularDistribucionVentas,
    enviarDiagnosticoAsociacionTerminados,
    ProcesarInformeVentasDetallado,
    type DiagnosticoAsociacionContext,
    type ModoDistribucion,
    type TerminadoConVentas,
} from "../PlaneacionProduccionService";
import ResumenCapacidadProductiva from "./ResumenCapacidadProductiva";
import TablaDistribucionTerminados from "./TablaDistribucionTerminados";
import {
    buildResumenCapacidadPorCategoria,
    buildVisibilityFromPreset,
    COLUMN_DEFINITIONS,
    type ColumnKey,
    type ColumnVisibility,
    type PresetColumnas,
} from "./step1Distribucion.utils";
import { LuChevronDown } from 'react-icons/lu';

interface Step1CalcularDistribucionProps {
    excelFile: File | null;
    setActiveStep: (step: number) => void;
    rawData: TerminadoConVentas[];
    setRawData: (data: TerminadoConVentas[]) => void;
    necesidades: Record<string, number>;
    setNecesidades: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    showNextButton?: boolean;
}

export default function Step1CalcularDistribucion({
    excelFile,
    setActiveStep,
    rawData,
    setRawData,
    necesidades,
    setNecesidades,
    showNextButton = true,
}: Step1CalcularDistribucionProps) {
    const access = useAccessSnapshot();
    const enableBackendDebug = access.isMasterLike && EndPointsURL.getEnvironment() === "local";

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [emptyDebugId, setEmptyDebugId] = useState<string | null>(null);

    const [modo, setModo] = useState<ModoDistribucion>("valor");
    const [presetColumnas, setPresetColumnas] = useState<PresetColumnas>("decision");
    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => buildVisibilityFromPreset("decision"));
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [draftNecesidades, setDraftNecesidades] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!excelFile) {
            setIsLoading(false);
            setEmptyDebugId(null);
            return;
        }

        let cancelled = false;

        const procesarExcel = async () => {
            setIsLoading(true);
            setError(null);
            setEmptyDebugId(null);

            try {
                const result = await ProcesarInformeVentasDetallado(excelFile);
                if (cancelled) return;

                setRawData(result.terminados);

                if (result.terminados.length === 0 && enableBackendDebug) {
                    const clientContext: DiagnosticoAsociacionContext = {
                        totalFilasLeidas: result.totalFilasLeidas,
                        totalFilasUnificadas: result.totalFilasUnificadas,
                        totalAsociadoFinal: result.terminados.length,
                        triggerReason: "no_terminados_asociados",
                        uiMessage: "No se encontraron productos terminados asociados a los datos del informe.",
                    };

                    void enviarDiagnosticoAsociacionTerminados(excelFile, clientContext)
                        .then((debugResult) => {
                            if (!cancelled && debugResult?.debugId) {
                                setEmptyDebugId(debugResult.debugId);
                            }
                        })
                        .catch((debugError) => {
                            console.error("[Step1CalcularDistribucion] No se pudo generar diagnostico de asociacion:", debugError);
                        });
                }
            } catch (err) {
                console.error("[Step1CalcularDistribucion] Error al procesar:", err);
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err));
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        procesarExcel();

        return () => {
            cancelled = true;
        };
    }, [enableBackendDebug, excelFile, setRawData]);

    const distribucion = useMemo(
        () => CalcularDistribucionVentas(rawData, modo),
        [rawData, modo],
    );

    const acumulados = useMemo(() => {
        const arr: number[] = [];
        let acum = 0;
        for (const item of distribucion) {
            acum += item.porcentaje_participacion;
            arr.push(acum);
        }
        return arr;
    }, [distribucion]);

    useEffect(() => {
        setPage(0);
    }, [modo, size]);

    useEffect(() => {
        setPresetColumnas("decision");
        setColumnVisibility(buildVisibilityFromPreset("decision"));
        setDraftNecesidades({});
    }, [excelFile]);

    const totalPages = Math.ceil(distribucion.length / size);
    const pageData = distribucion.slice(page * size, (page + 1) * size);
    const pageStartIndex = page * size;
    const deferredNecesidades = useDeferredValue(necesidades);
    const resumenCapacidad = useMemo(
        () => buildResumenCapacidadPorCategoria(distribucion, deferredNecesidades),
        [deferredNecesidades, distribucion],
    );

    const handlePresetChange = (preset: PresetColumnas) => {
        setPresetColumnas(preset);
        setColumnVisibility(buildVisibilityFromPreset(preset));
    };

    const handleToggleColumn = (columnKey: ColumnKey) => {
        const definition = COLUMN_DEFINITIONS.find((column) => column.key === columnKey);
        if (definition?.isLocked) {
            return;
        }

        setColumnVisibility((prev) => ({
            ...prev,
            [columnKey]: !prev[columnKey],
        }));
    };

    if (isLoading) {
        return (
            <Flex direction="column" align="center" justify="center" py={16} gap={6}>
                            <Spinner borderWidth="4px" animationDuration="0.65s" color="teal.500" size="xl" />
                <Text fontSize="lg" color="gray.600">Procesando informe de ventas...</Text>
            </Flex>
        );
    }

    if (error) {
        return (
            <Box p={4}>
                <Text color="red.500">Error al procesar el informe: {error}</Text>
            </Box>
        );
    }

    if (distribucion.length === 0) {
        return (
            <Box p={4}>
                <Text color="red.500">No se encontraron productos terminados asociados a los datos del informe.</Text>
                {emptyDebugId && (
                    <Text mt={2} color="gray.600">
                        Diagnostico tecnico generado en backend. debugId={emptyDebugId}. Revise planeacion_excel_debug.log.
                    </Text>
                )}
            </Box>
        );
    }

    const paretoIdx = acumulados.findIndex((a) => a >= 80);

    return (
        <VStack gap={4} align="stretch" px={2} py={4} w="full" minW={0}>
            <VStack align="stretch" gap={3}>
                <Text fontSize="md" color="gray.700">
                    <strong>{distribucion.length}</strong> productos terminados
                    {paretoIdx >= 0 && (
                        <> - el 80% de {modo === "valor" ? "las ventas ($)" : "la cantidad"} se concentra en los primeros <strong>{paretoIdx + 1}</strong> productos</>
                    )}
                </Text>

                <Flex justify="space-between" align="center" wrap="wrap" gap={3} w="full" minW={0}>
                    <ButtonGroup size="sm" attached variant="outline">
                        <Button
                            onClick={() => setModo("valor")}
                            colorPalette={modo === "valor" ? "teal" : "gray"}
                            variant={modo === "valor" ? "solid" : "outline"}
                        >
                            Por Valor ($)
                        </Button>
                        <Button
                            onClick={() => setModo("cantidad")}
                            colorPalette={modo === "cantidad" ? "teal" : "gray"}
                            variant={modo === "cantidad" ? "solid" : "outline"}
                        >
                            Por Cantidad
                        </Button>
                    </ButtonGroup>

                    <Flex gap={3} wrap="wrap" align="center">
                        <ButtonGroup size="sm" attached variant="outline">
                            <Button
                                onClick={() => handlePresetChange("decision")}
                                colorPalette={presetColumnas === "decision" ? "teal" : "gray"}
                                variant={presetColumnas === "decision" ? "solid" : "outline"}
                            >
                                Decision
                            </Button>
                            <Button
                                onClick={() => handlePresetChange("analisis")}
                                colorPalette={presetColumnas === "analisis" ? "teal" : "gray"}
                                variant={presetColumnas === "analisis" ? "solid" : "outline"}
                            >
                                Analisis
                            </Button>
                        </ButtonGroup>

                        <Menu.Root closeOnSelect={false}>
                            <Menu.Trigger asChild>
                                <Button size="sm" variant="outline">
                                    Columnas <LuChevronDown />
                                </Button>
                            </Menu.Trigger>
                            <Portal><Menu.Positioner><Menu.Content>
                                        <VStack align="stretch" gap={2}>
                                            {COLUMN_DEFINITIONS.map((column) => (
                                                <Checkbox.Root
                                                    key={column.key}
                                                    checked={columnVisibility[column.key]}
                                                    disabled={column.isLocked}
                                                    onCheckedChange={() => handleToggleColumn(column.key)}
                                                ><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>
                                                    {column.label}
                                                </Checkbox.Label></Checkbox.Root>
                                            ))}
                                        </VStack>
                                    </Menu.Content></Menu.Positioner></Portal>
                        </Menu.Root>
                    </Flex>
                </Flex>
            </VStack>

            <ResumenCapacidadProductiva rows={resumenCapacidad} />

            <TablaDistribucionTerminados
                pageData={pageData}
                columnVisibility={columnVisibility}
                necesidades={necesidades}
                draftNecesidades={draftNecesidades}
                setDraftNecesidades={setDraftNecesidades}
                setNecesidades={setNecesidades}
                startNecesidadesTransition={startTransition}
                acumulados={acumulados}
                pageStartIndex={pageStartIndex}
            />

            <BetterPagination
                page={page}
                size={size}
                totalPages={totalPages}
                onPageChange={setPage}
                onSizeChange={setSize}
            />

            {showNextButton && (
                <Flex justify="flex-end" pt={2}>
                    <Button
                        colorPalette="teal"
                        onClick={() => setActiveStep(2)}
                        disabled={distribucion.length === 0}
                    >
                        Siguiente
                    </Button>
                </Flex>
            )}
        </VStack>
    );
}
