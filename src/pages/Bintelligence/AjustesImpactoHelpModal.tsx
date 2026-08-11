import { Steps, Alert, Code, Stack, Text, List, Dialog, Portal } from "@chakra-ui/react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function AjustesImpactoHelpModal({ isOpen, onClose }: Props) {
    return (
        <Dialog.Root
            open={isOpen}
            size={{ base: "full", md: "lg" }}
            placement='center'
            scrollBehavior="inside"
            onOpenChange={e => {
                if (!e.open) {
                    onClose();
                }
            }}
        >
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>¿Cómo se calcula el mayor impacto?</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body pb={6}>
                            <Stack gap={4}>
                                <Text>
                                    El ranking considera los ajustes positivos y negativos registrados
                                    en el almacén General durante el período seleccionado. Las materias
                                    primas y los materiales de empaque se clasifican por separado.
                                </Text>

                                <Stack gap={2}>
                                    <Text fontWeight="semibold">Fórmula</Text>
                                    <Code p={3} borderRadius="md" whiteSpace="normal">
                                        Valor del movimiento = |cantidad| × costo maestro actual
                                    </Code>
                                    <Code p={3} borderRadius="md" whiteSpace="normal">
                                        Impacto = valor de ajustes positivos + valor de ajustes negativos
                                    </Code>
                                </Stack>

                                <Alert.Root status="info" alignItems="flex-start" borderRadius="md">
                                    <Alert.Indicator mt={0.5} />
                                    <Text fontSize="sm">
                                        Una entrada de $300.000 y una salida de $200.000 producen un
                                        impacto de $500.000 y un balance neto de +$100.000. Las entradas
                                        y salidas no se compensan para ordenar el ranking.
                                    </Text>
                                </Alert.Root>

                                <List.Root as='ul' gap={2} pl={4}>
                                    <List.Item>
                                        Los valores son estimados con el costo maestro vigente al
                                        consultar, no con un costo histórico del movimiento.
                                    </List.Item>
                                    <List.Item>
                                        Un material sin costo vigente conserva cantidades y conteos,
                                        pero aporta $0 al impacto económico y se marca como tal.
                                    </List.Item>
                                    <List.Item>
                                        Al filtrar solo positivos o solo negativos, el ranking se
                                        recalcula usando únicamente esos movimientos.
                                    </List.Item>
                                    <List.Item>
                                        Otros tipos de producto participan en los KPI globales, pero no
                                        en los rankings de materias primas y empaques.
                                    </List.Item>
                                </List.Root>
                            </Stack>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
