import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Text,
} from "@chakra-ui/react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function CoberturaCostosHelpModal({ isOpen, onClose }: Props) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size={{ base: "full", md: "lg" }}
            isCentered
        >
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Cobertura de costos</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <Text>
                        La cobertura de costos indica qué porcentaje de las referencias con stock
                        positivo tiene un costo maestro vigente mayor que cero. El porcentaje global
                        considera todo el inventario; los porcentajes de Materiales y Terminados
                        muestran el mismo cálculo dentro de cada grupo. Las referencias sin costo no
                        aportan a la valorización y, si un grupo no tiene referencias con stock
                        positivo, su cobertura se muestra como “No estimable”.
                    </Text>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
