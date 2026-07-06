import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { QuestionIcon } from "@chakra-ui/icons";
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    HStack,
    IconButton,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
    SimpleGrid,
    Spinner,
    Stat,
    StatHelpText,
    StatLabel,
    StatNumber,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Textarea,
    Th,
    Thead,
    Tooltip,
    Tr,
    VStack,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
import { FiArrowLeft, FiCalendar, FiEye, FiRefreshCw } from "react-icons/fi";

import EndPointsURL from "../../api/EndPointsURL.tsx";
import { useTabPermission } from "../../auth/usePermissions.ts";
import { useMasterDirectives } from "../../context/MasterDirectivesContext.tsx";
import {
    AREA_OPERATIVA_ADMIN_CORRECTION_ENABLED_DEFAULT,
    MASTER_DIRECTIVE_KEYS,
} from "../../context/masterDirectiveConstants.ts";
import AreaOperativaInactivityBell from "./Alertas/AreaOperativaInactivityBell.tsx";
import { useAreaOperativaInactivityAlerts } from "./Alertas/useAreaOperativaInactivityAlerts.ts";
import {
    BOARD_COLUMN_META,
    formatDateTime,
    formatMinutesDuration,
    SeguimientoBoardColumn,
    SeguimientoOrdenDetailDrawer,
    SeguimientoResumenCards,
} from "./components/SeguimientoBoardUI.tsx";
import type {
    AreaOperativaMetricasDTO,
    AreaOperativaMonitoreoDTO,
    AreaOperativaTableroDTO,
    EstadoTableroKey,
    MetricMode,
    OrdenProduccionSeguimientoDetalleDTO,
    SeguimientoOrdenAreaCardDTO,
} from "./components/seguimientoBoard.types.ts";
import MetricModeInfoModal from "./MetricModeInfoModal.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";

const endPoints = new EndPointsURL();

const CORRECTION_STATE_OPTIONS = [
    { value: 0, label: "En cola" },
    { value: 1, label: "En espera" },
    { value: 4, label: "En proceso" },
    { value: 2, label: "Completada" },
];

function isEstadoTableroKey(value: unknown): value is EstadoTableroKey {
    return value === "cola"
        || value === "espera"
        || value === "enProceso"
        || value === "completado";
}

function getEstadoCodeFromKey(estadoKey: EstadoTableroKey): number {
    switch (estadoKey) {
        case "cola":
            return 0;
        case "espera":
            return 1;
        case "enProceso":
            return 4;
        case "completado":
            return 2;
        default:
            return 0;
    }
}

function getTodayIsoDate(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60_000);
    return localDate.toISOString().slice(0, 10);
}

function resolveMetricModeLabel(mode: MetricMode): string {
    switch (mode) {
        case "historico":
            return "Histórico";
        case "rango":
            return "Rango de fechas";
        case "actual":
        default:
            return "Actual";
    }
}

