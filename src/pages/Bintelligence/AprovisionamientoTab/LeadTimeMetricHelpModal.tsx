import {
    Code,
    Divider,
    ListItem,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    OrderedList,
    Stack,
    Text,
} from "@chakra-ui/react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function LeadTimeMetricHelpModal({ isOpen, onClose }: Props) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Calculo de lead time proveedor-material</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <Stack spacing={5}>
                        <Text>
                            Esta vista calcula una metrica informativa para analizar el comportamiento historico de un proveedor con un material.
                            No es un maestro de planificacion MRP y no guarda el resultado como valor aprobado.
                        </Text>

                        <Divider />

                        <Stack spacing={2}>
                            <Text fontWeight="semibold">Ecuacion usada</Text>
                            <Code display="block" whiteSpace="pre-wrap" p={3} borderRadius="md">
                                L = fechaRecepcionCompleta - fechaInicio
                            </Code>
                            <Text>
                                La fecha inicial es la fecha de envio al proveedor. Para OCM historicas que aun no tienen ese dato, se usa
                                fecha de emision como fallback explicito.
                            </Text>
                        </Stack>

                        <Stack spacing={2}>
                            <Text fontWeight="semibold">Recepcion completa</Text>
                            <Text>
                                La recepcion completa es la primera fecha en la que la cantidad recibida acumulada alcanza o supera la cantidad
                                ordenada del material en esa OCM.
                            </Text>
                        </Stack>

                        <Stack spacing={2}>
                            <Text fontWeight="semibold">Algoritmo minimo</Text>
                            <OrderedList spacing={2} pl={4}>
                                <ListItem>Buscar OCM del proveedor y material dentro de la ventana seleccionada.</ListItem>
                                <ListItem>Tomar como inicio la fecha de envio al proveedor, o fecha de emision si no existe.</ListItem>
                                <ListItem>Ordenar las recepciones positivas por fecha y acumular cantidad recibida.</ListItem>
                                <ListItem>Calcular los dias hasta la primera fecha donde el acumulado completa lo ordenado.</ListItem>
                                <ListItem>Usar la mediana de las observaciones validas como lead time tipico.</ListItem>
                            </OrderedList>
                        </Stack>

                        <Stack spacing={2}>
                            <Text fontWeight="semibold">Por que mediana</Text>
                            <Text>
                                La mediana reduce el efecto de casos atipicos, por ejemplo una entrega excepcionalmente lenta por una causa puntual.
                                Por eso es adecuada como resumen operativo simple cuando se comparan historicos de entrega.
                            </Text>
                        </Stack>
                    </Stack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
