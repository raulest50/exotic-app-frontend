import { useState } from "react";
import {
    CalendarIcon,
} from "@chakra-ui/icons";
import {
    Badge,
    Box,
    Button,
    Flex,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
    useDisclosure,
} from "@chakra-ui/react";
import type { SemanaMPSDTO } from "./SemanaMPSPicker";
import SemanaMPSCarouselPicker from "./SemanaMPSCarouselPicker";
import {
    addLocalDays,
    buildSemanaMpsCodigo,
    formatSemanaMpsDisplayDate,
} from "./semanaMps.utils";

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
    buttonLabel = "Cambiar semana",
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
                leftIcon={<CalendarIcon />}
                onClick={handleOpen}
                isDisabled={isDisabled}
                h="auto"
                minH="64px"
                py={2}
                px={3}
                justifyContent="flex-start"
            >
                <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color="gray.500" lineHeight="1">
                        {buttonLabel}
                    </Text>
                    <Flex gap={2} align="center" wrap="wrap">
                        <Text fontWeight="semibold" lineHeight="1.1">{displayCodigo}</Text>
                        <Badge colorScheme={estadoColor}>{estadoLabel}</Badge>
                    </Flex>
                    <Text fontSize="xs" color="gray.600" lineHeight="1.1">
                        {formatSemanaMpsDisplayDate(displayStartDate)} a {formatSemanaMpsDisplayDate(displayEndDate)}
                    </Text>
                </VStack>
            </Button>

            <Modal isOpen={disclosure.isOpen} onClose={handleClose} size="4xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{modalTitle}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack align="stretch" spacing={4}>
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
                    </ModalBody>
                    <ModalFooter gap={3}>
                        <Button variant="ghost" onClick={handleClose}>
                            Cerrar
                        </Button>
                        <Button
                            colorScheme="teal"
                            onClick={handleAccept}
                            isDisabled={!pendingSemana}
                        >
                            Aceptar
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
