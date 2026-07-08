import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Card,
    CardBody,
    Flex,
    HStack,
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
    useToast,
} from "@chakra-ui/react";
import { QuestionIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import type { Material } from "../../Productos/types.tsx";
import type { Proveedor } from "../../Compras/types.tsx";
import type { ProveedorMaterialLeadTimeMetricDTO } from "./types.ts";
import { formatNumber } from "./utils.ts";
import LeadTimeMetricHelpModal from "./LeadTimeMetricHelpModal.tsx";

type Props = {
    selectedMaterial: Material | null;
    selectedProveedor: Proveedor | null;
    fechaCorte: string;
    ventanaDias: number;
};

const endPoints = new EndPointsURL();

export default function LeadTimesView({ selectedMaterial, selectedProveedor, fechaCorte, ventanaDias }: Props) {
    const toast = useToast();
    const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();
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
            <Card variant="outline">
                <CardBody>
                    <Text color="app.textMuted">
                        Seleccione un material y un proveedor para calcular el lead time informativo.
                    </Text>
                </CardBody>
            </Card>
        );
    }

    return (
        <Stack spacing={4}>
            <Card variant="outline">
                <CardBody>
                    <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap={4} direction={{ base: "column", md: "row" }}>
                        <Box>
                            <HStack spacing={2} align="center">
                                <Text fontWeight="semibold">Lead time proveedor-material</Text>
                                <Tooltip label="Formula y algoritmo de calculo">
                                    <IconButton
                                        aria-label="Ayuda del calculo de lead time"
                                        icon={<QuestionIcon />}
                                        size="sm"
                                        variant="outline"
                                        colorScheme="blue"
                                        onClick={onHelpOpen}
                                    />
                                </Tooltip>
                            </HStack>
                            <Text fontSize="sm" color="app.textMuted">
                                {selectedProveedor?.nombre} | {selectedMaterial?.nombre}
                            </Text>
                        </Box>
                        <Button
                            colorScheme="blue"
                            variant="outline"
                            onClick={fetchMetric}
                            isLoading={loading}
                            w={{ base: "full", md: "auto" }}
                        >
                            Refrescar
                        </Button>
                    </Flex>
                </CardBody>
            </Card>

            <Card variant="outline">
                <CardBody>
                    {loading ? (
                        <Stack align="center" py={10}>
                            <Spinner />
                            <Text color="app.textMuted">Calculando lead time...</Text>
                        </Stack>
                    ) : !metric ? (
                        <Text color="app.textMuted">No hay resultado disponible.</Text>
                    ) : !metric.calculable ? (
                        <Stack spacing={3}>
                            <Text color="app.textMuted">{metric.reason || "No hay observaciones calculables."}</Text>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                <Stat>
                                    <StatLabel>Ordenes consideradas</StatLabel>
                                    <StatNumber>{formatNumber(metric.ordenesConsideradas, 0)}</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Fecha corte</StatLabel>
                                    <StatNumber fontSize="xl">{metric.fechaCorte}</StatNumber>
                                </Stat>
                            </SimpleGrid>
                        </Stack>
                    ) : (
                        <Stack spacing={4}>
                            <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                                <Stat>
                                    <StatLabel>Lead time mediano</StatLabel>
                                    <StatNumber>{formatNumber(metric.leadTimeMedianoDias, 2)} dias</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Observaciones validas</StatLabel>
                                    <StatNumber>{formatNumber(metric.observaciones, 0)}</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Ordenes consideradas</StatLabel>
                                    <StatNumber>{formatNumber(metric.ordenesConsideradas, 0)}</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Fecha corte</StatLabel>
                                    <StatNumber fontSize="xl">{metric.fechaCorte}</StatNumber>
                                </Stat>
                            </SimpleGrid>

                            {fallbackCount > 0 && (
                                <Alert status="info" borderRadius="md">
                                    <AlertIcon />
                                    <Text fontSize="sm">
                                        {fallbackCount} observacion(es) usaron fecha de emision porque la OCM no tenia fecha de envio al proveedor.
                                    </Text>
                                </Alert>
                            )}
                        </Stack>
                    )}
                </CardBody>
            </Card>

            <LeadTimeMetricHelpModal isOpen={isHelpOpen} onClose={onHelpClose} />
        </Stack>
    );
}
