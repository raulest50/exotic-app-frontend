import { CloseButton, Code, Stack, Text, Separator, List, Dialog, Portal } from "@chakra-ui/react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function LeadTimeMetricHelpModal({ isOpen, onClose }: Props) {
    return (
        <Dialog.Root open={isOpen} size={{ base: "full", md: "xl" }} scrollBehavior="inside" onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW={{ md: "3xl" }}>
                        <Dialog.Header>
                            <Dialog.Title>Calculo de lead time proveedor-material</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" position="absolute" top="2" right="2" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body pb={6}>
                            <Stack gap={5}>
                                <Text>
                                    Esta vista calcula una metrica informativa para analizar el comportamiento historico de un proveedor con un material.
                                    No es un maestro de planificacion MRP y no guarda el resultado como valor aprobado.
                                </Text>

                                <Separator />

                                <Stack gap={2}>
                                    <Text fontWeight="semibold">Ecuacion usada</Text>
                                    <Code display="block" whiteSpace="pre-wrap" p={3} borderRadius="md">
                                        L = fechaRecepcionCompleta - fechaInicio
                                    </Code>
                                    <Text>
                                        La fecha inicial es la fecha de envio al proveedor. Para OCM historicas que aun no tienen ese dato, se usa
                                        fecha de emision como fallback explicito.
                                    </Text>
                                </Stack>

                                <Stack gap={2}>
                                    <Text fontWeight="semibold">Recepcion completa</Text>
                                    <Text>
                                        La recepcion completa es la primera fecha en la que la cantidad recibida acumulada alcanza o supera la cantidad
                                        ordenada del material en esa OCM.
                                    </Text>
                                </Stack>

                                <Stack gap={2}>
                                    <Text fontWeight="semibold">Algoritmo minimo</Text>
                                    <List.Root as='ol' gap={2} pl={4}>
                                        <List.Item>Buscar OCM del proveedor y material dentro de la ventana seleccionada.</List.Item>
                                        <List.Item>Tomar como inicio la fecha de envio al proveedor, o fecha de emision si no existe.</List.Item>
                                        <List.Item>Ordenar las recepciones positivas por fecha y acumular cantidad recibida.</List.Item>
                                        <List.Item>Calcular los dias hasta la primera fecha donde el acumulado completa lo ordenado.</List.Item>
                                        <List.Item>Usar la mediana de las observaciones validas como lead time tipico.</List.Item>
                                    </List.Root>
                                </Stack>

                                <Stack gap={2}>
                                    <Text fontWeight="semibold">Por que mediana</Text>
                                    <Text>
                                        La mediana reduce el efecto de casos atipicos, por ejemplo una entrega excepcionalmente lenta por una causa puntual.
                                        Por eso es adecuada como resumen operativo simple cuando se comparan historicos de entrega.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
