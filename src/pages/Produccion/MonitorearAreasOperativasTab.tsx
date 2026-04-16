import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    Input,
    SimpleGrid,
    Spinner,
    Stat,
    StatLabel,
    StatNumber,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
import { FiArrowLeft, FiCalendar, FiEye, FiRefreshCw } from "react-icons/fi";

import EndPointsURL from "../../api/EndPointsURL.tsx";
import {
    BOARD_COLUMN_META,
    formatDateTime,
    formatMinutesDuration,
    SeguimientoBoardColumn,
    SeguimientoOrdenDetailDrawer,
    SeguimientoResumenCards,
} from "./components/SeguimientoBoardUI.tsx";
import type {
    AreaOperativaMonitoreoDTO,
    AreaOperativaTableroDTO,
    EstadoTableroKey,
    OrdenProduccionSeguimientoDetalleDTO,
    SeguimientoOrdenAreaCardDTO,
} from "./components/seguimientoBoard.types.ts";

const endPoints = new EndPointsURL();

function getTodayIsoDate(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60_000);
    return localDate.toISOString().slice(0, 10);
}

export default function MonitorearAreasOperativasTab() {
    const toast = useToast();
    const {
        isOpen: isDetailOpen,
        onOpen: onDetailOpen,
        onClose: onDetailClose,
    } = useDisclosure();

    const [areas, setAreas] = useState<AreaOperativaMonitoreoDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedArea, setSelectedArea] = useState<AreaOperativaMonitoreoDTO | null>(null);
    const [fechaConsulta, setFechaConsulta] = useState(getTodayIsoDate());
    const [tablero, setTablero] = useState<AreaOperativaTableroDTO | null>(null);
    const [tableroLoading, setTableroLoading] = useState(false);
    const [tableroError, setTableroError] = useState<string | null>(null);

    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<OrdenProduccionSeguimientoDetalleDTO | null>(null);

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

    useEffect(() => {
        void fetchAreas();
    }, [fetchAreas]);

    useEffect(() => {
        if (!selectedArea) {
            return;
        }

        void fetchTableroArea(selectedArea, fechaConsulta);
    }, [fechaConsulta, fetchTableroArea, selectedArea]);

    const openMonitoringView = (area: AreaOperativaMonitoreoDTO) => {
        setSelectedArea(area);
        setFechaConsulta(getTodayIsoDate());
        setTablero(null);
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

    const metricCards = useMemo(() => {
        if (!tablero) {
            return [];
        }

        return [
            {
                label: "Promedio espera",
                value: formatMinutesDuration(
                    tablero.promedioMinutosEspera === null ? null : Math.round(tablero.promedioMinutosEspera),
                ),
            },
            {
                label: "Promedio proceso",
                value: formatMinutesDuration(
                    tablero.promedioMinutosEnProceso === null ? null : Math.round(tablero.promedioMinutosEnProceso),
                ),
            },
            {
                label: "Orden más atrasada",
                value: tablero.ordenMasAtrasada
                    ? `${tablero.ordenMasAtrasada.loteAsignado || `OP-${tablero.ordenMasAtrasada.ordenId}`} · ${formatMinutesDuration(tablero.ordenMasAtrasada.minutosEnEstadoActual)}`
                    : "Sin dato",
            },
        ];
    }, [tablero]);

    if (!selectedArea) {
        return (
            <VStack align="stretch" spacing={4}>
                <Box p={6} bg="white" borderRadius="md" boxShadow="sm">
                    <VStack align="start" spacing={1}>
                        <Heading size="md">Monitorear Áreas Operativas</Heading>
                        <Text color="gray.600">
                            Seleccione un área para entrar en modo vista de producción.
                        </Text>
                    </VStack>
                </Box>

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
                                            <Td>{area.nombre}</Td>
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
                            <Heading size="md">{selectedArea.nombre}</Heading>
                            <Text color="gray.600">
                                Líder: {selectedArea.responsableArea.nombreCompleto || selectedArea.responsableArea.username}
                            </Text>
                        </Box>
                        <HStack spacing={3}>
                            <Button
                                variant="outline"
                                leftIcon={<FiArrowLeft />}
                                onClick={() => {
                                    setSelectedArea(null);
                                    setTablero(null);
                                    setTableroError(null);
                                }}
                            >
                                Volver
                            </Button>
                            <Button
                                variant="outline"
                                leftIcon={<FiRefreshCw />}
                                onClick={() => void fetchTableroArea(selectedArea, fechaConsulta)}
                                isLoading={tableroLoading}
                            >
                                Refrescar
                            </Button>
                        </HStack>
                    </HStack>

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

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        {metricCards.map((metric) => (
                            <Box key={metric.label} borderWidth="1px" borderRadius="lg" bg="white" p={4}>
                                <Stat>
                                    <StatLabel>{metric.label}</StatLabel>
                                    <StatNumber fontSize="lg">{metric.value}</StatNumber>
                                </Stat>
                            </Box>
                        ))}
                    </SimpleGrid>

                    <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                        {(Object.keys(BOARD_COLUMN_META) as EstadoTableroKey[]).map((estadoKey) => (
                            <SeguimientoBoardColumn
                                key={estadoKey}
                                estadoKey={estadoKey}
                                items={tablero[estadoKey]}
                                mode="monitor"
                                onOpenDetail={handleOpenDetail}
                            />
                        ))}
                    </SimpleGrid>
                </>
            ) : null}

            <SeguimientoOrdenDetailDrawer
                isOpen={isDetailOpen}
                onClose={onDetailClose}
                detail={detail}
                loading={detailLoading}
            />
        </VStack>
    );
}
