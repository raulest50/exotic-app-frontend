import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Badge,
    Box,
    Button,
    Divider,
    Flex,
    Heading,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SimpleGrid,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Text,
    Td,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
} from "@chakra-ui/react";
import {
    AprobarMpsSemanal,
    GenerarOdpDesdeMps,
    ListarMpsSemanales,
    ListarSemanasMps,
    ObtenerMpsSemanal,
    ObtenerOdpsDesdeMpsSemanal,
    type MpsSemanalDraftDTO,
    type MpsSemanalOrdenProduccionListItemDTO,
    type MpsSemanalListItemDTO,
    type SemanaMPSDTO,
} from "../ProgProdMensualTab/PlaneacionProduccionService.tsx";
import { downloadMpsSemanalPdf } from "./pdf/MpsSemanalPdfGenerator";
import SemanaMPSPickerModal from "./SemanaMPSPickerModal";
import {
    formatSemanaMpsDisplayDate,
    getCurrentIsoWeekMonday,
    getIsoWeekYear,
    sortSemanasByStartDate,
} from "./semanaMps.utils";

type MpsEstado = MpsSemanalListItemDTO["estado"];

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

function SummaryLine({ label, value }: { label: string; value: number }) {
    const formattedValue = Number.isInteger(value)
        ? value.toLocaleString("es-CO")
        : value.toLocaleString("es-CO", { maximumFractionDigits: 2 });

    return (
        <Text fontSize="sm" color="gray.600">
            {label}: <Text as="span" fontWeight="semibold" color="gray.700">{formattedValue}</Text>
        </Text>
    );
}

