import {
    Box,
    Drawer,
    Flex,
    Heading,
    IconButton,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    Text,
    useDisclosure,
    Separator,
    Portal,
} from "@chakra-ui/react";
import { Tooltip } from '@/components/ui/tooltip';
import type { LeadTimeProveedorMaterialDTO, LeadTimeStatsDTO } from "./types.ts";
import { formatDateTime, formatNumber } from "./utils.ts";
import LeadTimeDetailHelpModal from "./LeadTimeDetailHelpModal.tsx";
import { LuHelpCircle } from 'react-icons/lu';

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
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Stat.Root>
                        <Stat.Label>Lead time representativo</Stat.Label>
                        <Stat.ValueText>{formatNumber(stats.representativeLeadTimeDays, 4)} dias</Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root>
                        <Stat.Label>Confianza</Stat.Label>
                        <Stat.ValueText>{formatNumber(stats.confidenceScore, 0)} / 100</Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root>
                        <Stat.Label>Promedio</Stat.Label>
                        <Stat.ValueText>{formatNumber(stats.averageLeadTimeDays, 4)} dias</Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root>
                        <Stat.Label>Mediana</Stat.Label>
                        <Stat.ValueText>{formatNumber(stats.medianLeadTimeDays, 4)} dias</Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root>
                        <Stat.Label>Minimo</Stat.Label>
                        <Stat.ValueText>{formatNumber(stats.minLeadTimeDays, 4)} dias</Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root>
                        <Stat.Label>Maximo</Stat.Label>
                        <Stat.ValueText>{formatNumber(stats.maxLeadTimeDays, 4)} dias</Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root>
                        <Stat.Label>Desviacion estandar</Stat.Label>
                        <Stat.ValueText>{formatNumber(stats.standardDeviationLeadTimeDays, 4)} dias</Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root>
                        <Stat.Label>Observaciones validas</Stat.Label>
                        <Stat.ValueText>{formatNumber(stats.validObservations, 0)}</Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root>
                        <Stat.Label>Ordenes consideradas</Stat.Label>
                        <Stat.ValueText>{formatNumber(stats.totalOrdersConsidered, 0)}</Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root>
                        <Stat.Label>Ultima recepcion observada</Stat.Label>
                        <Stat.ValueText fontSize="md">{formatDateTime(stats.lastReceiptObservedAt)}</Stat.ValueText>
                    </Stat.Root>
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
        open: isHelpOpen,
        onOpen: onHelpOpen,
        onClose: onHelpClose,
    } = useDisclosure();

    return (
        <>
            <Drawer.Root open={isOpen} placement='end' size={{ base: "full", md: "xl" }} onOpenChange={e => {
                if (!e.open) {
                    onClose();
                }
            }}>
                <Portal>

                    <Drawer.Backdrop />
                    <Drawer.Positioner>
                        <Drawer.Content>
                            <Drawer.CloseTrigger />
                            <Drawer.Header pr={16}>
                                <Flex
                                    align={{ base: "stretch", sm: "center" }}
                                    justify="space-between"
                                    direction={{ base: "column", sm: "row" }}
                                    gap={3}
                                >
                                    <Text>Detalle de lead time</Text>
                                    <Tooltip content="Explicacion de metricas y por que se usan">
                                        <IconButton
                                            aria-label="Ayuda del detalle de lead time"
                                            size="sm"
                                            variant="outline"
                                            colorPalette="blue"
                                            onClick={onHelpOpen}><LuHelpCircle /></IconButton>
                                    </Tooltip>
                                </Flex>
                            </Drawer.Header>
                            <Drawer.Body>
                                {loading ? (
                                    <Stack align="center" justify="center" h="full">
                                        <Spinner />
                                        <Text color="app.textMuted">Cargando detalle proveedor-material...</Text>
                                    </Stack>
                                ) : !detail ? (
                                    <Text color="app.textMuted">No hay detalle disponible.</Text>
                                ) : (
                                    <Stack gap={6}>
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

                                        <Separator />
                                        <StatsBlock title="Primera recepcion" stats={detail.firstReceipt} />
                                        <Separator />
                                        <StatsBlock title="Recepcion completa" stats={detail.completeReceipt} />
                                    </Stack>
                                )}
                            </Drawer.Body>
                        </Drawer.Content>
                    </Drawer.Positioner>

                </Portal>
            </Drawer.Root>
            <LeadTimeDetailHelpModal isOpen={isHelpOpen} onClose={onHelpClose} />
        </>
    );
}
