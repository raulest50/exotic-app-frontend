import React from "react";
import { Alert, Button, Text, VStack, Dialog, Portal } from "@chakra-ui/react";

interface ProveedorLeadTimeKpiHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProveedorLeadTimeKpiHelpModal: React.FC<ProveedorLeadTimeKpiHelpModalProps> = ({ isOpen, onClose }) => {
    return (
        <Dialog.Root open={isOpen} size='lg' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>KPI de lead time del proveedor</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack align="stretch" gap={4}>
                                <Alert.Root status="info" borderRadius="md">
                                    <Alert.Indicator />
                                    <Text fontSize="sm">
                                        Esta es una metrica auxiliar observada. No modifica automaticamente el tiempo de entrega
                                        de la OCM y no debe tratarse como maestro aprobado de planeacion MRP.
                                    </Text>
                                </Alert.Root>

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
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button colorPalette="blue" onClick={onClose}>
                                Entendido
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default ProveedorLeadTimeKpiHelpModal;
