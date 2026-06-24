import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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
import TerminadoPicker4MPS, {
    type TerminadoPickerResult,
} from "./TerminadoPicker4MPS/TerminadoPicker4MPS";
import {
    AtenderObservacionMpsSemanal,
    EditarMpsSemanalAprobadoItem,
    GuardarBorradorProgramacionSemanal,
    ListarObservacionesMpsSemanal,
    ObtenerMpsSemanal,
    type EstadoMpsSemanalItem,
    type MpsSemanalDraftDTO,
    type MpsSemanalObservacionDTO,
} from "./MpsSemanalService";
import { downloadMpsSemanalPdf } from "./pdf/MpsSemanalPdfGenerator";
import type { SemanaMPSDTO } from "./SemanaMPSPicker";
import SemanaMPSPickerModal from "./SemanaMPSPickerModal";
import MpsObservacionesPanel from "./MpsObservacionesPanel";
import { useMasterDirectives } from "../../../context/MasterDirectivesContext";
import {
    MASTER_DIRECTIVE_KEYS,
    MPS_SEMANAL_DIAS_BLOQUEO_EDICION_DEFAULT,
} from "../../../context/masterDirectiveConstants";

interface ProgramacionEntry {
    id: string;
    mpsItemId?: number;
    dayIndex: number;
    productoId: string;
    productoNombre: string;
    categoriaNombre?: string | null;
    loteSize: number;
    tiempoDiasFabricacion: number;
    prefijoLote?: string | null;
    prefijoVerificado: boolean;
    numeroLotes: number;
    observacion?: string | null;
    estadoItem?: EstadoMpsSemanalItem | null;
    editable?: boolean;
    blockedReason?: string | null;
    ordenesIniciadas?: number;
    ordenesCancelables?: number;
    lotesActivos?: number;
    lotesCancelados?: number;
}

const DAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const EPSILON = 0.000001;
const MPS_SEMANAL_DIAS_BLOQUEO_EDICION_MIN = 0;
const MPS_SEMANAL_DIAS_BLOQUEO_EDICION_MAX = 7;
const PENDING_CANCEL_REASON = "Cancelacion pendiente de guardar.";

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getBogotaTodayDateString(): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
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

function getMpsEditableFromDate(lockedDaysAhead: number): string {
    return addDays(getBogotaTodayDateString(), lockedDaysAhead);
}

function isMpsDateEditable(dateString: string, editableFromDate: string): boolean {
    return dateString >= editableFromDate;
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

function buildPersistedEntryId(itemId: number): string {
    return `mps-item__${itemId}`;
}

function getDayDroppableId(dayIndex: number): string {
    return `mps-week-day__${dayIndex}`;
}

function parseDayDropTarget(id: string | number): number | null {
    const value = String(id);
    if (!value.startsWith("mps-week-day__")) {
        return null;
    }
    const parsed = Number(value.replace("mps-week-day__", ""));
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 5 ? parsed : null;
}

function getMpsSemanaLabel(mps: MpsSemanalDraftDTO): string {
    return mps.semanaMpsCodigo ?? mps.weekStartDate;
}

function buildEntriesFingerprint(entries: ProgramacionEntry[]): string {
    return entries
        .map((entry) => `${entry.mpsItemId ?? ""}:${entry.dayIndex}:${entry.productoId}:${entry.numeroLotes}:${entry.estadoItem ?? ""}:${entry.observacion ?? ""}`)
        .sort()
        .join("|");
}

function buildLockedEntriesFingerprint(
    entries: ProgramacionEntry[],
    weekStartDate: string,
    editableFromDate: string,
): string {
    return entries
        .filter((entry) => !isMpsDateEditable(addDays(weekStartDate, entry.dayIndex), editableFromDate))
        .map((entry) => `${entry.mpsItemId ?? ""}:${entry.dayIndex}:${entry.productoId}:${entry.loteSize}:${entry.numeroLotes}:${entry.estadoItem ?? ""}:${entry.observacion ?? ""}`)
        .sort()
        .join("|");
}

function isApprovedEditEstado(estado: MpsSemanalDraftDTO["estado"] | null | undefined): boolean {
    return estado === "APROBADO" || estado === "CERRADO";
}

function isEntryCanceled(entry: ProgramacionEntry): boolean {
    return entry.estadoItem === "CANCELADO";
}

function isPendingCancellation(entry: ProgramacionEntry): boolean {
    return isEntryCanceled(entry) && entry.blockedReason === PENDING_CANCEL_REASON;
}

function normalizeObservation(value?: string | null): string {
    return value?.trim() ?? "";
}

function hasPersistedEntryChanged(entry: ProgramacionEntry, persisted?: ProgramacionEntry): boolean {
    if (!persisted) {
        return true;
    }
    return entry.dayIndex !== persisted.dayIndex
        || Math.round(entry.numeroLotes) !== Math.round(persisted.numeroLotes)
        || normalizeObservation(entry.observacion) !== normalizeObservation(persisted.observacion)
        || (entry.estadoItem ?? "ACTIVO") !== (persisted.estadoItem ?? "ACTIVO");
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
        numeroLotes: 1,
        observacion: "",
    };
}

