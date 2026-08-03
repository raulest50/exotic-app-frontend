import {
    Badge,
    Box,
    Divider,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    HStack,
    SimpleGrid,
    Stack,
    Text,
} from "@chakra-ui/react";
import { formatPercent, formatQuantity } from "./InformeGlobalUi";
import type { AlertaStock } from "./informesGlobales.types";

export default function InventarioAlertaDetailDrawer({
    alert,
    isOpen,
    onClose,
}: {
    alert: AlertaStock | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!alert) return null;

    return (
        <Drawer
            isOpen={isOpen}
            placement="right"
            onClose={onClose}
            size={{ base: "full", md: "md" }}
        >
            <DrawerOverlay />
            <DrawerContent>
                <DrawerCloseButton />
                <DrawerHeader pr={12}>Detalle de alerta</DrawerHeader>
                <DrawerBody pb={8}>
                    <Stack spacing={5}>
                        <Box>
                            <HStack spacing={2} mb={2} flexWrap="wrap">
                                <Badge colorScheme={alertColor(alert.tipo)}>
                                    {alertLabel(alert.tipo)}
                                </Badge>
                                <Badge variant="outline">
                                    {groupLabel(alert.grupo)}
                                </Badge>
                            </HStack>
                            <Text fontWeight="bold" fontSize="lg">
                                {alert.productoNombre}
                            </Text>
                            <Text color="app.textMuted">{alert.productoId}</Text>
                        </Box>

                        <Divider />

                        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                            <DetailMetric
                                label="Stock actual en GENERAL"
                                value={`${formatQuantity(alert.stock)} ${alert.unidadMedida}`}
                            />
                            <DetailMetric
                                label="Umbral efectivo"
                                value={quantityOrDash(alert.umbral, alert.unidadMedida)}
                            />
                            <DetailMetric
                                label="Stock mínimo configurado"
                                value={`${formatQuantity(alert.stockMinimo)} ${alert.unidadMedida}`}
                            />
                            <DetailMetric
                                label="Punto de reorden"
                                value={`${formatQuantity(alert.puntoReorden)} ${alert.unidadMedida}`}
                            />
                            <DetailMetric
                                label="Brecha frente al umbral"
                                value={quantityOrDash(
                                    alert.brechaUmbral,
                                    alert.unidadMedida,
                                )}
                            />
                            <DetailMetric
                                label="Brecha relativa"
                                value={alert.brechaPct === null
                                || alert.brechaPct === undefined
                                    ? "No estimable"
                                    : formatPercent(alert.brechaPct)}
                            />
                        </SimpleGrid>

                        <Divider />

                        <Box>
                            <Text fontWeight="semibold" mb={2}>
                                Condiciones observadas
                            </Text>
                            <Stack spacing={2}>
                                <ConditionRow
                                    label="Costo maestro vigente"
                                    met={alert.costoVigente}
                                    positiveLabel="Disponible"
                                    negativeLabel="No disponible"
                                />
                                <ConditionRow
                                    label="Stock mínimo"
                                    met={alert.umbralesIncumplidos.includes(
                                        "STOCK_MINIMO",
                                    )}
                                    positiveLabel="Incumplido"
                                    negativeLabel="No incumplido"
                                    warning
                                />
                                <ConditionRow
                                    label="Punto de reorden"
                                    met={alert.umbralesIncumplidos.includes(
                                        "PUNTO_REORDEN",
                                    )}
                                    positiveLabel="Incumplido"
                                    negativeLabel="No incumplido"
                                    warning
                                />
                            </Stack>
                        </Box>

                        <Text color="app.textMuted" fontSize="sm">
                            La clasificación corresponde al stock físico actual del
                            almacén General. Los valores iguales o menores que cero
                            configurados como umbral no participan en su cálculo.
                        </Text>
                    </Stack>
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
    return (
        <Box>
            <Text color="app.textMuted" fontSize="xs">{label}</Text>
            <Text fontWeight="semibold">{value}</Text>
        </Box>
    );
}

function ConditionRow({
    label,
    met,
    positiveLabel,
    negativeLabel,
    warning = false,
}: {
    label: string;
    met: boolean;
    positiveLabel: string;
    negativeLabel: string;
    warning?: boolean;
}) {
    return (
        <HStack justify="space-between">
            <Text fontSize="sm">{label}</Text>
            <Badge colorScheme={met ? (warning ? "orange" : "green") : "gray"}>
                {met ? positiveLabel : negativeLabel}
            </Badge>
        </HStack>
    );
}

function quantityOrDash(value: number | null | undefined, unit: string) {
    return value === null || value === undefined
        ? "—"
        : `${formatQuantity(value)} ${unit}`;
}

function alertColor(type: AlertaStock["tipo"]) {
    if (type === "STOCK_NEGATIVO") return "red";
    if (type === "AGOTADO") return "orange";
    if (type === "BAJO_UMBRAL") return "yellow";
    return "purple";
}

function alertLabel(type: AlertaStock["tipo"]) {
    const labels: Record<AlertaStock["tipo"], string> = {
        STOCK_NEGATIVO: "Stock negativo",
        AGOTADO: "Agotado",
        BAJO_UMBRAL: "Bajo umbral",
        SIN_COSTO: "Sin costo",
    };
    return labels[type];
}

function groupLabel(group: AlertaStock["grupo"]) {
    const labels: Record<AlertaStock["grupo"], string> = {
        MATERIA_PRIMA: "Materia prima",
        EMPAQUE: "Material de empaque",
        OTROS: "Otros materiales",
    };
    return labels[group];
}
