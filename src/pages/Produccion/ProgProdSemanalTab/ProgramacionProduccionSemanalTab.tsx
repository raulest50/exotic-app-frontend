import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    AddIcon,
    DeleteIcon,
    MinusIcon,
} from "@chakra-ui/icons";
import {
    Badge,
    Box,
    Button,
    Divider,
    Flex,
    FormControl,
    FormLabel,
    IconButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    NumberInput,
    NumberInputField,
    SimpleGrid,
    Text,
    Tooltip,
    VStack,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
import TerminadoPicker, {
    type TerminadoPickerResult,
} from "../../../components/Pickers/TerminadoPicker/TerminadoPicker";
import {
    GuardarBorradorProgramacionSemanal,
    ObtenerMpsSemanal,
    type MpsSemanalDraftDTO,
    type PropuestaMpsCalendarBlockDTO,
} from "../ProgProdMensualTab/PlaneacionProduccionService";
import { downloadMpsSemanalPdf } from "./pdf/MpsSemanalPdfGenerator";
import type { SemanaMPSDTO } from "./SemanaMPSPicker";
import SemanaMPSPickerModal from "./SemanaMPSPickerModal";
import MpsCategoriaBreakdown from "./MpsCategoriaBreakdown";

interface ProgramacionEntry {
    id: string;
    dayIndex: number;
    productoId: string;
    productoNombre: string;
    categoriaNombre?: string | null;
    loteSize: number;
    tiempoDiasFabricacion: number;
    prefijoLote?: string | null;
    prefijoVerificado: boolean;
    unidades: number;
}

const DAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const EPSILON = 0.000001;

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCurrentWeekMonday(): string {
    const today = new Date();
    const currentDay = today.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    return formatLocalDate(monday);
}

function addDays(dateString: string, days: number): string {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + days);
    return formatLocalDate(date);
}

function isMonday(dateString: string): boolean {
    return !!dateString && new Date(`${dateString}T00:00:00`).getDay() === 1;
}

