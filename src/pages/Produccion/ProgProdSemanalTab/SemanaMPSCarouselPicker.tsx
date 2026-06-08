import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@chakra-ui/icons";
import {
    Badge,
    Box,
    Flex,
    IconButton,
    SimpleGrid,
    Spinner,
    Text,
    VStack,
    useToast,
} from "@chakra-ui/react";
import {
    ListarSemanasMps,
    type SemanaMPSDTO,
} from "./MpsSemanalService";
import {
    addLocalDays,
    buildSemanaMpsCodigo,
    formatSemanaMpsDisplayDate,
    getCurrentIsoWeekMonday,
    getIsoWeekNumber,
    getIsoWeekYear,
} from "./semanaMps.utils";

interface SemanaMPSCarouselPickerProps {
    value: string;
    onChange: (semana: SemanaMPSDTO) => void;
    isDisabled?: boolean;
}

interface SemanaCardView {
    offset: -1 | 0 | 1;
    anioSemana: number;
    semana: SemanaMPSDTO;
    isLoaded: boolean;
    isFailed: boolean;
}

const carouselSpring = {
    type: "spring",
    stiffness: 220,
    damping: 28,
    mass: 0.9,
} as const;

function getSlideInitialTarget(direction: -1 | 0 | 1) {
    return {
        x: direction === 1 ? 96 : direction === -1 ? -96 : 0,
        opacity: direction === 0 ? 1 : 0.78,
    };
}

function getSlideExitTarget(direction: -1 | 0 | 1) {
    return {
        x: direction === 1 ? -96 : direction === -1 ? 96 : 0,
        opacity: direction === 0 ? 1 : 0.55,
    };
}

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function buildTransientSemana(startDate: string): SemanaMPSDTO {
    return {
        id: null,
        codigo: buildSemanaMpsCodigo(startDate),
        anioSemana: getIsoWeekYear(startDate),
        numeroSemana: getIsoWeekNumber(startDate),
        startDate,
        endDate: addLocalDays(startDate, 5),
        standard: "ISO_8601_MONDAY_SATURDAY",
        mpsId: null,
        estado: null,
        fechaGeneracionOdps: null,
    };
}

function getSemanaEstadoLabel(semana: SemanaMPSDTO, isLoaded: boolean, isFailed: boolean): string {
    if (isFailed) {
        return "No disponible";
    }
    if (!isLoaded) {
        return "Cargando";
    }
    if (!semana.mpsId) {
        return "Sin MPS";
    }
    if (semana.fechaGeneracionOdps) {
        return "ODPs generadas";
    }
    switch (semana.estado) {
        case "BORRADOR":
            return "Borrador";
        case "APROBADO":
            return "Aprobado";
        case "CERRADO":
            return "Cerrado";
        default:
            return "Con MPS";
    }
}