function buildEntriesFromDraft(draft: MpsSemanalDraftDTO): ProgramacionEntry[] {
    const entries: ProgramacionEntry[] = [];

    draft.dias.forEach((dia) => {
        dia.items.forEach((item) => {
            entries.push({
                id: buildPersistedEntryId(item.id),
                mpsItemId: item.id,
                dayIndex: dia.dayIndex,
                productoId: item.terminadoId,
                productoNombre: item.terminadoNombre,
                categoriaNombre: item.categoriaNombre,
                loteSize: item.loteSize,
                tiempoDiasFabricacion: item.tiempoDiasFabricacion,
                prefijoLote: null,
                prefijoVerificado: true,
                numeroLotes: item.numeroLotes,
                observacion: item.observacion ?? "",
                estadoItem: item.estadoItem ?? "ACTIVO",
                editable: item.editable,
                blockedReason: item.blockedReason,
                ordenesIniciadas: item.ordenesIniciadas,
                ordenesCancelables: item.ordenesCancelables,
                lotesActivos: item.lotesActivos,
                lotesCancelados: item.lotesCancelados,
            });
        });
    });

    return entries;
}

function getEntryIssues(entry: ProgramacionEntry): string[] {
    const issues: string[] = [];
    if (isEntryCanceled(entry)) {
        return issues;
    }
    if (entry.loteSize <= 0) {
        issues.push("Sin lote size");
    }
    if (!entry.prefijoVerificado && !entry.prefijoLote?.trim()) {
        issues.push("Sin prefijo de lote");
    }
    if (!Number.isFinite(entry.numeroLotes) || entry.numeroLotes <= 0) {
        issues.push("Lotes requeridos");
    }
    if (!isIntegerLike(entry.numeroLotes)) {
        issues.push("Numero de lotes no entero");
    }
    return issues;
}

function DroppableDayColumn({
    dayIndex,
    isDayEditable,
    isDropDisabled,
    children,
}: {
    dayIndex: number;
    isDayEditable: boolean;
    isDropDisabled: boolean;
    children: ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: getDayDroppableId(dayIndex),
        disabled: isDropDisabled,
    });

    return (
        <Box
            ref={setNodeRef}
            bg={!isDropDisabled && isOver ? "teal.50" : (isDayEditable ? "white" : "gray.50")}
            borderWidth="1px"
            borderColor={!isDropDisabled && isOver ? "teal.300" : (isDayEditable ? "gray.200" : "gray.300")}
            borderRadius="md"
            p={3}
            minH="280px"
        >
            {children}
        </Box>
    );
}

function DraggableEntryCard({
    entry,
    isDragDisabled,
    children,
}: {
    entry: ProgramacionEntry;
    isDragDisabled: boolean;
    children: ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: entry.id,
        data: { entryId: entry.id },
        disabled: isDragDisabled,
    });

    return (
        <Box
            ref={setNodeRef}
            transform={CSS.Translate.toString(transform)}
            opacity={isDragging ? 0.45 : 1}
            cursor={isDragDisabled ? "default" : "grab"}
            {...(!isDragDisabled ? listeners : {})}
            {...(!isDragDisabled ? attributes : {})}
        >
            {children}
        </Box>
    );
}