function formatNumber(value: number): string {
    return value.toLocaleString("es-CO", {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function isNotFoundError(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 404;
}

function isIntegerLike(value: number): boolean {
    return Number.isFinite(value) && Math.abs(value - Math.round(value)) <= EPSILON;
}

function buildEntryId(productoId: string, dayIndex: number): string {
    return `${productoId}__${dayIndex}`;
}

function getMpsSemanaLabel(mps: MpsSemanalDraftDTO): string {
    return mps.semanaMpsCodigo ?? mps.weekStartDate;
}

function buildEntriesFingerprint(entries: ProgramacionEntry[]): string {
    return entries
        .map((entry) => `${entry.dayIndex}:${entry.productoId}:${entry.unidades}`)
        .sort()
        .join("|");
}

function buildEntryFromTerminado(terminado: TerminadoPickerResult, dayIndex: number): ProgramacionEntry {
    return {
        id: buildEntryId(terminado.productoId, dayIndex),
        dayIndex,
        productoId: terminado.productoId,
        productoNombre: terminado.nombre,
        categoriaNombre: terminado.categoria?.categoriaNombre,
        loteSize: terminado.categoria?.loteSize ?? 0,
        tiempoDiasFabricacion: terminado.categoria?.tiempoDiasFabricacion ?? 0,
        prefijoLote: terminado.prefijoLote,
        prefijoVerificado: false,
        unidades: terminado.categoria?.loteSize && terminado.categoria.loteSize > 0 ? terminado.categoria.loteSize : 0,
    };
}

function buildEntriesFromDraft(draft: MpsSemanalDraftDTO): ProgramacionEntry[] {
    const itemByProductoId = new Map(draft.items.map((item) => [item.productoId, item]));
    const entries: ProgramacionEntry[] = [];

    draft.calendar.rows.forEach((row) => {
        row.days.forEach((day) => {
            day.blocks.forEach((block: PropuestaMpsCalendarBlockDTO) => {
                const item = itemByProductoId.get(block.productoId);
                entries.push({
                    id: block.blockId || buildEntryId(block.productoId, day.dayIndex),
                    dayIndex: day.dayIndex,
                    productoId: block.productoId,
                    productoNombre: block.productoNombre,
                    categoriaNombre: block.categoriaNombre,
                    loteSize: block.loteSize,
                    tiempoDiasFabricacion: item?.tiempoDiasFabricacion ?? 0,
                    prefijoLote: null,
                    prefijoVerificado: true,
                    unidades: block.cantidadAsignada,
                });
            });
        });
    });

    return entries;
}

function getEntryIssues(entry: ProgramacionEntry): string[] {
    const issues: string[] = [];
    if (entry.loteSize <= 0) {
        issues.push("Sin lote size");
    }
    if (!entry.prefijoVerificado && !entry.prefijoLote?.trim()) {
        issues.push("Sin prefijo de lote");
    }
    if (!Number.isFinite(entry.unidades) || entry.unidades <= 0) {
        issues.push("Unidades requeridas");
    }
    const lotes = entry.loteSize > 0 ? entry.unidades / entry.loteSize : 0;
    if (entry.loteSize > 0 && entry.unidades > 0 && !isIntegerLike(lotes)) {
        issues.push("Unidades no divisibles por lote size");
    }
    return issues;
}

export default function ProgramacionProduccionSemanalTab() {
    const [weekStartDate, setWeekStartDate] = useState(getCurrentWeekMonday());
    const [selectedSemana, setSelectedSemana] = useState<SemanaMPSDTO | null>(null);
    const [entries, setEntries] = useState<ProgramacionEntry[]>([]);
    const [currentDraft, setCurrentDraft] = useState<MpsSemanalDraftDTO | null>(null);
    const [lastPersistedEntriesFingerprint, setLastPersistedEntriesFingerprint] = useState("");
    const [pendingSemanaChange, setPendingSemanaChange] = useState<SemanaMPSDTO | null>(null);
    const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);
    const [isLoadingDraft, setIsLoadingDraft] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const pickerDisclosure = useDisclosure();
    const weekChangeConfirmDisclosure = useDisclosure();
    const toast = useToast();

    const isReadOnly = currentDraft !== null && currentDraft.estado !== "BORRADOR";
    const entriesFingerprint = useMemo(() => buildEntriesFingerprint(entries), [entries]);
    const hasUnsavedChanges = entriesFingerprint !== lastPersistedEntriesFingerprint;

    const entriesByDay = useMemo(() => {
        const grouped = new Map<number, ProgramacionEntry[]>();
        for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
            grouped.set(dayIndex, []);
        }
        entries.forEach((entry) => {
            grouped.get(entry.dayIndex)?.push(entry);
        });
        return grouped;
    }, [entries]);

    const validationIssues = useMemo(() => {
        const issues: string[] = [];
        if (!isMonday(weekStartDate)) {
            issues.push("La semana debe iniciar un lunes.");
        }
        if (entries.length === 0) {
            issues.push("Agregue al menos un terminado.");
        }
        entries.forEach((entry) => {
            getEntryIssues(entry).forEach((issue) => {
                issues.push(`${entry.productoId}: ${issue}`);
            });
        });
        return issues;
    }, [entries, weekStartDate]);

    const totals = useMemo(() => {
        return entries.reduce(
            (acc, entry) => {
                const lotes = entry.loteSize > 0 ? entry.unidades / entry.loteSize : 0;
                acc.unidades += Number.isFinite(entry.unidades) ? entry.unidades : 0;
                acc.lotes += Number.isFinite(lotes) ? lotes : 0;
                return acc;
            },
            { unidades: 0, lotes: 0 },
        );
    }, [entries]);

    const breakdownEntries = useMemo(() => entries.map((entry) => ({
        productoId: entry.productoId,
        productoNombre: entry.productoNombre,
        categoriaNombre: entry.categoriaNombre,
        loteSize: entry.loteSize,
        unidades: entry.unidades,
        dayIndex: entry.dayIndex,
    })), [entries]);

    const loadWeekForProgramming = useCallback(async (
        targetWeekStartDate: string,
        options: { showLoadedToast?: boolean } = {},
    ): Promise<boolean> => {
        setIsLoadingDraft(true);
        try {
            const draft = await ObtenerMpsSemanal(targetWeekStartDate);
            const draftEntries = buildEntriesFromDraft(draft);
            setWeekStartDate(draft.weekStartDate);
            setCurrentDraft(draft);
            setEntries(draftEntries);
            setLastPersistedEntriesFingerprint(buildEntriesFingerprint(draftEntries));
            if (options.showLoadedToast) {
                toast({
                    title: "Semana cargada",
                    description: `MPS #${draft.mpsId} cargado en estado ${draft.estado}.`,
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            }
            return true;
        } catch (error) {
            if (isNotFoundError(error)) {
                setWeekStartDate(targetWeekStartDate);
                setCurrentDraft(null);
                setEntries([]);
                setLastPersistedEntriesFingerprint("");
                return true;
            }
            toast({
                title: "No se pudo abrir la semana",
                description: getAxiosErrorMessage(error, "No fue posible cargar la semana MPS seleccionada."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            return false;
        } finally {
            setIsLoadingDraft(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadWeekForProgramming(weekStartDate);
    }, [loadWeekForProgramming]);

    const applyWeekChange = async (semana: SemanaMPSDTO) => {
        const wasLoaded = await loadWeekForProgramming(semana.startDate, { showLoadedToast: true });
        if (wasLoaded) {
            setSelectedSemana(semana);
        }
    };

    const handleWeekChange = (semana: SemanaMPSDTO) => {
        if (semana.startDate === weekStartDate) {
            return;
        }
        if (hasUnsavedChanges) {
            setPendingSemanaChange(semana);
            weekChangeConfirmDisclosure.onOpen();
            return;
        }
        void applyWeekChange(semana);
    };

    const handleConfirmWeekChange = () => {
        if (pendingSemanaChange) {
            void applyWeekChange(pendingSemanaChange);
        }
        setPendingSemanaChange(null);
        weekChangeConfirmDisclosure.onClose();
    };

    const handleCancelWeekChange = () => {
        setPendingSemanaChange(null);
        weekChangeConfirmDisclosure.onClose();
    };

    const handleSelectTerminado = (terminado: TerminadoPickerResult) => {
        if (pickerDayIndex == null) {
            return;
        }
        setEntries((prev) => {
            const existing = prev.find((entry) => (
                entry.dayIndex === pickerDayIndex && entry.productoId === terminado.productoId
            ));
            if (existing) {
                return prev;
            }
            return [...prev, buildEntryFromTerminado(terminado, pickerDayIndex)];
        });
    };

    const handleEntryUnitsChange = (entryId: string, valueAsString: string) => {
        const parsed = Number(valueAsString);
        setEntries((prev) => prev.map((entry) => (
            entry.id === entryId
                ? { ...entry, unidades: Number.isFinite(parsed) ? parsed : 0 }
                : entry
        )));
    };

    const adjustEntryUnitsByLote = (entryId: string, direction: 1 | -1) => {
        setEntries((prev) => prev.map((entry) => {
            if (entry.id !== entryId || entry.loteSize <= 0) {
                return entry;
            }
            const nextUnits = entry.unidades + (direction * entry.loteSize);
            return {
                ...entry,
                unidades: Math.max(entry.loteSize, nextUnits),
            };
        }));
    };

    const handleRemoveEntry = (entryId: string) => {
        setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    };

    const handleSaveDraft = async () => {
        if (validationIssues.length > 0 || isReadOnly) {
            return;
        }
        setIsSaving(true);
        try {
            const saved = await GuardarBorradorProgramacionSemanal({
                weekStartDate,
                entradas: entries.map((entry) => ({
                    date: addDays(weekStartDate, entry.dayIndex),
                    productoId: entry.productoId,
                    unidades: entry.unidades,
                })),
            });
            setCurrentDraft(saved);
            setWeekStartDate(saved.weekStartDate);
            const savedEntries = buildEntriesFromDraft(saved);
            setEntries(savedEntries);
            setLastPersistedEntriesFingerprint(buildEntriesFingerprint(savedEntries));
            setSelectedSemana((current) => current?.startDate === saved.weekStartDate ? {
                ...current,
                id: saved.semanaMpsId ?? current.id,
                codigo: saved.semanaMpsCodigo ?? current.codigo,
                mpsId: saved.mpsId,
                estado: saved.estado,
                fechaGeneracionOdps: saved.fechaGeneracionOdps,
            } : current);
            toast({
                title: "Borrador guardado",
                description: `MPS #${saved.mpsId} guardado para la semana ${getMpsSemanaLabel(saved)}.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "No se pudo guardar el borrador",
                description: getAxiosErrorMessage(error, "La programacion semanal no pudo guardarse."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!currentDraft) {
            return;
        }
        setIsDownloadingPdf(true);
        try {
            await downloadMpsSemanalPdf(currentDraft);
        } catch (error) {
            toast({
                title: "No se pudo generar el PDF",
                description: getAxiosErrorMessage(error, "La descarga del PDF MPS fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const canSave = validationIssues.length === 0 && !isReadOnly && !isLoadingDraft;

    return (
        <VStack align="stretch" spacing={4}>
            <Box bg="white" borderRadius="md" boxShadow="sm" p={4}>
                <Flex gap={4} align="end" wrap="wrap">
                    <SemanaMPSPickerModal
                        value={weekStartDate}
                        onChange={handleWeekChange}
                        isDisabled={isLoadingDraft || isSaving}
                        selectedSemana={selectedSemana}
                        selectedCodigo={currentDraft?.semanaMpsCodigo ?? selectedSemana?.codigo}
                        selectedStartDate={currentDraft?.weekStartDate ?? selectedSemana?.startDate ?? weekStartDate}
                        selectedEndDate={currentDraft?.weekEndDate ?? selectedSemana?.endDate ?? addDays(weekStartDate, 5)}
                        selectedMpsId={currentDraft?.mpsId ?? selectedSemana?.mpsId}
                        selectedEstado={currentDraft?.estado ?? selectedSemana?.estado}
                        selectedFechaGeneracionOdps={currentDraft?.fechaGeneracionOdps ?? selectedSemana?.fechaGeneracionOdps}
                        buttonLabel="Semana MPS"
                        modalTitle="Seleccionar semana para programacion"
                    />
                    <Button
                        colorScheme="blue"
                        onClick={() => void handleSaveDraft()}
                        isLoading={isSaving}
                        isDisabled={!canSave}
                    >
                        Guardar borrador
                    </Button>
                    <Button
                        variant="outline"
                        colorScheme="purple"
                        onClick={() => void handleDownloadPdf()}
                        isLoading={isDownloadingPdf}
                        isDisabled={!currentDraft}
                    >
                        PDF MPS
                    </Button>
                </Flex>

                <Flex mt={3} gap={3} align="center" wrap="wrap">
                    <Badge colorScheme={currentDraft ? "blue" : "orange"}>
                        {currentDraft
                            ? `MPS #${currentDraft.mpsId} - ${getMpsSemanaLabel(currentDraft)} - ${currentDraft.estado}`
                            : "Sin MPS guardado - nueva programacion para esta semana"}
                    </Badge>
                    {isLoadingDraft && <Badge colorScheme="gray">Cargando semana</Badge>}
                    {hasUnsavedChanges && <Badge colorScheme="orange">Cambios sin guardar</Badge>}
                    {currentDraft?.fechaGeneracionOdps && <Badge colorScheme="green">ODPs generadas</Badge>}
                    <Badge colorScheme="purple">{formatNumber(totals.unidades)} unidades</Badge>
                    <Badge colorScheme={isIntegerLike(totals.lotes) ? "green" : "orange"}>
                        {formatNumber(totals.lotes)} lotes
                    </Badge>
                </Flex>

                {validationIssues.length > 0 && (
                    <Box mt={3} p={3} bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
                        <VStack align="stretch" spacing={1}>
                            {validationIssues.slice(0, 5).map((issue) => (
                                <Text key={issue} fontSize="sm" color="orange.700">{issue}</Text>
                            ))}
                            {validationIssues.length > 5 && (
                                <Text fontSize="sm" color="orange.700">
                                    {validationIssues.length - 5} validaciones adicionales.
                                </Text>
                            )}
                        </VStack>
                    </Box>
                )}
            </Box>

            <SimpleGrid columns={[1, 1, 2, 3, 6]} spacing={3}>
                {DAY_LABELS.map((label, dayIndex) => {
                    const dayEntries = entriesByDay.get(dayIndex) ?? [];
                    const dayDate = addDays(weekStartDate, dayIndex);
                    return (
                        <Box key={label} bg="white" borderWidth="1px" borderRadius="md" p={3} minH="280px">
                            <Flex align="start" justify="space-between" gap={2}>
                                <Box>
                                    <Text fontWeight="bold">{label}</Text>
                                    <Text fontSize="sm" color="gray.600">{dayDate}</Text>
                                </Box>
                                <Tooltip label="Agregar terminado">
                                    <IconButton
                                        aria-label={`Agregar terminado ${label}`}
                                        icon={<AddIcon />}
                                        size="sm"
                                        colorScheme="teal"
                                        isDisabled={isReadOnly || !isMonday(weekStartDate)}
                                        onClick={() => {
                                            setPickerDayIndex(dayIndex);
                                            pickerDisclosure.onOpen();
                                        }}
                                    />
                                </Tooltip>
                            </Flex>

                            <Divider my={3} />

                            <VStack align="stretch" spacing={3}>
                                {dayEntries.length === 0 ? (
                                    <Text fontSize="sm" color="gray.500">Sin terminados programados.</Text>
                                ) : (
                                    dayEntries.map((entry) => {
                                        const lotes = entry.loteSize > 0 ? entry.unidades / entry.loteSize : 0;
                                        const entryIssues = getEntryIssues(entry);
                                        return (
                                            <Box key={entry.id} borderWidth="1px" borderColor={entryIssues.length ? "orange.300" : "gray.200"} borderRadius="md" p={2}>
                                                <Flex justify="space-between" gap={2} align="start">
                                                    <Box minW={0}>
                                                        <Text fontWeight="semibold" fontSize="sm" noOfLines={2}>{entry.productoNombre}</Text>
                                                        <Text fontSize="xs" color="gray.600">{entry.productoId}</Text>
                                                        <Text fontSize="xs" color="gray.600">{entry.categoriaNombre ?? "Sin categoria"}</Text>
                                                    </Box>
                                                    <IconButton
                                                        aria-label="Quitar terminado"
                                                        icon={<DeleteIcon />}
                                                        size="xs"
                                                        variant="ghost"
                                                        colorScheme="red"
                                                        isDisabled={isReadOnly}
                                                        onClick={() => handleRemoveEntry(entry.id)}
                                                    />
                                                </Flex>
                                                <FormControl mt={2}>
                                                    <FormLabel fontSize="xs" mb={1}>Unidades</FormLabel>
                                                    <Flex gap={1} align="center">
                                                        <Tooltip label="Restar un lote">
                                                            <IconButton
                                                                aria-label={`Restar lote a ${entry.productoNombre}`}
                                                                icon={<MinusIcon />}
                                                                size="sm"
                                                                variant="outline"
                                                                isDisabled={isReadOnly || entry.loteSize <= 0 || entry.unidades <= entry.loteSize}
                                                                onClick={() => adjustEntryUnitsByLote(entry.id, -1)}
                                                            />
                                                        </Tooltip>
                                                        <NumberInput
                                                            size="sm"
                                                            min={0}
                                                            value={entry.unidades}
                                                            onChange={(valueAsString) => handleEntryUnitsChange(entry.id, valueAsString)}
                                                            isDisabled={isReadOnly}
                                                            flex="1"
                                                        >
                                                            <NumberInputField />
                                                        </NumberInput>
                                                        <Tooltip label="Sumar un lote">
                                                            <IconButton
                                                                aria-label={`Sumar lote a ${entry.productoNombre}`}
                                                                icon={<AddIcon />}
                                                                size="sm"
                                                                variant="outline"
                                                                colorScheme="teal"
                                                                isDisabled={isReadOnly || entry.loteSize <= 0}
                                                                onClick={() => adjustEntryUnitsByLote(entry.id, 1)}
                                                            />
                                                        </Tooltip>
                                                    </Flex>
                                                </FormControl>
                                                <Flex mt={2} gap={2} align="center" wrap="wrap">
                                                    <Badge colorScheme={entry.loteSize > 0 ? "blue" : "orange"}>
                                                        Lote {entry.loteSize || "-"}
                                                    </Badge>
                                                    <Badge colorScheme={isIntegerLike(lotes) ? "green" : "orange"}>
                                                        {formatNumber(lotes)} lotes
                                                    </Badge>
                                                </Flex>
                                                {entryIssues.length > 0 && (
                                                    <Text mt={2} fontSize="xs" color="orange.700">
                                                        {entryIssues.join(" | ")}
                                                    </Text>
                                                )}
                                            </Box>
                                        );
                                    })
                                )}
                            </VStack>
                        </Box>
                    );
                })}
            </SimpleGrid>

            <MpsCategoriaBreakdown
                entries={breakdownEntries}
                dayLabels={DAY_LABELS}
            />

            <TerminadoPicker
                isOpen={pickerDisclosure.isOpen}
                onClose={pickerDisclosure.onClose}
                onSelectTerminado={handleSelectTerminado}
            />

            <Modal isOpen={weekChangeConfirmDisclosure.isOpen} onClose={handleCancelWeekChange} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Descartar cambios sin guardar</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text color="gray.700">
                            La programacion visible tiene cambios sin guardar. Si cambia de semana, esos cambios se descartaran.
                        </Text>
                        {pendingSemanaChange && (
                            <Text mt={2} fontSize="sm" color="gray.600">
                                Nueva semana: {pendingSemanaChange.codigo}
                            </Text>
                        )}
                    </ModalBody>
                    <ModalFooter gap={3}>
                        <Button variant="ghost" onClick={handleCancelWeekChange}>
                            Cancelar
                        </Button>
                        <Button colorScheme="red" onClick={handleConfirmWeekChange}>
                            Descartar y cambiar semana
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </VStack>
    );
}
