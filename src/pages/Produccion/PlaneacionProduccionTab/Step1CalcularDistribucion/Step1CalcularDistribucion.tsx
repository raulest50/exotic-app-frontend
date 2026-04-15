import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    ButtonGroup,
    Checkbox,
    Flex,
    Menu,
    MenuButton,
    MenuList,
    NumberInput,
    NumberInputField,
    Spinner,
    Text,
    VStack,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
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

interface Step1CalcularDistribucionProps {
    excelFile: File | null;
    setActiveStep: (step: number) => void;
    rawData: TerminadoConVentas[];
    setRawData: (data: TerminadoConVentas[]) => void;
    necesidades: Record<string, number>;
    setNecesidades: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

type PresetColumnas = "decision" | "analisis";
type ColumnKey =
    | "index"
    | "codigo"
    | "descripcion"
    | "categoria"
    | "cantidadVendida"
    | "valorTotal"
    | "porcentajeParticipacion"
    | "porcentajeAcumulado"
    | "stockActual"
    | "necesidad";

type ColumnVisibility = Record<ColumnKey, boolean>;

interface ColumnDefinition {
    key: ColumnKey;
    label: string;
    isNumeric?: boolean;
    isLocked?: boolean;
}

const COLUMN_DEFINITIONS: ColumnDefinition[] = [
    { key: "index", label: "#" },
    { key: "codigo", label: "Codigo", isLocked: true },
    { key: "descripcion", label: "Descripcion", isLocked: true },
    { key: "categoria", label: "Categoria" },
    { key: "cantidadVendida", label: "Cantidad Vendida", isNumeric: true },
    { key: "valorTotal", label: "Valor Total", isNumeric: true },
    { key: "porcentajeParticipacion", label: "% Participacion", isNumeric: true },
    { key: "porcentajeAcumulado", label: "% Acumulado", isNumeric: true },
    { key: "stockActual", label: "Stock Actual", isNumeric: true },
    { key: "necesidad", label: "Necesidad", isNumeric: true },
];

function buildVisibilityFromPreset(preset: PresetColumnas): ColumnVisibility {
    const visibleKeys =
        preset === "decision"
            ? new Set<ColumnKey>([
                "codigo",
                "descripcion",
                "categoria",
                "stockActual",
                "porcentajeParticipacion",
                "porcentajeAcumulado",
                "necesidad",
            ])
            : new Set<ColumnKey>([
                "index",
                "codigo",
                "descripcion",
                "categoria",
                "cantidadVendida",
                "valorTotal",
                "porcentajeParticipacion",
                "porcentajeAcumulado",
                "stockActual",
                "necesidad",
            ]);

    return COLUMN_DEFINITIONS.reduce((acc, column) => {
        acc[column.key] = visibleKeys.has(column.key);
        return acc;
    }, {} as ColumnVisibility);
}

function formatCantidad(value: number): string {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function formatMoneda(value: number): string {
    return `$${formatCantidad(value)}`;
}

export default function Step1CalcularDistribucion({
    excelFile,
    setActiveStep,
    rawData,
    setRawData,
    necesidades,
    setNecesidades,
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
    }, [excelFile]);

    const totalPages = Math.ceil(distribucion.length / size);
    const pageData = distribucion.slice(page * size, (page + 1) * size);
    const pageStartIndex = page * size;

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
                <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="teal.500" size="xl" />
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
        <VStack spacing={4} align="stretch" px={2} py={4} w="full" minW={0}>
            <VStack align="stretch" spacing={3}>
                <Text fontSize="md" color="gray.700">
                    <strong>{distribucion.length}</strong> productos terminados
                    {paretoIdx >= 0 && (
                        <> - el 80% de {modo === "valor" ? "las ventas ($)" : "la cantidad"} se concentra en los primeros <strong>{paretoIdx + 1}</strong> productos</>
                    )}
                </Text>

                <Flex justify="space-between" align="center" wrap="wrap" gap={3} w="full" minW={0}>
                    <ButtonGroup size="sm" isAttached variant="outline">
                        <Button
                            onClick={() => setModo("valor")}
                            colorScheme={modo === "valor" ? "teal" : "gray"}
                            variant={modo === "valor" ? "solid" : "outline"}
                        >
                            Por Valor ($)
                        </Button>
                        <Button
                            onClick={() => setModo("cantidad")}
                            colorScheme={modo === "cantidad" ? "teal" : "gray"}
                            variant={modo === "cantidad" ? "solid" : "outline"}
                        >
                            Por Cantidad
                        </Button>
                    </ButtonGroup>

                    <Flex gap={3} wrap="wrap" align="center">
                        <ButtonGroup size="sm" isAttached variant="outline">
                            <Button
                                onClick={() => handlePresetChange("decision")}
                                colorScheme={presetColumnas === "decision" ? "teal" : "gray"}
                                variant={presetColumnas === "decision" ? "solid" : "outline"}
                            >
                                Decision
                            </Button>
                            <Button
                                onClick={() => handlePresetChange("analisis")}
                                colorScheme={presetColumnas === "analisis" ? "teal" : "gray"}
                                variant={presetColumnas === "analisis" ? "solid" : "outline"}
                            >
                                Analisis
                            </Button>
                        </ButtonGroup>

                        <Menu closeOnSelect={false}>
                            <MenuButton as={Button} size="sm" variant="outline" rightIcon={<ChevronDownIcon />}>
                                Columnas
                            </MenuButton>
                            <MenuList p={3} minW="230px">
                                <VStack align="stretch" spacing={2}>
                                    {COLUMN_DEFINITIONS.map((column) => (
                                        <Checkbox
                                            key={column.key}
                                            isChecked={columnVisibility[column.key]}
                                            isDisabled={column.isLocked}
                                            onChange={() => handleToggleColumn(column.key)}
                                        >
                                            {column.label}
                                        </Checkbox>
                                    ))}
                                </VStack>
                            </MenuList>
                        </Menu>
                    </Flex>
                </Flex>
            </VStack>

            <TableContainer w="full" minW={0} overflowX="auto">
                <Table size="sm" variant="simple" colorScheme="teal">
                    <Thead>
                        <Tr>
                            {columnVisibility.index && <Th>#</Th>}
                            {columnVisibility.codigo && <Th>Codigo</Th>}
                            {columnVisibility.descripcion && <Th>Descripcion</Th>}
                            {columnVisibility.categoria && <Th>Categoria</Th>}
                            {columnVisibility.cantidadVendida && <Th isNumeric>Cantidad Vendida</Th>}
                            {columnVisibility.valorTotal && <Th isNumeric>Valor Total</Th>}
                            {columnVisibility.porcentajeParticipacion && <Th isNumeric>% Participacion</Th>}
                            {columnVisibility.porcentajeAcumulado && <Th isNumeric>% Acumulado</Th>}
                            {columnVisibility.stockActual && <Th isNumeric>Stock Actual</Th>}
                            {columnVisibility.necesidad && <Th isNumeric>Necesidad</Th>}
                        </Tr>
                    </Thead>
                    <Tbody>
                        {pageData.map((fila, localIdx) => {
                            const globalIdx = pageStartIndex + localIdx;
                            const acum = acumulados[globalIdx];
                            const prevAcum = globalIdx > 0 ? acumulados[globalIdx - 1] : 0;
                            const isParetoRow = prevAcum < 80 && acum >= 80;
                            const isAbovePareto = acum <= 80;

                            return (
                                <Tr
                                    key={fila.terminado.productoId}
                                    bg={isAbovePareto ? "teal.50" : undefined}
                                    borderBottom={isParetoRow ? "3px solid" : undefined}
                                    borderBottomColor={isParetoRow ? "orange.400" : undefined}
                                >
                                    {columnVisibility.index && (
                                        <Td fontWeight={isParetoRow ? "bold" : "normal"}>{globalIdx + 1}</Td>
                                    )}
                                    {columnVisibility.codigo && <Td>{fila.terminado.productoId}</Td>}
                                    {columnVisibility.descripcion && <Td>{fila.terminado.nombre}</Td>}
                                    {columnVisibility.categoria && <Td>{fila.terminado.categoria?.categoriaNombre ?? "-"}</Td>}
                                    {columnVisibility.cantidadVendida && (
                                        <Td isNumeric>{formatCantidad(fila.cantidad_vendida)}</Td>
                                    )}
                                    {columnVisibility.valorTotal && (
                                        <Td isNumeric>{formatMoneda(fila.valor_total)}</Td>
                                    )}
                                    {columnVisibility.porcentajeParticipacion && (
                                        <Td isNumeric>{fila.porcentaje_participacion.toFixed(2)}%</Td>
                                    )}
                                    {columnVisibility.porcentajeAcumulado && (
                                        <Td
                                            isNumeric
                                            fontWeight={isParetoRow ? "bold" : "normal"}
                                            color={isParetoRow ? "orange.600" : undefined}
                                        >
                                            {acum.toFixed(2)}%
                                        </Td>
                                    )}
                                    {columnVisibility.stockActual && (
                                        <Td
                                            isNumeric
                                            color={fila.stockActualConsolidado < 0 ? "red.500" : undefined}
                                            fontWeight={fila.stockActualConsolidado < 0 ? "bold" : "normal"}
                                        >
                                            {formatCantidad(fila.stockActualConsolidado)}
                                        </Td>
                                    )}
                                    {columnVisibility.necesidad && (
                                        <Td isNumeric>
                                            <NumberInput
                                                size="sm"
                                                min={0}
                                                value={necesidades[fila.terminado.productoId] ?? ""}
                                                onChange={(_, valueAsNumber) =>
                                                    setNecesidades((prev) => ({
                                                        ...prev,
                                                        [fila.terminado.productoId]: isNaN(valueAsNumber) ? 0 : valueAsNumber,
                                                    }))
                                                }
                                                w="110px"
                                            >
                                                <NumberInputField textAlign="right" placeholder="0" />
                                            </NumberInput>
                                        </Td>
                                    )}
                                </Tr>
                            );
                        })}
                    </Tbody>
                </Table>
            </TableContainer>

            <BetterPagination
                page={page}
                size={size}
                totalPages={totalPages}
                onPageChange={setPage}
                onSizeChange={setSize}
            />

            <Flex justify="flex-end" pt={2}>
                <Button
                    colorScheme="teal"
                    onClick={() => setActiveStep(2)}
                    isDisabled={distribucion.length === 0}
                >
                    Siguiente
                </Button>
            </Flex>
        </VStack>
    );
}
