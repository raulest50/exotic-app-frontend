import { Alert, CloseButton, Code, Stack, Text, List, Dialog, Portal } from "@chakra-ui/react";

export default function MaterialOpHelpModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
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
                        <Dialog.Header>
                            <Dialog.Title>Material dispensado, WIP y material en tránsito</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" position="absolute" top="2" right="2" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body pb={6}>
                            <Stack gap={4}>
                                <Stack gap={2}>
                                    <Text fontWeight="semibold">Material dispensado</Text>
                                    <Code p={3} borderRadius="md" whiteSpace="normal">
                                        Dispensaciones normales + reposiciones por avería
                                    </Code>
                                    <Text>
                                        Representa las salidas físicas inventariables del
                                        almacén General asociadas a órdenes de producción
                                        que todavía no están terminadas ni canceladas.
                                    </Text>
                                </Stack>

                                <Stack gap={2}>
                                    <Text fontWeight="semibold">WIP material estimado</Text>
                                    <Code p={3} borderRadius="md" whiteSpace="normal">
                                        Material dispensado + consumos directos formales
                                    </Code>
                                    <Text>
                                        Es una estimación bruta del costo material cargado
                                        a las OP abiertas desde el primer movimiento
                                        formal de material. Incluye reposiciones y no
                                        descuenta los materiales reportados como
                                        averiados.
                                    </Text>
                                </Stack>

                                <Alert.Root
                                    status="info"
                                    alignItems="flex-start"
                                    borderRadius="md"
                                >
                                    <Alert.Indicator mt={0.5} />
                                    <Text fontSize="sm">
                                        Ambas vistas pueden mostrar el mismo valor cuando
                                        las OP no tienen consumos directos.
                                    </Text>
                                </Alert.Root>

                                <List.Root as='ul' gap={2} pl={4}>
                                    <List.Item>
                                        La OP con fabricación completada permanece incluida
                                        hasta confirmar el ingreso del producto terminado.
                                    </List.Item>
                                    <List.Item>
                                        Los valores usan el costo maestro vigente, no el
                                        costo histórico de cada movimiento.
                                    </List.Item>
                                    <List.Item>
                                        Las referencias sin costo positivo conservan sus
                                        cantidades, pero aportan $0 a la estimación.
                                    </List.Item>
                                    <List.Item>
                                        No incluye mano de obra, indirectos, capacidad ni
                                        movimientos de la cuenta contable 1210.
                                    </List.Item>
                                </List.Root>

                                <Text color="app.textMuted" fontSize="sm">
                                    “Material en tránsito” se reserva normalmente para
                                    compras o transferencias aún no recibidas. Por eso no
                                    describe estas salidas hacia producción; el bloque de
                                    OCM pendientes cubre el abastecimiento aún por ingresar.
                                </Text>
                            </Stack>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
