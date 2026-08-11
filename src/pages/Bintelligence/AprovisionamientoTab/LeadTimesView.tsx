import {
    Alert,
    Box,
    Button,
    Card,
    Flex,
    HStack,
    IconButton,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    Text,
    useDisclosure,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { Tooltip } from '@/components/ui/tooltip';
import { useEffect, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import type { Material } from "../../Productos/types.tsx";
import type { Proveedor } from "../../Compras/types.tsx";
import type { ProveedorMaterialLeadTimeMetricDTO } from "./types.ts";
import { formatNumber } from "./utils.ts";
import LeadTimeMetricHelpModal from "./LeadTimeMetricHelpModal.tsx";
import { LuHelpCircle } from 'react-icons/lu';

type Props = {
    selectedMaterial: Material | null;
    selectedProveedor: Proveedor | null;
    fechaCorte: string;
    ventanaDias: number;
};

const endPoints = new EndPointsURL();

export default function LeadTimesView({ selectedMaterial, selectedProveedor, fechaCorte, ventanaDias }: Props) {
    const toast = useAppToast();
    const { open: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();
    const [metric, setMetric] = useState<ProveedorMaterialLeadTimeMetricDTO | null>(null);
    const [loading, setLoading] = useState(false);

    const canLoad = Boolean(selectedMaterial && selectedProveedor);
    const fallbackCount = metric?.observacionesConFallbackFechaEmision ?? 0;

    const fetchMetric = async () => {
        if (!selectedMaterial || !selectedProveedor) {
            setMetric(null);
            return;
        }

        setLoading(true);
        try {
            const url = endPoints.biProveedorLeadTime(
                selectedProveedor.id,
                selectedMaterial.productoId,
                fechaCorte,
                ventanaDias
            );
            const response = await axios.get<ProveedorMaterialLeadTimeMetricDTO>(url);
            setMetric(response.data);
        } catch (error) {
            console.error("Error loading supplier-material lead time:", error);
            setMetric(null);
            toast({
                title: "Error",
                description: "No se pudo calcular el lead time informativo para el par seleccionado.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!canLoad) {
            setMetric(null);
            return;
        }
        fetchMetric();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMaterial?.productoId, selectedProveedor?.id, fechaCorte, ventanaDias]);

    if (!canLoad) {
        return (
            <Card.Root variant="outline">
                <Card.Body>
                    <Text color="app.textMuted">
                        Seleccione un material y un proveedor para calcular el lead time informativo.
                    </Text>
                </Card.Body>
            </Card.Root>
        );
    }

    return (
        <Stack gap={4}>
            <Card.Root variant="outline">
                <Card.Body>
                    <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap={4} direction={{ base: "column", md: "row" }}>
                        <Box>
                            <HStack gap={2} align="center">
                                <Text fontWeight="semibold">Lead time proveedor-material</Text>
                                <Tooltip content="Formula y algoritmo de calculo">
                                    <IconButton
                                        aria-label="Ayuda del calculo de lead time"
                                        size="sm"
                                        variant="outline"
                                        colorPalette="blue"
                                        onClick={onHelpOpen}><LuHelpCircle /></IconButton>
                                </Tooltip>
                            </HStack>
                            <Text fontSize="sm" color="app.textMuted">
                                {selectedProveedor?.nombre} | {selectedMaterial?.nombre}
                            </Text>
                        </Box>
                        <Button
                            colorPalette="blue"
                            variant="outline"
                            onClick={fetchMetric}
                            loading={loading}
                            w={{ base: "full", md: "auto" }}
                        >
                            Refrescar
                        </Button>
                    </Flex>
                </Card.Body>
            </Card.Root>

            <Card.Root variant="outline">
                <Card.Body>
                    {loading ? (
                        <Stack align="center" py={10}>
                            <Spinner />
                            <Text color="app.textMuted">Calculando lead time...</Text>
                        </Stack>
                    ) : !metric ? (
                        <Text color="app.textMuted">No hay resultado disponible.</Text>
                    ) : !metric.calculable ? (
                        <Stack gap={3}>
                            <Text color="app.textMuted">{metric.reason || "No hay observaciones calculables."}</Text>
                            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                <Stat.Root>
                                    <Stat.Label>Ordenes consideradas</Stat.Label>
                                    <Stat.ValueText>{formatNumber(metric.ordenesConsideradas, 0)}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Fecha corte</Stat.Label>
                                    <Stat.ValueText fontSize="xl">{metric.fechaCorte}</Stat.ValueText>
                                </Stat.Root>
                            </SimpleGrid>
                        </Stack>
                    ) : (
                        <Stack gap={4}>
                            <SimpleGrid columns={{ base: 1, md: 4 }} gap={4}>
                                <Stat.Root>
                                    <Stat.Label>Lead time mediano</Stat.Label>
                                    <Stat.ValueText>{formatNumber(metric.leadTimeMedianoDias, 2)} dias</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Observaciones validas</Stat.Label>
                                    <Stat.ValueText>{formatNumber(metric.observaciones, 0)}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Ordenes consideradas</Stat.Label>
                                    <Stat.ValueText>{formatNumber(metric.ordenesConsideradas, 0)}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Fecha corte</Stat.Label>
                                    <Stat.ValueText fontSize="xl">{metric.fechaCorte}</Stat.ValueText>
                                </Stat.Root>
                            </SimpleGrid>

                            {fallbackCount > 0 && (
                                <Alert.Root status="info" borderRadius="md">
                                    <Alert.Indicator />
                                    <Text fontSize="sm">
                                        {fallbackCount} observacion(es) usaron fecha de emision porque la OCM no tenia fecha de envio al proveedor.
                                    </Text>
                                </Alert.Root>
                            )}
                        </Stack>
                    )}
                </Card.Body>
            </Card.Root>

            <LeadTimeMetricHelpModal isOpen={isHelpOpen} onClose={onHelpClose} />
        </Stack>
    );
}
