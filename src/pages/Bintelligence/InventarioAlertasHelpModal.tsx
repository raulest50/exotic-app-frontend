import {
    ListItem,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    OrderedList,
    Text,
    Button,
    Stack,
} from "@chakra-ui/react";

export default function InventarioAlertasHelpModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Cómo se clasifican las alertas</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Stack spacing={4}>
                        <Text>
                            Cada material recibe una clasificación principal sin
                            doble conteo, usando este orden:
                        </Text>
                        <OrderedList spacing={2} pl={4}>
                            <ListItem><b>Stock negativo:</b> saldo menor que cero.</ListItem>
                            <ListItem><b>Agotado:</b> saldo igual a cero.</ListItem>
                            <ListItem>
                                <b>Bajo umbral:</b> saldo positivo que alcanzó el
                                stock mínimo o el punto de reorden.
                            </ListItem>
                            <ListItem>
                                <b>Sin costo:</b> saldo positivo, sin una alerta
                                anterior y sin costo maestro vigente.
                            </ListItem>
                        </OrderedList>
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
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>Entendido</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
