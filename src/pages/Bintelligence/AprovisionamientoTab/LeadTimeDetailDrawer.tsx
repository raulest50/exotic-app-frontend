import {
    Box,
    Divider,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    Flex,
    Heading,
    IconButton,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    StatLabel,
    StatNumber,
    Text,
    Tooltip,
    useDisclosure,
} from "@chakra-ui/react";
import { QuestionIcon } from "@chakra-ui/icons";
import type { LeadTimeProveedorMaterialDTO, LeadTimeStatsDTO } from "./types.ts";
import { formatDateTime, formatNumber } from "./utils.ts";
import LeadTimeDetailHelpModal from "./LeadTimeDetailHelpModal.tsx";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    loading: boolean;
    detail: LeadTimeProveedorMaterialDTO | null;
    selectedProveedorNombre?: string | null;
};

function StatsBlock({ title, stats }: { title: string; stats: LeadTimeStatsDTO | undefined }) {
    if (!stats) {
        return null;
    }

    return (
        <Box>
            <Heading size="sm" mb={3}>{title}</Heading>
            {!stats.calculable ? (
                <Text color="app.textMuted">{stats.reason || "No se pudo calcular."}</Text>
            ) : (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Stat>
                        <StatLabel>Lead time representativo</StatLabel>
                        <StatNumber>{formatNumber(stats.representativeLeadTimeDays, 4)} dias</StatNumber>
                    </Stat>
                    <Stat>
                        <StatLabel>Confianza</StatLabel>
                        <StatNumber>{formatNumber(stats.confidenceScore, 0)} / 100</StatNumber>
                    </Stat>
                    <Stat>
                        <StatLabel>Promedio</StatLabel>
                        <StatNumber>{formatNumber(stats.averageLeadTimeDays, 4)} dias</StatNumber>
                    </Stat>
                    <Stat>
                        <StatLabel>Mediana</StatLabel>
                        <StatNumber>{formatNumber(stats.medianLeadTimeDays, 4)} dias</StatNumber>
                    </Stat>
                    <Stat>
                        <StatLabel>Minimo</StatLabel>
                        <StatNumber>{formatNumber(stats.minLeadTimeDays, 4)} dias</StatNumber>
                    </Stat>
                    <Stat>
                        <StatLabel>Maximo</StatLabel>
                        <StatNumber>{formatNumber(stats.maxLeadTimeDays, 4)} dias</StatNumber>
                    </Stat>
                    <Stat>
                        <StatLabel>Desviacion estandar</StatLabel>
                        <StatNumber>{formatNumber(stats.standardDeviationLeadTimeDays, 4)} dias</StatNumber>
                    </Stat>
                    <Stat>
                        <StatLabel>Observaciones validas</StatLabel>
                        <StatNumber>{formatNumber(stats.validObservations, 0)}</StatNumber>
                    </Stat>
                    <Stat>
                        <StatLabel>Ordenes consideradas</StatLabel>
                        <StatNumber>{formatNumber(stats.totalOrdersConsidered, 0)}</StatNumber>
                    </Stat>
                    <Stat>
                        <StatLabel>Ultima recepcion observada</StatLabel>
                        <StatNumber fontSize="md">{formatDateTime(stats.lastReceiptObservedAt)}</StatNumber>
                    </Stat>
                </SimpleGrid>
            )}
        </Box>
    );
}

export default function LeadTimeDetailDrawer({
    isOpen,
    onClose,
    loading,
    detail,
    selectedProveedorNombre,
}: Props) {
    const {
        isOpen: isHelpOpen,
        onOpen: onHelpOpen,
        onClose: onHelpClose,
    } = useDisclosure();

    return (
        <>
            <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xl">
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerCloseButton />
                    <DrawerHeader pr={16}>
                        <Flex align="center" justify="space-between" gap={3}>
                            <Text>Detalle de lead time</Text>
                            <Tooltip label="Explicacion de metricas y por que se usan">
                                <IconButton
                                    aria-label="Ayuda del detalle de lead time"
                                    icon={<QuestionIcon />}
                                    size="sm"
                                    variant="outline"
                                    colorScheme="blue"
                                    onClick={onHelpOpen}
                                />
                            </Tooltip>
                        </Flex>
                    </DrawerHeader>
                    <DrawerBody>
                        {loading ? (
                            <Stack align="center" justify="center" h="full">
                                <Spinner />
                                <Text color="app.textMuted">Cargando detalle proveedor-material...</Text>
                            </Stack>
                        ) : !detail ? (
                            <Text color="app.textMuted">No hay detalle disponible.</Text>
                        ) : (
                            <Stack spacing={6}>
                                <Box>
                                    <Heading size="sm">{selectedProveedorNombre || detail.proveedorNombre}</Heading>
                                    <Text color="app.textMuted">{detail.proveedorId}</Text>
                                    <Text mt={2}>
                                        Material: <b>{detail.materialNombre}</b> ({detail.materialId})
                                    </Text>
                                    <Text>
                                        Ventana: {detail.ventanaDias} dias, fecha corte {detail.fechaCorte}
                                    </Text>
                                </Box>

                                <Divider />
                                <StatsBlock title="Primera recepcion" stats={detail.firstReceipt} />
                                <Divider />
                                <StatsBlock title="Recepcion completa" stats={detail.completeReceipt} />
                            </Stack>
                        )}
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
            <LeadTimeDetailHelpModal isOpen={isHelpOpen} onClose={onHelpClose} />
        </>
    );
}