function getSemanaEstadoColor(semana: SemanaMPSDTO, isLoaded: boolean, isFailed: boolean): string {
    if (isFailed) {
        return "red";
    }
    if (!isLoaded || !semana.mpsId) {
        return "gray";
    }
    if (semana.fechaGeneracionOdps) {
        return "green";
    }
    switch (semana.estado) {
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

export default function SemanaMPSCarouselPicker({
    value,
    onChange,
    isDisabled = false,
}: SemanaMPSCarouselPickerProps) {
    const toast = useToast();
    const currentWeekStartDate = useMemo(() => getCurrentIsoWeekMonday(), []);
    const [focusedStartDate, setFocusedStartDate] = useState(value || currentWeekStartDate);
    const [weeksByYear, setWeeksByYear] = useState<Record<number, SemanaMPSDTO[]>>({});
    const [loadingYears, setLoadingYears] = useState<Record<number, boolean>>({});
    const [failedYears, setFailedYears] = useState<Record<number, boolean>>({});
    const [slideDirection, setSlideDirection] = useState<-1 | 0 | 1>(0);

    useEffect(() => {
        setFocusedStartDate(value || currentWeekStartDate);
    }, [currentWeekStartDate, value]);

    const loadWeeksForYear = useCallback((anioSemana: number) => {
        if (weeksByYear[anioSemana] || loadingYears[anioSemana] || failedYears[anioSemana]) {
            return;
        }

        setLoadingYears((current) => ({ ...current, [anioSemana]: true }));
        setFailedYears((current) => ({ ...current, [anioSemana]: false }));
        ListarSemanasMps(anioSemana)
            .then((response) => {
                setWeeksByYear((current) => ({ ...current, [anioSemana]: response }));
            })
            .catch((error) => {
                toast({
                    title: "No se pudieron cargar las semanas MPS",
                    description: getAxiosErrorMessage(error, "La consulta de semanas MPS fallo."),
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                setFailedYears((current) => ({ ...current, [anioSemana]: true }));
            })
            .finally(() => {
                setLoadingYears((current) => ({ ...current, [anioSemana]: false }));
            });
    }, [failedYears, loadingYears, toast, weeksByYear]);

    const visibleStartDates = useMemo(
        () => [
            addLocalDays(focusedStartDate, -7),
            focusedStartDate,
            addLocalDays(focusedStartDate, 7),
        ],
        [focusedStartDate],
    );

    const yearsToLoad = useMemo(() => Array.from(new Set(
        visibleStartDates.map((date) => getIsoWeekYear(date)),
    )), [visibleStartDates]);

    useEffect(() => {
        yearsToLoad.forEach(loadWeeksForYear);
    }, [loadWeeksForYear, yearsToLoad]);

    const visibleWeeks = useMemo<SemanaCardView[]>(() => {
        return visibleStartDates.map((startDate, index) => {
            const anioSemana = getIsoWeekYear(startDate);
            const weeksForYear = weeksByYear[anioSemana];
            const semana = weeksForYear?.find((candidate) => candidate.startDate === startDate);
            return {
                offset: (index - 1) as -1 | 0 | 1,
                anioSemana,
                semana: semana ?? buildTransientSemana(startDate),
                isLoaded: Boolean(semana),
                isFailed: Boolean(failedYears[anioSemana] || (weeksForYear && !semana)),
            };
        });
    }, [failedYears, visibleStartDates, weeksByYear]);

    const isLoadingVisibleWeeks = visibleWeeks.some((card) => (
        !card.isLoaded && loadingYears[card.anioSemana]
    ));

    const handleMove = (direction: -1 | 1) => {
        setSlideDirection(direction);
        setFocusedStartDate((current) => addLocalDays(current, direction * 7));
    };

    const handleSelect = (card: SemanaCardView) => {
        if (isDisabled || !card.isLoaded) {
            return;
        }
        setSlideDirection(card.offset);
        setFocusedStartDate(card.semana.startDate);
        onChange(card.semana);
    };

    return (
        <VStack align="stretch" spacing={4}>
            <Flex align="center" gap={3}>
                <IconButton
                    aria-label="Semana anterior"
                    icon={<ChevronLeftIcon />}
                    variant="outline"
                    colorScheme="teal"
                    isDisabled={isDisabled}
                    onClick={() => handleMove(-1)}
                />

                <Box flex="1" minW={0} overflow="hidden" px={2} py={3} mx={-2}>
                    <AnimatePresence initial={false} mode="wait" custom={slideDirection}>
                        <motion.div
                            key={focusedStartDate}
                            initial={getSlideInitialTarget(slideDirection)}
                            animate={{ x: 0, opacity: 1 }}
                            exit={getSlideExitTarget(slideDirection)}
                            transition={carouselSpring}
                        >
                            <SimpleGrid columns={[1, 1, 3]} spacing={3}>
                                {visibleWeeks.map((card) => {
                                    const isFocused = card.offset === 0;
                                    const isSelected = card.semana.startDate === value;
                                    const isCurrentWeek = card.semana.startDate === currentWeekStartDate;
                                    const estadoLabel = getSemanaEstadoLabel(card.semana, card.isLoaded, card.isFailed);
                                    const estadoColor = getSemanaEstadoColor(card.semana, card.isLoaded, card.isFailed);
                                    const borderColor = isSelected
                                        ? "teal.500"
                                        : isFocused
                                            ? "blue.300"
                                            : "gray.200";
                                    const backgroundColor = isSelected
                                        ? "teal.50"
                                        : isFocused
                                            ? "blue.50"
                                            : "white";

                                    return (
                                        <Box
                                            key={card.semana.startDate}
                                            as="button"
                                            type="button"
                                            textAlign="left"
                                            p={4}
                                            minH="176px"
                                            borderWidth="1px"
                                            borderRadius="md"
                                            borderColor={borderColor}
                                            bg={backgroundColor}
                                            boxShadow={isSelected ? "md" : "sm"}
                                            opacity={card.isLoaded && !isDisabled ? 1 : 0.68}
                                            cursor={card.isLoaded && !isDisabled ? "pointer" : "not-allowed"}
                                            transform={isFocused ? "scale(1.01)" : "scale(1)"}
                                            transition="transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, background-color 120ms ease"
                                            _hover={card.isLoaded && !isDisabled ? {
                                                transform: isFocused ? "scale(1.03)" : "scale(1.02)",
                                                boxShadow: "lg",
                                                borderColor: isSelected ? "teal.600" : "teal.300",
                                                bg: isSelected ? "teal.100" : "teal.50",
                                            } : undefined}
                                            onClick={() => handleSelect(card)}
                                        >
                                            <VStack align="stretch" spacing={3}>
                                                <Flex justify="space-between" align="start" gap={2}>
                                                    <Box minW={0}>
                                                        <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                                            {card.semana.codigo}
                                                        </Text>
                                                        <Text fontSize="xs" color="gray.500">
                                                            {formatSemanaMpsDisplayDate(card.semana.startDate)} a {formatSemanaMpsDisplayDate(card.semana.endDate)}
                                                        </Text>
                                                    </Box>
                                                    {card.isLoaded ? null : <Spinner size="sm" color="teal.500" />}
                                                </Flex>

                                                <Flex gap={2} wrap="wrap">
                                                    <Badge colorScheme={estadoColor}>{estadoLabel}</Badge>
                                                    {isCurrentWeek && <Badge colorScheme="purple">Semana actual</Badge>}
                                                    {isSelected && <Badge colorScheme="teal">Seleccionada</Badge>}
                                                </Flex>

                                                <Box>
                                                    <Text fontSize="sm" color="gray.700">
                                                        Lunes: <Text as="span" fontWeight="semibold">{formatSemanaMpsDisplayDate(card.semana.startDate)}</Text>
                                                    </Text>
                                                    <Text fontSize="sm" color="gray.700">
                                                        Sabado: <Text as="span" fontWeight="semibold">{formatSemanaMpsDisplayDate(card.semana.endDate)}</Text>
                                                    </Text>
                                                </Box>

                                                {card.semana.mpsId ? (
                                                    <Text fontSize="xs" color="gray.600">
                                                        MPS #{card.semana.mpsId}
                                                    </Text>
                                                ) : (
                                                    <Text fontSize="xs" color="gray.500">
                                                        {card.isFailed ? "No se pudo consultar esta semana." : "No hay MPS persistido para esta semana."}
                                                    </Text>
                                                )}
                                            </VStack>
                                        </Box>
                                    );
                                })}
                            </SimpleGrid>
                        </motion.div>
                    </AnimatePresence>
                </Box>

                <IconButton
                    aria-label="Semana posterior"
                    icon={<ChevronRightIcon />}
                    variant="outline"
                    colorScheme="teal"
                    isDisabled={isDisabled}
                    onClick={() => handleMove(1)}
                />
            </Flex>

            {isLoadingVisibleWeeks && (
                <Flex align="center" gap={2} justify="center">
                    <Spinner size="sm" color="teal.500" />
                    <Text fontSize="sm" color="gray.600">Cargando semanas...</Text>
                </Flex>
            )}
        </VStack>
    );
}
