import React from "react";
import { CloseButton, Alert, Button, Text, VStack, Dialog, Portal } from "@chakra-ui/react";

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
                    <Dialog.Content maxW="lg">
                        <Dialog.Header><Dialog.Title>KPI de lead time del proveedor</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" />
                        </Dialog.CloseTrigger>
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
                                    El lead time negociado es una referencia manual del proveedor en días calendario enteros.
                                    Un campo vacío significa que no está definido; 0 indica entrega el mismo día.
                                    No se recalcula a partir de las compras ni reemplaza el tiempo de entrega de cada OCM.
                                </Text>

                                <Text fontSize="sm">
                                    El observado es la mediana histórica por par OCM-material, expresada en días de 24 horas
                                    y puede contener decimales. La diferencia resta el negociado al observado: un valor positivo
                                    indica una duración observada mayor. Solo se muestra con un KPI vigente y ambos valores
                                    disponibles; no representa una tasa de cumplimiento de entregas.
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
