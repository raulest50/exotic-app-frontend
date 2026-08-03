import {
    Box,
    Divider,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
} from '@chakra-ui/react';

type AlcanceStockHelpModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function AlcanceStockHelpModal({
    isOpen,
    onClose,
}: AlcanceStockHelpModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size={{ base: 'full', md: 'lg' }}
            isCentered
        >
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>¿Qué stock estoy viendo?</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack align="stretch" spacing={4}>
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

                        <Divider />

                        <Text fontSize="sm" color="gray.600">
                            Solo se suman movimientos que afectan inventario. Los ajustes positivos
                            y negativos participan según su almacén; los consumos directos usados
                            únicamente para trazabilidad no alteran estos saldos.
                        </Text>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
