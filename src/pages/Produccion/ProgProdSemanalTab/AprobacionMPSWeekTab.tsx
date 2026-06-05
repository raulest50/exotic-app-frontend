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
    type PropuestaMpsCalendarBlockDTO,
    type SemanaMPSDTO,
} from "../ProgProdMensualTab/PlaneacionProduccionService.tsx";
import { downloadMpsSemanalPdf } from "./pdf/MpsSemanalPdfGenerator";
import SemanaMPSPickerModal from "./SemanaMPSPickerModal";
import MpsReadonlyReviewPanel, { type MpsReadonlyBlockContext } from "./MpsReadonlyReviewPanel";
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

type SelectedMpsBlockOrders = {
    block: PropuestaMpsCalendarBlockDTO;
    context: MpsReadonlyBlockContext;
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

function getTotalOrdenesEsperadasFromMps(mps: MpsSemanalDraftDTO | null): number {
    if (!mps?.calendar?.rows) {
        return 0;
    }

    return mps.calendar.rows
        .flatMap((row) => row.days ?? [])
        .flatMap((day) => day.blocks ?? [])
        .reduce((total, block) => total + Math.max(block.lotesAsignados ?? 0, 0), 0);
}

function SummaryLine({ label, value }: { label: string; value: number }) {
    return (
        <Text fontSize="sm" color="gray.600">
            {label}: <Text as="span" fontWeight="semibold" color="gray.700">{formatNumber(value)}</Text>
        </Text>
    );
}

function MpsBlockOrdersModal({
    selectedBlock,
    ordenes,
    isLoading,
    error,
    onClose,
}: {
    selectedBlock: SelectedMpsBlockOrders | null;
    ordenes: MpsSemanalOrdenProduccionListItemDTO[];
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}) {
    const isOpen = selectedBlock !== null;
    const block = selectedBlock?.block ?? null;
    const context = selectedBlock?.context ?? null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>OPs generadas del bloque MPS</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    {block && context && (
                        <VStack align="stretch" spacing={4}>
                            <Box>
                                <Heading size="sm">{block.productoNombre}</Heading>
                                <Text fontSize="sm" color="gray.600">
                                    {block.productoId} - {context.dayLabel} {formatSemanaMpsDisplayDate(context.date)}
                                </Text>
                                <Flex mt={2} gap={2} wrap="wrap">
                                    <Badge colorScheme="teal">{formatNumber(block.lotesAsignados)} lotes</Badge>
                                    <Badge colorScheme="purple">{formatNumber(block.cantidadAsignada)} und</Badge>
                                    <Badge colorScheme="gray">Block ID: {block.blockId}</Badge>
                                </Flex>
                            </Box>

                            {isLoading ? (
                                <Flex justify="center" align="center" py={8} gap={3}>
                                    <Spinner color="teal.500" />
                                    <Text color="gray.600">Cargando OPs del bloque...</Text>
                                </Flex>
                            ) : error ? (
                                <Box p={4} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md">
                                    <Text color="red.700" fontSize="sm">{error}</Text>
                                </Box>
                            ) : ordenes.length === 0 ? (
                                <Box p={4} bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
                                    <Text color="orange.700" fontSize="sm">
                                        No se encontraron OPs asociadas a este bloque MPS.
                                    </Text>
                                </Box>
                            ) : (
                                <TableContainer>
                                    <Table size="sm" variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Orden</Th>
                                                <Th>Lote</Th>
                                                <Th isNumeric>Cantidad</Th>
                                                <Th>Lanzamiento</Th>
                                                <Th>Fin planificado</Th>
                                                <Th>Estado</Th>
                                                <Th>Lote ordinal</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {ordenes.map((orden) => (
                                                <Tr key={orden.ordenId}>
                                                    <Td>{orden.ordenId}</Td>
                                                    <Td>{orden.loteAsignado ?? "-"}</Td>
                                                    <Td isNumeric>{formatNumber(orden.cantidadProducir)}</Td>
                                                    <Td>{formatDateTimeLabel(orden.fechaLanzamiento)}</Td>
                                                    <Td>{formatDateTimeLabel(orden.fechaFinalPlanificada)}</Td>
                                                    <Td>{renderEstadoOrdenLabel(orden.estadoOrden)}</Td>
                                                    <Td>{orden.mpsLoteOrdinal ?? "-"}</Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </TableContainer>
                            )}

                            <Text fontSize="sm" color="gray.600">
                                {ordenes.length} OPs asociadas a este bloque.
                            </Text>
                        </VStack>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>
                        Cerrar
                    </Button>
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
    const [selectedMpsDetail, setSelectedMpsDetail] = useState<MpsSemanalDraftDTO | null>(null);
    const [isLoadingMpsDetail, setIsLoadingMpsDetail] = useState(false);
    const [mpsDetailError, setMpsDetailError] = useState<string | null>(null);
    const [approvingWeekStartDate, setApprovingWeekStartDate] = useState<string | null>(null);
    const [generatingWeekStartDate, setGeneratingWeekStartDate] = useState<string | null>(null);
    const [downloadingPdfWeekStartDate, setDownloadingPdfWeekStartDate] = useState<string | null>(null);
    const [selectedWeekOdps, setSelectedWeekOdps] = useState<MpsSemanalOrdenProduccionListItemDTO[]>([]);
    const [isLoadingOdps, setIsLoadingOdps] = useState(false);
    const [odpsError, setOdpsError] = useState<string | null>(null);
    const [selectedMpsBlockOrders, setSelectedMpsBlockOrders] = useState<SelectedMpsBlockOrders | null>(null);

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

    const blockOrderCountById = useMemo(() => {
        const counts = new Map<string, number>();
        selectedWeekOdps.forEach((orden) => {
            if (orden.mpsBlockId) {
                counts.set(orden.mpsBlockId, (counts.get(orden.mpsBlockId) ?? 0) + 1);
            }
        });
        return counts;
    }, [selectedWeekOdps]);

    const selectedBlockOrders = useMemo(() => {
        if (!selectedMpsBlockOrders) {
            return [];
        }

        return selectedWeekOdps
            .filter((orden) => orden.mpsBlockId === selectedMpsBlockOrders.block.blockId)
            .sort((a, b) => {
                const aOrdinal = a.mpsLoteOrdinal ?? Number.MAX_SAFE_INTEGER;
                const bOrdinal = b.mpsLoteOrdinal ?? Number.MAX_SAFE_INTEGER;
                return aOrdinal - bOrdinal || a.ordenId - b.ordenId;
            });
    }, [selectedMpsBlockOrders, selectedWeekOdps]);

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
        selectedMpsItem?.weekStartDate,
    ]);

    useEffect(() => {
        let isCancelled = false;

        if (!selectedMpsItem || selectedMpsItem.totalOrdenesGeneradas <= 0) {
            setSelectedWeekOdps([]);
            setOdpsError(null);
            setIsLoadingOdps(false);
            setSelectedMpsBlockOrders(null);
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
        selectedMpsItem?.totalOrdenesGeneradas,
        selectedMpsItem?.weekStartDate,
    ]);

    const handleSemanaChange = (semana: SemanaMPSDTO) => {
        setSelectedSemana(semana);
        setSelectedWeekStartDate(semana.startDate);
        setSelectedMpsDetail(null);
        setSelectedWeekOdps([]);
        setMpsDetailError(null);
        setOdpsError(null);
        setSelectedMpsBlockOrders(null);
        void refreshCurrentSelection(semana.startDate);
    };

    const handleApprove = async (mps: MpsSemanalDraftDTO) => {
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

    const totalOrdenesEsperadasFromDetail = getTotalOrdenesEsperadasFromMps(selectedMpsDetail);
    const canApprove = selectedMpsDetail?.estado === "BORRADOR" && totalOrdenesEsperadasFromDetail > 0;
    const canGenerateOdps = selectedMpsItem?.estado === "APROBADO"
        && !selectedMpsItem.odpsGeneradasCompletas
        && selectedMpsItem.totalOrdenesEsperadas > 0;
    const areGeneratedOrdersAvailable = (selectedMpsItem?.totalOrdenesGeneradas ?? 0) > 0
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
                                            <Text fontWeight="semibold">{formatNumber(selectedMpsItem.totalOrdenesEsperadas)}</Text>
                                        </Box>
                                        <Box p={3} bg="gray.50" borderRadius="md">
                                            <Text fontSize="xs" color="gray.500">ODPs generadas</Text>
                                            <Text fontWeight="semibold">
                                                {formatNumber(selectedMpsItem.totalOrdenesGeneradas)} / {formatNumber(selectedMpsItem.totalOrdenesEsperadas)}
                                            </Text>
                                        </Box>
                                    </SimpleGrid>

                                    <SimpleGrid columns={[1, 2, 3]} gap={3}>
                                        <SummaryLine label="Terminados evaluados" value={selectedMpsItem.summary.totalTerminadosEvaluados} />
                                        <SummaryLine label="Lotes propuestos" value={selectedMpsItem.summary.totalLotesPropuestos} />
                                        <SummaryLine label="Unidades propuestas" value={selectedMpsItem.summary.totalUnidadesPropuestas} />
                                    </SimpleGrid>

                                    {selectedMpsItem.estado === "BORRADOR" && selectedMpsItem.totalOrdenesEsperadas === 0 && (
                                        <Box p={3} bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
                                            <Text fontSize="sm" color="orange.700">
                                                No se puede aprobar una semana sin ODPs esperadas.
                                            </Text>
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
                                        {canApprove && selectedMpsDetail && (
                                            <Button
                                                colorScheme="green"
                                                onClick={() => void handleApprove(selectedMpsDetail)}
                                                isLoading={approvingWeekStartDate === selectedMpsDetail.weekStartDate}
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
                            {selectedMpsItem.totalOrdenesGeneradas > 0 && odpsError && (
                                <Box p={3} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md">
                                    <Text color="red.700" fontSize="sm">
                                        {odpsError}
                                    </Text>
                                </Box>
                            )}
                            <MpsReadonlyReviewPanel
                                mps={selectedMpsDetail}
                                totalOrdenesGeneradas={selectedMpsItem.totalOrdenesGeneradas}
                                areGeneratedOrdersAvailable={areGeneratedOrdersAvailable}
                                getBlockOrderCount={(blockId) => blockOrderCountById.get(blockId) ?? 0}
                                onBlockClick={(block, context) => setSelectedMpsBlockOrders({ block, context })}
                            />
                        </VStack>
                    ) : (
                        <Box p={4} bg="gray.50" borderRadius="md">
                            <Text color="gray.500" fontSize="sm">No hay detalle MPS cargado.</Text>
                        </Box>
                    )}
                </Box>
            )}

            <MpsBlockOrdersModal
                selectedBlock={selectedMpsBlockOrders}
                ordenes={selectedBlockOrders}
                isLoading={isLoadingOdps}
                error={odpsError}
                onClose={() => setSelectedMpsBlockOrders(null)}
            />
        </VStack>
    );
}
