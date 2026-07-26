import {
    Alert,
    AlertIcon,
    Code,
    ListItem,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Stack,
    Text,
    UnorderedList,
} from "@chakra-ui/react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function AjustesImpactoHelpModal({ isOpen, onClose }: Props) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size={{ base: "full", md: "lg" }}
            isCentered
            scrollBehavior="inside"
        >
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>¿Cómo se calcula el mayor impacto?</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <Stack spacing={4}>
                        <Text>
                            El ranking considera los ajustes positivos y negativos registrados
                            en el almacén General durante el período seleccionado. Las materias
                            primas y los materiales de empaque se clasifican por separado.
                        </Text>

                        <Stack spacing={2}>
                            <Text fontWeight="semibold">Fórmula</Text>
                            <Code p={3} borderRadius="md" whiteSpace="normal">
                                Valor del movimiento = |cantidad| × costo maestro actual
                            </Code>
                            <Code p={3} borderRadius="md" whiteSpace="normal">
                                Impacto = valor de ajustes positivos + valor de ajustes negativos
                            </Code>
                        </Stack>

                        <Alert status="info" alignItems="flex-start" borderRadius="md">
                            <AlertIcon mt={0.5} />
                            <Text fontSize="sm">
                                Una entrada de $300.000 y una salida de $200.000 producen un
                                impacto de $500.000 y un balance neto de +$100.000. Las entradas
                                y salidas no se compensan para ordenar el ranking.
                            </Text>
                        </Alert>

                        <UnorderedList spacing={2} pl={4}>
                            <ListItem>
                                Los valores son estimados con el costo maestro vigente al
                                consultar, no con un costo histórico del movimiento.
                            </ListItem>
                            <ListItem>
                                Un material sin costo vigente conserva cantidades y conteos,
                                pero aporta $0 al impacto económico y se marca como tal.
                            </ListItem>
                            <ListItem>
                                Al filtrar solo positivos o solo negativos, el ranking se
                                recalcula usando únicamente esos movimientos.
                            </ListItem>
                            <ListItem>
                                Otros tipos de producto participan en los KPI globales, pero no
                                en los rankings de materias primas y empaques.
                            </ListItem>
                        </UnorderedList>
                    </Stack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
