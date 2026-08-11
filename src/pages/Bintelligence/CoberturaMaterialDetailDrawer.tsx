import {
    Alert,
    Badge,
    Box,
    CloseButton,
    Drawer,
    HStack,
    SimpleGrid,
    Stack,
    Text,
    Separator,
    Portal,
    List,
} from "@chakra-ui/react";
import {
    formatDate,
    formatDateTime,
    formatQuantity,
} from "./InformeGlobalUi";
import type {
    EstimacionCoberturaMaterial,
    FuenteDemandaCobertura,
} from "./informesGlobales.types";

export default function CoberturaMaterialDetailDrawer({
    estimate,
    cutoff,
    windowDays,
    demandSource,
    isOpen,
    onClose,
}: {
    estimate: EstimacionCoberturaMaterial | null;
    cutoff: string;
    windowDays: 7 | 30 | 90;
    demandSource: FuenteDemandaCobertura;
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!estimate) return null;

    return (
        <Drawer.Root
            open={isOpen}
            placement='end'
            size={{ base: "full", md: "md" }}
            onOpenChange={e => {
                if (!e.open) {
                    onClose();
                }
            }}
        >
            <Portal>

                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content>
                        <Drawer.CloseTrigger asChild>
                            <CloseButton size="sm" position="absolute" top="2" right="2" />
                        </Drawer.CloseTrigger>
                        <Drawer.Header pr={12}>
                            <Drawer.Title>Detalle de cobertura</Drawer.Title>
                        </Drawer.Header>
                        <Drawer.Body pb={8}>
                            <Stack gap={5}>
                                <Box>
                                    <HStack gap={2} mb={2} flexWrap="wrap">
                                        <Badge colorPalette={horizonColor(estimate)}>
                                            {horizonLabel(estimate)}
                                        </Badge>
                                        <Badge variant="outline">
                                            {groupLabel(estimate.grupo)}
                                        </Badge>
                                        {estimate.confianzaBaja ? (
                                            <Badge colorPalette="yellow">
                                                Confianza baja
                                            </Badge>
                                        ) : (
                                            <Badge colorPalette="green">
                                                Confianza aceptable
                                            </Badge>
                                        )}
                                    </HStack>
                                    <Text fontWeight="bold" fontSize="lg">
                                        {estimate.nombre}
                                    </Text>
                                    <Text color="app.textMuted">{estimate.productoId}</Text>
                                </Box>

                                <Separator />

                                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                                    <DetailMetric
                                        label="Stock físico actual"
                                        value={`${formatQuantity(estimate.stockActual)} ${estimate.unidadMedida}`}
                                    />
                                    <DetailMetric
                                        label="Demanda media diaria"
                                        value={`${formatQuantity(estimate.demandaMediaDiaria)} ${estimate.unidadMedida}/día`}
                                    />
                                    <DetailMetric
                                        label="Demanda operativa"
                                        value={`${formatQuantity(estimate.demandaMediaDiariaOperativa)} ${estimate.unidadMedida}/día`}
                                    />
                                    <DetailMetric
                                        label="Demanda por contingencias"
                                        value={`${formatQuantity(estimate.demandaMediaDiariaContingencia)} ${estimate.unidadMedida}/día`}
                                    />
                                    <DetailMetric
                                        label="Días restantes"
                                        value={estimate.diasHastaAgotamiento === null
                                        || estimate.diasHastaAgotamiento === undefined
                                            ? "No estimable"
                                            : formatQuantity(
                                                estimate.diasHastaAgotamiento,
                                            )}
                                    />
                                    <DetailMetric
                                        label="Fecha estimada"
                                        value={estimate.fechaAgotamiento
                                            ? formatDate(estimate.fechaAgotamiento)
                                            : "No estimable"}
                                    />
                                    <DetailMetric
                                        label="Intervalo estimado"
                                        value={intervalLabel(
                                            estimate.intervaloFechaMin,
                                            estimate.intervaloFechaMax,
                                        )}
                                    />
                                    <DetailMetric
                                        label="Días con demanda"
                                        value={`${estimate.diasConDemanda} de ${windowDays}`}
                                    />
                                    <DetailMetric
                                        label="Días con dispensación"
                                        value={estimate.diasConDispensacion.toLocaleString(
                                            "es-CO",
                                        )}
                                    />
                                    <DetailMetric
                                        label="Contingencias incluidas"
                                        value={estimate.ajustesContingenciaIncluidos
                                            .toLocaleString("es-CO")}
                                    />
                                </SimpleGrid>

                                {estimate.confianzaBaja ? (
                                    <Alert.Root
                                        status="warning"
                                        alignItems="flex-start"
                                        borderRadius="md"
                                    >
                                        <Alert.Indicator mt={0.5} />
                                        <Box>
                                            <Text fontWeight="semibold" mb={1}>
                                                Motivos de confianza baja
                                            </Text>
                                            <List.Root as='ul' pl={4} gap={1}>
                                                {estimate.motivosConfianzaBaja.map(
                                                    (reason) => (
                                                        <List.Item
                                                            key={reason}
                                                            fontSize="sm"
                                                        >
                                                            {reason}
                                                        </List.Item>
                                                    ),
                                                )}
                                            </List.Root>
                                        </Box>
                                    </Alert.Root>
                                ) : null}

                                <Separator />

                                <Stack gap={2}>
                                    <Text color="app.textMuted" fontSize="sm">
                                        Stock del almacén General al{" "}
                                        {formatDateTime(cutoff)}.
                                    </Text>
                                    <Text color="app.textMuted" fontSize="sm">
                                        Fuente de demanda:{" "}
                                        {demandSource === "SOLO_DISPENSACIONES"
                                            ? "dispensaciones formales"
                                            : "dispensaciones formales y contingencias de producción"}.
                                        La proyección supone que el ritmo observado se
                                        repite y que no ingresan materiales; no constituye
                                        un compromiso de abastecimiento.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Drawer.Body>
                    </Drawer.Content>
                </Drawer.Positioner>

            </Portal>
        </Drawer.Root>
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

function intervalLabel(
    minimum?: string | null,
    maximum?: string | null,
) {
    if (!minimum || !maximum) return "No estimable";
    return `${formatDate(minimum)} – ${formatDate(maximum)}`;
}

function groupLabel(group: EstimacionCoberturaMaterial["grupo"]) {
    const labels: Record<EstimacionCoberturaMaterial["grupo"], string> = {
        MATERIA_PRIMA: "Materia prima",
        EMPAQUE: "Material de empaque",
        OTROS: "Otros materiales",
    };
    return labels[group];
}

function horizonLabel(estimate: EstimacionCoberturaMaterial) {
    const days = estimate.diasHastaAgotamiento;
    if (days === null || days === undefined) return "No estimable";
    if (days <= 0) return "Agotado";
    if (days <= 7) return "Hasta 7 días";
    if (days <= 30) return "8–30 días";
    return "Más de 30 días";
}

function horizonColor(estimate: EstimacionCoberturaMaterial) {
    const days = estimate.diasHastaAgotamiento;
    if (days === null || days === undefined) return "gray";
    if (days <= 0) return "red";
    if (days <= 7) return "orange";
    if (days <= 30) return "yellow";
    return "green";
}
