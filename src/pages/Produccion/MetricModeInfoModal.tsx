import {
    Box,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SimpleGrid,
    Text,
    VStack,
    Button,
} from "@chakra-ui/react";

interface MetricModeInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MODE_DETAILS = [
    {
        title: "Actual",
        what: "Mide el promedio del tiempo que llevan las órdenes que están vivas ahora mismo en espera o en proceso.",
        how: "Se toma la foto actual del tablero en la fecha seleccionada y se promedian los minutos en estado de las tarjetas visibles en esas columnas.",
        example: "Si hoy hay 3 órdenes en espera con 10, 20 y 50 min, el promedio mostrado es 26,7 min.",
    },
    {
        title: "Histórico",
        what: "Mide el promedio real de las estancias ya cerradas que el área ha recorrido en toda su trazabilidad disponible.",
        how: "Se reconstruyen los intervalos de espera y proceso a partir de los eventos de entrada y salida del estado. Solo se cuentan intervalos cerrados.",
        example: "Si el área registró 4 esperas cerradas de 15, 30, 45 y 90 min, el promedio histórico es 45 min.",
    },
    {
        title: "Rango de fechas",
        what: "Mide el promedio real de las estancias cerradas cuyo cierre ocurrió dentro del rango seleccionado.",
        how: "Se calcula igual que el histórico, pero filtrando solo los intervalos cerrados que terminaron entre la fecha desde y la fecha hasta.",
        example: "Si entre el 1 y el 3 de mayo cerraron 3 procesos de 40, 60 y 80 min, el promedio del rango es 60 min.",
    },
];

export default function MetricModeInfoModal({
    isOpen,
    onClose,
}: MetricModeInfoModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Cómo interpretar los promedios</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <Text color="gray.600">
                            `Actual` mira el estado vivo del tablero. `Histórico` y `Rango de fechas`
                            miran tiempos cerrados que ya fueron recorridos por las órdenes.
                        </Text>

                        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
                            {MODE_DETAILS.map((mode) => (
                                <Box
                                    key={mode.title}
                                    borderWidth="1px"
                                    borderRadius="lg"
                                    bg="gray.50"
                                    p={4}
                                >
                                    <VStack align="stretch" spacing={3}>
                                        <Text fontWeight="bold" fontSize="lg">
                                            {mode.title}
                                        </Text>
                                        <Box>
                                            <Text fontWeight="semibold" mb={1}>
                                                Qué mide
                                            </Text>
                                            <Text color="gray.700" fontSize="sm">
                                                {mode.what}
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontWeight="semibold" mb={1}>
                                                Cómo se calcula
                                            </Text>
                                            <Text color="gray.700" fontSize="sm">
                                                {mode.how}
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontWeight="semibold" mb={1}>
                                                Ejemplo
                                            </Text>
                                            <Text color="gray.700" fontSize="sm">
                                                {mode.example}
                                            </Text>
                                        </Box>
                                    </VStack>
                                </Box>
                            ))}
                        </SimpleGrid>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onClose}>Cerrar</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
