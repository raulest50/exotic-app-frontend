import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Badge,
    Box,
    Button,
    Divider,
    Flex,
    Heading,
    Input,
    SimpleGrid,
    Spinner,
    Text,
    useToast,
    VStack,
} from "@chakra-ui/react";
import {
    AprobarMpsSemanal,
    CerrarObservacionMpsSemanal,
    CrearObservacionMpsSemanal,
    GenerarOdpDesdeMps,
    ListarMpsSemanales,
    ListarObservacionesMpsSemanal,
    ListarSemanasMps,
    ObtenerMpsSemanal,
    ObtenerOdpsDesdeMpsSemanal,
    type MpsEstado,
    type MpsSemanalDraftDTO,
    type MpsSemanalListItemDTO,
    type MpsSemanalObservacionDTO,
    type MpsSemanalObservacionTipo,
    type MpsSemanalOrdenProduccionListItemDTO,
    type SemanaMPSDTO,
} from "./MpsSemanalService";
import { downloadMpsSemanalPdf } from "./pdf/MpsSemanalPdfGenerator";
import SemanaMPSPickerModal from "./SemanaMPSPickerModal";
import MpsReadonlyReviewPanel from "./MpsReadonlyReviewPanel";
import MpsObservacionesPanel from "./MpsObservacionesPanel";
import MpsItemOrdersModal, { type SelectedMpsItemOrders } from "./MpsItemOrdersModal";
import {
    formatSemanaMpsDisplayDate,
    getCurrentIsoWeekMonday,
    getIsoWeekYear,
    sortSemanasByStartDate,
} from "./semanaMps.utils";

type SemanaMpsDisplayInfo = {
    semanaMpsCodigo?: string | null;
    weekStartDate: string;
    weekEndDate: string;
};

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function getEstadoColorScheme(estado: MpsEstado): string {
    switch (estado) {
        case "BORRADOR":
            return "yellow";
        case "APROBADO":
            return "green";
        case "CERRADO":
            return "gray";
        default:
            return "blue";
    }
}

function getEstadoLabel(estado: MpsEstado): string {
    switch (estado) {
        case "BORRADOR":
            return "Borrador";
        case "APROBADO":
            return "Aprobada";
        case "CERRADO":
            return "Cerrada";
        default:
            return estado;
    }
}

function getSemanaMpsLabel(item: SemanaMpsDisplayInfo): string {
    return item.semanaMpsCodigo ?? item.weekStartDate;
}

function getSemanaMpsDateRange(item: SemanaMpsDisplayInfo): string {
    return `${formatSemanaMpsDisplayDate(item.weekStartDate)} a ${formatSemanaMpsDisplayDate(item.weekEndDate)}`;
}

function getSemanaMpsDisplayFromSemana(semana: SemanaMPSDTO): SemanaMpsDisplayInfo {
    return {
        semanaMpsCodigo: semana.codigo,
        weekStartDate: semana.startDate,
        weekEndDate: semana.endDate,
    };
}

