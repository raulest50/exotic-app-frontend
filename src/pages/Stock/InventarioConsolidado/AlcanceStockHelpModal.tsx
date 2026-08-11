import { Steps, Box, Text, VStack, Separator, Dialog, Portal } from '@chakra-ui/react';

type AlcanceStockHelpModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function AlcanceStockHelpModal({
    isOpen,
    onClose,
}: AlcanceStockHelpModalProps) {
    return (
        <Dialog.Root
            open={isOpen}
            size={{ base: 'full', md: 'lg' }}
            placement='center'
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
                        <Dialog.Header>¿Qué stock estoy viendo?</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body pb={6}>
                            <VStack align="stretch" gap={4}>
                                <Text>
                                    El alcance define qué almacenes participan en el saldo mostrado. No
                                    mueve inventario ni modifica transacciones existentes.
                                </Text>

                                <Box>
                                    <Text fontWeight="semibold">Disponible operativo</Text>
                                    <Text color="gray.600">
                                        Solo GENERAL. Es el stock utilizable por la operación y el mismo
                                        alcance de almacén empleado por el Informe Global, cobertura,
                                        proyección y dispensación.
                                    </Text>
                                </Box>

                                <Box>
                                    <Text fontWeight="semibold">Stock restringido/no disponible</Text>
                                    <Text color="gray.600">
                                        AVERIAS + CALIDAD + DEVOLUCIONES. Es inventario bajo custodia, pero
                                        no disponible para la operación normal.
                                    </Text>
                                </Box>

                                <Box>
                                    <Text fontWeight="semibold">Inventario físico total</Text>
                                    <Text color="gray.600">
                                        GENERAL + AVERIAS + CALIDAD + DEVOLUCIONES. Debe equivaler a la suma
                                        del disponible operativo y el stock restringido.
                                    </Text>
                                </Box>

                                <Box>
                                    <Text fontWeight="semibold">Personalizado</Text>
                                    <Text color="gray.600">
                                        Permite combinar únicamente los almacenes que se quieran consultar.
                                    </Text>
                                </Box>

                                <Separator />

                                <Text fontSize="sm" color="gray.600">
                                    Solo se suman movimientos que afectan inventario. Los ajustes positivos
                                    y negativos participan según su almacén; los consumos directos usados
                                    únicamente para trazabilidad no alteran estos saldos.
                                </Text>
                            </VStack>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
