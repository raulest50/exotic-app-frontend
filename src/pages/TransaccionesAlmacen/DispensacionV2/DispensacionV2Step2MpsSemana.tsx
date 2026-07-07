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
import type { AreaOperativaDispensacionV2 } from "./DispensacionV2Step1SelectArea";
import type { DispensacionV2MpsItemSeleccionado } from "./DispensacionV2Types";

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
    onSelectMpsItem: (selectedItem: DispensacionV2MpsItemSeleccionado) => void;
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

export default function DispensacionV2Step2MpsSemana({
    selectedArea,
    onSelectMpsItem,
    onBack,
}: DispensacionV2Step2MpsSemanaProps) {
    const [currentWeekStartDate] = useState(getCurrentIsoWeekMonday);
    const [selectedWeekKey, setSelectedWeekKey] = useState<WeekKey>("present");
    const [mps, setMps] = useState<MpsSemanalDraftDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorStatus, setErrorStatus] = useState<number | null>(null);
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

            {!loading && mps ? (
                <MpsReadonlyReviewPanel
                    mps={mps}
                    totalOrdenesGeneradas={mps.totalOdpsGeneradas}
                    areGeneratedOrdersAvailable={mps.totalOdpsGeneradas > 0}
                    itemClickMode="card"
                    itemActionLabel="OPs"
                    onItemClick={(item, context) => onSelectMpsItem({
                        item,
                        context,
                        weekStartDate: mps.weekStartDate,
                        weekEndDate: mps.weekEndDate,
                        semanaMpsCodigo: mps.semanaMpsCodigo,
                    })}
                />
            ) : null}
        </VStack>
    );
}
