import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Steps, Badge, Flex, NativeSelect, Spinner, Text, VStack, useToast, Field } from "@chakra-ui/react";
import {
    ListarSemanasMps,
    type SemanaMPSDTO,
} from "./MpsSemanalService";
import {
    formatSemanaMpsDisplayDate,
    getCurrentDateString,
    getIsoWeekYear,
} from "./semanaMps.utils";

interface SemanaMPSPickerProps {
    value: string;
    onChange: (semana: SemanaMPSDTO) => void;
    isDisabled?: boolean;
}

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function getSemanaEstadoLabel(semana: SemanaMPSDTO): string {
    if (!semana.mpsId) {
        return "Sin MPS";
    }
    if (semana.fechaGeneracionOdps) {
        return "ODPs generadas";
    }
    return semana.estado ?? "Con MPS";
}

function getSemanaEstadoColor(semana: SemanaMPSDTO): string {
    if (!semana.mpsId) {
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

function buildSemanaOptionLabel(semana: SemanaMPSDTO): string {
    return `${semana.codigo} | ${formatSemanaMpsDisplayDate(semana.startDate)} - ${formatSemanaMpsDisplayDate(semana.endDate)} | ${getSemanaEstadoLabel(semana)}`;
}

export default function SemanaMPSPicker({
    value,
    onChange,
    isDisabled = false,
}: SemanaMPSPickerProps) {
    const toast = useToast();
    const [anioSemana, setAnioSemana] = useState(() => getIsoWeekYear(value || getCurrentDateString()));
    const [semanas, setSemanas] = useState<SemanaMPSDTO[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const nextAnioSemana = getIsoWeekYear(value || getCurrentDateString());
        setAnioSemana((current) => current === nextAnioSemana ? current : nextAnioSemana);
    }, [value]);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        ListarSemanasMps(anioSemana)
            .then((response) => {
                if (isMounted) {
                    setSemanas(response);
                }
            })
            .catch((error) => {
                if (isMounted) {
                    toast({
                        title: "No se pudieron cargar las semanas MPS",
                        description: getAxiosErrorMessage(error, "La consulta de semanas MPS fallo."),
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                    });
                    setSemanas([]);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [anioSemana, toast]);

    const selectedSemana = useMemo(
        () => semanas.find((semana) => semana.startDate === value) ?? null,
        [semanas, value],
    );

    const yearOptions = useMemo(() => {
        const currentIsoYear = getIsoWeekYear(getCurrentDateString());
        const years = new Set<number>();
        for (let year = currentIsoYear - 2; year <= currentIsoYear + 2; year++) {
            years.add(year);
        }
        years.add(anioSemana);
        if (value) {
            years.add(getIsoWeekYear(value));
        }
        return Array.from(years).sort((left, right) => left - right);
    }, [anioSemana, value]);

    const handleWeekChange = (nextStartDate: string) => {
        const nextSemana = semanas.find((semana) => semana.startDate === nextStartDate);
        if (nextSemana) {
            onChange(nextSemana);
        }
    };

    return (
        <VStack align="stretch" gap={2}>
            <Flex gap={3} align="end" wrap="wrap">
                <Field.Root maxW="150px">
                    <Field.Label>Anio ISO</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            value={anioSemana}
                            onValueChange={(event) => setAnioSemana(Number(event.target.value))}
                            disabled={isDisabled || isLoading}>
                            {yearOptions.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>

                <Field.Root minW={["100%", "360px"]} maxW="560px">
                    <Field.Label>Semana MPS</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            value={value}
                            placeholder={isLoading ? "Cargando semanas..." : "Seleccione una semana"}
                            onValueChange={(event) => handleWeekChange(event.target.value)}
                            disabled={isDisabled || isLoading}>
                            {semanas.map((semana) => (
                                <option key={semana.codigo} value={semana.startDate}>
                                    {buildSemanaOptionLabel(semana)}
                                </option>
                            ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>

                {isLoading && <Spinner size="sm" color="teal.500" />}
            </Flex>

            {selectedSemana && (
                <Flex gap={2} align="center" wrap="wrap">
                    <Badge colorPalette="blue">{selectedSemana.codigo}</Badge>
                    <Badge colorPalette={getSemanaEstadoColor(selectedSemana)}>
                        {getSemanaEstadoLabel(selectedSemana)}
                    </Badge>
                    <Text fontSize="sm" color="gray.600">
                        {formatSemanaMpsDisplayDate(selectedSemana.startDate)} a {formatSemanaMpsDisplayDate(selectedSemana.endDate)}
                    </Text>
                </Flex>
            )}
        </VStack>
    );
}

export type { SemanaMPSDTO };
