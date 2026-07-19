import { ChevronDownIcon, ChevronUpIcon, WarningTwoIcon } from "@chakra-ui/icons";
import {
    Alert,
    AlertIcon,
    Badge,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    Collapse,
    HStack,
    SimpleGrid,
    Spinner,
    Stack,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { fetchMaterialCoverage, requestErrorMessage } from "./informesGlobales.api";
import { formatDate, formatQuantity, KpiCard } from "./InformeGlobalUi";
import type { CoberturaMateriales } from "./informesGlobales.types";

type CoverageWindow = 7 | 30 | 90;

export default function CoberturaMaterialesCard() {
    const [expanded, setExpanded] = useState(false);
    const [windowDays, setWindowDays] = useState<CoverageWindow>(90);
    const [report, setReport] = useState<CoberturaMateriales | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!expanded) return;

        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchMaterialCoverage(windowDays)
            .then((response) => {
                if (!cancelled) setReport(response);
            })
            .catch((requestError) => {
                if (!cancelled) {
                    setReport(null);
                    setError(requestErrorMessage(requestError));
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [expanded, windowDays]);

    return (
        <Card variant="outline">
            <CardBody p={{ base: 3, md: 5 }}>
                <Stack spacing={4}>
                    <Button
                        variant="ghost"
                        justifyContent="space-between"
                        minH="44px"
                        px={2}
                        onClick={() => setExpanded((current) => !current)}
                        rightIcon={expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        aria-expanded={expanded}
                    >
                        <HStack spacing={2}>
                            {report?.confianzaBaja ? <WarningTwoIcon color="yellow.500" /> : null}
                            <Text as="span">
                                {coverageToggleLabel(report?.confianzaBaja, expanded)}
                            </Text>
                            {report?.confianzaBaja ? (
                                <Badge colorScheme="yellow">Confianza baja</Badge>
                            ) : null}
                        </HStack>
                    </Button>

                    <Collapse in={expanded} animateOpacity>
                        <Stack spacing={4} pt={1}>
                            <Text color="app.textMuted" fontSize="sm">
                                Estima cuándo se agotaría el primer material si se repitiera el ritmo reciente de dispensación y no ingresaran materiales. No debe usarse como compromiso de abastecimiento.
                            </Text>
                            <ButtonGroup isAttached size="sm" alignSelf={{ base: "stretch", md: "flex-end" }}>
                                {([7, 30, 90] as CoverageWindow[]).map((days) => (
                                    <Button
                                        key={days}
                                        minH="44px"
                                        flex={{ base: 1, md: "initial" }}
                                        colorScheme={windowDays === days ? "green" : undefined}
                                        variant={windowDays === days ? "solid" : "outline"}
                                        onClick={() => setWindowDays(days)}
                                        aria-pressed={windowDays === days}
                                    >
                                        {days} días
                                    </Button>
                                ))}
                            </ButtonGroup>

                            {loading ? (
                                <HStack minH="120px" justify="center">
                                    <Spinner color="green.500" />
                                    <Text color="app.textMuted">Calculando cobertura…</Text>
                                </HStack>
                            ) : error ? (
                                <Alert status="error" borderRadius="md">
                                    <AlertIcon />
                                    {error}
                                </Alert>
                            ) : report ? (
                                <CoverageResult report={report} />
                            ) : null}
                        </Stack>
                    </Collapse>
                </Stack>
            </CardBody>
        </Card>
    );
}

function CoverageResult({ report }: { report: CoberturaMateriales }) {
    if (report.estado === "SIN_CONSUMO") {
        return (
            <Alert status="info" borderRadius="md">
                <AlertIcon />
                No hubo consumo suficiente para estimar agotamientos en esta ventana.
            </Alert>
        );
    }

    return (
        <Stack spacing={4}>
            {report.confianzaBaja ? (
                <Alert status="warning" alignItems="flex-start" borderRadius="md">
                    <AlertIcon mt={0.5} />
                    <Stack spacing={1}>
                        <Text fontWeight="semibold">Estimación de baja confianza</Text>
                        {report.motivosConfianzaBaja.map((reason) => (
                            <Text key={reason} fontSize="sm">{reason}</Text>
                        ))}
                    </Stack>
                </Alert>
            ) : null}

            <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={3}>
                <KpiCard
                    label="Primer agotamiento"
                    value={report.fechaPrimerAgotamiento
                        ? formatDate(report.fechaPrimerAgotamiento)
                        : "No estimable"}
                    help={report.materialCriticoNombre ?? "Sin material crítico"}
                />
                <KpiCard
                    label="Intervalo estimado"
                    value={intervalLabel(report.intervaloFechaMin, report.intervaloFechaMax)}
                    help="Rango bootstrap de la demanda"
                />
                <KpiCard
                    label="Materiales con demanda"
                    value={report.materialesConDemanda.toLocaleString("es-CO")}
                    help={`${report.materialesAnalizados.toLocaleString("es-CO")} analizados`}
                />
                <KpiCard
                    label="Días activos"
                    value={report.diasConDispensacion.toLocaleString("es-CO")}
                    help={`${report.diasObservados.toLocaleString("es-CO")} días observados`}
                />
            </SimpleGrid>

            <TableContainer>
                <Table size="sm">
                    <Thead>
                        <Tr>
                            <Th>Material</Th>
                            <Th isNumeric>Stock</Th>
                            <Th isNumeric>Demanda diaria</Th>
                            <Th isNumeric>Días restantes</Th>
                            <Th>Fecha estimada</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {report.estimaciones.map((estimate, index) => (
                            <Tr key={estimate.productoId}>
                                <Td>
                                    <Stack spacing={0}>
                                        <HStack>
                                            <Text fontWeight="semibold">{estimate.nombre}</Text>
                                            {index === 0 ? <Badge colorScheme="red">Crítico</Badge> : null}
                                        </HStack>
                                        <Text color="app.textMuted" fontSize="xs">
                                            {estimate.productoId}
                                        </Text>
                                    </Stack>
                                </Td>
                                <Td isNumeric>
                                    {formatQuantity(estimate.stockActual)} {estimate.unidadMedida}
                                </Td>
                                <Td isNumeric>{formatQuantity(estimate.demandaMediaDiaria)}</Td>
                                <Td isNumeric>
                                    {estimate.diasHastaAgotamiento === null
                                    || estimate.diasHastaAgotamiento === undefined
                                        ? "—"
                                        : formatQuantity(estimate.diasHastaAgotamiento)}
                                </Td>
                                <Td>{estimate.fechaAgotamiento
                                    ? formatDate(estimate.fechaAgotamiento)
                                    : "—"}</Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </TableContainer>
        </Stack>
    );
}

function intervalLabel(minimum?: string | null, maximum?: string | null) {
    if (!minimum || !maximum) return "No estimable";
    return `${formatDate(minimum)} – ${formatDate(maximum)}`;
}

function coverageToggleLabel(lowConfidence: boolean | undefined, expanded: boolean) {
    if (lowConfidence) {
        return expanded
            ? "Ocultar estimación exploratoria"
            : "Ver estimación exploratoria";
    }
    return expanded ? "Ocultar cobertura estimada" : "Cobertura estimada de materiales";
}
