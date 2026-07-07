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
import { asignarLotesDispensacionV2, prepararDispensacionV2 } from "./DispensacionV2Service";
import type { AreaOperativaDispensacionV2 } from "./DispensacionV2Step1SelectArea";
import type {
    DispensacionV2OrdenSeleccionada,
    DispensacionV2PreparacionResponseDTO,
} from "./DispensacionV2Types";
import { formatDispensacionV2Number } from "./DispensacionV2Types";
import { recalcularDispensacionV2 } from "./DispensacionV2Calculations";

interface DispensacionV2Step3MaterialesProps {
    selectedArea: AreaOperativaDispensacionV2;
    selectedOrdenes: DispensacionV2OrdenSeleccionada[];
    preparacion: DispensacionV2PreparacionResponseDTO | null;
    onPreparacionChange: (preparacion: DispensacionV2PreparacionResponseDTO | null) => void;
    onAsignacionReady: (asignacion: DispensacionV2PreparacionResponseDTO) => void;
    onBack: () => void;
}

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { error?: string; message?: string } | string | undefined;
        if (typeof data === "string" && data.trim()) return data;
        if (data && typeof data === "object") return data.message ?? data.error ?? error.message ?? fallback;
        return error.message || fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function buildSelectionKey(areaId: number, ordenes: DispensacionV2OrdenSeleccionada[]): string {
    const ordenIds = ordenes
        .map((orden) => orden.ordenProduccionId)
        .sort((a, b) => a - b)
        .join(",");
    return `${areaId}:${ordenIds}`;
}

function buildResponseKey(response: DispensacionV2PreparacionResponseDTO | null): string | null {
    if (!response) return null;
    const ordenIds = response.ordenes
        .map((orden) => orden.ordenProduccionId)
        .sort((a, b) => a - b)
        .join(",");
    return `${response.area.areaId}:${ordenIds}`;
}