export default function ProgramacionProduccionSemanalTab() {
    const { getNumberDirective } = useMasterDirectives();
    const lockedDaysAhead = getNumberDirective(
        MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_DIAS_BLOQUEO_EDICION,
        MPS_SEMANAL_DIAS_BLOQUEO_EDICION_DEFAULT,
        {
            min: MPS_SEMANAL_DIAS_BLOQUEO_EDICION_MIN,
            max: MPS_SEMANAL_DIAS_BLOQUEO_EDICION_MAX,
        },
    );
    const [weekStartDate, setWeekStartDate] = useState(getCurrentWeekMonday());
    const [selectedSemana, setSelectedSemana] = useState<SemanaMPSDTO | null>(null);
    const [entries, setEntries] = useState<ProgramacionEntry[]>([]);
    const [currentDraft, setCurrentDraft] = useState<MpsSemanalDraftDTO | null>(null);
    const [observaciones, setObservaciones] = useState<MpsSemanalObservacionDTO[]>([]);
    const [isLoadingObservaciones, setIsLoadingObservaciones] = useState(false);
    const [observacionesError, setObservacionesError] = useState<string | null>(null);
    const [lastPersistedEntriesFingerprint, setLastPersistedEntriesFingerprint] = useState("");
    const [lastPersistedEntries, setLastPersistedEntries] = useState<ProgramacionEntry[]>([]);
    const [pendingSemanaChange, setPendingSemanaChange] = useState<SemanaMPSDTO | null>(null);
    const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);
    const [isLoadingDraft, setIsLoadingDraft] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [editableFromDate, setEditableFromDate] = useState(() => getMpsEditableFromDate(lockedDaysAhead));
    const pickerDisclosure = useDisclosure();
    const weekChangeConfirmDisclosure = useDisclosure();
    const toast = useToast();

    const isApprovedEditMode = isApprovedEditEstado(currentDraft?.estado);
    const isDraftMode = currentDraft === null || currentDraft.estado === "BORRADOR";
    const isReadOnly = currentDraft !== null && !isDraftMode && !isApprovedEditMode;
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const entriesFingerprint = useMemo(() => buildEntriesFingerprint(entries), [entries]);
    const hasUnsavedChanges = entriesFingerprint !== lastPersistedEntriesFingerprint;

    const canEditEntry = useCallback((entry: ProgramacionEntry, targetDayIndex = entry.dayIndex): boolean => {
        if (isReadOnly || (isEntryCanceled(entry) && !isPendingCancellation(entry))) {
            return false;
        }
        if (!isMpsDateEditable(addDays(weekStartDate, targetDayIndex), editableFromDate)) {
            return false;
        }
        if (isApprovedEditMode) {
            return entry.editable === true;
        }
        return isDraftMode;
    }, [editableFromDate, isApprovedEditMode, isDraftMode, isReadOnly, weekStartDate]);

    const hasDuplicateProductOnDay = useCallback((
        entry: ProgramacionEntry,
        targetDayIndex: number,
        sourceEntries = entries,
    ): boolean => sourceEntries.some((candidate) => (
        candidate.id !== entry.id
        && candidate.dayIndex === targetDayIndex
        && candidate.productoId === entry.productoId
        && !isEntryCanceled(candidate)
    )), [entries]);

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

    const lockedEntriesChanged = useMemo(() => (
        buildLockedEntriesFingerprint(entries, weekStartDate, editableFromDate)
        !== buildLockedEntriesFingerprint(lastPersistedEntries, weekStartDate, editableFromDate)
    ), [editableFromDate, entries, lastPersistedEntries, weekStartDate]);

    const isWeekFullyLocked = useMemo(() => (
        DAY_LABELS.every((_, dayIndex) => (
            !isMpsDateEditable(addDays(weekStartDate, dayIndex), editableFromDate)
        ))
    ), [editableFromDate, weekStartDate]);

    const validationIssues = useMemo(() => {
        const issues: string[] = [];
        if (!isMonday(weekStartDate)) {
            issues.push("La semana debe iniciar un lunes.");
        }
        if (isWeekFullyLocked) {
            issues.push(`Esta semana no tiene dias editables. La primera fecha editable es ${editableFromDate}.`);
        }
        if (lockedEntriesChanged) {
            issues.push(`No se pueden modificar dias bloqueados. La primera fecha editable es ${editableFromDate}.`);
        }
        const activeEntries = entries.filter((entry) => !isEntryCanceled(entry));
        if (isDraftMode && activeEntries.length === 0) {
            issues.push("Agregue al menos un terminado.");
        }
        activeEntries.forEach((entry) => {
            getEntryIssues(entry).forEach((issue) => {
                issues.push(`${entry.productoId}: ${issue}`);
            });
        });
        return issues;
    }, [editableFromDate, entries, isDraftMode, isWeekFullyLocked, lockedEntriesChanged, weekStartDate]);

    const totals = useMemo(() => {
        return entries.filter((entry) => !isEntryCanceled(entry)).reduce(
            (acc, entry) => {
                const lotes = Number.isFinite(entry.numeroLotes) ? entry.numeroLotes : 0;
                const unidades = entry.loteSize > 0 ? lotes * entry.loteSize : 0;
                acc.unidades += unidades;
                acc.lotes += lotes;
                return acc;
            },
            { unidades: 0, lotes: 0 },
        );
    }, [entries]);

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
            if (isNotFoundError(error)) {
                setObservaciones([]);
                setObservacionesError(null);
            } else {
                setObservacionesError(getAxiosErrorMessage(error, "No fue posible cargar las observaciones del MPS."));
            }
        } finally {
            setIsLoadingObservaciones(false);
        }
    }, []);

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
            setLastPersistedEntries(draftEntries);
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
                setLastPersistedEntries([]);
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
        setEditableFromDate(getMpsEditableFromDate(lockedDaysAhead));
        const intervalId = window.setInterval(() => {
            setEditableFromDate(getMpsEditableFromDate(lockedDaysAhead));
        }, 60_000);
        return () => window.clearInterval(intervalId);
    }, [lockedDaysAhead]);

    useEffect(() => {
        void loadWeekForProgramming(weekStartDate);
    }, [loadWeekForProgramming]);

    useEffect(() => {
        if (currentDraft?.weekStartDate) {
            void loadObservaciones(currentDraft.weekStartDate);
        } else {
            setObservaciones([]);
            setObservacionesError(null);
            setIsLoadingObservaciones(false);
        }
    }, [
        currentDraft?.fechaActualizacion,
        currentDraft?.mpsId,
        currentDraft?.revisionNumero,
        currentDraft?.weekStartDate,
        loadObservaciones,
    ]);

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
        const dayDate = addDays(weekStartDate, pickerDayIndex);
        if (!isDraftMode || isReadOnly || !isMpsDateEditable(dayDate, editableFromDate)) {
            toast({
                title: !isDraftMode ? "MPS aprobado" : "Dia bloqueado",
                description: !isDraftMode
                    ? "La edicion aprobada permite mover, aumentar, reducir o cancelar tarjetas existentes; no agrega productos nuevos."
                    : `No se puede programar antes de ${editableFromDate}.`,
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
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

    const handleEntryLotesChange = (entryId: string, valueAsString: string) => {
        const parsed = Number(valueAsString);
        setEntries((prev) => prev.map((entry) => {
            if (entry.id !== entryId || !canEditEntry(entry)) {
                return entry;
            }
            const normalizedLotes = Number.isFinite(parsed)
                ? (isApprovedEditMode ? Math.max(0, parsed) : parsed)
                : 0;
            return {
                ...entry,
                numeroLotes: normalizedLotes,
                estadoItem: isApprovedEditMode ? (normalizedLotes <= 0 ? "CANCELADO" : "ACTIVO") : entry.estadoItem,
                blockedReason: isApprovedEditMode && normalizedLotes <= 0
                    ? PENDING_CANCEL_REASON
                    : null,
            };
        }));
    };

    const adjustEntryLotes = (entryId: string, direction: 1 | -1) => {
        setEntries((prev) => prev.map((entry) => {
            if (entry.id !== entryId || !canEditEntry(entry)) {
                return entry;
            }
            const nextLotes = entry.numeroLotes + direction;
            const normalizedLotes = Math.max(isApprovedEditMode ? 0 : 1, nextLotes);
            return {
                ...entry,
                numeroLotes: normalizedLotes,
                estadoItem: isApprovedEditMode ? (normalizedLotes <= 0 ? "CANCELADO" : "ACTIVO") : entry.estadoItem,
                blockedReason: isApprovedEditMode && normalizedLotes <= 0 ? PENDING_CANCEL_REASON : null,
            };
        }));
    };

    const handleRemoveEntry = (entryId: string) => {
        setEntries((prev) => prev.flatMap((entry) => {
            if (entry.id !== entryId || !canEditEntry(entry)) {
                return [entry];
            }
            if (isApprovedEditMode) {
                return [{
                    ...entry,
                    numeroLotes: 0,
                    estadoItem: "CANCELADO",
                    blockedReason: PENDING_CANCEL_REASON,
                }];
            }
            return [];
        }));
    };

    const applySavedMpsState = useCallback((saved: MpsSemanalDraftDTO) => {
        setCurrentDraft(saved);
        setWeekStartDate(saved.weekStartDate);
        const savedEntries = buildEntriesFromDraft(saved);
        setEntries(savedEntries);
        setLastPersistedEntries(savedEntries);
        setLastPersistedEntriesFingerprint(buildEntriesFingerprint(savedEntries));
        setSelectedSemana((current) => current?.startDate === saved.weekStartDate ? {
            ...current,
            id: saved.semanaMpsId ?? current.id,
            codigo: saved.semanaMpsCodigo ?? current.codigo,
            mpsId: saved.mpsId,
            estado: saved.estado,
            fechaGeneracionOdps: saved.fechaGeneracionOdps,
        } : current);
    }, []);

    const handleDragEnd = (event: DragEndEvent) => {
        const targetDayIndex = event.over ? parseDayDropTarget(event.over.id) : null;
        if (targetDayIndex == null) {
            return;
        }
        const activeEntryId = String(event.active.id);
        const entry = entries.find((candidate) => candidate.id === activeEntryId);
        if (!entry || entry.dayIndex === targetDayIndex) {
            return;
        }
        if (!canEditEntry(entry)) {
            toast({
                title: "Tarjeta bloqueada",
                description: entry.blockedReason ?? "La tarjeta no se puede mover.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }
        if (!isMpsDateEditable(addDays(weekStartDate, targetDayIndex), editableFromDate)) {
            toast({
                title: "Dia destino bloqueado",
                description: `No se puede programar antes de ${editableFromDate}.`,
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }
        if (hasDuplicateProductOnDay(entry, targetDayIndex)) {
            toast({
                title: "Producto duplicado",
                description: "El producto ya existe en el dia destino.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }
        setEntries((prev) => prev.map((candidate) => (
            candidate.id === entry.id ? { ...candidate, dayIndex: targetDayIndex } : candidate
        )));
    };

    const handleSaveApprovedChanges = async () => {
        if (!currentDraft || !isApprovedEditMode || validationIssues.length > 0 || isReadOnly) {
            return;
        }

        const persistedById = new Map(lastPersistedEntries.map((entry) => [entry.id, entry]));
        const changedEntries = entries.filter((entry) => (
            entry.mpsItemId != null && hasPersistedEntryChanged(entry, persistedById.get(entry.id))
        ));
        if (changedEntries.length === 0) {
            return;
        }

        setIsSaving(true);
        try {
            let latestSaved: MpsSemanalDraftDTO | null = null;
            for (const entry of changedEntries) {
                latestSaved = await EditarMpsSemanalAprobadoItem(entry.mpsItemId!, {
                    dayIndex: entry.dayIndex,
                    numeroLotes: Math.max(0, Math.round(entry.numeroLotes)),
                    observacion: normalizeObservation(entry.observacion) || undefined,
                });
            }

            if (latestSaved) {
                applySavedMpsState(latestSaved);
            }
            toast({
                title: "MPS actualizado",
                description: `Se guardaron ${changedEntries.length} tarjeta(s) del MPS ${currentDraft.estado}.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "No se pudo editar el MPS",
                description: getAxiosErrorMessage(error, "Los cambios de la tarjeta aprobada no pudieron guardarse."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDraft = async () => {
        if (isApprovedEditMode) {
            await handleSaveApprovedChanges();
            return;
        }
        if (validationIssues.length > 0 || isReadOnly) {
            return;
        }
        setIsSaving(true);
        try {
            const saved = await GuardarBorradorProgramacionSemanal({
                weekStartDate,
                dias: DAY_LABELS.map((_, dayIndex) => ({
                    fecha: addDays(weekStartDate, dayIndex),
                    dayIndex,
                    items: entries
                        .filter((entry) => entry.dayIndex === dayIndex)
                        .map((entry) => ({
                            terminadoId: entry.productoId,
                            numeroLotes: Math.round(entry.numeroLotes),
                            observacion: entry.observacion?.trim() || undefined,
                        })),
                })),
            });
            applySavedMpsState(saved);
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

    const handleAtenderObservacion = async (observacionId: number, respuestaCorreccion: string) => {
        if (!currentDraft) {
            return;
        }
        if (hasUnsavedChanges) {
            toast({
                title: isApprovedEditMode ? "Guarde primero los cambios" : "Guarde primero el borrador",
                description: "Para atender una observacion, primero guarde el MPS corregido.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            throw new Error("Hay cambios sin guardar.");
        }
        try {
            await AtenderObservacionMpsSemanal(observacionId, { respuestaCorreccion });
            toast({
                title: "Observacion atendida",
                description: "La observacion quedo marcada como atendida para revision de aprobacion.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            await loadObservaciones(currentDraft.weekStartDate);
        } catch (error) {
            toast({
                title: "No se pudo atender la observacion",
                description: getAxiosErrorMessage(error, "La observacion no pudo actualizarse."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            throw error;
        }
    };

    const canSave = validationIssues.length === 0
        && !isReadOnly
        && !isLoadingDraft
        && !isWeekFullyLocked
        && (isDraftMode || (isApprovedEditMode && hasUnsavedChanges));

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
                        buttonLabel="Selector de semana MPS"
                        buttonHelperText="Click para cambiar o consultar semana"
                        modalTitle="Seleccionar semana para programacion"
                    />
                    <Button
                        colorScheme="blue"
                        onClick={() => void handleSaveDraft()}
                        isLoading={isSaving}
                        isDisabled={!canSave}
                    >
                        {isApprovedEditMode ? "Guardar cambios MPS" : "Guardar borrador"}
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
                    {isApprovedEditMode && <Badge colorScheme="teal">Edicion controlada</Badge>}
                    <Badge colorScheme="gray">Editable desde {editableFromDate}</Badge>
                    {isWeekFullyLocked && <Badge colorScheme="red">Semana bloqueada</Badge>}
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

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SimpleGrid columns={[1, 1, 2, 3, 6]} spacing={3}>
                    {DAY_LABELS.map((label, dayIndex) => {
                        const dayEntries = entriesByDay.get(dayIndex) ?? [];
                        const dayDate = addDays(weekStartDate, dayIndex);
                        const isDayEditable = isMpsDateEditable(dayDate, editableFromDate);
                        const addButtonLabel = !isDraftMode
                            ? "No se agregan productos en MPS aprobado"
                            : (isDayEditable ? "Agregar terminado" : `No editable antes de ${editableFromDate}`);
                        return (
                            <DroppableDayColumn
                                key={label}
                                dayIndex={dayIndex}
                                isDayEditable={isDayEditable}
                                isDropDisabled={isReadOnly || !isDayEditable}
                            >
                                <Flex align="start" justify="space-between" gap={2}>
                                    <Box>
                                        <Flex align="center" gap={2} wrap="wrap">
                                            <Text fontWeight="bold">{label}</Text>
                                            {!isDayEditable && <Badge colorScheme="gray">Bloqueado</Badge>}
                                        </Flex>
                                        <Text fontSize="sm" color="gray.600">{dayDate}</Text>
                                    </Box>
                                    <Tooltip label={addButtonLabel} shouldWrapChildren>
                                        <IconButton
                                            aria-label={`Agregar terminado ${label}`}
                                            icon={<AddIcon />}
                                            size="sm"
                                            colorScheme="teal"
                                            isDisabled={!isDraftMode || isReadOnly || !isMonday(weekStartDate) || !isDayEditable}
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
                                            const lotes = entry.numeroLotes;
                                            const unidades = entry.loteSize > 0 ? entry.numeroLotes * entry.loteSize : 0;
                                            const entryIssues = getEntryIssues(entry);
                                            const entryCanceled = isEntryCanceled(entry);
                                            const isEntryEditable = canEditEntry(entry);
                                            return (
                                                <DraggableEntryCard
                                                    key={entry.id}
                                                    entry={entry}
                                                    isDragDisabled={!isEntryEditable || entry.numeroLotes <= 0}
                                                >
                                                    <Box
                                                        bg={entryCanceled || !isEntryEditable ? "gray.50" : "white"}
                                                        borderWidth="1px"
                                                        borderColor={entryIssues.length ? "orange.300" : (entryCanceled ? "gray.300" : "gray.200")}
                                                        borderRadius="md"
                                                        p={2}
                                                    >
                                                        <Flex justify="space-between" gap={2} align="start">
                                                            <Box minW={0}>
                                                                <Text fontWeight="semibold" fontSize="sm" noOfLines={2}>{entry.productoNombre}</Text>
                                                                <Text fontSize="xs" color="gray.600">{entry.productoId}</Text>
                                                                <Text fontSize="xs" color="gray.600">{entry.categoriaNombre ?? "Sin categoria"}</Text>
                                                            </Box>
                                                            <IconButton
                                                                aria-label={isApprovedEditMode ? "Cancelar tarjeta MPS" : "Quitar terminado"}
                                                                icon={<DeleteIcon />}
                                                                size="xs"
                                                                variant="ghost"
                                                                colorScheme="red"
                                                                isDisabled={!isEntryEditable}
                                                                onClick={() => handleRemoveEntry(entry.id)}
                                                            />
                                                        </Flex>
                                                        <FormControl mt={2}>
                                                            <FormLabel fontSize="xs" mb={1}>Lotes</FormLabel>
                                                            <Flex gap={1} align="center">
                                                                <Tooltip label="Restar un lote">
                                                                    <IconButton
                                                                        aria-label={`Restar lote a ${entry.productoNombre}`}
                                                                        icon={<MinusIcon />}
                                                                        size="sm"
                                                                        variant="outline"
                                                                        isDisabled={!isEntryEditable || entry.numeroLotes <= (isApprovedEditMode ? 0 : 1)}
                                                                        onClick={() => adjustEntryLotes(entry.id, -1)}
                                                                    />
                                                                </Tooltip>
                                                                <NumberInput
                                                                    size="sm"
                                                                    min={isApprovedEditMode ? 0 : 1}
                                                                    step={1}
                                                                    precision={0}
                                                                    value={entry.numeroLotes}
                                                                    onChange={(valueAsString) => handleEntryLotesChange(entry.id, valueAsString)}
                                                                    isDisabled={!isEntryEditable}
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
                                                                        isDisabled={!isEntryEditable}
                                                                        onClick={() => adjustEntryLotes(entry.id, 1)}
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
                                                            <Badge colorScheme="purple">
                                                                {formatNumber(unidades)} und
                                                            </Badge>
                                                            {entryCanceled && (
                                                                <Badge colorScheme="red">
                                                                    {isPendingCancellation(entry) ? "Cancelacion pendiente" : "Cancelada"}
                                                                </Badge>
                                                            )}
                                                            {(entry.ordenesIniciadas ?? 0) > 0 && (
                                                                <Badge colorScheme="red">{entry.ordenesIniciadas} OP iniciada(s)</Badge>
                                                            )}
                                                            {(entry.lotesCancelados ?? 0) > 0 && (
                                                                <Badge colorScheme="orange">{entry.lotesCancelados} lote(s) cancelado(s)</Badge>
                                                            )}
                                                            {isApprovedEditMode && (entry.ordenesCancelables ?? 0) > 0 && !entryCanceled && (
                                                                <Badge colorScheme="gray">{entry.ordenesCancelables} OP cancelable(s)</Badge>
                                                            )}
                                                            {!isEntryEditable && !entryCanceled && <Badge colorScheme="gray">Solo lectura</Badge>}
                                                        </Flex>
                                                        {entry.blockedReason && (!isEntryEditable || isPendingCancellation(entry)) && (
                                                            <Text mt={2} fontSize="xs" color={entryCanceled ? "gray.600" : "red.600"}>
                                                                {entry.blockedReason}
                                                            </Text>
                                                        )}
                                                        {entryIssues.length > 0 && (
                                                            <Text mt={2} fontSize="xs" color="orange.700">
                                                                {entryIssues.join(" | ")}
                                                            </Text>
                                                        )}
                                                    </Box>
                                                </DraggableEntryCard>
                                            );
                                        })
                                    )}
                                </VStack>
                            </DroppableDayColumn>
                        );
                    })}
                </SimpleGrid>
            </DndContext>

            <MpsObservacionesPanel
                mode="programacion"
                mps={currentDraft}
                observaciones={observaciones}
                isLoading={isLoadingObservaciones}
                error={observacionesError}
                hasUnsavedChanges={hasUnsavedChanges}
                onRetry={() => void loadObservaciones(currentDraft?.weekStartDate ?? null)}
                onAtenderObservacion={handleAtenderObservacion}
            />

            <TerminadoPicker4MPS
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
