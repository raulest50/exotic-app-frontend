import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Flex,
    Heading,
    Spinner,
    Text,
    VStack,
} from "@chakra-ui/react";
import { FiRefreshCw } from "react-icons/fi";
import EndPointsURL from "../../api/EndPointsURL.tsx";
import MpsItemOrdersModal, {
    type SelectedMpsItemOrders,
} from "../Produccion/ProgProdSemanalTab/MpsItemOrdersModal.tsx";
import MpsReadonlyReviewPanel from "../Produccion/ProgProdSemanalTab/MpsReadonlyReviewPanel.tsx";
import type {
    MpsSemanalDraftDTO,
    MpsSemanalOrdenProduccionListItemDTO,
} from "../Produccion/ProgProdSemanalTab/MpsSemanalService.ts";
import {
    addLocalDays,
    formatSemanaMpsDisplayDate,
    getCurrentIsoWeekMonday,
} from "../Produccion/ProgProdSemanalTab/semanaMps.utils.ts";

const endpoints = new EndPointsURL();

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { error?: string; message?: string } | undefined;
        return data?.message ?? data?.error ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function getAlertStatus(status: number | null): "warning" | "error" {
    if (status === 404 || status === 409) {
        return "warning";
    }
    return "error";
}

export default function AreaOperativaMpsSemanalTab() {
    const [currentWeekStartDate, setCurrentWeekStartDate] = useState(getCurrentIsoWeekMonday);
    const currentWeekEndDate = useMemo(() => addLocalDays(currentWeekStartDate, 5), [currentWeekStartDate]);
    const [mps, setMps] = useState<MpsSemanalDraftDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorStatus, setErrorStatus] = useState<number | null>(null);
    const [selectedWeekOdps, setSelectedWeekOdps] = useState<MpsSemanalOrdenProduccionListItemDTO[]>([]);
    const [isLoadingOdps, setIsLoadingOdps] = useState(false);
    const [odpsError, setOdpsError] = useState<string | null>(null);
    const [selectedMpsItemOrders, setSelectedMpsItemOrders] = useState<SelectedMpsItemOrders | null>(null);

    const fetchMpsActual = useCallback(async () => {
        setCurrentWeekStartDate(getCurrentIsoWeekMonday());
        setLoading(true);
        setError(null);
        setErrorStatus(null);
        setMps(null);
        setSelectedWeekOdps([]);
        setIsLoadingOdps(false);
        setOdpsError(null);
        setSelectedMpsItemOrders(null);

        try {
            const response = await axios.get<MpsSemanalDraftDTO>(
                endpoints.area_operativa_panel_mps_semanal_actual,
                { withCredentials: true },
            );
            setMps(response.data);
        } catch (err) {
            const status = axios.isAxiosError(err) ? err.response?.status ?? null : null;
            setErrorStatus(status);
            setError(getAxiosErrorMessage(err, "No fue posible cargar el MPS semanal actual."));
        } finally {
            setLoading(false);
        }
    }, []);

    const displayWeekStartDate = mps?.weekStartDate ?? currentWeekStartDate;
    const displayWeekEndDate = mps?.weekEndDate ?? currentWeekEndDate;

    const selectedItemOrders = useMemo(() => {
        if (!selectedMpsItemOrders) {
            return [];
        }
        const plannedLotIds = new Set(selectedMpsItemOrders.item.lotesPlanificados.map((lote) => lote.id));
        return selectedWeekOdps
            .filter((orden) => (
                orden.mpsItemId === selectedMpsItemOrders.item.id
                || (orden.mpsLotePlanificadoId != null && plannedLotIds.has(orden.mpsLotePlanificadoId))
            ))
            .sort((a, b) => {
                const aOrdinal = a.mpsLoteOrdinal ?? Number.MAX_SAFE_INTEGER;
                const bOrdinal = b.mpsLoteOrdinal ?? Number.MAX_SAFE_INTEGER;
                return aOrdinal - bOrdinal || a.ordenId - b.ordenId;
            });
    }, [selectedMpsItemOrders, selectedWeekOdps]);

    useEffect(() => {
        let isCancelled = false;

        if (!mps || mps.totalOdpsGeneradas <= 0) {
            setSelectedWeekOdps([]);
            setOdpsError(null);
            setIsLoadingOdps(false);
            setSelectedMpsItemOrders(null);
            return () => {
                isCancelled = true;
            };
        }

        setSelectedWeekOdps([]);
        setOdpsError(null);
        setIsLoadingOdps(true);

        axios.get<MpsSemanalOrdenProduccionListItemDTO[]>(
            endpoints.area_operativa_panel_mps_semanal_actual_odps,
            { withCredentials: true },
        )
            .then((response) => {
                if (!isCancelled) {
                    setSelectedWeekOdps(response.data ?? []);
                }
            })
            .catch((err) => {
                if (!isCancelled) {
                    setOdpsError(getAxiosErrorMessage(err, "No fue posible cargar las ODPs generadas del MPS semanal."));
                    setSelectedWeekOdps([]);
                    setSelectedMpsItemOrders(null);
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsLoadingOdps(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [
        mps?.fechaGeneracionOdps,
        mps?.mpsId,
        mps?.totalOdpsGeneradas,
        mps?.weekStartDate,
    ]);

    useEffect(() => {
        void fetchMpsActual();
    }, [fetchMpsActual]);

    const areGeneratedOrdersAvailable = Boolean(mps)
        && mps.totalOdpsGeneradas > 0
        && !isLoadingOdps
        && !odpsError;

    return (
        <VStack align="stretch" spacing={5}>
            <Box borderWidth="1px" borderRadius="lg" bg="app.surface" p={4}>
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                        <Heading size="md">MPS semanal</Heading>
                        <Text color="app.textMuted" fontSize="sm" mt={1}>
                            Semana actual: {formatSemanaMpsDisplayDate(displayWeekStartDate)} a {formatSemanaMpsDisplayDate(displayWeekEndDate)}
                        </Text>
                    </Box>
                    <Button
                        variant="outline"
                        leftIcon={<FiRefreshCw />}
                        onClick={() => void fetchMpsActual()}
                        isLoading={loading}
                    >
                        Refrescar
                    </Button>
                </Flex>
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

            {!loading && mps && mps.totalOdpsGeneradas > 0 && odpsError ? (
                <Alert status="error" borderRadius="md" alignItems="flex-start">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="semibold">ODPs no disponibles</Text>
                        <Text fontSize="sm">{odpsError}</Text>
                    </Box>
                </Alert>
            ) : null}

            {!loading && mps ? (
                <MpsReadonlyReviewPanel
                    mps={mps}
                    totalOrdenesGeneradas={mps.totalOdpsGeneradas}
                    areGeneratedOrdersAvailable={areGeneratedOrdersAvailable}
                    onItemClick={(item, context) => setSelectedMpsItemOrders({ item, context })}
                />
            ) : null}

            <MpsItemOrdersModal
                selectedItem={selectedMpsItemOrders}
                ordenes={selectedItemOrders}
                isLoading={isLoadingOdps}
                error={odpsError}
                onClose={() => setSelectedMpsItemOrders(null)}
            />
        </VStack>
    );
}
