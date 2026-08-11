import { CloseButton, Text, Button, Stack, List, Dialog, Portal } from "@chakra-ui/react";

export default function InventarioAlertasHelpModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    return (
        <Dialog.Root open={isOpen} size='lg' placement='center' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Cómo se clasifican las alertas</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" position="absolute" top="2" right="2" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
                            <Stack gap={4}>
                                <Text>
                                    Cada material recibe una clasificación principal sin
                                    doble conteo, usando este orden:
                                </Text>
                                <List.Root as='ol' gap={2} pl={4}>
                                    <List.Item><b>Stock negativo:</b> saldo menor que cero.</List.Item>
                                    <List.Item><b>Agotado:</b> saldo igual a cero.</List.Item>
                                    <List.Item>
                                        <b>Bajo umbral:</b> saldo positivo que alcanzó el
                                        stock mínimo o el punto de reorden.
                                    </List.Item>
                                    <List.Item>
                                        <b>Sin costo:</b> saldo positivo, sin una alerta
                                        anterior y sin costo maestro vigente.
                                    </List.Item>
                                </List.Root>
                                <Text>
                                    El umbral efectivo es el mayor valor positivo entre
                                    stock mínimo y punto de reorden. El detalle conserva
                                    las demás condiciones observadas aunque no sean la
                                    clasificación principal.
                                </Text>
                                <Text color="app.textMuted" fontSize="sm">
                                    Estas alertas representan el stock actual del almacén
                                    General; el periodo del informe no reconstruye alertas
                                    históricas.
                                </Text>
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button colorPalette="blue" onClick={onClose}>Entendido</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
