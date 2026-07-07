import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Checkbox,
    Flex,
    Heading,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import CustomDecimalInput from "../../../components/CustomDecimalInput/CustomDecimalInput";
import { recalcularDispensacionV2 } from "./DispensacionV2Calculations";
import {
    asignarLotesDispensacionV2DesdeMateriales,
    prepararMaterialesRecetaDispensacionV2,
} from "./DispensacionV2Service";
import type { AreaOperativaDispensacionV2 } from "./DispensacionV2Step1SelectArea";
import type {
    DispensacionV2MaterialDTO,
    DispensacionV2MaterialesRecetaResponseDTO,
    DispensacionV2MpsItemSeleccionado,
    DispensacionV2OrdenSeleccionada,
    DispensacionV2PreparacionResponseDTO,
} from "./DispensacionV2Types";
import { formatDispensacionV2Number } from "./DispensacionV2Types";

interface DispensacionV2Step3MaterialesProps {
    selectedArea: AreaOperativaDispensacionV2;
    selectedMpsItem: DispensacionV2MpsItemSeleccionado;
    selectedOrdenes: DispensacionV2OrdenSeleccionada[];
    materialesReceta: DispensacionV2MaterialesRecetaResponseDTO | null;
    onMaterialesRecetaChange: (materialesReceta: DispensacionV2MaterialesRecetaResponseDTO | null) => void;
    onAsignacionReady: (asignacion: DispensacionV2PreparacionResponseDTO) => void;
    onBack: () => void;
}

const TOLERANCE = 0.01;

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { error?: string; message?: string } | string | undefined;
        if (typeof data === "string" && data.trim()) return data;
        if (data && typeof data === "object") return data.message ?? data.error ?? error.message ?? fallback;
        return error.message || fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function resolveCantidadBase(
    selectedItem: DispensacionV2MpsItemSeleccionado,
    ordenes: DispensacionV2OrdenSeleccionada[],
): number {
    const loteSize = selectedItem.item.loteSize;
    if (typeof loteSize === "number" && Number.isFinite(loteSize) && loteSize > TOLERANCE) {
        return loteSize;
    }
    return ordenes.find((orden) => orden.cantidadPlanificada > TOLERANCE)?.cantidadPlanificada ?? 0;
}

function buildRecipeKey(areaId: number, productoId: string, cantidadBase: number): string {
    return `${areaId}:${productoId}:${cantidadBase.toFixed(4)}`;
}

function buildResponseKey(response: DispensacionV2MaterialesRecetaResponseDTO | null): string | null {
    if (!response) return null;
    return buildRecipeKey(response.area.areaId, response.productoId, response.cantidadBase);
}

function buildMaterialWarning(material: DispensacionV2MaterialDTO, excedeReceta: boolean): string | null {
    const warnings: string[] = [];
    if (!material.inventareable) {
        warnings.push("Material no inventariable; no requiere salida de lote.");
    }
    if (excedeReceta) {
        warnings.push("La cantidad actual excede la receta por OP.");
    }
    return warnings.length > 0 ? warnings.join(" ") : null;
}

function recalcularMaterial(material: DispensacionV2MaterialDTO): DispensacionV2MaterialDTO {
    const cantidadActual = material.checked && material.inventareable ? material.cantidadADispensar : 0;
    const totalConHistorico = cantidadActual;
    const excedeReceta = totalConHistorico - material.cantidadReceta > TOLERANCE;
    return {
        ...material,
        totalConHistorico,
        excedeReceta,
        warning: buildMaterialWarning(material, excedeReceta),
    };
}

function recalcularMaterialesReceta(
    response: DispensacionV2MaterialesRecetaResponseDTO,
): DispensacionV2MaterialesRecetaResponseDTO {
    const materiales = response.materiales.map(recalcularMaterial);
    const warnings = materiales
        .filter((material) => material.warning)
        .map((material) => `${material.productoNombre}: ${material.warning}`);
    return {
        ...response,
        materiales,
        warnings,
    };
}

function iniciarMaterialesDesmarcados(
    response: DispensacionV2MaterialesRecetaResponseDTO,
): DispensacionV2MaterialesRecetaResponseDTO {
    return {
        ...response,
        materiales: response.materiales.map((material) => ({
            ...material,
            checked: false,
        })),
    };
}

