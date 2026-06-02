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
    Input,
    NumberInput,
    NumberInputField,
    SimpleGrid,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Text,
    Tooltip,
    VStack,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
import TerminadoPicker, {
    type TerminadoPickerResult,
} from "../../../components/Pickers/TerminadoPicker/TerminadoPicker";
import AprobacionMPSWeekTab from "../AprobacionMPSWeekTab";
import {
    AprobarMpsSemanal,
    GenerarOdpDesdeMps,
    GuardarBorradorProgramacionSemanal,
    ObtenerMpsSemanal,
    type MpsSemanalDraftDTO,
    type PropuestaMpsCalendarBlockDTO,
} from "../PlaneacionProduccionTab/PlaneacionProduccionService";
import { downloadMpsSemanalPdf } from "./pdf/MpsSemanalPdfGenerator";

interface OpenMpsWeekRequest {
    weekStartDate: string;
    token: number;
}

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

function isIntegerLike(value: number): boolean {
    return Number.isFinite(value) && Math.abs(value - Math.round(value)) <= EPSILON;
}

function buildEntryId(productoId: string, dayIndex: number): string {
    return `${productoId}__${dayIndex}`;
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

function ProgramacionEditor({ externalOpenRequest }: { externalOpenRequest: OpenMpsWeekRequest | null }) {
    const [weekStartDate, setWeekStartDate] = useState(getCurrentWeekMonday());
    const [entries, setEntries] = useState<ProgramacionEntry[]>([]);
    const [currentDraft, setCurrentDraft] = useState<MpsSemanalDraftDTO | null>(null);
    const [lastExternalTokenHandled, setLastExternalTokenHandled] = useState<number | null>(null);
    const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);
    const [isLoadingDraft, setIsLoadingDraft] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const pickerDisclosure = useDisclosure();
    const toast = useToast();

    const weekEndDate = useMemo(() => addDays(weekStartDate, 5), [weekStartDate]);
    const isReadOnly = currentDraft !== null && currentDraft.estado !== "BORRADOR";

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

    const openPersistedWeek = useCallback(async (targetWeekStartDate: string) => {
        setIsLoadingDraft(true);
        try {
            const draft = await ObtenerMpsSemanal(targetWeekStartDate);
            setWeekStartDate(draft.weekStartDate);
            setCurrentDraft(draft);
            setEntries(buildEntriesFromDraft(draft));
            toast({
                title: "Semana cargada",
                description: `MPS #${draft.mpsId} cargado en estado ${draft.estado}.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "No se pudo abrir la semana",
                description: getAxiosErrorMessage(error, "No fue posible cargar la semana MPS seleccionada."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoadingDraft(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!externalOpenRequest || externalOpenRequest.token === lastExternalTokenHandled) {
            return;
        }
        setLastExternalTokenHandled(externalOpenRequest.token);
        void openPersistedWeek(externalOpenRequest.weekStartDate);
    }, [externalOpenRequest, lastExternalTokenHandled, openPersistedWeek]);

    const handleWeekChange = (value: string) => {
        setWeekStartDate(value);
        setCurrentDraft(null);
        setEntries([]);
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
            setEntries(buildEntriesFromDraft(saved));
            toast({
                title: "Borrador guardado",
                description: `MPS #${saved.mpsId} guardado para la semana ${saved.weekStartDate}.`,
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

    const handleApprove = async () => {
        setIsApproving(true);
        try {
            const approved = await AprobarMpsSemanal({ weekStartDate });
            setCurrentDraft(approved);
            setEntries(buildEntriesFromDraft(approved));
            toast({
                title: "Semana aprobada",
                description: `La semana ${weekStartDate} fue aprobada correctamente.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "No se pudo aprobar la semana",
                description: getAxiosErrorMessage(error, "La aprobacion del MPS semanal fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsApproving(false);
        }
    };

    const handleGenerateOdps = async () => {
        setIsGenerating(true);
        try {
            const response = await GenerarOdpDesdeMps({ weekStartDate });
            const reloaded = await ObtenerMpsSemanal(weekStartDate);
            setCurrentDraft(reloaded);
            setEntries(buildEntriesFromDraft(reloaded));
            toast({
                title: "ODPs generadas",
                description: `Se crearon ${response.totalOrdenesCreadas} ordenes desde la semana ${weekStartDate}.`,
                status: "success",
                duration: 4000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "No se pudieron generar las ODPs",
                description: getAxiosErrorMessage(error, "La generacion de ordenes desde el MPS fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsGenerating(false);
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

    const canSave = validationIssues.length === 0 && !isReadOnly;
    const canApprove = currentDraft?.estado === "BORRADOR" && validationIssues.length === 0;
    const canGenerate = currentDraft?.estado === "APROBADO" && !currentDraft.fechaGeneracionOdps && validationIssues.length === 0;

    return (
        <VStack align="stretch" spacing={4}>
            <Box bg="white" borderRadius="md" boxShadow="sm" p={4}>
                <Flex gap={4} align="end" wrap="wrap">
                    <FormControl maxW="220px">
                        <FormLabel>Semana inicio (lunes)</FormLabel>
                        <Input
                            type="date"
                            value={weekStartDate}
                            onChange={(event) => handleWeekChange(event.target.value)}
                            isDisabled={isReadOnly}
                        />
                    </FormControl>
                    <FormControl maxW="220px">
                        <FormLabel>Semana fin (sabado)</FormLabel>
                        <Input value={weekEndDate} isReadOnly bg="gray.50" />
                    </FormControl>
                    <Button
                        variant="outline"
                        onClick={() => void openPersistedWeek(weekStartDate)}
                        isLoading={isLoadingDraft}
                    >
                        Abrir semana
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setCurrentDraft(null);
                            setEntries([]);
                        }}
                    >
                        Nueva programacion
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={() => void handleSaveDraft()}
                        isLoading={isSaving}
                        isDisabled={!canSave}
                    >
                        Guardar borrador
                    </Button>
                    <Button
                        colorScheme="green"
                        onClick={() => void handleApprove()}
                        isLoading={isApproving}
                        isDisabled={!canApprove}
                    >
                        Aprobar
                    </Button>
                    <Button
                        colorScheme="teal"
                        onClick={() => void handleGenerateOdps()}
                        isLoading={isGenerating}
                        isDisabled={!canGenerate}
                    >
                        Generar ODPs
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
                    <Badge colorScheme={currentDraft ? "blue" : "gray"}>
                        {currentDraft ? `MPS #${currentDraft.mpsId} - ${currentDraft.estado}` : "Sin borrador guardado"}
                    </Badge>
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

            <TerminadoPicker
                isOpen={pickerDisclosure.isOpen}
                onClose={pickerDisclosure.onClose}
                onSelectTerminado={handleSelectTerminado}
            />
        </VStack>
    );
}

export default function ProgramacionProduccionSemanalTab() {
    const [tabIndex, setTabIndex] = useState(0);
    const [openRequest, setOpenRequest] = useState<OpenMpsWeekRequest | null>(null);

    return (
        <Tabs index={tabIndex} onChange={setTabIndex}>
            <TabList>
                <Tab>Programar semana</Tab>
                <Tab>Bandeja MPS</Tab>
            </TabList>
            <TabPanels>
                <TabPanel px={0}>
                    <ProgramacionEditor externalOpenRequest={openRequest} />
                </TabPanel>
                <TabPanel px={0}>
                    <AprobacionMPSWeekTab
                        onOpenMpsWeek={(weekStartDate) => {
                            setOpenRequest((previous) => ({
                                weekStartDate,
                                token: (previous?.token ?? 0) + 1,
                            }));
                            setTabIndex(0);
                        }}
                    />
                </TabPanel>
            </TabPanels>
        </Tabs>
    );
}