export default function DispensacionV2Step3Materiales({
    selectedArea,
    selectedOrdenes,
    preparacion,
    onPreparacionChange,
    onAsignacionReady,
    onBack,
}: DispensacionV2Step3MaterialesProps) {
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeRequestRef = useRef(0);

    const selectionKey = useMemo(
        () => buildSelectionKey(selectedArea.areaId, selectedOrdenes),
        [selectedArea.areaId, selectedOrdenes],
    );
    const responseKey = useMemo(() => buildResponseKey(preparacion), [preparacion]);
    const totalMateriales = preparacion?.ordenes.reduce((total, orden) => total + orden.materiales.length, 0) ?? 0;
    const totalWarnings = preparacion?.warnings.length ?? 0;

    const cargarPreparacion = useCallback(async (force = false) => {
        if (selectedOrdenes.length === 0) {
            onPreparacionChange(null);
            return;
        }
        if (!force && responseKey === selectionKey && preparacion) {
            return;
        }

        const requestId = activeRequestRef.current + 1;
        activeRequestRef.current = requestId;
        setLoading(true);
        setError(null);

        try {
            const response = await prepararDispensacionV2(selectedArea.areaId, selectedOrdenes);
            if (activeRequestRef.current === requestId) {
                onPreparacionChange(recalcularDispensacionV2(response));
            }
        } catch (err) {
            if (activeRequestRef.current === requestId) {
                setError(getAxiosErrorMessage(err, "No fue posible preparar los materiales de la dispensacion v2."));
                onPreparacionChange(null);
            }
        } finally {
            if (activeRequestRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [onPreparacionChange, preparacion, responseKey, selectedArea.areaId, selectedOrdenes, selectionKey]);

    useEffect(() => {
        void cargarPreparacion(false);
    }, [cargarPreparacion]);

    const updateMaterial = useCallback((
        ordenProduccionId: number,
        productoId: string,
        updater: (material: DispensacionV2PreparacionResponseDTO["ordenes"][number]["materiales"][number]) => DispensacionV2PreparacionResponseDTO["ordenes"][number]["materiales"][number],
    ) => {
        if (!preparacion) return;
        const next = {
            ...preparacion,
            ordenes: preparacion.ordenes.map((orden) => {
                if (orden.ordenProduccionId !== ordenProduccionId) return orden;
                return {
                    ...orden,
                    materiales: orden.materiales.map((material) =>
                        material.productoId === productoId ? updater(material) : material,
                    ),
                };
            }),
        };
        onPreparacionChange(recalcularDispensacionV2(next));
    }, [onPreparacionChange, preparacion]);

    const handlePrepararResumen = async () => {
        if (!preparacion) return;
        setAssigning(true);
        setError(null);
        try {
            const asignacion = await asignarLotesDispensacionV2(selectedArea.areaId, preparacion);
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
                            {selectedOrdenes.length} OPs seleccionadas para {selectedArea.nombre}
                        </Text>
                    </Box>
                    <Flex gap={2} wrap="wrap">
                        <Button variant="outline" onClick={onBack}>
                            Volver al MPS
                        </Button>
                        <Button
                            variant="outline"
                            leftIcon={<FiRefreshCw />}
                            onClick={() => void cargarPreparacion(true)}
                            isLoading={loading}
                        >
                            Recalcular receta
                        </Button>
                    </Flex>
                </Flex>

                {preparacion ? (
                    <Flex mt={4} gap={2} wrap="wrap">
                        <Badge colorScheme="teal">{preparacion.ordenes.length} OPs</Badge>
                        <Badge colorScheme="purple">{totalMateriales} materiales</Badge>
                        <Badge colorScheme={totalWarnings > 0 ? "orange" : "green"}>
                            {totalWarnings} warnings
                        </Badge>
                    </Flex>
                ) : null}
            </Box>

            {loading ? (
                <Flex justify="center" align="center" py={12} gap={3}>
                    <Spinner size="xl" color="teal.500" />
                    <Text color="app.textMuted">Preparando receta e historico...</Text>
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

            {!loading && preparacion ? (
                <VStack align="stretch" spacing={4}>
                    {preparacion.ordenes.map((orden) => (
                        <Box key={orden.ordenProduccionId} borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                            <Flex justify="space-between" align="start" gap={3} wrap="wrap" mb={3}>
                                <Box>
                                    <Heading size="sm">
                                        OP {orden.ordenProduccionId} - {orden.loteAsignado ?? "Sin lote"}
                                    </Heading>
                                    <Text fontSize="sm" color="app.textMuted">
                                        {orden.productoTerminadoNombre} ({orden.productoTerminadoId})
                                    </Text>
                                </Box>
                                <Flex gap={2} wrap="wrap">
                                    <Badge colorScheme="purple">
                                        {formatDispensacionV2Number(orden.cantidadProducir)} und
                                    </Badge>
                                    <Badge colorScheme="teal">{orden.area.nombre}</Badge>
                                </Flex>
                            </Flex>

                            <TableContainer>
                                <Table size="sm" variant="simple">
                                    <Thead>
                                        <Tr>
                                            <Th>Dispensar</Th>
                                            <Th>Material</Th>
                                            <Th isNumeric>Receta</Th>
                                            <Th isNumeric>Historico</Th>
                                            <Th isNumeric>Cantidad actual</Th>
                                            <Th isNumeric>Total</Th>
                                            <Th>Estado</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {orden.materiales.map((material) => (
                                            <Tr key={material.productoId} bg={material.excedeReceta ? "orange.50" : undefined}>
                                                <Td>
                                                    <Checkbox
                                                        colorScheme="teal"
                                                        isChecked={material.checked}
                                                        isDisabled={!material.inventareable}
                                                        onChange={(event) => updateMaterial(
                                                            orden.ordenProduccionId,
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
                                                    {formatDispensacionV2Number(material.cantidadHistorica)} {material.tipoUnidades}
                                                </Td>
                                                <Td isNumeric>
                                                    <Flex justify="end">
                                                        <CustomDecimalInput
                                                            value={material.cantidadADispensar}
                                                            onChange={(value) => updateMaterial(
                                                                orden.ordenProduccionId,
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
                                                <Td isNumeric>
                                                    {formatDispensacionV2Number(material.totalConHistorico)} {material.tipoUnidades}
                                                </Td>
                                                <Td>
                                                    {material.warning ? (
                                                        <Badge colorScheme={material.excedeReceta ? "orange" : "gray"} whiteSpace="normal">
                                                            {material.warning}
                                                        </Badge>
                                                    ) : (
                                                        <Badge colorScheme="green">OK</Badge>
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </TableContainer>
                        </Box>
                    ))}

                    {preparacion.warnings.length > 0 ? (
                        <Alert status="warning" borderRadius="md" alignItems="flex-start">
                            <AlertIcon />
                            <Box>
                                <Text fontWeight="semibold">Advertencias de la preparacion</Text>
                                {preparacion.warnings.slice(0, 6).map((warning) => (
                                    <Text key={warning} fontSize="sm">{warning}</Text>
                                ))}
                                {preparacion.warnings.length > 6 ? (
                                    <Text fontSize="sm">Y {preparacion.warnings.length - 6} advertencias mas.</Text>
                                ) : null}
                            </Box>
                        </Alert>
                    ) : null}

                    <Flex justify="flex-end" gap={3}>
                        <Button variant="outline" onClick={onBack}>
                            Atrás
                        </Button>
                        <Button colorScheme="teal" onClick={handlePrepararResumen} isLoading={assigning}>
                            Preparar resumen
                        </Button>
                    </Flex>
                </VStack>
            ) : null}
        </VStack>
    );
}
