import React from "react";
import {
    Alert,
    AlertIcon,
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
} from "@chakra-ui/react";

interface ProveedorLeadTimeKpiHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProveedorLeadTimeKpiHelpModal: React.FC<ProveedorLeadTimeKpiHelpModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>KPI de lead time del proveedor</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <Alert status="info" borderRadius="md">
                            <AlertIcon />
                            <Text fontSize="sm">
                                Esta es una metrica auxiliar observada. No modifica automaticamente el tiempo de entrega
                                de la OCM y no debe tratarse como maestro aprobado de planeacion MRP.
                            </Text>
                        </Alert>

                        <Text fontSize="sm">
                            El KPI resume entregas historicas completas del proveedor y muestra un lead time tipico a
                            nivel proveedor. Sirve como referencia rapida para compras, seguimiento y conversacion con el
                            proveedor.
                        </Text>

                        <Text fontSize="sm">
                            Para planeacion, el dato mas correcto suele ser el lead time por par material-proveedor,
                            porque un mismo proveedor puede entregar materiales distintos con tiempos diferentes.
                        </Text>

                        <Text fontSize="sm">
                            Estado vigente significa que el job encontro observaciones validas recientes. Desactualizado
                            significa que se conserva el ultimo valor conocido, pero la ventana mas reciente no tuvo
                            observaciones validas. Sin informacion indica que todavia no existe un valor calculable.
                        </Text>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>
                        Entendido
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ProveedorLeadTimeKpiHelpModal;