export default function DispensacionV2Step3Materiales({
    selectedArea,
    selectedMpsItem,
    selectedOrdenes,
    materialesReceta,
    onMaterialesRecetaChange,
    onAsignacionReady,
    onBack,
}: DispensacionV2Step3MaterialesProps) {
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeRequestRef = useRef(0);

    const productoId = selectedMpsItem.item.terminadoId;
    const cantidadBase = useMemo(
        () => resolveCantidadBase(selectedMpsItem, selectedOrdenes),
        [selectedMpsItem, selectedOrdenes],
    );
    const recipeKey = useMemo(
        () => buildRecipeKey(selectedArea.areaId, productoId, cantidadBase),
        [cantidadBase, productoId, selectedArea.areaId],
    );
    const responseKey = useMemo(() => buildResponseKey(materialesReceta), [materialesReceta]);
    const totalMateriales = materialesReceta?.materiales.length ?? 0;
    const totalMaterialesSeleccionados = materialesReceta?.materiales.filter(
        (material) => material.checked && material.inventareable,
    ).length ?? 0;
    const totalWarnings = materialesReceta?.warnings.length ?? 0;
    const cantidadesPlanificadasDiferentes = selectedOrdenes.some(
        (orden) => Math.abs(orden.cantidadPlanificada - cantidadBase) > TOLERANCE,
    );

    const cargarReceta = useCallback(async (force = false) => {
        if (selectedOrdenes.length === 0) {
            onMaterialesRecetaChange(null);
            return;
        }
        if (cantidadBase <= TOLERANCE) {
            setError("No se pudo determinar una cantidad base valida para la receta.");
            onMaterialesRecetaChange(null);
            return;
        }
        if (!force && responseKey === recipeKey && materialesReceta) {
            return;
        }

        const requestId = activeRequestRef.current + 1;
        activeRequestRef.current = requestId;
        setLoading(true);
        setError(null);

        try {
            const response = await prepararMaterialesRecetaDispensacionV2(selectedArea.areaId, productoId, cantidadBase);
            if (activeRequestRef.current === requestId) {
                onMaterialesRecetaChange(recalcularMaterialesReceta(iniciarMaterialesDesmarcados(response)));
            }
        } catch (err) {
            if (activeRequestRef.current === requestId) {
                setError(getAxiosErrorMessage(err, "No fue posible preparar la receta de materiales para la dispensacion v2."));
                onMaterialesRecetaChange(null);
            }
        } finally {
            if (activeRequestRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [
        cantidadBase,
        materialesReceta,
        onMaterialesRecetaChange,
        productoId,
        recipeKey,
        responseKey,
        selectedArea.areaId,
        selectedOrdenes.length,
    ]);

    useEffect(() => {
        void cargarReceta(false);
    }, [cargarReceta]);

    const updateMaterial = useCallback((
        productoMaterialId: string,
        updater: (material: DispensacionV2MaterialDTO) => DispensacionV2MaterialDTO,
    ) => {
        if (!materialesReceta) return;
        setError(null);
        const next = {
            ...materialesReceta,
            materiales: materialesReceta.materiales.map((material) =>
                material.productoId === productoMaterialId ? updater(material) : material,
            ),
        };
        onMaterialesRecetaChange(recalcularMaterialesReceta(next));
    }, [materialesReceta, onMaterialesRecetaChange]);

    const handlePrepararResumen = async () => {
        if (!materialesReceta) return;
        if (totalMaterialesSeleccionados === 0) {
            setError("Debe chulear al menos un material inventariable para preparar el resumen.");
            return;
        }
        setAssigning(true);
        setError(null);
        try {
            const asignacion = await asignarLotesDispensacionV2DesdeMateriales(
                selectedArea.areaId,
                selectedOrdenes,
                materialesReceta.materiales,
            );
            onAsignacionReady(recalcularDispensacionV2(asignacion));
        } catch (err) {
            setError(getAxiosErrorMessage(err, "No fue posible asignar lotes de origen para la dispensacion v2."));
        } finally {
            setAssigning(false);
        }
    };

    return (
        <VStack align="stretch" spacing={5}>
            <Box borderWidth="1px" borderRadius="lg" bg="app.surface" p={4}>
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                        <Heading size="md">Materiales a dispensar</Heading>
                        <Text color="app.textMuted" fontSize="sm" mt={1}>
                            Receta de {selectedMpsItem.item.terminadoNombre} para {selectedOrdenes.length} OPs de {selectedArea.nombre}
                        </Text>
                    </Box>
                    <Flex gap={2} wrap="wrap">
                        <Button variant="outline" onClick={onBack}>
                            Volver a OPs
                        </Button>
                        <Button
                            variant="outline"
                            leftIcon={<FiRefreshCw />}
                            onClick={() => void cargarReceta(true)}
                            isLoading={loading}
                        >
                            Recalcular receta
                        </Button>
                    </Flex>
                </Flex>

                {materialesReceta ? (
                    <Flex mt={4} gap={2} wrap="wrap">
                        <Badge colorScheme="teal">{selectedOrdenes.length} OPs</Badge>
                        <Badge colorScheme="purple">
                            {formatDispensacionV2Number(materialesReceta.cantidadBase)} und por OP
                        </Badge>
                        <Badge colorScheme="blue">{totalMateriales} materiales</Badge>
                        <Badge colorScheme={totalMaterialesSeleccionados > 0 ? "green" : "gray"}>
                            {totalMaterialesSeleccionados} chuleados
                        </Badge>
                        <Badge colorScheme={totalWarnings > 0 ? "orange" : "green"}>
                            {totalWarnings} warnings
                        </Badge>
                    </Flex>
                ) : null}
            </Box>

            {cantidadesPlanificadasDiferentes ? (
                <Alert status="warning" borderRadius="md" alignItems="flex-start">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="semibold">Cantidades planificadas diferentes</Text>
                        <Text fontSize="sm">
                            La selección global se aplicará con una misma cantidad por OP. Revise las cantidades antes de preparar el resumen.
                        </Text>
                    </Box>
                </Alert>
            ) : null}

            {loading ? (
                <Flex justify="center" align="center" py={12} gap={3}>
                    <Spinner size="xl" color="teal.500" />
                    <Text color="app.textMuted">Preparando receta de materiales...</Text>
                </Flex>
            ) : null}

            {error ? (
                <Alert status="error" borderRadius="md" alignItems="flex-start">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="semibold">No se pudo preparar la dispensacion</Text>
                        <Text fontSize="sm">{error}</Text>
                    </Box>
                </Alert>
            ) : null}

            {!loading && materialesReceta ? (
                <VStack align="stretch" spacing={4}>
                    <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                        <TableContainer>
                            <Table size="sm" variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Dispensar</Th>
                                        <Th>Material</Th>
                                        <Th isNumeric>Receta por OP</Th>
                                        <Th isNumeric>Cantidad por OP</Th>
                                        <Th>Estado</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {materialesReceta.materiales.map((material) => (
                                        <Tr key={material.productoId} bg={material.excedeReceta ? "orange.50" : undefined}>
                                            <Td>
                                                <Checkbox
                                                    colorScheme="teal"
                                                    isChecked={material.checked}
                                                    isDisabled={!material.inventareable}
                                                    onChange={(event) => updateMaterial(
                                                        material.productoId,
                                                        (current) => ({ ...current, checked: event.target.checked }),
                                                    )}
                                                />
                                            </Td>
                                            <Td>
                                                <Text fontWeight="semibold" fontSize="sm">{material.productoNombre}</Text>
                                                <Text fontSize="xs" color="app.textMuted">
                                                    {material.productoId} · {material.tipoProducto}
                                                </Text>
                                            </Td>
                                            <Td isNumeric>
                                                {formatDispensacionV2Number(material.cantidadReceta)} {material.tipoUnidades}
                                            </Td>
                                            <Td isNumeric>
                                                <Flex justify="end">
                                                    <CustomDecimalInput
                                                        value={material.cantidadADispensar}
                                                        onChange={(value) => updateMaterial(
                                                            material.productoId,
                                                            (current) => ({ ...current, cantidadADispensar: value }),
                                                        )}
                                                        min={0}
                                                        size="sm"
                                                        width="110px"
                                                        maxDecimals={4}
                                                        isDisabled={!material.checked || !material.inventareable}
                                                    />
                                                </Flex>
                                            </Td>
                                            <Td>
                                                {material.warning ? (
                                                    <Badge colorScheme={material.excedeReceta ? "orange" : "gray"} whiteSpace="normal">
                                                        {material.warning}
                                                    </Badge>
                                                ) : material.checked ? (
                                                    <Badge colorScheme="green">Seleccionado</Badge>
                                                ) : (
                                                    <Badge colorScheme="gray">Sin dispensar</Badge>
                                                )}
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </Box>

                    {materialesReceta.warnings.length > 0 ? (
                        <Alert status="warning" borderRadius="md" alignItems="flex-start">
                            <AlertIcon />
                            <Box>
                                <Text fontWeight="semibold">Advertencias de la receta</Text>
                                {materialesReceta.warnings.slice(0, 6).map((warning) => (
                                    <Text key={warning} fontSize="sm">{warning}</Text>
                                ))}
                                {materialesReceta.warnings.length > 6 ? (
                                    <Text fontSize="sm">Y {materialesReceta.warnings.length - 6} advertencias mas.</Text>
                                ) : null}
                            </Box>
                        </Alert>
                    ) : null}

                    <Flex justify="flex-end" gap={3}>
                        <Button variant="outline" onClick={onBack}>
                            Atrás
                        </Button>
                        <Button
                            colorScheme="teal"
                            onClick={handlePrepararResumen}
                            isLoading={assigning}
                            isDisabled={totalMaterialesSeleccionados === 0}
                        >
                            Preparar resumen
                        </Button>
                    </Flex>
                </VStack>
            ) : null}
        </VStack>
    );
}
