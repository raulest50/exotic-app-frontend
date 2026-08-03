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

export default function MaterialOpHelpModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
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
                <ModalHeader>
                    Material dispensado, WIP y material en tránsito
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <Stack spacing={4}>
                        <Stack spacing={2}>
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

                        <Stack spacing={2}>
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

                        <Alert
                            status="info"
                            alignItems="flex-start"
                            borderRadius="md"
                        >
                            <AlertIcon mt={0.5} />
                            <Text fontSize="sm">
                                Ambas vistas pueden mostrar el mismo valor cuando
                                las OP no tienen consumos directos.
                            </Text>
                        </Alert>

                        <UnorderedList spacing={2} pl={4}>
                            <ListItem>
                                La OP con fabricación completada permanece incluida
                                hasta confirmar el ingreso del producto terminado.
                            </ListItem>
                            <ListItem>
                                Los valores usan el costo maestro vigente, no el
                                costo histórico de cada movimiento.
                            </ListItem>
                            <ListItem>
                                Las referencias sin costo positivo conservan sus
                                cantidades, pero aportan $0 a la estimación.
                            </ListItem>
                            <ListItem>
                                No incluye mano de obra, indirectos, capacidad ni
                                movimientos de la cuenta contable 1210.
                            </ListItem>
                        </UnorderedList>

                        <Text color="app.textMuted" fontSize="sm">
                            “Material en tránsito” se reserva normalmente para
                            compras o transferencias aún no recibidas. Por eso no
                            describe estas salidas hacia producción; el bloque de
                            OCM pendientes cubre el abastecimiento aún por ingresar.
                        </Text>
                    </Stack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
