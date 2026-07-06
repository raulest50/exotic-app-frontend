import { Alert, AlertIcon, Badge, Box, Button, Flex, Heading, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import EndPointsURL from "../../../api/EndPointsURL";
import MpsReadonlyReviewPanel from "../../Produccion/ProgProdSemanalTab/MpsReadonlyReviewPanel";
import type { MpsSemanalDraftDTO } from "../../Produccion/ProgProdSemanalTab/MpsSemanalService";
import {
    addLocalDays,
    buildSemanaMpsCodigo,
    formatSemanaMpsDisplayDate,
    getCurrentIsoWeekMonday,
} from "../../Produccion/ProgProdSemanalTab/semanaMps.utils";
import DispensacionV2LotesOrdenModal, {
    type DispensacionV2MpsItemSeleccionado,
    type DispensacionV2OrdenSeleccionada,
} from "./DispensacionV2LotesOrdenModal";
import type { AreaOperativaDispensacionV2 } from "./DispensacionV2Step1SelectArea";

const endpoints = new EndPointsURL();

type WeekKey = "previous" | "present" | "next";

interface WeekOption {
    key: WeekKey;
    label: string;
    weekStartDate: string;
    weekEndDate: string;
    code: string;
}

interface DispensacionV2Step2MpsSemanaProps {
    selectedArea: AreaOperativaDispensacionV2;
    onBack: () => void;
}

function buildWeekOptions(currentWeekStartDate: string): WeekOption[] {
    const options: Array<{ key: WeekKey; label: string; offsetDays: number }> = [
        { key: "previous", label: "Semana anterior", offsetDays: -7 },
        { key: "present", label: "Semana presente", offsetDays: 0 },
        { key: "next", label: "Semana siguiente", offsetDays: 7 },
    ];

    return options.map(({ key, label, offsetDays }) => {
        const weekStartDate = addLocalDays(currentWeekStartDate, offsetDays);
        return {
            key,
            label,
            weekStartDate,
            weekEndDate: addLocalDays(weekStartDate, 5),
            code: buildSemanaMpsCodigo(weekStartDate),
        };
    });
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

function getAlertStatus(status: number | null): "warning" | "error" {
    if (status === 404 || status === 409) {
        return "warning";
    }
    return "error";
}

function formatNumber(value: number | null | undefined): string {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return safeValue.toLocaleString("es-CO", {
        minimumFractionDigits: safeValue % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

export default function DispensacionV2Step2MpsSemana({
    selectedArea,
    onBack,
}: DispensacionV2Step2MpsSemanaProps) {
    const [currentWeekStartDate] = useState(getCurrentIsoWeekMonday);
    const [selectedWeekKey, setSelectedWeekKey] = useState<WeekKey>("present");
    const [mps, setMps] = useState<MpsSemanalDraftDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorStatus, setErrorStatus] = useState<number | null>(null);
    const [selectedMpsItem, setSelectedMpsItem] = useState<DispensacionV2MpsItemSeleccionado | null>(null);
    const [selectedOrdenes, setSelectedOrdenes] = useState<DispensacionV2OrdenSeleccionada[]>([]);
    const activeRequestRef = useRef(0);

    const weekOptions = useMemo(() => buildWeekOptions(currentWeekStartDate), [currentWeekStartDate]);
    const selectedWeek = useMemo(
        () => weekOptions.find((option) => option.key === selectedWeekKey) ?? weekOptions[1]!,
        [selectedWeekKey, weekOptions],
    );

    const clearMpsState = useCallback(() => {
        setError(null);
        setErrorStatus(null);
        setMps(null);
        setSelectedMpsItem(null);
        setSelectedOrdenes([]);
    }, []);

    const selectedOrdenesOrdenadas = useMemo(
        () => [...selectedOrdenes].sort((a, b) => a.mpsLoteOrdinal - b.mpsLoteOrdinal || a.ordenProduccionId - b.ordenProduccionId),
        [selectedOrdenes],
    );
    const productosSeleccionados = useMemo(
        () => Array.from(new Set(selectedOrdenesOrdenadas.map((orden) => orden.productoNombre).filter(Boolean))),
        [selectedOrdenesOrdenadas],
    );
    const totalCantidadSeleccionada = selectedOrdenesOrdenadas.reduce(
        (total, orden) => total + orden.cantidadPlanificada,
        0,
    );

    const handleToggleOrden = useCallback((orden: DispensacionV2OrdenSeleccionada) => {
        setSelectedOrdenes((current) => {
            const exists = current.some((selected) => selected.ordenProduccionId === orden.ordenProduccionId);
            if (exists) {
                return current.filter((selected) => selected.ordenProduccionId !== orden.ordenProduccionId);
            }
            return [...current, orden];
        });
    }, []);

    const handleToggleOrdenes = useCallback((ordenes: DispensacionV2OrdenSeleccionada[], shouldSelect: boolean) => {
        setSelectedOrdenes((current) => {
            const ordenIds = new Set(ordenes.map((orden) => orden.ordenProduccionId));
            if (!shouldSelect) {
                return current.filter((selected) => !ordenIds.has(selected.ordenProduccionId));
            }

            const currentIds = new Set(current.map((orden) => orden.ordenProduccionId));
            const nextOrdenes = ordenes.filter((orden) => !currentIds.has(orden.ordenProduccionId));
            return [...current, ...nextOrdenes];
        });
    }, []);

    const handleRemoveOrden = useCallback((ordenProduccionId: number) => {
        setSelectedOrdenes((current) => current.filter((orden) => orden.ordenProduccionId !== ordenProduccionId));
    }, []);

    const fetchMpsForWeek = useCallback(async (weekStartDate: string) => {
        const requestId = activeRequestRef.current + 1;
        activeRequestRef.current = requestId;

        setLoading(true);
        clearMpsState();

        try {
            const response = await axios.get<MpsSemanalDraftDTO>(
                endpoints.dispensacion_v2_mps_semanal,
                {
                    params: {
                        weekStartDate,
                        areaId: selectedArea.areaId,
                    },
                    withCredentials: true,
                },
            );

            if (activeRequestRef.current === requestId) {
                setMps(response.data);
            }
        } catch (err) {
            if (activeRequestRef.current === requestId) {
                const status = axios.isAxiosError(err) ? err.response?.status ?? null : null;
                setErrorStatus(status);
                setError(getAxiosErrorMessage(err, "No fue posible cargar el MPS semanal para el area seleccionada."));
            }
        } finally {
            if (activeRequestRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [clearMpsState, selectedArea.areaId]);

    const handleSelectWeek = useCallback((weekKey: WeekKey) => {
        if (weekKey === selectedWeekKey) {
            return;
        }

        activeRequestRef.current += 1;
        setSelectedWeekKey(weekKey);
        setLoading(true);
        clearMpsState();
    }, [clearMpsState, selectedWeekKey]);

    useEffect(() => {
        void fetchMpsForWeek(selectedWeek.weekStartDate);
    }, [fetchMpsForWeek, selectedWeek.weekStartDate]);

    return (
        <VStack align="stretch" spacing={5}>
            <Box borderWidth="1px" borderRadius="lg" bg="app.surface" p={4}>
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                        <Heading size="md">MPS semanal</Heading>
                        <Flex gap={2} align="center" mt={2} flexWrap="wrap">
                            <Text color="app.textMuted" fontSize="sm">
                                Area seleccionada: {selectedArea.nombre}
                            </Text>
                            <Badge variant="subtle">ID {selectedArea.areaId}</Badge>
                        </Flex>
                        <Text color="app.textMuted" fontSize="sm" mt={1}>
                            Semana {selectedWeek.label.toLowerCase()}: {formatSemanaMpsDisplayDate(selectedWeek.weekStartDate)} a {formatSemanaMpsDisplayDate(selectedWeek.weekEndDate)}
                        </Text>
                    </Box>
                    <Flex gap={2} wrap="wrap">
                        <Button variant="outline" onClick={onBack}>
                            Volver al área
                        </Button>
                        <Button
                            variant="outline"
                            leftIcon={<FiRefreshCw />}
                            onClick={() => void fetchMpsForWeek(selectedWeek.weekStartDate)}
                            isLoading={loading}
                        >
                            Refrescar
                        </Button>
                    </Flex>
                </Flex>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mt={4}>
                    {weekOptions.map((option) => {
                        const isSelected = option.key === selectedWeek.key;
                        return (
                            <Button
                                key={option.key}
                                minH="64px"
                                py={3}
                                colorScheme={isSelected ? "teal" : "gray"}
                                variant={isSelected ? "solid" : "outline"}
                                onClick={() => handleSelectWeek(option.key)}
                            >
                                <VStack as="span" spacing={0}>
                                    <Text as="span" fontWeight="bold" lineHeight="1.2">
                                        {option.code}
                                    </Text>
                                    <Text
                                        as="span"
                                        fontSize="xs"
                                        lineHeight="1.2"
                                        color={isSelected ? "whiteAlpha.900" : "app.textMuted"}
                                    >
                                        {option.label}
                                    </Text>
                                </VStack>
                            </Button>
                        );
                    })}
                </SimpleGrid>
            </Box>

            {loading ? (
                <Flex justify="center" align="center" py={12} gap={3}>
                    <Spinner size="xl" color="teal.500" />
                    <Text color="app.textMuted">Cargando MPS semanal...</Text>
                </Flex>
            ) : null}

            {!loading && error ? (
                <Alert status={getAlertStatus(errorStatus)} borderRadius="md" alignItems="flex-start">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="semibold">MPS semanal no disponible</Text>
                        <Text fontSize="sm">{error}</Text>
                    </Box>
                </Alert>
            ) : null}

            {!loading && mps && mps.totalItems === 0 ? (
                <Alert status="info" borderRadius="md" alignItems="flex-start">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="semibold">Sin tarjetas para esta area</Text>
                        <Text fontSize="sm">El area seleccionada no interviene en las ODPs generadas para esta semana.</Text>
                    </Box>
                </Alert>
            ) : null}

            {!loading && selectedOrdenesOrdenadas.length > 0 ? (
                <Box borderWidth="1px" borderColor="teal.200" borderRadius="md" bg="teal.50" p={4}>
                    <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                        <Box>
                            <Text fontSize="sm" color="gray.600">OPs seleccionadas para dispensacion</Text>
                            <Heading size="sm" mt={1}>
                                {selectedOrdenesOrdenadas.length} OPs listas para la operacion
                            </Heading>
                            <Text fontSize="sm" color="gray.700" mt={1}>
                                {productosSeleccionados.length === 1
                                    ? productosSeleccionados[0]
                                    : `${productosSeleccionados.length} productos seleccionados`}
                            </Text>
                        </Box>
                        <Flex gap={2} wrap="wrap" justify="end">
                            <Badge colorScheme="teal">{selectedOrdenesOrdenadas[0]?.areaNombre}</Badge>
                            <Badge colorScheme="purple">{formatNumber(totalCantidadSeleccionada)} und</Badge>
                            <Badge colorScheme="gray">{selectedOrdenesOrdenadas.length} lotes MPS</Badge>
                        </Flex>
                    </Flex>
                    <VStack align="stretch" spacing={2} mt={3}>
                        {selectedOrdenesOrdenadas.map((orden) => (
                            <Flex
                                key={orden.ordenProduccionId}
                                justify="space-between"
                                align="center"
                                gap={3}
                                wrap="wrap"
                                bg="white"
                                borderWidth="1px"
                                borderColor="teal.100"
                                borderRadius="md"
                                p={3}
                            >
                                <Box>
                                    <Text fontWeight="semibold" fontSize="sm">
                                        OP {orden.ordenProduccionId} - {orden.loteAsignado ?? "Sin lote real"}
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                        Lote MPS {orden.mpsLoteOrdinal} - Entrega {formatSemanaMpsDisplayDate(orden.fechaEntregaPlanificada)}
                                    </Text>
                                </Box>
                                <Flex gap={2} align="center" wrap="wrap">
                                    <Badge colorScheme="purple">{formatNumber(orden.cantidadPlanificada)} und</Badge>
                                    <Button size="xs" variant="outline" onClick={() => handleRemoveOrden(orden.ordenProduccionId)}>
                                        Quitar
                                    </Button>
                                </Flex>
                            </Flex>
                        ))}
                    </VStack>
                </Box>
            ) : null}

            {!loading && mps ? (
                <MpsReadonlyReviewPanel
                    mps={mps}
                    totalOrdenesGeneradas={mps.totalOdpsGeneradas}
                    areGeneratedOrdersAvailable={mps.totalOdpsGeneradas > 0}
                    itemClickMode="card"
                    itemActionLabel="Lotes"
                    onItemClick={(item, context) => setSelectedMpsItem({ item, context })}
                />
            ) : null}

            {mps ? (
                <DispensacionV2LotesOrdenModal
                    selectedItem={selectedMpsItem}
                    selectedOrdenes={selectedOrdenes}
                    selectedArea={selectedArea}
                    weekStartDate={mps.weekStartDate}
                    weekEndDate={mps.weekEndDate}
                    semanaMpsCodigo={mps.semanaMpsCodigo}
                    onToggleOrden={handleToggleOrden}
                    onToggleOrdenes={handleToggleOrdenes}
                    onClose={() => setSelectedMpsItem(null)}
                />
            ) : null}
        </VStack>
    );
}
