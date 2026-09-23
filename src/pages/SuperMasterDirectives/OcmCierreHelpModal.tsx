import { Box, Button, CloseButton, Dialog, Heading, Portal, Stack, Text } from "@chakra-ui/react";

interface OcmCierreHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function OcmCierreHelpModal({ isOpen, onClose }: OcmCierreHelpModalProps) {
    return (
        <Dialog.Root
            open={isOpen}
            size={{ base: "full", md: "xl" }}
            placement="center"
            scrollBehavior="inside"
            closeOnEscape
            closeOnInteractOutside
            restoreFocus
            onOpenChange={event => { if (!event.open) onClose(); }}
        >
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header pr={14}>
                            <Dialog.Title>Cómo funciona el cierre automático de OCM</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton type="button" aria-label="Cerrar ayuda" size="sm" position="absolute" top={2} right={2} />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
                            <Stack gap={5} fontSize="sm" lineHeight="tall">
                                <Dialog.Description color="app.textMuted">
                                    Guía de cierre de órdenes de compra de materiales (OCM) pendientes de recepción.
                                    Los cambios de configuración entran en vigor al pulsar «Guardar configuración de cierre».
                                </Dialog.Description>

                                <Box>
                                    <Heading as="h3" size="sm" mb={2}>Qué significa recepción completa</Heading>
                                    <Text>
                                        Cada material debe haber recibido al menos la cantidad solicitada. Se suman sus
                                        recepciones parciales y, si aparece en varios renglones, sus cantidades solicitadas.
                                        Recibir de más un material no compensa el faltante de otro.
                                    </Text>
                                </Box>

                                <Box>
                                    <Heading as="h3" size="sm" mb={2}>Opciones de cierre</Heading>
                                    <Stack gap={2}>
                                        <Text>
                                            <strong>Desactivado:</strong> las órdenes conservan el cierre manual.
                                            Se sigue registrando cuándo su recepción pasa de incompleta a completa.
                                        </Text>
                                        <Text>
                                            <strong>Al completar la recepción:</strong> una orden incluida en la activación
                                            vigente se cierra al completar todos sus materiales.
                                        </Text>
                                        <Text>
                                            <strong>Días después de completar la recepción:</strong> espera el número de días
                                            configurado, un entero de al menos 1. Son días calendario, incluidos fines de semana
                                            y festivos, contados desde la fecha y hora de recepción completa en hora de Colombia.
                                            Los vencimientos se revisan aproximadamente cada minuto; el cierre puede ocurrir
                                            después de la hora prevista durante una de esas revisiones.
                                        </Text>
                                    </Stack>
                                </Box>

                                <Box>
                                    <Heading as="h3" size="sm" mb={2}>Activación y retroactividad</Heading>
                                    <Text>
                                        Al activar y guardar, se establece una fecha y hora de inicio. El cierre automático
                                        incluye las órdenes cuya recepción se complete desde ese momento, aunque hayan sido
                                        creadas antes. Las que ya estaban completas quedan fuera de esa activación y pueden
                                        cerrarse manualmente. Si se desconoce una fecha histórica de recepción completa,
                                        el sistema no la inventa.
                                    </Text>
                                </Box>

                                <Box>
                                    <Heading as="h3" size="sm" mb={2}>Cambiar, desactivar o reactivar</Heading>
                                    <Text>
                                        Cambiar el modo o los días mientras la directiva está activa conserva la fecha de inicio
                                        y aplica la nueva regla a las órdenes abiertas incluidas. Reducir el plazo o pasar al
                                        cierre por recepción completa puede hacer que una orden se cierre en la siguiente revisión.
                                    </Text>
                                    <Text mt={2}>
                                        Desactivar y guardar detiene los cierres automáticos, sin reabrir órdenes ya cerradas.
                                        Volver a activar y guardar establece un nuevo inicio: las órdenes que ya estaban completas
                                        antes de esa nueva activación quedan para cierre manual, incluso si antes esperaban un plazo.
                                    </Text>
                                </Box>

                                <Box>
                                    <Heading as="h3" size="sm" mb={2}>Cambios en las cantidades de una orden</Heading>
                                    <Text>
                                        Si una orden pendiente de cierre vuelve a estar incompleta al modificar sus cantidades,
                                        se borra su fecha de recepción completa. Cuando vuelva a completarse, se registra una nueva
                                        fecha y el plazo comienza desde allí. Reducir las cantidades solicitadas también puede
                                        hacer que una orden pase a estar completa y quede sujeta al cierre configurado.
                                    </Text>
                                </Box>

                                <Box>
                                    <Heading as="h3" size="sm" mb={2}>Cierre manual de órdenes completas</Heading>
                                    <Text>
                                        «Cerrar OCM con recepción completa» permite revisar y confirmar el cierre de todas las
                                        órdenes abiertas completas de la lista, incluidas las históricas y las que aún esperan
                                        su plazo automático. Funciona también con el cierre automático desactivado.
                                        Se comprueban nuevamente las cantidades y el estado de cada orden al confirmar.
                                    </Text>
                                </Box>

                                <Box>
                                    <Heading as="h3" size="sm" mb={2}>Qué ocurre al cerrar</Heading>
                                    <Text>
                                        La orden cambia a cerrada y se registra la fecha y el origen del cierre; si es manual,
                                        también se registra quién lo realizó. El cierre no registra nuevas recepciones,
                                        no mueve inventario y no genera pagos ni asientos contables.
                                    </Text>
                                </Box>

                                <Box borderWidth="1px" borderRadius="md" p={4}>
                                    <Heading as="h3" size="sm" mb={2}>Ejemplos ilustrativos</Heading>
                                    <Stack gap={3}>
                                        <Text>
                                            <strong>Orden creada antes de activar:</strong> creas una OCM el 1 de septiembre,
                                            activas y guardas la directiva el 10 a las 09:00 y completas su recepción el 11.
                                            Esa orden sí queda incluida. Si su recepción ya estaba completa el 9, queda fuera
                                            del cierre automático de esa activación.
                                        </Text>
                                        <Text>
                                            <strong>Plazo de dos días:</strong> con la directiva ya activa, la recepción se completa
                                            el 11 de septiembre a las 14:00. El plazo vence el 13 a las 14:00, hora de Colombia.
                                            La orden se cerrará en una revisión a partir de ese momento, siempre que siga completa
                                            y abierta y se mantenga esa configuración.
                                        </Text>
                                    </Stack>
                                </Box>
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button type="button" colorPalette="teal" width="auto" minW="7rem" flexShrink={0} px={6} onClick={onClose}>
                                Cerrar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
