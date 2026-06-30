import {
    Badge,
    Box,
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Grid,
    HStack,
    Input,
    Spinner,
    Switch,
    Table,
    Tbody,
    Td,
    Text,
    Textarea,
    Th,
    Thead,
    Tr,
    VStack,
    useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    createJornadaLaboralVersion,
    getJornadaLaboralVersiones,
    getJornadaLaboralVigente,
    type JornadaLaboralBloque,
    type JornadaLaboralVersion,
    type JornadaLaboralVersionPayload,
} from "../../../api/JornadaLaboralApi";

interface JornadaLaboralSectionProps {
    canEdit: boolean;
}

type SectionKey = "weekdays" | "saturday" | "sunday";

interface BlockDraft {
    horaInicio: string;
    horaFin: string;
}

interface SectionDraft {
    laborable: boolean;
    bloques: [BlockDraft, BlockDraft];
}

type JornadaDraft = Record<SectionKey, SectionDraft> & {
    motivoCambio: string;
};

const SECTION_DEFINITIONS: Array<{ key: SectionKey; label: string; days: number[] }> = [
    { key: "weekdays", label: "Lunes a viernes", days: [1, 2, 3, 4, 5] },
    { key: "saturday", label: "Sabado", days: [6] },
    { key: "sunday", label: "Domingo", days: [7] },
];

const DAY_LABELS: Record<number, string> = {
    1: "Lun",
    2: "Mar",
    3: "Mie",
    4: "Jue",
    5: "Vie",
    6: "Sab",
    7: "Dom",
};

const EMPTY_BLOCK: BlockDraft = { horaInicio: "", horaFin: "" };
const DEFAULT_WORKDAY_BLOCKS: [BlockDraft, BlockDraft] = [
    { horaInicio: "07:30", horaFin: "12:00" },
    { horaInicio: "13:00", horaFin: "17:00" },
];

const DEFAULT_DRAFT: JornadaDraft = {
    weekdays: { laborable: true, bloques: cloneDefaultBlocks() },
    saturday: { laborable: true, bloques: cloneDefaultBlocks() },
    sunday: { laborable: false, bloques: cloneDefaultBlocks() },
    motivoCambio: "",
};

