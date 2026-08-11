import { useState } from "react";
import {
    Badge,
    Box,
    Button,
    Flex,
    Text,
    VStack,
    useDisclosure,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import type { SemanaMPSDTO } from "./SemanaMPSPicker";
import SemanaMPSCarouselPicker from "./SemanaMPSCarouselPicker";
import {
    addLocalDays,
    buildSemanaMpsCodigo,
    formatSemanaMpsDisplayDate,
} from "./semanaMps.utils";
import { LuCalendar } from 'react-icons/lu';

interface SemanaMPSPickerModalProps {
    value: string;
    onChange: (semana: SemanaMPSDTO) => void;
    isDisabled?: boolean;
    selectedSemana?: SemanaMPSDTO | null;
    selectedCodigo?: string | null;
    selectedStartDate?: string | null;
    selectedEndDate?: string | null;
    selectedMpsId?: number | null;
    selectedEstado?: SemanaMPSDTO["estado"] | null;
    selectedFechaGeneracionOdps?: string | null;
    buttonLabel?: string;
    buttonHelperText?: string;
    modalTitle?: string;
}

function getEstadoLabel(
    mpsId: number | null | undefined,
    estado: SemanaMPSDTO["estado"] | null | undefined,
    fechaGeneracionOdps: string | null | undefined,
): string {
    if (!mpsId) {
        return "Sin MPS";
    }
    if (fechaGeneracionOdps) {
        return "ODPs generadas";
    }
    switch (estado) {
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

function getEstadoColor(
    mpsId: number | null | undefined,
    estado: SemanaMPSDTO["estado"] | null | undefined,
    fechaGeneracionOdps: string | null | undefined,
): string {
    if (!mpsId) {
        return "gray";
    }
    if (fechaGeneracionOdps) {
        return "green";
    }
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

export default function SemanaMPSPickerModal({
    value,
    onChange,
    isDisabled = false,
    selectedSemana = null,
    selectedCodigo,
    selectedStartDate,
    selectedEndDate,
    selectedMpsId,
    selectedEstado,
    selectedFechaGeneracionOdps,
    buttonLabel = "Selector de semana MPS",
    buttonHelperText = "Click para cambiar o consultar semana",
    modalTitle = "Seleccionar semana MPS",
}: SemanaMPSPickerModalProps) {
    const disclosure = useDisclosure();
    const [pendingSemana, setPendingSemana] = useState<SemanaMPSDTO | null>(null);

    const displayStartDate = selectedStartDate ?? selectedSemana?.startDate ?? value;
    const displayEndDate = selectedEndDate ?? selectedSemana?.endDate ?? addLocalDays(displayStartDate, 5);
    const displayCodigo = selectedCodigo ?? selectedSemana?.codigo ?? buildSemanaMpsCodigo(displayStartDate);
    const displayMpsId = selectedMpsId ?? selectedSemana?.mpsId ?? null;
    const displayEstado = selectedEstado ?? selectedSemana?.estado ?? null;
    const displayFechaGeneracionOdps = selectedFechaGeneracionOdps ?? selectedSemana?.fechaGeneracionOdps ?? null;
    const estadoLabel = getEstadoLabel(displayMpsId, displayEstado, displayFechaGeneracionOdps);
    const estadoColor = getEstadoColor(displayMpsId, displayEstado, displayFechaGeneracionOdps);

    const handleOpen = () => {
        setPendingSemana(null);
        disclosure.onOpen();
    };

    const handleClose = () => {
        setPendingSemana(null);
        disclosure.onClose();
    };

    const handleAccept = () => {
        if (!pendingSemana) {
            return;
        }
        onChange(pendingSemana);
        setPendingSemana(null);
        disclosure.onClose();
    };

    return (
        <>
            <Button
                variant="outline"
                onClick={handleOpen}
                disabled={isDisabled}
                h="auto"
                minH="64px"
                py={2}
                px={3}
                justifyContent="flex-start"
                aria-label={`${buttonLabel}. ${buttonHelperText}. Semana ${displayCodigo}, ${estadoLabel}, ${formatSemanaMpsDisplayDate(displayStartDate)} a ${formatSemanaMpsDisplayDate(displayEndDate)}`}><LuCalendar /><VStack align="start" gap={1}>
                    <Text fontSize="xs" color="teal.700" fontWeight="semibold" lineHeight="1">
                        {buttonLabel}
                    </Text>
                    <Text fontSize="xs" color="gray.500" lineHeight="1">
                        {buttonHelperText}
                    </Text>
                    <Flex gap={2} align="center" wrap="wrap">
                        <Text fontWeight="semibold" lineHeight="1.1">{displayCodigo}</Text>
                        <Badge colorPalette={estadoColor}>{estadoLabel}</Badge>
                    </Flex>
                    <Text fontSize="xs" color="gray.600" lineHeight="1.1">
                        {formatSemanaMpsDisplayDate(displayStartDate)} a {formatSemanaMpsDisplayDate(displayEndDate)}
                    </Text>
                </VStack></Button>

            <Dialog.Root open={disclosure.open} size='xl' onOpenChange={e => {
                if (!e.open) {
                    handleClose();
                }
            }}>
                <Portal>

                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>{modalTitle}</Dialog.Header>
                            <Dialog.CloseTrigger />
                            <Dialog.Body pb={6}>
                                <VStack align="stretch" gap={4}>
                                    <Box>
                                        <Text fontSize="sm" color="gray.600">
                                            Seleccione la semana ISO que se usara para consultar o crear el MPS semanal.
                                        </Text>
                                    </Box>
                                    <SemanaMPSCarouselPicker
                                        value={pendingSemana?.startDate ?? value}
                                        onChange={setPendingSemana}
                                        isDisabled={isDisabled}
                                    />
                                </VStack>
                            </Dialog.Body>
                            <Dialog.Footer gap={3}>
                                <Button variant="ghost" onClick={handleClose}>
                                    Cerrar
                                </Button>
                                <Button
                                    colorPalette="teal"
                                    onClick={handleAccept}
                                    disabled={!pendingSemana}
                                >
                                    Aceptar
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>

                </Portal>
            </Dialog.Root>
        </>
    );
}
