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
import MpsReadonlyReviewPanel from "../Produccion/ProgProdSemanalTab/MpsReadonlyReviewPanel.tsx";
import type { MpsSemanalDraftDTO } from "../Produccion/ProgProdSemanalTab/MpsSemanalService.ts";
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

    const fetchMpsActual = useCallback(async () => {
        setCurrentWeekStartDate(getCurrentIsoWeekMonday());
        setLoading(true);
        setError(null);
        setErrorStatus(null);
        setMps(null);

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

    useEffect(() => {
        void fetchMpsActual();
    }, [fetchMpsActual]);

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

            {!loading && mps ? (
                <MpsReadonlyReviewPanel
                    mps={mps}
                    totalOrdenesGeneradas={mps.totalOdpsGeneradas}
                    areGeneratedOrdersAvailable={false}
                />
            ) : null}
        </VStack>
    );
}