function formatNumber(value: number): string {
    return value.toLocaleString("es-CO", {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function formatDateTimeLabel(value: string | null): string {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function findDefaultSemana(semanas: SemanaMPSDTO[], currentWeekStartDate: string): SemanaMPSDTO | null {
    const sorted = sortSemanasByStartDate(semanas);
    const currentSemana = sorted.find((semana) => semana.startDate === currentWeekStartDate);
    if (currentSemana?.mpsId != null) {
        return currentSemana;
    }

    return sorted.find((semana) => semana.startDate > currentWeekStartDate && semana.mpsId != null)
        ?? currentSemana
        ?? sorted[0]
        ?? null;
}

function generateApprovalToken(): string {
    return Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
}

function SummaryLine({ label, value }: { label: string; value: number }) {
    return (
        <Text fontSize="sm" color="gray.600">
            {label}: <Text as="span" fontWeight="semibold" color="gray.700">{formatNumber(value)}</Text>
        </Text>
    );
}

export default function AprobacionMPSWeekTab() {
    const toast = useToast();
    const [items, setItems] = useState<MpsSemanalListItemDTO[]>([]);
    const [selectedSemana, setSelectedSemana] = useState<SemanaMPSDTO | null>(null);
    const [selectedWeekStartDate, setSelectedWeekStartDate] = useState(getCurrentIsoWeekMonday());
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [selectedMpsDetail, setSelectedMpsDetail] = useState<MpsSemanalDraftDTO | null>(null);
    const [isLoadingMpsDetail, setIsLoadingMpsDetail] = useState(false);
    const [mpsDetailError, setMpsDetailError] = useState<string | null>(null);
    const [observaciones, setObservaciones] = useState<MpsSemanalObservacionDTO[]>([]);
    const [isLoadingObservaciones, setIsLoadingObservaciones] = useState(false);
    const [observacionesError, setObservacionesError] = useState<string | null>(null);
    const [approvingWeekStartDate, setApprovingWeekStartDate] = useState<string | null>(null);
    const [generatingWeekStartDate, setGeneratingWeekStartDate] = useState<string | null>(null);
    const [downloadingPdfWeekStartDate, setDownloadingPdfWeekStartDate] = useState<string | null>(null);
    const [selectedWeekOdps, setSelectedWeekOdps] = useState<MpsSemanalOrdenProduccionListItemDTO[]>([]);
    const [isLoadingOdps, setIsLoadingOdps] = useState(false);
    const [odpsError, setOdpsError] = useState<string | null>(null);
    const [selectedMpsItemOrders, setSelectedMpsItemOrders] = useState<SelectedMpsItemOrders | null>(null);
    const [approvalToken, setApprovalToken] = useState<string | null>(null);
    const [approvalTokenInput, setApprovalTokenInput] = useState("");

    const selectedMpsItem = useMemo(
        () => items.find((item) => item.weekStartDate === selectedWeekStartDate) ?? null,
        [items, selectedWeekStartDate],
    );

    const selectedDisplayInfo = useMemo<SemanaMpsDisplayInfo | null>(() => {
        if (selectedMpsItem) {
            return selectedMpsItem;
        }
        return selectedSemana ? getSemanaMpsDisplayFromSemana(selectedSemana) : null;
    }, [selectedMpsItem, selectedSemana]);

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

    const pendingObservacionesCount = useMemo(() => (
        observaciones.filter((observacion) => (
            observacion.estado === "ABIERTA" || observacion.estado === "ATENDIDA"
        )).length
    ), [observaciones]);

    const loadObservaciones = useCallback(async (targetWeekStartDate: string | null) => {
        if (!targetWeekStartDate) {
            setObservaciones([]);
            setObservacionesError(null);
            setIsLoadingObservaciones(false);
            return;
        }
        setIsLoadingObservaciones(true);
        setObservacionesError(null);
        try {
            const response = await ListarObservacionesMpsSemanal(targetWeekStartDate);
            setObservaciones(response);
        } catch (error) {
            setObservaciones([]);
            setObservacionesError(getAxiosErrorMessage(error, "No fue posible cargar las observaciones del MPS."));
        } finally {
            setIsLoadingObservaciones(false);
        }
    }, []);

    const loadInitialData = useCallback(async () => {
        setIsLoadingInitial(true);
        const currentWeekStartDate = getCurrentIsoWeekMonday();
        const currentIsoYear = getIsoWeekYear(currentWeekStartDate);
        try {
            const [semanas, mpsItems] = await Promise.all([
                ListarSemanasMps(currentIsoYear),
                ListarMpsSemanales(),
            ]);
            setItems(mpsItems);

            const nextSelectedSemana = findDefaultSemana(semanas, currentWeekStartDate);
            setSelectedSemana(nextSelectedSemana);
            setSelectedWeekStartDate(nextSelectedSemana?.startDate ?? currentWeekStartDate);
        } catch (error) {
            toast({
                title: "No se pudo cargar la aprobacion MPS",
                description: getAxiosErrorMessage(error, "No fue posible consultar las semanas MPS."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            setSelectedSemana(null);
            setSelectedWeekStartDate(currentWeekStartDate);
        } finally {
            setIsLoadingInitial(false);
        }
    }, [toast]);

    const refreshCurrentSelection = useCallback(async (targetWeekStartDate: string) => {
        try {
            const [semanas, mpsItems] = await Promise.all([
                ListarSemanasMps(getIsoWeekYear(targetWeekStartDate)),
                ListarMpsSemanales(),
            ]);
            setItems(mpsItems);
            const updatedSemana = semanas.find((semana) => semana.startDate === targetWeekStartDate) ?? null;
            setSelectedSemana(updatedSemana);
            setSelectedWeekStartDate(targetWeekStartDate);
        } catch (error) {
            toast({
                title: "No se pudo refrescar la semana MPS",
                description: getAxiosErrorMessage(error, "La informacion de aprobacion no pudo actualizarse."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    }, [toast]);

    useEffect(() => {
        void loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        let isCancelled = false;

        if (!selectedMpsItem) {
            setSelectedMpsDetail(null);
            setMpsDetailError(null);
            setIsLoadingMpsDetail(false);
            return () => {
                isCancelled = true;
            };
        }

        setSelectedMpsDetail(null);
        setMpsDetailError(null);
        setIsLoadingMpsDetail(true);

        ObtenerMpsSemanal(selectedMpsItem.weekStartDate)
            .then((mps) => {
                if (!isCancelled) {
                    setSelectedMpsDetail(mps);
                }
            })
            .catch((error) => {
                if (!isCancelled) {
                    setMpsDetailError(getAxiosErrorMessage(error, "La consulta del MPS semanal fallo."));
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsLoadingMpsDetail(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [
        selectedMpsItem?.estado,
        selectedMpsItem?.fechaActualizacion,
        selectedMpsItem?.fechaGeneracionOdps,
        selectedMpsItem?.mpsId,
        selectedMpsItem?.totalLotesPlanificados,
        selectedMpsItem?.totalOdpsGeneradas,
        selectedMpsItem?.weekStartDate,
    ]);

    useEffect(() => {
        let isCancelled = false;

        if (!selectedMpsItem || selectedMpsItem.totalOdpsGeneradas <= 0) {
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

        ObtenerOdpsDesdeMpsSemanal(selectedMpsItem.weekStartDate)
            .then((response) => {
                if (!isCancelled) {
                    setSelectedWeekOdps(response);
                }
            })
            .catch((error) => {
                if (!isCancelled) {
                    setOdpsError(getAxiosErrorMessage(error, "La consulta de ODPs generadas para la semana fallo."));
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
        selectedMpsItem?.fechaGeneracionOdps,
        selectedMpsItem?.mpsId,
        selectedMpsItem?.totalOdpsGeneradas,
        selectedMpsItem?.weekStartDate,
    ]);

    useEffect(() => {
        if (selectedMpsItem?.weekStartDate) {
            void loadObservaciones(selectedMpsItem.weekStartDate);
        } else {
            setObservaciones([]);
            setObservacionesError(null);
            setIsLoadingObservaciones(false);
        }
    }, [
        loadObservaciones,
        selectedMpsItem?.fechaActualizacion,
        selectedMpsItem?.mpsId,
        selectedMpsItem?.revisionNumero,
        selectedMpsItem?.weekStartDate,
    ]);

    const handleSemanaChange = (semana: SemanaMPSDTO) => {
        setSelectedSemana(semana);
        setSelectedWeekStartDate(semana.startDate);
    };

    const handleApprove = async (mps: MpsSemanalDraftDTO) => {
        setApprovingWeekStartDate(mps.weekStartDate);
        try {
            await AprobarMpsSemanal({ weekStartDate: mps.weekStartDate });
            toast({
                title: "MPS aprobado",
                description: `La semana ${getSemanaMpsLabel(mps)} quedo aprobada.`,
                status: "success",
                duration: 4000,
                isClosable: true,
            });
            await refreshCurrentSelection(mps.weekStartDate);
            await loadObservaciones(mps.weekStartDate);
        } catch (error) {
            toast({
                title: "No se pudo aprobar el MPS",
                description: getAxiosErrorMessage(error, "La aprobacion del MPS fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setApprovingWeekStartDate(null);
        }
    };

    const handleCreateObservacion = async (tipo: MpsSemanalObservacionTipo, mensaje: string) => {
        if (!selectedMpsDetail) {
            return;
        }
        try {
            await CrearObservacionMpsSemanal({
                weekStartDate: selectedMpsDetail.weekStartDate,
                tipo,
                mensaje,
            });
            toast({
                title: "Observacion registrada",
                description: "La observacion quedo asociada al MPS semanal.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            await loadObservaciones(selectedMpsDetail.weekStartDate);
        } catch (error) {
            toast({
                title: "No se pudo registrar la observacion",
                description: getAxiosErrorMessage(error, "La observacion no pudo guardarse."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            throw error;
        }
    };

    const handleCerrarObservacion = async (observacionId: number) => {
        if (!selectedMpsDetail) {
            return;
        }
        try {
            await CerrarObservacionMpsSemanal(observacionId);
            toast({
                title: "Correccion aceptada",
                description: "La observacion quedo cerrada.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            await loadObservaciones(selectedMpsDetail.weekStartDate);
        } catch (error) {
            toast({
                title: "No se pudo cerrar la observacion",
                description: getAxiosErrorMessage(error, "La observacion no pudo cerrarse."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            throw error;
        }
    };

    const handleGenerateOdps = async (item: MpsSemanalListItemDTO) => {
        setGeneratingWeekStartDate(item.weekStartDate);
        try {
            const response = await GenerarOdpDesdeMps({ weekStartDate: item.weekStartDate });
            toast({
                title: "ODPs generadas",
                description: `Se crearon ${response.totalOrdenesCreadas} ordenes desde la semana ${getSemanaMpsLabel(item)}.`,
                status: "success",
                duration: 4000,
                isClosable: true,
            });
            await refreshCurrentSelection(item.weekStartDate);
        } catch (error) {
            toast({
                title: "No se pudieron generar las ODPs",
                description: getAxiosErrorMessage(error, "La generacion de ordenes desde el MPS fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setGeneratingWeekStartDate(null);
        }
    };

    const handleDownloadPdf = async (item: MpsSemanalListItemDTO) => {
        setDownloadingPdfWeekStartDate(item.weekStartDate);
        try {
            const mps = selectedMpsDetail?.weekStartDate === item.weekStartDate
                ? selectedMpsDetail
                : await ObtenerMpsSemanal(item.weekStartDate);
            await downloadMpsSemanalPdf(mps);
        } catch (error) {
            toast({
                title: "No se pudo generar el PDF",
                description: getAxiosErrorMessage(error, "La descarga del PDF MPS fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setDownloadingPdfWeekStartDate(null);
        }
    };

    const canApproveBase = selectedMpsDetail?.estado === "BORRADOR"
        && selectedMpsDetail.totalLotesPlanificados > 0;
    const canApproveWithoutToken = canApproveBase
        && pendingObservacionesCount === 0
        && !isLoadingObservaciones
        && !observacionesError;

    useEffect(() => {
        setApprovalTokenInput("");
        if (canApproveWithoutToken) {
            setApprovalToken(generateApprovalToken());
        } else {
            setApprovalToken(null);
        }
    }, [
        canApproveWithoutToken,
        selectedMpsDetail?.mpsId,
        selectedMpsDetail?.revisionNumero,
        selectedMpsDetail?.weekStartDate,
    ]);

    const canApprove = canApproveWithoutToken
        && approvalToken !== null
        && approvalTokenInput === approvalToken;
    const canGenerateOdps = selectedMpsItem?.estado === "APROBADO"
        && selectedMpsItem.totalLotesPlanificados > 0
        && selectedMpsItem.totalOdpsGeneradas === 0;
    const areGeneratedOrdersAvailable = (selectedMpsItem?.totalOdpsGeneradas ?? 0) > 0
        && !isLoadingOdps
        && !odpsError;

    return (
        <VStack align="stretch" spacing={5}>
            <Box p={5} bg="white" borderRadius="md" boxShadow="sm">
                <VStack align="stretch" spacing={4}>
                    <Box>
                        <Heading size="md">Aprobacion MPS semanal</Heading>
                        <Text color="gray.600" mt={1}>
                            Seleccione una semana, revise el MPS completo y ejecute la aprobacion desde esta vista.
                        </Text>
                    </Box>
                    <SemanaMPSPickerModal
                        value={selectedWeekStartDate}
                        onChange={handleSemanaChange}
                        isDisabled={isLoadingInitial}
                        selectedSemana={selectedSemana}
                        selectedCodigo={selectedDisplayInfo?.semanaMpsCodigo ?? selectedSemana?.codigo}
                        selectedStartDate={selectedDisplayInfo?.weekStartDate ?? selectedSemana?.startDate ?? selectedWeekStartDate}
                        selectedEndDate={selectedDisplayInfo?.weekEndDate ?? selectedSemana?.endDate}
                        selectedMpsId={selectedMpsItem?.mpsId ?? selectedSemana?.mpsId}
                        selectedEstado={selectedMpsItem?.estado ?? selectedSemana?.estado}
                        selectedFechaGeneracionOdps={selectedMpsItem?.fechaGeneracionOdps ?? selectedSemana?.fechaGeneracionOdps}
                        buttonLabel="Selector de semana MPS"
                        buttonHelperText="Click para cambiar o consultar semana"
                        modalTitle="Seleccionar semana para aprobacion"
                    />
                </VStack>
            </Box>

            {isLoadingInitial ? (
                <Flex justify="center" align="center" py={12} gap={3}>
                    <Spinner color="teal.500" />
                    <Text color="gray.600">Cargando semana MPS...</Text>
                </Flex>
            ) : (
                <Box p={5} bg="white" borderRadius="md" boxShadow="sm">
                    {!selectedDisplayInfo ? (
                        <Text color="gray.500" fontSize="sm">Seleccione una semana MPS.</Text>
                    ) : (
                        <VStack align="stretch" spacing={4}>
                            <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                                <Box>
                                    <Heading size="sm">Semana {getSemanaMpsLabel(selectedDisplayInfo)}</Heading>
                                    <Text fontSize="sm" color="gray.600">{getSemanaMpsDateRange(selectedDisplayInfo)}</Text>
                                </Box>
                                {selectedMpsItem ? (
                                    <Badge colorScheme={getEstadoColorScheme(selectedMpsItem.estado)}>
                                        {getEstadoLabel(selectedMpsItem.estado)}
                                    </Badge>
                                ) : (
                                    <Badge colorScheme="gray">Sin MPS</Badge>
                                )}
                            </Flex>

                            <Divider />

                            {!selectedMpsItem ? (
                                <Box p={4} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md">
                                    <Text color="red.700" fontWeight="semibold">
                                        Esta semana no tiene MPS definido. Revise programacion semanal.
                                    </Text>
                                    <Text color="red.700" fontSize="sm" mt={1}>
                                        No hay una programacion persistida para revisar, aprobar o convertir en ODPs.
                                    </Text>
                                </Box>
                            ) : (
                                <>
                                    <SimpleGrid columns={[1, 2, 4]} gap={3}>
                                        <Box p={3} bg="gray.50" borderRadius="md">
                                            <Text fontSize="xs" color="gray.500">MPS</Text>
                                            <Text fontWeight="semibold">#{selectedMpsItem.mpsId}</Text>
                                        </Box>
                                        <Box p={3} bg="gray.50" borderRadius="md">
                                            <Text fontSize="xs" color="gray.500">Creado</Text>
                                            <Text fontWeight="semibold">{formatDateTimeLabel(selectedMpsItem.fechaCreacion)}</Text>
                                        </Box>
                                        <Box p={3} bg="gray.50" borderRadius="md">
                                            <Text fontSize="xs" color="gray.500">Lotes planificados</Text>
                                            <Text fontWeight="semibold">{formatNumber(selectedMpsItem.totalLotesPlanificados)}</Text>
                                        </Box>
                                        <Box p={3} bg="gray.50" borderRadius="md">
                                            <Text fontSize="xs" color="gray.500">ODPs generadas</Text>
                                            <Text fontWeight="semibold">
                                                {formatNumber(selectedMpsItem.totalOdpsGeneradas)} / {formatNumber(selectedMpsItem.totalLotesPlanificados)}
                                            </Text>
                                        </Box>
                                    </SimpleGrid>

                                    <SimpleGrid columns={[1, 2, 3]} gap={3}>
                                        <SummaryLine label="Items programados" value={selectedMpsItem.totalItems} />
                                        <SummaryLine label="Lotes planificados" value={selectedMpsItem.totalLotesPlanificados} />
                                        <SummaryLine label="ODPs generadas" value={selectedMpsItem.totalOdpsGeneradas} />
                                    </SimpleGrid>

                                    {selectedMpsItem.estado === "BORRADOR" && selectedMpsItem.totalLotesPlanificados === 0 && (
                                        <Box p={3} bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
                                            <Text fontSize="sm" color="orange.700">
                                                No se puede aprobar una semana sin lotes planificados.
                                            </Text>
                                        </Box>
                                    )}
                                    {canApproveBase && pendingObservacionesCount > 0 && (
                                        <Box p={3} bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
                                            <Text fontSize="sm" color="orange.700">
                                                Hay {pendingObservacionesCount} observaciones abiertas o atendidas. Deben cerrarse antes de aprobar.
                                            </Text>
                                        </Box>
                                    )}
                                    {canApproveBase && (isLoadingObservaciones || observacionesError) && (
                                        <Box p={3} bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
                                            <Text fontSize="sm" color="orange.700">
                                                Las observaciones deben estar cargadas correctamente antes de aprobar.
                                            </Text>
                                        </Box>
                                    )}
                                    {canApproveWithoutToken && approvalToken !== null && (
                                        <Box p={3} bg="green.50" borderWidth="1px" borderColor="green.200" borderRadius="md">
                                            <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                                                <Box>
                                                    <Text fontSize="sm" color="green.800" fontWeight="semibold">
                                                        Confirmacion de aprobacion
                                                    </Text>
                                                    <Text fontSize="sm" color="green.700">
                                                        Digite{" "}
                                                        <Text as="span" fontWeight="bold" letterSpacing="0.08em">
                                                            {approvalToken}
                                                        </Text>{" "}
                                                        para habilitar la aprobacion.
                                                    </Text>
                                                </Box>
                                                <Input
                                                    aria-label="Token de aprobacion MPS"
                                                    value={approvalTokenInput}
                                                    onChange={(event) => setApprovalTokenInput(
                                                        event.target.value.replace(/\D/g, "").slice(0, 4),
                                                    )}
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    maxLength={4}
                                                    autoComplete="off"
                                                    placeholder="0000"
                                                    bg="white"
                                                    maxW="120px"
                                                    textAlign="center"
                                                    fontWeight="bold"
                                                    letterSpacing="0.08em"
                                                />
                                            </Flex>
                                        </Box>
                                    )}

                                    <Flex justify="end" gap={3} wrap="wrap">
                                        <Button
                                            variant="outline"
                                            colorScheme="purple"
                                            onClick={() => void handleDownloadPdf(selectedMpsItem)}
                                            isLoading={downloadingPdfWeekStartDate === selectedMpsItem.weekStartDate}
                                        >
                                            PDF MPS
                                        </Button>
                                        {canApproveBase && selectedMpsDetail && (
                                            <Button
                                                colorScheme="green"
                                                onClick={() => void handleApprove(selectedMpsDetail)}
                                                isLoading={approvingWeekStartDate === selectedMpsDetail.weekStartDate}
                                                isDisabled={!canApprove}
                                            >
                                                Aprobar MPS
                                            </Button>
                                        )}
                                        {canGenerateOdps && (
                                            <Button
                                                colorScheme="blue"
                                                onClick={() => void handleGenerateOdps(selectedMpsItem)}
                                                isLoading={generatingWeekStartDate === selectedMpsItem.weekStartDate}
                                            >
                                                Generar ODPs
                                            </Button>
                                        )}
                                    </Flex>
                                </>
                            )}
                        </VStack>
                    )}
                </Box>
            )}

            {selectedMpsItem && (
                <Box p={5} bg="white" borderRadius="md" boxShadow="sm">
                    {isLoadingMpsDetail ? (
                        <Flex justify="center" align="center" py={12} gap={3}>
                            <Spinner color="teal.500" />
                            <Text color="gray.600">Cargando detalle MPS...</Text>
                        </Flex>
                    ) : mpsDetailError ? (
                        <Box p={4} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md">
                            <Text color="red.700" fontSize="sm">{mpsDetailError}</Text>
                        </Box>
                    ) : selectedMpsDetail ? (
                        <VStack align="stretch" spacing={4}>
                            {selectedMpsItem.totalOdpsGeneradas > 0 && odpsError && (
                                <Box p={3} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md">
                                    <Text color="red.700" fontSize="sm">
                                        {odpsError}
                                    </Text>
                                </Box>
                            )}
                            <MpsReadonlyReviewPanel
                                mps={selectedMpsDetail}
                                totalOrdenesGeneradas={selectedMpsItem.totalOdpsGeneradas}
                                areGeneratedOrdersAvailable={areGeneratedOrdersAvailable}
                                onItemClick={(item, context) => setSelectedMpsItemOrders({ item, context })}
                            />
                            <MpsObservacionesPanel
                                mode="aprobacion"
                                mps={selectedMpsDetail}
                                observaciones={observaciones}
                                isLoading={isLoadingObservaciones}
                                error={observacionesError}
                                onRetry={() => void loadObservaciones(selectedMpsDetail.weekStartDate)}
                                onCreateObservacion={handleCreateObservacion}
                                onCerrarObservacion={handleCerrarObservacion}
                            />
                        </VStack>
                    ) : (
                        <Box p={4} bg="gray.50" borderRadius="md">
                            <Text color="gray.500" fontSize="sm">No hay detalle MPS cargado.</Text>
                        </Box>
                    )}
                </Box>
            )}

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