export default function JornadaLaboralSection({ canEdit }: JornadaLaboralSectionProps) {
    const toast = useToast();
    const [vigente, setVigente] = useState<JornadaLaboralVersion | null>(null);
    const [versiones, setVersiones] = useState<JornadaLaboralVersion[]>([]);
    const [draft, setDraft] = useState<JornadaDraft>(DEFAULT_DRAFT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [vigenteResponse, versionesResponse] = await Promise.all([
                getJornadaLaboralVigente(),
                getJornadaLaboralVersiones(),
            ]);
            setVigente(vigenteResponse);
            setVersiones(versionesResponse);
            setDraft(draftFromVersion(vigenteResponse));
        } catch (error) {
            console.error("Error cargando jornada laboral", error);
            toast({
                title: "No se pudo cargar la jornada laboral",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const validationErrors = useMemo(() => validateDraft(draft), [draft]);
    const hasValidationErrors = validationErrors.length > 0;
    const totalHours = useMemo(() => minutesToHoursLabel(calculateDraftMinutes(draft)), [draft]);
    const vigenteSummary = useMemo(() => vigente ? formatVersionSummary(vigente) : "-", [vigente]);

    const updateSectionLaborable = (sectionKey: SectionKey, laborable: boolean) => {
        setDraft((current) => ({
            ...current,
            [sectionKey]: {
                ...current[sectionKey],
                laborable,
            },
        }));
    };

    const updateBlock = (
        sectionKey: SectionKey,
        blockIndex: 0 | 1,
        field: keyof BlockDraft,
        value: string
    ) => {
        setDraft((current) => {
            const nextBlocks = current[sectionKey].bloques.map((block, index) => (
                index === blockIndex ? { ...block, [field]: value } : block
            )) as [BlockDraft, BlockDraft];
            return {
                ...current,
                [sectionKey]: {
                    ...current[sectionKey],
                    bloques: nextBlocks,
                },
            };
        });
    };

    const handleRestore = () => {
        setDraft(vigente ? draftFromVersion(vigente) : DEFAULT_DRAFT);
    };

    const handleSave = async () => {
        if (!canEdit || hasValidationErrors || saving) return;

        setSaving(true);
        try {
            await createJornadaLaboralVersion(payloadFromDraft(draft));
            toast({
                title: "Jornada laboral actualizada",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            await loadData();
        } catch (error) {
            console.error("Error guardando jornada laboral", error);
            toast({
                title: "No se pudo guardar la nueva version",
                description: getErrorMessage(error),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box borderWidth="1px" borderRadius="md" p={4}>
                <Spinner />
            </Box>
        );
    }

    return (
        <VStack align="stretch" spacing={6}>
            <Box borderWidth="1px" borderRadius="md" p={4}>
                <HStack justify="space-between" align="flex-start" mb={4}>
                    <Box>
                        <Text fontWeight="bold">Version vigente</Text>
                        <Text fontSize="sm" color="app.textMuted">
                            {vigente ? `Version ${vigente.version} - ${vigenteSummary}` : "-"}
                        </Text>
                    </Box>
                    {vigente ? <Badge colorScheme="green">{vigente.estado}</Badge> : null}
                </HStack>

                <Grid templateColumns={["1fr", "1fr", "repeat(3, 1fr)"]} gap={4}>
                    {SECTION_DEFINITIONS.map((section) => (
                        <Box key={section.key} borderWidth="1px" borderRadius="md" p={3}>
                            <HStack justify="space-between" mb={3}>
                                <Box>
                                    <Text fontWeight="semibold">{section.label}</Text>
                                    <Text fontSize="xs" color="app.textMuted">
                                        {draft[section.key].laborable ? "Laborable" : "No laborable"}
                                    </Text>
                                </Box>
                                <Switch
                                    isChecked={draft[section.key].laborable}
                                    isDisabled={!canEdit}
                                    onChange={(event) => updateSectionLaborable(section.key, event.target.checked)}
                                />
                            </HStack>

                            <VStack align="stretch" spacing={3}>
                                {draft[section.key].bloques.map((block, index) => (
                                    <Grid key={index} templateColumns="1fr 1fr" gap={2}>
                                        <FormControl isDisabled={!canEdit || !draft[section.key].laborable}>
                                            <FormLabel fontSize="xs" mb={1}>
                                                {index === 0 ? "Inicio" : "Inicio opcional"}
                                            </FormLabel>
                                            <Input
                                                type="time"
                                                value={block.horaInicio}
                                                onChange={(event) => updateBlock(section.key, index as 0 | 1, "horaInicio", event.target.value)}
                                            />
                                        </FormControl>
                                        <FormControl isDisabled={!canEdit || !draft[section.key].laborable}>
                                            <FormLabel fontSize="xs" mb={1}>
                                                {index === 0 ? "Fin" : "Fin opcional"}
                                            </FormLabel>
                                            <Input
                                                type="time"
                                                value={block.horaFin}
                                                onChange={(event) => updateBlock(section.key, index as 0 | 1, "horaFin", event.target.value)}
                                            />
                                        </FormControl>
                                    </Grid>
                                ))}
                            </VStack>
                        </Box>
                    ))}
                </Grid>

                <HStack mt={4} wrap="wrap" spacing={3}>
                    <Badge colorScheme="blue">Total semanal {totalHours}</Badge>
                    <Badge colorScheme="gray">Vigencia inmediata</Badge>
                </HStack>

                <FormControl mt={4} isRequired isInvalid={Boolean(getMotivoError(validationErrors))}>
                    <FormLabel>Motivo del cambio</FormLabel>
                    <Textarea
                        value={draft.motivoCambio}
                        onChange={(event) => setDraft((current) => ({ ...current, motivoCambio: event.target.value }))}
                        isReadOnly={!canEdit}
                        minH="90px"
                    />
                    <FormErrorMessage>{getMotivoError(validationErrors)}</FormErrorMessage>
                </FormControl>

                {validationErrors.filter((error) => error.field !== "motivoCambio").length > 0 && (
                    <Box mt={4} p={3} borderWidth="1px" borderColor="orange.200" borderRadius="md" bg="orange.50">
                        {validationErrors
                            .filter((error) => error.field !== "motivoCambio")
                            .slice(0, 4)
                            .map((error) => (
                                <Text key={error.message} fontSize="sm" color="orange.700">
                                    {error.message}
                                </Text>
                            ))}
                    </Box>
                )}

                <HStack justify="flex-end" mt={4}>
                    <Button
                        variant="outline"
                        onClick={handleRestore}
                        isDisabled={saving}
                    >
                        Restaurar
                    </Button>
                    <Button
                        colorScheme="teal"
                        onClick={handleSave}
                        isLoading={saving}
                        isDisabled={!canEdit || hasValidationErrors}
                    >
                        Guardar nueva version
                    </Button>
                </HStack>
            </Box>

            <Box overflowX="auto" borderWidth="1px" borderRadius="md">
                <Table size="sm" variant="simple">
                    <Thead>
                        <Tr>
                            <Th>Version</Th>
                            <Th>Estado</Th>
                            <Th>Resumen</Th>
                            <Th>Horas semana</Th>
                            <Th>Vigente desde</Th>
                            <Th>Vigente hasta</Th>
                            <Th>Creado por</Th>
                            <Th>Motivo</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {versiones.map((version) => (
                            <Tr key={version.id}>
                                <Td>{version.version}</Td>
                                <Td>
                                    <Badge colorScheme={version.estado === "VIGENTE" ? "green" : "gray"}>
                                        {version.estado}
                                    </Badge>
                                </Td>
                                <Td>{formatVersionSummary(version)}</Td>
                                <Td>{minutesToHoursLabel(calculateVersionMinutes(version))}</Td>
                                <Td>{formatDateTime(version.vigenteDesde)}</Td>
                                <Td>{formatDateTime(version.vigenteHasta)}</Td>
                                <Td>{version.creadoPor ?? "-"}</Td>
                                <Td>{version.motivoCambio ?? "-"}</Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </Box>
        </VStack>
    );
}

function cloneDefaultBlocks(): [BlockDraft, BlockDraft] {
    return DEFAULT_WORKDAY_BLOCKS.map((block) => ({ ...block })) as [BlockDraft, BlockDraft];
}

function emptyBlocks(): [BlockDraft, BlockDraft] {
    return [{ ...EMPTY_BLOCK }, { ...EMPTY_BLOCK }];
}

function draftFromVersion(version: JornadaLaboralVersion): JornadaDraft {
    return {
        weekdays: sectionFromVersion(version, [1, 2, 3, 4, 5]),
        saturday: sectionFromVersion(version, [6]),
        sunday: sectionFromVersion(version, [7]),
        motivoCambio: "",
    };
}

function sectionFromVersion(version: JornadaLaboralVersion, days: number[]): SectionDraft {
    const firstDayWithBlocks = days
        .map((day) => blocksForDay(version.bloques, day))
        .find((blocks) => blocks.length > 0);

    if (!firstDayWithBlocks) {
        return { laborable: false, bloques: emptyBlocks() };
    }

    const normalized = firstDayWithBlocks.slice(0, 2).map((block) => ({
        horaInicio: toTimeInputValue(block.horaInicio),
        horaFin: toTimeInputValue(block.horaFin),
    }));

    return {
        laborable: true,
        bloques: [
            normalized[0] ?? { ...EMPTY_BLOCK },
            normalized[1] ?? { ...EMPTY_BLOCK },
        ],
    };
}

function blocksForDay(blocks: JornadaLaboralBloque[], day: number): JornadaLaboralBloque[] {
    return blocks
        .filter((block) => block.diaSemana === day)
        .sort((left, right) => left.orden - right.orden);
}

function payloadFromDraft(draft: JornadaDraft): JornadaLaboralVersionPayload {
    return {
        motivoCambio: draft.motivoCambio.trim(),
        dias: SECTION_DEFINITIONS.flatMap((section) => (
            section.days.map((day) => ({
                diaSemana: day,
                laborable: draft[section.key].laborable,
                bloques: draft[section.key].laborable
                    ? completeBlocks(draft[section.key].bloques)
                    : [],
            }))
        )),
    };
}

function completeBlocks(blocks: BlockDraft[]) {
    return blocks
        .filter((block) => block.horaInicio.trim() && block.horaFin.trim())
        .map((block) => ({
            horaInicio: block.horaInicio.trim(),
            horaFin: block.horaFin.trim(),
        }));
}

interface ValidationError {
    field: string;
    message: string;
}

function validateDraft(draft: JornadaDraft): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!draft.motivoCambio.trim()) {
        errors.push({ field: "motivoCambio", message: "El motivo del cambio es obligatorio." });
    }

    let hasLaborableDay = false;
    SECTION_DEFINITIONS.forEach((section) => {
        const sectionDraft = draft[section.key];
        if (!sectionDraft.laborable) return;

        hasLaborableDay = true;
        const complete = completeBlocks(sectionDraft.bloques);
        const hasPartialBlock = sectionDraft.bloques.some((block) => (
            Boolean(block.horaInicio.trim()) !== Boolean(block.horaFin.trim())
        ));
        if (hasPartialBlock) {
            errors.push({ field: section.key, message: `${section.label}: complete inicio y fin de cada bloque.` });
        }
        if (complete.length === 0) {
            errors.push({ field: section.key, message: `${section.label}: configure al menos un bloque horario.` });
        }
        complete.forEach((block) => {
            if (block.horaInicio >= block.horaFin) {
                errors.push({ field: section.key, message: `${section.label}: el inicio debe ser anterior al fin.` });
            }
        });
        if (complete.length === 2 && complete[0].horaFin > complete[1].horaInicio) {
            errors.push({ field: section.key, message: `${section.label}: los bloques no pueden solaparse.` });
        }
    });

    if (!hasLaborableDay) {
        errors.push({ field: "jornada", message: "Configure al menos un dia laborable." });
    }

    return errors;
}

function getMotivoError(errors: ValidationError[]) {
    return errors.find((error) => error.field === "motivoCambio")?.message;
}

function calculateDraftMinutes(draft: JornadaDraft): number {
    return SECTION_DEFINITIONS.reduce((total, section) => {
        const sectionDraft = draft[section.key];
        if (!sectionDraft.laborable) return total;
        const dayMinutes = completeBlocks(sectionDraft.bloques).reduce(
            (sum, block) => sum + minutesBetween(block.horaInicio, block.horaFin),
            0
        );
        return total + dayMinutes * section.days.length;
    }, 0);
}

function calculateVersionMinutes(version: JornadaLaboralVersion): number {
    return version.bloques.reduce(
        (total, block) => total + minutesBetween(block.horaInicio, block.horaFin),
        0
    );
}

function minutesBetween(start: string, end: string): number {
    const startMinutes = parseTimeMinutes(start);
    const endMinutes = parseTimeMinutes(end);
    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return 0;
    return endMinutes - startMinutes;
}

function parseTimeMinutes(value: string): number | null {
    const normalized = toTimeInputValue(value);
    const [hours, minutes] = normalized.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
}

function minutesToHoursLabel(minutes: number): string {
    const hours = minutes / 60;
    return `${hours.toLocaleString("es-CO", {
        minimumFractionDigits: hours % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 1,
    })} h`;
}

function formatVersionSummary(version: JornadaLaboralVersion): string {
    return [1, 2, 3, 4, 5, 6, 7]
        .map((day) => {
            const blocks = blocksForDay(version.bloques, day);
            if (blocks.length === 0) return `${DAY_LABELS[day]} no laborable`;
            return `${DAY_LABELS[day]} ${blocks
                .map((block) => `${toTimeInputValue(block.horaInicio)}-${toTimeInputValue(block.horaFin)}`)
                .join(", ")}`;
        })
        .join(" | ");
}

function toTimeInputValue(value: string): string {
    return value ? value.slice(0, 5) : "";
}

function formatDateTime(value?: string | null): string {
    if (!value) return "-";
    return new Date(value).toLocaleString();
}

function getErrorMessage(error: unknown): string | undefined {
    if (typeof error === "object" && error !== null && "response" in error) {
        const maybeResponse = (error as { response?: { data?: { message?: string; error?: string } } }).response;
        return maybeResponse?.data?.message ?? maybeResponse?.data?.error;
    }
    return error instanceof Error ? error.message : undefined;
}
