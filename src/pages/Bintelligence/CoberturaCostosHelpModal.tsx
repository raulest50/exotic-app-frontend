import { Text, Dialog, Portal } from "@chakra-ui/react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function CoberturaCostosHelpModal({ isOpen, onClose }: Props) {
    return (
        <Dialog.Root
            open={isOpen}
            size={{ base: "full", md: "lg" }}
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
                        <Dialog.Header>Cobertura de costos</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body pb={6}>
                            <Text>
                                La cobertura de costos indica qué porcentaje de las referencias con stock
                                positivo tiene un costo maestro vigente mayor que cero. El porcentaje global
                                considera todo el inventario; los porcentajes de Materiales y Terminados
                                muestran el mismo cálculo dentro de cada grupo. Las referencias sin costo no
                                aportan a la valorización y, si un grupo no tiene referencias con stock
                                positivo, su cobertura se muestra como “No estimable”.
                            </Text>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