function formatTimeWithSeconds(value: string | null | undefined): string {
    if (!value) {
        return "Sin reportes";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

function formatShortDate(value: string | null | undefined): string {
    if (!value) {
        return "";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatLastAlertUpdate(value: Date | null): string {
    if (!value) {
        return "Sin actualización";
    }

    return value.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export default function MonitorearAreasOperativasTab() {
    const toast = useToast();
    const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const {
        isOpen: isDetailOpen,
        onOpen: onDetailOpen,
        onClose: onDetailClose,
    } = useDisclosure();
    const {
        isOpen: isMetricInfoOpen,
        onOpen: onMetricInfoOpen,
        onClose: onMetricInfoClose,
    } = useDisclosure();
    const {
        isOpen: isCorrectionOpen,
        onOpen: onCorrectionOpen,
        onClose: onCorrectionClose,
    } = useDisclosure();
    const { getBooleanDirective } = useMasterDirectives();
    const { nivel: monitoringAccessLevel } = useTabPermission(Modulo.PRODUCCION, "MONITOREAR_AREAS_OPERATIVAS");

    const [areas, setAreas] = useState<AreaOperativaMonitoreoDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedArea, setSelectedArea] = useState<AreaOperativaMonitoreoDTO | null>(null);
    const [fechaConsulta, setFechaConsulta] = useState(getTodayIsoDate());
    const [tablero, setTablero] = useState<AreaOperativaTableroDTO | null>(null);
    const [tableroLoading, setTableroLoading] = useState(false);
    const [tableroError, setTableroError] = useState<string | null>(null);

    const [metricMode, setMetricMode] = useState<MetricMode>("actual");
    const [rangoDesde, setRangoDesde] = useState(getTodayIsoDate());
    const [rangoHasta, setRangoHasta] = useState(getTodayIsoDate());
    const [metricas, setMetricas] = useState<AreaOperativaMetricasDTO | null>(null);
    const [metricasLoading, setMetricasLoading] = useState(false);
    const [metricasError, setMetricasError] = useState<string | null>(null);

    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<OrdenProduccionSeguimientoDetalleDTO | null>(null);
    const [correctionCard, setCorrectionCard] = useState<SeguimientoOrdenAreaCardDTO | null>(null);
    const [correctionTarget, setCorrectionTarget] = useState("");
    const [correctionMotivo, setCorrectionMotivo] = useState("");
    const [correctionSaving, setCorrectionSaving] = useState(false);
    const [correctionError, setCorrectionError] = useState<string | null>(null);
    const {
        alertsByAreaId,
        checkIntervalMinutes,
        error: alertsError,
        lastUpdatedAt: alertsLastUpdatedAt,
        loading: alertsLoading,
        refreshAlerts,
    } = useAreaOperativaInactivityAlerts();
    const correctionDirectiveEnabled = getBooleanDirective(
        MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_ADMIN_CORRECTION_ENABLED,
        AREA_OPERATIVA_ADMIN_CORRECTION_ENABLED_DEFAULT,
    );
    const canCorrectStates = correctionDirectiveEnabled
        && monitoringAccessLevel >= 3
        && fechaConsulta === getTodayIsoDate();

    const fetchAreas = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get<AreaOperativaMonitoreoDTO[]>(
                endPoints.monitoreo_areas_operativas,
                { withCredentials: true },
            );
            setAreas(response.data ?? []);
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "No fue posible cargar las áreas operativas.",
            );
            setAreas([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTableroArea = useCallback(async (area: AreaOperativaMonitoreoDTO, fecha: string) => {
        setTableroLoading(true);
        setTableroError(null);

        try {
            const response = await axios.get<AreaOperativaTableroDTO>(
                endPoints.monitoreo_area_tablero.replace("{areaId}", String(area.areaId)),
                {
                    params: { fecha },
                    withCredentials: true,
                },
            );
            setTablero(response.data);
        } catch (err: any) {
            setTableroError(
                err.response?.data?.message ||
                err.message ||
                "No fue posible cargar el monitoreo del área.",
            );
            setTablero(null);
        } finally {
            setTableroLoading(false);
        }
    }, []);

    const fetchMetricasArea = useCallback(async (
        area: AreaOperativaMonitoreoDTO,
        mode: MetricMode,
        fechaActual: string,
        desde: string,
        hasta: string,
    ) => {
        setMetricasLoading(true);
        setMetricasError(null);

        try {
            const params: Record<string, string> = { modo: mode };
            if (mode === "actual") {
                params.fecha = fechaActual;
            } else if (mode === "rango") {
                params.fechaDesde = desde;
                params.fechaHasta = hasta;
            }

            const response = await axios.get<AreaOperativaMetricasDTO>(
                endPoints.monitoreo_area_metricas.replace("{areaId}", String(area.areaId)),
                {
                    params,
                    withCredentials: true,
                },
            );
            setMetricas(response.data);
        } catch (err: any) {
            setMetricasError(
                err.response?.data?.message ||
                err.message ||
                "No fue posible cargar las métricas del área.",
            );
            setMetricas(null);
        } finally {
            setMetricasLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchAreas();
    }, [fetchAreas]);

    useEffect(() => {
        if (!selectedArea) {
            return;
        }

        void fetchTableroArea(selectedArea, fechaConsulta);
    }, [fechaConsulta, fetchTableroArea, selectedArea]);

    useEffect(() => {
        if (!selectedArea) {
            return;
        }
        if (metricMode === "rango" && (!rangoDesde || !rangoHasta)) {
            return;
        }

        void fetchMetricasArea(selectedArea, metricMode, fechaConsulta, rangoDesde, rangoHasta);
    }, [
        fechaConsulta,
        fetchMetricasArea,
        metricMode,
        rangoDesde,
        rangoHasta,
        selectedArea,
    ]);

    const openMonitoringView = (area: AreaOperativaMonitoreoDTO) => {
        const today = getTodayIsoDate();
        setSelectedArea(area);
        setFechaConsulta(today);
        setMetricMode("actual");
        setRangoDesde(today);
        setRangoHasta(today);
        setTablero(null);
        setMetricas(null);
        setMetricasError(null);
    };

    const handleMetricModeChange = (mode: MetricMode) => {
        setMetricMode(mode);
        if (mode === "rango") {
            setRangoDesde(fechaConsulta);
            setRangoHasta(fechaConsulta);
        }
    };

    const handleOpenDetail = useCallback(async (orden: SeguimientoOrdenAreaCardDTO) => {
        setDetail(null);
        setDetailLoading(true);
        onDetailOpen();

        try {
            const response = await axios.get<OrdenProduccionSeguimientoDetalleDTO>(
                endPoints.seguimiento_detalle_orden.replace("{ordenId}", String(orden.ordenId)),
                { withCredentials: true },
            );
            setDetail(response.data);
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.response?.data?.message || err.message || "No fue posible cargar el detalle.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setDetailLoading(false);
        }
    }, [onDetailOpen, toast]);

    const handleOpenCorrection = useCallback((orden: SeguimientoOrdenAreaCardDTO, targetEstado?: number) => {
        const firstTarget = CORRECTION_STATE_OPTIONS.find((option) => option.value !== orden.estado);
        const initialTarget = targetEstado != null && targetEstado !== orden.estado
            ? targetEstado
            : firstTarget?.value;
        setCorrectionCard(orden);
        setCorrectionTarget(initialTarget != null ? String(initialTarget) : "");
        setCorrectionMotivo("");
        setCorrectionError(null);
        onCorrectionOpen();
    }, [onCorrectionOpen]);

    const handleCorrectionDragEnd = useCallback((event: DragEndEvent) => {
        const card = event.active.data.current?.card as SeguimientoOrdenAreaCardDTO | undefined;
        const targetEstadoKey = event.over?.data.current?.estadoKey;

        if (!canCorrectStates || !card || !isEstadoTableroKey(targetEstadoKey)) {
            return;
        }

        const targetEstado = getEstadoCodeFromKey(targetEstadoKey);
        if (card.estado === targetEstado || card.areaId === -1 || card.estadoOrden === -1 || card.estadoOrden === 2) {
            return;
        }

        handleOpenCorrection(card, targetEstado);
    }, [canCorrectStates, handleOpenCorrection]);

    const handleCloseCorrection = useCallback(() => {
        if (correctionSaving) {
            return;
        }
        onCorrectionClose();
        setCorrectionCard(null);
        setCorrectionTarget("");
        setCorrectionMotivo("");
        setCorrectionError(null);
    }, [correctionSaving, onCorrectionClose]);

    const handleSubmitCorrection = useCallback(async () => {
        if (!selectedArea || !correctionCard || !correctionTarget) {
            return;
        }

        const motivo = correctionMotivo.trim();
        if (!motivo) {
            setCorrectionError("El motivo es obligatorio.");
            return;
        }

        setCorrectionSaving(true);
        setCorrectionError(null);
        try {
            await axios.patch<SeguimientoOrdenAreaCardDTO>(
                endPoints.monitoreo_area_correccion_estado
                    .replace("{areaId}", String(selectedArea.areaId))
                    .replace("{seguimientoId}", String(correctionCard.id)),
                {
                    expectedEstado: correctionCard.estado,
                    targetEstado: Number(correctionTarget),
                    motivo,
                },
                { withCredentials: true },
            );

            toast({
                title: "Estado corregido",
                status: "success",
                duration: 4000,
                isClosable: true,
            });

            onCorrectionClose();
            setCorrectionCard(null);
            setCorrectionTarget("");
            setCorrectionMotivo("");
            void fetchTableroArea(selectedArea, fechaConsulta);
            void fetchMetricasArea(selectedArea, metricMode, fechaConsulta, rangoDesde, rangoHasta);
            void refreshAlerts();
        } catch (err: any) {
            setCorrectionError(
                err.response?.data?.message ||
                err.message ||
                "No fue posible aplicar la correccion.",
            );
        } finally {
            setCorrectionSaving(false);
        }
    }, [
        correctionCard,
        correctionMotivo,
        correctionTarget,
        fechaConsulta,
        fetchMetricasArea,
        fetchTableroArea,
        metricMode,
        onCorrectionClose,
        rangoDesde,
        rangoHasta,
        refreshAlerts,
        selectedArea,
        toast,
    ]);

    const selectedAreaAlert = selectedArea ? alertsByAreaId.get(selectedArea.areaId) : undefined;

    const metricCards = useMemo(() => {
        if (!tablero) {
            return [];
        }

        const formatMetricValue = (value: number | null, sampleCount: number | null | undefined) => {
            if (sampleCount === 0) {
                return "Sin muestras";
            }
            return formatMinutesDuration(value === null ? null : Math.round(value));
        };

        const metricsSubtitle = metricasLoading
            ? "Consultando métricas"
            : metricas
                ? `${resolveMetricModeLabel(metricas.modo)}`
                : `Modo ${resolveMetricModeLabel(metricMode)}`;
        const ultimoReporteRef = tablero.ultimaOrdenReporteResponsableLote
            || (tablero.ultimaOrdenReporteResponsableId
                ? `OP-${tablero.ultimaOrdenReporteResponsableId}`
                : null);
        const ultimoReporteHelpText = tablero.ultimaFechaReporteResponsable
            ? [
                tablero.fechaConsulta !== getTodayIsoDate() ? formatShortDate(tablero.ultimaFechaReporteResponsable) : null,
                ultimoReporteRef ? `Orden ${ultimoReporteRef}` : "Reporte manual del líder",
            ].filter(Boolean).join(" · ")
            : "Sin eventos manuales del líder";

        return [
            {
                label: "Promedio espera",
                value: metricasLoading
                    ? "Cargando..."
                    : formatMetricValue(metricas?.promedioMinutosEspera ?? null, metricas?.muestrasEspera),
                helpText: metricasLoading
                    ? metricsSubtitle
                    : `${metricas?.muestrasEspera ?? 0} muestras · ${metricsSubtitle}`,
            },
            {
                label: "Promedio proceso",
                value: metricasLoading
                    ? "Cargando..."
                    : formatMetricValue(metricas?.promedioMinutosEnProceso ?? null, metricas?.muestrasEnProceso),
                helpText: metricasLoading
                    ? metricsSubtitle
                    : `${metricas?.muestrasEnProceso ?? 0} muestras · ${metricsSubtitle}`,
            },
            {
                label: "Orden más atrasada",
                value: tablero.ordenMasAtrasada
                    ? `${tablero.ordenMasAtrasada.loteAsignado || `OP-${tablero.ordenMasAtrasada.ordenId}`} · ${formatMinutesDuration(tablero.ordenMasAtrasada.minutosEnEstadoActual)}`
                    : "Sin dato",
                helpText: "Basada en la foto actual del tablero",
            },
            {
                label: "Último reporte líder",
                value: formatTimeWithSeconds(tablero.ultimaFechaReporteResponsable),
                helpText: ultimoReporteHelpText,
            },
        ];
    }, [metricMode, metricas, metricasLoading, tablero]);

    if (!selectedArea) {
        return (
            <VStack align="stretch" spacing={4}>
                <Box p={6} bg="white" borderRadius="md" boxShadow="sm">
                    <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
                        <VStack align="start" spacing={1}>
                            <Heading size="md">Monitorear Áreas Operativas</Heading>
                            <Text color="gray.600">
                                Seleccione un área para entrar en modo vista de producción.
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                Alertas cada {checkIntervalMinutes} min · {formatLastAlertUpdate(alertsLastUpdatedAt)}
                            </Text>
                        </VStack>
                        <Tooltip label="Refrescar alertas de inactividad" hasArrow>
                            <IconButton
                                aria-label="Refrescar alertas de inactividad"
                                icon={<FiRefreshCw />}
                                variant="outline"
                                isLoading={alertsLoading}
                                isDisabled={alertsLoading}
                                onClick={() => void refreshAlerts()}
                            />
                        </Tooltip>
                    </HStack>
                </Box>

                {alertsError ? (
                    <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        {alertsError}
                    </Alert>
                ) : null}

                {loading ? (
                    <Flex justify="center" align="center" py={10}>
                        <Spinner size="xl" />
                    </Flex>
                ) : null}

                {!loading && error ? (
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        {error}
                    </Alert>
                ) : null}

                {!loading && !error && areas.length === 0 ? (
                    <Box p={6} bg="white" borderRadius="md" boxShadow="sm">
                        <Text color="gray.600">
                            No hay áreas operativas monitoreables por ahora.
                        </Text>
                    </Box>
                ) : null}

                {!loading && !error && areas.length > 0 ? (
                    <Box bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
                        <TableContainer>
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Área</Th>
                                        <Th>Descripción</Th>
                                        <Th>Líder</Th>
                                        <Th textAlign="right">Acción</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {areas.map((area) => (
                                        <Tr key={area.areaId}>
                                            <Td>
                                                <HStack spacing={2}>
                                                    <AreaOperativaInactivityBell alert={alertsByAreaId.get(area.areaId)} />
                                                    <Text>{area.nombre}</Text>
                                                </HStack>
                                            </Td>
                                            <Td>
                                                <Text noOfLines={2} maxW="320px">
                                                    {area.descripcion || "Sin descripción"}
                                                </Text>
                                            </Td>
                                            <Td>
                                                {area.responsableArea.nombreCompleto || area.responsableArea.username}
                                            </Td>
                                            <Td textAlign="right">
                                                <Button
                                                    size="sm"
                                                    leftIcon={<FiEye />}
                                                    colorScheme="teal"
                                                    variant="outline"
                                                    onClick={() => openMonitoringView(area)}
                                                >
                                                    Ver monitoreo
                                                </Button>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </Box>
                ) : null}
            </VStack>
        );
    }

    return (
        <VStack align="stretch" spacing={4}>
            <Box p={6} bg="white" borderRadius="md" boxShadow="sm">
                <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between" flexWrap="wrap" gap={3}>
                        <Box>
                            <HStack spacing={2}>
                                <Heading size="md">{selectedArea.nombre}</Heading>
                                <AreaOperativaInactivityBell alert={selectedAreaAlert} />
                            </HStack>
                            <Text color="gray.600">
                                Líder: {selectedArea.responsableArea.nombreCompleto || selectedArea.responsableArea.username}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                Alertas cada {checkIntervalMinutes} min · {formatLastAlertUpdate(alertsLastUpdatedAt)}
                            </Text>
                        </Box>
                        <HStack spacing={3}>
                            <Tooltip label="Refrescar alertas de inactividad" hasArrow>
                                <IconButton
                                    aria-label="Refrescar alertas de inactividad"
                                    icon={<FiRefreshCw />}
                                    variant="outline"
                                    isLoading={alertsLoading}
                                    isDisabled={alertsLoading}
                                    onClick={() => void refreshAlerts()}
                                />
                            </Tooltip>
                            <Button
                                variant="outline"
                                leftIcon={<FiArrowLeft />}
                                onClick={() => {
                                    setSelectedArea(null);
                                    setTablero(null);
                                    setTableroError(null);
                                    setMetricas(null);
                                    setMetricasError(null);
                                }}
                            >
                                Volver
                            </Button>
                            <Button
                                variant="outline"
                                leftIcon={<FiRefreshCw />}
                                onClick={() => {
                                    void fetchTableroArea(selectedArea, fechaConsulta);
                                    void fetchMetricasArea(selectedArea, metricMode, fechaConsulta, rangoDesde, rangoHasta);
                                }}
                                isLoading={tableroLoading || metricasLoading}
                            >
                                Refrescar
                            </Button>
                        </HStack>
                    </HStack>

                    {alertsError ? (
                        <Alert status="warning" borderRadius="md">
                            <AlertIcon />
                            {alertsError}
                        </Alert>
                    ) : null}

                    <HStack flexWrap="wrap" gap={3}>
                        <HStack spacing={2}>
                            <FiCalendar />
                            <Text fontWeight="medium">Fecha de monitoreo</Text>
                        </HStack>
                        <Input
                            type="date"
                            value={fechaConsulta}
                            max={getTodayIsoDate()}
                            onChange={(event) => setFechaConsulta(event.target.value)}
                            w={{ base: "full", md: "220px" }}
                            bg="white"
                        />
                        <Text fontSize="sm" color="gray.600">
                            Foto reconstruida al corte de {tablero ? formatDateTime(tablero.instanteFoto) : fechaConsulta}
                        </Text>
                    </HStack>

                    <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between" flexWrap="wrap" gap={3}>
                            <HStack spacing={2}>
                                <Text fontWeight="medium">Modo de promedio</Text>
                                <Tooltip label="Cómo se calcula cada modo" hasArrow>
                                    <IconButton
                                        aria-label="Ayuda sobre modos de promedio"
                                        icon={<QuestionIcon />}
                                        size="sm"
                                        variant="ghost"
                                        onClick={onMetricInfoOpen}
                                    />
                                </Tooltip>
                            </HStack>
                            <Select
                                value={metricMode}
                                onChange={(event) => handleMetricModeChange(event.target.value as MetricMode)}
                                w={{ base: "full", md: "260px" }}
                                bg="white"
                            >
                                <option value="actual">Actual</option>
                                <option value="historico">Histórico</option>
                                <option value="rango">Rango de fechas</option>
                            </Select>
                        </HStack>

                        {metricMode === "rango" ? (
                            <HStack flexWrap="wrap" gap={3}>
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                                        Desde
                                    </Text>
                                    <Input
                                        type="date"
                                        value={rangoDesde}
                                        max={getTodayIsoDate()}
                                        onChange={(event) => setRangoDesde(event.target.value)}
                                        w={{ base: "full", md: "220px" }}
                                        bg="white"
                                    />
                                </Box>
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                                        Hasta
                                    </Text>
                                    <Input
                                        type="date"
                                        value={rangoHasta}
                                        max={getTodayIsoDate()}
                                        onChange={(event) => setRangoHasta(event.target.value)}
                                        w={{ base: "full", md: "220px" }}
                                        bg="white"
                                    />
                                </Box>
                            </HStack>
                        ) : null}

                        {metricasError ? (
                            <Alert status="warning" borderRadius="md">
                                <AlertIcon />
                                {metricasError}
                            </Alert>
                        ) : null}
                    </VStack>
                </VStack>
            </Box>

            {tableroLoading ? (
                <Flex justify="center" align="center" py={10}>
                    <Spinner size="xl" color="teal.500" />
                </Flex>
            ) : null}

            {!tableroLoading && tableroError ? (
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {tableroError}
                </Alert>
            ) : null}

            {!tableroLoading && tablero ? (
                <>
                    <SeguimientoResumenCards
                        total={tablero.resumen.total}
                        cola={tablero.resumen.cola}
                        espera={tablero.resumen.espera}
                        enProceso={tablero.resumen.enProceso}
                        completado={tablero.resumen.completado}
                    />

                    <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                        {metricCards.map((metric) => (
                            <Box key={metric.label} borderWidth="1px" borderRadius="lg" bg="white" p={4}>
                                <Stat>
                                    <StatLabel>{metric.label}</StatLabel>
                                    <StatNumber fontSize="lg">{metric.value}</StatNumber>
                                    <StatHelpText mb={0}>{metric.helpText}</StatHelpText>
                                </Stat>
                            </Box>
                        ))}
                    </SimpleGrid>

                    {(() => {
                        const boardColumns = (
                            <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                                {(Object.keys(BOARD_COLUMN_META) as EstadoTableroKey[]).map((estadoKey) => (
                                    <SeguimientoBoardColumn
                                        key={estadoKey}
                                        estadoKey={estadoKey}
                                        items={tablero[estadoKey]}
                                        mode="monitor"
                                        onOpenDetail={handleOpenDetail}
                                        canCorrectState={canCorrectStates}
                                        onCorrectState={handleOpenCorrection}
                                        dndEnabled={canCorrectStates}
                                    />
                                ))}
                            </SimpleGrid>
                        );

                        if (!canCorrectStates) {
                            return boardColumns;
                        }

                        return (
                            <DndContext
                                sensors={dndSensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleCorrectionDragEnd}
                            >
                                {boardColumns}
                            </DndContext>
                        );
                    })()}
                </>
            ) : null}

            <SeguimientoOrdenDetailDrawer
                isOpen={isDetailOpen}
                onClose={onDetailClose}
                detail={detail}
                loading={detailLoading}
            />
            <Modal isOpen={isCorrectionOpen} onClose={handleCloseCorrection} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Corregir estado</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack align="stretch" spacing={4}>
                            {correctionCard ? (
                                <Box>
                                    <Text fontWeight="bold">
                                        {correctionCard.loteAsignado || `OP-${correctionCard.ordenId}`}
                                    </Text>
                                    <Text color="app.textMuted" fontSize="sm">
                                        {correctionCard.productoNombre}
                                    </Text>
                                    <Text color="app.textMuted" fontSize="sm">
                                        Estado actual: {correctionCard.estadoDescripcion}
                                    </Text>
                                </Box>
                            ) : null}

                            {correctionError ? (
                                <Alert status="error" borderRadius="md">
                                    <AlertIcon />
                                    {correctionError}
                                </Alert>
                            ) : null}

                            <FormControl>
                                <FormLabel>Nuevo estado</FormLabel>
                                <Select
                                    value={correctionTarget}
                                    onChange={(event) => setCorrectionTarget(event.target.value)}
                                    isDisabled={correctionSaving}
                                >
                                    {CORRECTION_STATE_OPTIONS
                                        .filter((option) => option.value !== correctionCard?.estado)
                                        .map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                </Select>
                            </FormControl>

                            <FormControl>
                                <FormLabel>Motivo</FormLabel>
                                <Textarea
                                    value={correctionMotivo}
                                    onChange={(event) => setCorrectionMotivo(event.target.value)}
                                    maxLength={500}
                                    rows={4}
                                    isDisabled={correctionSaving}
                                />
                                <Text fontSize="xs" color="app.textMuted" mt={1}>
                                    {correctionMotivo.length}/500
                                </Text>
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <HStack spacing={3}>
                            <Button variant="ghost" onClick={handleCloseCorrection} isDisabled={correctionSaving}>
                                Cancelar
                            </Button>
                            <Button
                                colorScheme="purple"
                                onClick={handleSubmitCorrection}
                                isLoading={correctionSaving}
                                isDisabled={!correctionTarget || !correctionMotivo.trim()}
                            >
                                Aplicar
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <MetricModeInfoModal
                isOpen={isMetricInfoOpen}
                onClose={onMetricInfoClose}
            />
        </VStack>
    );
}