function renderEstadoOrdenLabel(estadoOrden: number): string {
    switch (estadoOrden) {
        case -1:
            return "Cancelada";
        case 0:
            return "Abierta";
        case 2:
            return "Terminada";
        case 3:
            return "Fabricacion completada";
        default:
            return `Estado ${estadoOrden}`;
    }
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

function getMpsDetailRowLabel(row: MpsSemanalDraftDTO["calendar"]["rows"][number]): string {
    return row.poolCapacidadNombre ?? row.categoriaNombre ?? row.rowKey ?? "Sin categoria";
}

function getTotalOrdenesEsperadasFromMps(mps: MpsSemanalDraftDTO | null): number {
    if (!mps?.calendar?.rows) {
        return 0;
    }

    return mps.calendar.rows
        .flatMap((row) => row.days ?? [])
        .flatMap((day) => day.blocks ?? [])
        .reduce((total, block) => total + Math.max(block.lotesAsignados ?? 0, 0), 0);
}

function MpsDetailModal({
    isOpen,
    isLoading,
    mps,
    onClose,
    onApprove,
    isApproving,
}: {
    isOpen: boolean;
    isLoading: boolean;
    mps: MpsSemanalDraftDTO | null;
    onClose: () => void;
    onApprove: (mps: MpsSemanalDraftDTO) => void;
    isApproving: boolean;
}) {
    const rows = mps?.calendar?.rows ?? [];
    const days = mps?.calendar?.days ?? [];
    const totalOrdenesEsperadas = getTotalOrdenesEsperadasFromMps(mps);
    const canApprove = mps?.estado === "BORRADOR" && totalOrdenesEsperadas > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    Detalle MPS semanal
                    {mps ? ` - Semana ${getSemanaMpsLabel(mps)}` : ""}
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    {isLoading ? (
                        <Flex justify="center" align="center" py={10} gap={3}>
                            <Spinner color="teal.500" />
                            <Text color="gray.600">Cargando detalle MPS...</Text>
                        </Flex>
                    ) : !mps ? (
                        <Box p={4} bg="gray.50" borderRadius="md">
                            <Text color="gray.500" fontSize="sm">No hay detalle MPS cargado.</Text>
                        </Box>
                    ) : (
                        <VStack align="stretch" spacing={4}>
                            <SimpleGrid columns={[1, 2, 4]} gap={3}>
                                <Box p={3} bg="gray.50" borderRadius="md">
                                    <Text fontSize="xs" color="gray.500">MPS</Text>
                                    <Text fontWeight="semibold">#{mps.mpsId}</Text>
                                </Box>
                                <Box p={3} bg="gray.50" borderRadius="md">
                                    <Text fontSize="xs" color="gray.500">Estado</Text>
                                    <Badge colorScheme={getEstadoColorScheme(mps.estado)}>{getEstadoLabel(mps.estado)}</Badge>
                                </Box>
                                <Box p={3} bg="gray.50" borderRadius="md">
                                    <Text fontSize="xs" color="gray.500">Semana</Text>
                                    <Text fontWeight="semibold">{getSemanaMpsLabel(mps)}</Text>
                                    <Text fontSize="xs" color="gray.500">{getSemanaMpsDateRange(mps)}</Text>
                                </Box>
                                <Box p={3} bg="gray.50" borderRadius="md">
                                    <Text fontSize="xs" color="gray.500">ODPs</Text>
                                    <Text fontWeight="semibold">{mps.fechaGeneracionOdps ? "Generadas" : "No generadas"}</Text>
                                </Box>
                            </SimpleGrid>

                            <SimpleGrid columns={[1, 2, 4]} gap={3}>
                                <SummaryLine label="Terminados evaluados" value={mps.summary.totalTerminadosEvaluados} />
                                <SummaryLine label="Lotes propuestos" value={mps.summary.totalLotesPropuestos} />
                                <SummaryLine label="Unidades propuestas" value={mps.summary.totalUnidadesPropuestas} />
                                <SummaryLine label="ODPs esperadas" value={totalOrdenesEsperadas} />
                            </SimpleGrid>

                            {rows.length === 0 ? (
                                <Box p={4} bg="gray.50" borderRadius="md">
                                    <Text color="gray.500" fontSize="sm">Este MPS no tiene filas de calendario.</Text>
                                </Box>
                            ) : (
                                <TableContainer>
                                    <Table size="sm" variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Categoria / Pool</Th>
                                                {days.map((day) => (
                                                    <Th key={day.dayIndex}>
                                                        <VStack align="start" spacing={0}>
                                                            <Text>{["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"][day.dayIndex] ?? `Dia ${day.dayIndex + 1}`}</Text>
                                                            <Text fontSize="xs" color="gray.500">{day.date}</Text>
                                                        </VStack>
                                                    </Th>
                                                ))}
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {rows.map((row) => (
                                                <Tr key={row.rowKey}>
                                                    <Td fontWeight="semibold">{getMpsDetailRowLabel(row)}</Td>
                                                    {days.map((day) => {
                                                        const cell = row.days.find((candidate) => candidate.dayIndex === day.dayIndex);
                                                        const blocks = cell?.blocks ?? [];
                                                        return (
                                                            <Td key={`${row.rowKey}-${day.dayIndex}`} verticalAlign="top">
                                                                {blocks.length === 0 ? (
                                                                    <Text fontSize="xs" color="gray.400">-</Text>
                                                                ) : (
                                                                    <VStack align="stretch" spacing={2}>
                                                                        {blocks.map((block) => (
                                                                            <Box key={block.blockId} p={2} bg="gray.50" borderRadius="md">
                                                                                <Text fontSize="sm" fontWeight="medium">{block.productoNombre}</Text>
                                                                                <Text fontSize="xs" color="gray.600">{block.productoId}</Text>
                                                                                <Text fontSize="xs" color="gray.600">
                                                                                    {block.cantidadAsignada.toLocaleString("es-CO")} und | {block.lotesAsignados.toLocaleString("es-CO")} lotes
                                                                                </Text>
                                                                            </Box>
                                                                        ))}
                                                                    </VStack>
                                                                )}
                                                            </Td>
                                                        );
                                                    })}
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </TableContainer>
                            )}
                        </VStack>
                    )}
                </ModalBody>
                <ModalFooter gap={3} justifyContent="space-between" flexWrap="wrap">
                    {mps?.estado === "BORRADOR" && totalOrdenesEsperadas === 0 ? (
                        <Text fontSize="sm" color="orange.600">
                            No se puede aprobar una semana sin ODPs esperadas.
                        </Text>
                    ) : (
                        <Box />
                    )}
                    <Flex gap={3}>
                        <Button variant="ghost" onClick={onClose}>
                            Cerrar
                        </Button>
                        {canApprove && (
                            <Button
                                colorScheme="green"
                                onClick={() => {
                                    if (mps) {
                                        onApprove(mps);
                                    }
                                }}
                                isLoading={isApproving}
                            >
                                Aprobar MPS
                            </Button>
                        )}
                    </Flex>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

export default function AprobacionMPSWeekTab() {
    const toast = useToast();
    const [items, setItems] = useState<MpsSemanalListItemDTO[]>([]);
    const [selectedSemana, setSelectedSemana] = useState<SemanaMPSDTO | null>(null);
    const [selectedWeekStartDate, setSelectedWeekStartDate] = useState(getCurrentIsoWeekMonday());
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [detailWeekStartDate, setDetailWeekStartDate] = useState<string | null>(null);
    const [selectedMpsDetail, setSelectedMpsDetail] = useState<MpsSemanalDraftDTO | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [approvingWeekStartDate, setApprovingWeekStartDate] = useState<string | null>(null);
    const [generatingWeekStartDate, setGeneratingWeekStartDate] = useState<string | null>(null);
    const [viewingWeekStartDate, setViewingWeekStartDate] = useState<string | null>(null);
    const [downloadingPdfWeekStartDate, setDownloadingPdfWeekStartDate] = useState<string | null>(null);
    const [selectedWeekForOdps, setSelectedWeekForOdps] = useState<MpsSemanalListItemDTO | null>(null);
    const [selectedWeekOdps, setSelectedWeekOdps] = useState<MpsSemanalOrdenProduccionListItemDTO[]>([]);
    const [isOdpsModalOpen, setIsOdpsModalOpen] = useState(false);
    const [isLoadingOdps, setIsLoadingOdps] = useState(false);

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

    const handleSemanaChange = (semana: SemanaMPSDTO) => {
        setSelectedSemana(semana);
        setSelectedWeekStartDate(semana.startDate);
        setSelectedMpsDetail(null);
        setIsDetailModalOpen(false);
        setSelectedWeekForOdps(null);
        setSelectedWeekOdps([]);
        setIsOdpsModalOpen(false);
        void refreshCurrentSelection(semana.startDate);
    };

    const handleViewDetail = async (item: MpsSemanalListItemDTO) => {
        setDetailWeekStartDate(item.weekStartDate);
        setSelectedMpsDetail(null);
        setIsDetailModalOpen(true);
        try {
            const mps = await ObtenerMpsSemanal(item.weekStartDate);
            setSelectedMpsDetail(mps);
        } catch (error) {
            toast({
                title: "No se pudo cargar el detalle MPS",
                description: getAxiosErrorMessage(error, "La consulta del MPS semanal fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            setIsDetailModalOpen(false);
        } finally {
            setDetailWeekStartDate(null);
        }
    };

    const handleCloseDetail = () => {
        setIsDetailModalOpen(false);
        setSelectedMpsDetail(null);
    };

    const handleApproveFromDetail = async (mps: MpsSemanalDraftDTO) => {
        setApprovingWeekStartDate(mps.weekStartDate);
        try {
            await AprobarMpsSemanal({ weekStartDate: mps.weekStartDate });
            toast({
                title: "Semana aprobada",
                description: `La semana ${getSemanaMpsLabel(mps)} fue aprobada correctamente.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            handleCloseDetail();
            await refreshCurrentSelection(mps.weekStartDate);
        } catch (error) {
            toast({
                title: "No se pudo aprobar la semana",
                description: getAxiosErrorMessage(error, "La aprobacion del MPS semanal fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setApprovingWeekStartDate(null);
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

    const handleViewOdps = async (item: MpsSemanalListItemDTO) => {
        setViewingWeekStartDate(item.weekStartDate);
        setIsLoadingOdps(true);
        setSelectedWeekForOdps(item);
        setIsOdpsModalOpen(true);
        try {
            const response = await ObtenerOdpsDesdeMpsSemanal(item.weekStartDate);
            setSelectedWeekOdps(response);
        } catch (error) {
            toast({
                title: "No se pudieron consultar las ODPs",
                description: getAxiosErrorMessage(error, "La consulta de ODPs generadas para la semana fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            setIsOdpsModalOpen(false);
            setSelectedWeekForOdps(null);
            setSelectedWeekOdps([]);
        } finally {
            setViewingWeekStartDate(null);
            setIsLoadingOdps(false);
        }
    };

    const handleDownloadPdf = async (item: MpsSemanalListItemDTO) => {
        setDownloadingPdfWeekStartDate(item.weekStartDate);
        try {
            const mps = await ObtenerMpsSemanal(item.weekStartDate);
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

    const handleCloseOdpsModal = () => {
        setIsOdpsModalOpen(false);
        setSelectedWeekForOdps(null);
        setSelectedWeekOdps([]);
    };

    const canGenerateOdps = selectedMpsItem?.estado === "APROBADO"
        && !selectedMpsItem.odpsGeneradasCompletas
        && selectedMpsItem.totalOrdenesEsperadas > 0;
    const canViewOdps = (selectedMpsItem?.totalOrdenesGeneradas ?? 0) > 0;

    return (
        <VStack align="stretch" spacing={5}>
            <Box p={5} bg="white" borderRadius="md" boxShadow="sm">
                <VStack align="stretch" spacing={4}>
                    <Box>
                        <Heading size="md">Aprobacion MPS semanal</Heading>
                        <Text color="gray.600" mt={1}>
                            Seleccione una semana, revise el detalle del MPS y apruebe solo desde la revision formal.
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
                        buttonLabel="Semana MPS"
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
                                            <Text fontSize="xs" color="gray.500">ODPs esperadas</Text>
                                            <Text fontWeight="semibold">{selectedMpsItem.totalOrdenesEsperadas.toLocaleString("es-CO")}</Text>
                                        </Box>
                                        <Box p={3} bg="gray.50" borderRadius="md">
                                            <Text fontSize="xs" color="gray.500">ODPs generadas</Text>
                                            <Text fontWeight="semibold">
                                                {selectedMpsItem.totalOrdenesGeneradas.toLocaleString("es-CO")} / {selectedMpsItem.totalOrdenesEsperadas.toLocaleString("es-CO")}
                                            </Text>
                                        </Box>
                                    </SimpleGrid>

                                    <SimpleGrid columns={[1, 2, 3]} gap={3}>
                                        <SummaryLine label="Terminados evaluados" value={selectedMpsItem.summary.totalTerminadosEvaluados} />
                                        <SummaryLine label="Lotes propuestos" value={selectedMpsItem.summary.totalLotesPropuestos} />
                                        <SummaryLine label="Unidades propuestas" value={selectedMpsItem.summary.totalUnidadesPropuestas} />
                                    </SimpleGrid>

                                    {selectedMpsItem.estado === "BORRADOR" && (
                                        <Box p={3} bg="yellow.50" borderWidth="1px" borderColor="yellow.200" borderRadius="md">
                                            <Text fontSize="sm" color="yellow.800">
                                                Para aprobar esta semana primero abra Revisar MPS. La aprobacion solo esta disponible dentro del detalle.
                                            </Text>
                                        </Box>
                                    )}

                                    <Flex justify="end" gap={3} wrap="wrap">
                                        <Button
                                            variant="outline"
                                            onClick={() => void handleViewDetail(selectedMpsItem)}
                                            isLoading={detailWeekStartDate === selectedMpsItem.weekStartDate}
                                        >
                                            Revisar MPS
                                        </Button>
                                        <Button
                                            variant="outline"
                                            colorScheme="purple"
                                            onClick={() => void handleDownloadPdf(selectedMpsItem)}
                                            isLoading={downloadingPdfWeekStartDate === selectedMpsItem.weekStartDate}
                                        >
                                            PDF MPS
                                        </Button>
                                        {canViewOdps && (
                                            <Button
                                                variant="outline"
                                                colorScheme="teal"
                                                onClick={() => void handleViewOdps(selectedMpsItem)}
                                                isLoading={viewingWeekStartDate === selectedMpsItem.weekStartDate}
                                            >
                                                Ver ODPs
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

            <MpsDetailModal
                isOpen={isDetailModalOpen}
                isLoading={detailWeekStartDate !== null}
                mps={selectedMpsDetail}
                onClose={handleCloseDetail}
                onApprove={handleApproveFromDetail}
                isApproving={approvingWeekStartDate === selectedMpsDetail?.weekStartDate}
            />

            <Modal isOpen={isOdpsModalOpen} onClose={handleCloseOdpsModal} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        ODPs generadas
                        {selectedWeekForOdps ? ` - Semana ${getSemanaMpsLabel(selectedWeekForOdps)}` : ""}
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        {selectedWeekForOdps && (
                            <VStack align="stretch" spacing={4}>
                                <Box>
                                    <Text fontSize="sm" color="gray.600">
                                        ODPs generadas: {selectedWeekForOdps.totalOrdenesGeneradas} / {selectedWeekForOdps.totalOrdenesEsperadas}
                                    </Text>
                                    {selectedWeekForOdps.generadoPorUsername && (
                                        <Text fontSize="sm" color="gray.600">
                                            Generadas por: {selectedWeekForOdps.generadoPorUsername}
                                        </Text>
                                    )}
                                    {selectedWeekForOdps.fechaGeneracionOdps && (
                                        <Text fontSize="sm" color="gray.600">
                                            Fecha de generacion: {formatDateTimeLabel(selectedWeekForOdps.fechaGeneracionOdps)}
                                        </Text>
                                    )}
                                </Box>

                                {isLoadingOdps ? (
                                    <Flex justify="center" align="center" py={8} gap={3}>
                                        <Spinner color="teal.500" />
                                        <Text color="gray.600">Cargando ODPs generadas...</Text>
                                    </Flex>
                                ) : selectedWeekOdps.length === 0 ? (
                                    <Box p={4} bg="gray.50" borderRadius="md">
                                        <Text color="gray.500" fontSize="sm">
                                            Esta semana no tiene ODPs generadas registradas.
                                        </Text>
                                    </Box>
                                ) : (
                                    <TableContainer>
                                        <Table size="sm" variant="simple">
                                            <Thead>
                                                <Tr>
                                                    <Th>Orden</Th>
                                                    <Th>Producto</Th>
                                                    <Th>Lote</Th>
                                                    <Th isNumeric>Cantidad</Th>
                                                    <Th>Lanzamiento</Th>
                                                    <Th>Fin planificado</Th>
                                                    <Th>Estado</Th>
                                                    <Th>Block ID</Th>
                                                    <Th>Lote ordinal</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {selectedWeekOdps.map((orden) => (
                                                    <Tr key={orden.ordenId}>
                                                        <Td>{orden.ordenId}</Td>
                                                        <Td>
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontSize="sm" fontWeight="medium">{orden.productoNombre ?? "-"}</Text>
                                                                <Text fontSize="xs" color="gray.500">{orden.productoId ?? "-"}</Text>
                                                            </VStack>
                                                        </Td>
                                                        <Td>{orden.loteAsignado ?? "-"}</Td>
                                                        <Td isNumeric>{orden.cantidadProducir}</Td>
                                                        <Td>{formatDateTimeLabel(orden.fechaLanzamiento)}</Td>
                                                        <Td>{formatDateTimeLabel(orden.fechaFinalPlanificada)}</Td>
                                                        <Td>{renderEstadoOrdenLabel(orden.estadoOrden)}</Td>
                                                        <Td>{orden.mpsBlockId ?? "-"}</Td>
                                                        <Td>{orden.mpsLoteOrdinal ?? "-"}</Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </VStack>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </VStack>
    );
}
