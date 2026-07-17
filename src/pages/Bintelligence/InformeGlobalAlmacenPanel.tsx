import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    Divider,
    Heading,
    HStack,
    SimpleGrid,
    Stack,
    Stat,
    StatHelpText,
    StatLabel,
    StatNumber,
    Text,
    useBreakpointValue,
} from "@chakra-ui/react";
import ReactECharts from "echarts-for-react";
import {
    buildRankingDispensacionOptions,
    buildSerieFisicaOptions,
} from "./informeGlobalAlmacen.charts";
import type {
    InformeGlobalAlmacen,
    NotaInformeAlmacen,
    ResumenUnidadAlmacen,
} from "./informeGlobalAlmacen.types";

interface InformeGlobalAlmacenPanelProps {
    report: InformeGlobalAlmacen;
}

export default function InformeGlobalAlmacenPanel({ report }: InformeGlobalAlmacenPanelProps) {
    const resumenPorUnidad = report.resumenPorUnidad ?? [];
    const rankingDispensacion = report.rankingDispensacion ?? [];
    const serieFisicaDiaria = report.serieFisicaDiaria ?? [];
    const unidades = useMemo(
        () => resumenPorUnidad.map((item) => item.unidadMedida),
        [resumenPorUnidad],
    );
    const [unidadSeleccionada, setUnidadSeleccionada] = useState(unidades[0] ?? "");
    const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

    useEffect(() => {
        if (!unidades.includes(unidadSeleccionada)) {
            setUnidadSeleccionada(unidades[0] ?? "");
        }
    }, [unidadSeleccionada, unidades]);

    const resumenUnidad = resumenPorUnidad.find(
        (item) => item.unidadMedida === unidadSeleccionada,
    );
    const ranking = rankingDispensacion.find(
        (item) => item.unidadMedida === unidadSeleccionada,
    );
    const serieUnidad = serieFisicaDiaria.filter(
        (item) => item.unidadMedida === unidadSeleccionada,
    );
    const rankingOptions = useMemo(
        () => ranking ? buildRankingDispensacionOptions(ranking, isMobile) : null,
        [isMobile, ranking],
    );
    const serieOptions = useMemo(
        () => unidadSeleccionada
            ? buildSerieFisicaOptions(serieFisicaDiaria, unidadSeleccionada, isMobile)
            : null,
        [isMobile, serieFisicaDiaria, unidadSeleccionada],
    );
    const rankingItems = (ranking?.materiales.length ?? 0) + (ranking?.materialesOtros ? 1 : 0);
    const rankingHeight = Math.max(250, Math.min(500, 105 + rankingItems * (isMobile ? 34 : 38)));
    const totalMovimientos = report.resumen.movimientosDispensacion
        + report.resumen.movimientosRecepcionCompra
        + report.resumen.movimientosOtrosIngresos;
    const serieTieneDatos = serieUnidad.some(
        (item) => item.cantidadDispensada > 0 || item.cantidadRecibidaCompra > 0,
    );

    return (
        <Stack spacing={{ base: 4, md: 5 }}>
            {totalMovimientos === 0 ? (
                <EmptyMessage message="No se registraron movimientos de materiales en el periodo seleccionado." />
            ) : null}

            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 3, md: 4 }}>
                {resumenPorUnidad.map((item) => (
                    <PhysicalKpi
                        key={item.unidadMedida}
                        label={`Dispensado (${item.unidadMedida})`}
                        value={formatQuantity(item.cantidadDispensada)}
                        help={item.cantidadDispensada > 0 ? "Cantidad física del periodo" : "Sin dispensaciones"}
                        accentColor="green.500"
                    />
                ))}
                <PhysicalKpi
                    label="Dispensaciones"
                    value={formatInteger(report.resumen.movimientosDispensacion)}
                    help={`${formatInteger(report.resumen.materialesDispensados)} materiales`}
                    accentColor="teal.500"
                />
            </SimpleGrid>

            <Card variant="outline">
                <CardBody p={{ base: 4, md: 5 }}>
                    <Stack spacing={4}>
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            justify="space-between"
                            align={{ base: "stretch", md: "flex-start" }}
                            spacing={3}
                        >
                            <Box>
                                <Heading as="h3" size="sm">Materiales más dispensados</Heading>
                                <Text fontSize="sm" color="app.textMuted" mt={1}>
                                    Cantidades físicas comparables dentro de una misma unidad.
                                </Text>
                            </Box>
                            {unidades.length > 0 ? (
                                <ButtonGroup
                                    isAttached
                                    size="sm"
                                    variant="outline"
                                    w={{ base: "full", md: "auto" }}
                                    overflowX="auto"
                                    aria-label="Unidad de medida del informe"
                                >
                                    {unidades.map((unidad) => (
                                        <Button
                                            key={unidad}
                                            minH="44px"
                                            minW={{ base: "72px", md: "64px" }}
                                            flex={{ base: 1, md: "initial" }}
                                            colorScheme={unidad === unidadSeleccionada ? "teal" : "gray"}
                                            variant={unidad === unidadSeleccionada ? "solid" : "outline"}
                                            aria-pressed={unidad === unidadSeleccionada}
                                            onClick={() => setUnidadSeleccionada(unidad)}
                                        >
                                            {unidad}
                                        </Button>
                                    ))}
                                </ButtonGroup>
                            ) : null}
                        </Stack>

                        {ranking && ranking.cantidadTotal > 0 && rankingOptions ? (
                            <>
                                <ReactECharts
                                    option={rankingOptions}
                                    notMerge
                                    lazyUpdate
                                    style={{ height: `${rankingHeight}px`, width: "100%" }}
                                />
                                <Text fontSize="sm" color="app.textMuted">
                                    En {unidadSeleccionada} se dispensaron {formatQuantity(ranking.cantidadTotal)} entre {formatInteger(ranking.materialesTotales)} materiales.
                                </Text>
                            </>
                        ) : (
                            <EmptyChartMessage
                                message={unidadSeleccionada
                                    ? `No hubo dispensaciones en ${unidadSeleccionada} durante el periodo.`
                                    : "No hay unidades de medida disponibles para construir el ranking."}
                            />
                        )}
                    </Stack>
                </CardBody>
            </Card>

            {report.modoFecha === "RANGO" ? (
                <Card variant="outline">
                    <CardBody p={{ base: 4, md: 5 }}>
                        <Stack spacing={4}>
                            <Box>
                                <Heading as="h3" size="sm">Evolución diaria</Heading>
                                <Text fontSize="sm" color="app.textMuted" mt={1}>
                                    Dispensaciones y recepciones efectivas de compra en {unidadSeleccionada || "la unidad seleccionada"}.
                                </Text>
                            </Box>
                            {serieOptions && serieTieneDatos ? (
                                <>
                                    <ReactECharts
                                        option={serieOptions}
                                        notMerge
                                        lazyUpdate
                                        style={{ height: isMobile ? "320px" : "380px", width: "100%" }}
                                    />
                                    <Text fontSize="sm" color="app.textMuted">
                                        Total del rango: {formatQuantity(resumenUnidad?.cantidadDispensada)} {unidadSeleccionada} dispensados y {formatQuantity(resumenUnidad?.cantidadRecibidaCompra)} {unidadSeleccionada} recibidos por OCM.
                                    </Text>
                                </>
                            ) : (
                                <EmptyChartMessage message="No hubo dispensaciones ni recepciones OCM para esta unidad en el rango." />
                            )}
                        </Stack>
                    </CardBody>
                </Card>
            ) : null}

            <Card variant="outline">
                <CardBody p={{ base: 4, md: 5 }}>
                    <Stack spacing={4}>
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            justify="space-between"
                            align={{ base: "flex-start", md: "center" }}
                            spacing={2}
                        >
                            <Box>
                                <Heading as="h3" size="sm">Ingresos físicos de materiales</Heading>
                                <Text fontSize="sm" color="app.textMuted" mt={1}>
                                    Recepciones de órdenes de compra separadas de ajustes y transferencias.
                                </Text>
                            </Box>
                            <HStack spacing={2}>
                                <Badge colorScheme="blue">OCM</Badge>
                                <Badge colorScheme="orange">Otros ingresos</Badge>
                            </HStack>
                        </Stack>

                        {report.resumen.movimientosRecepcionCompra === 0 ? (
                            <EmptyMessage message="No hubo recepciones de compra OCM en el periodo." compact />
                        ) : null}

                        {resumenPorUnidad.length > 0 ? (
                            <Stack spacing={0} divider={<Divider borderColor="app.border" />}>
                                {resumenPorUnidad.map((item) => (
                                    <UnitFlowRow key={item.unidadMedida} item={item} />
                                ))}
                            </Stack>
                        ) : (
                            <Text color="app.textMuted">No hay ingresos físicos para resumir.</Text>
                        )}
                    </Stack>
                </CardBody>
            </Card>

            <Card variant="outline" bg="gray.50">
                <CardBody p={{ base: 4, md: 5 }}>
                    <Stack spacing={4}>
                        <Box>
                            <Heading as="h3" size="sm">Valoración estimada</Heading>
                            <Text fontSize="sm" color="app.textMuted" mt={1}>
                                Referencia secundaria calculada con el costo maestro actual de cada material.
                            </Text>
                        </Box>
                        <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={{ base: 3, md: 4 }}>
                            <ValuationMetric
                                label="Dispensaciones"
                                value={formatCurrency(report.resumen.valorDispensacionesEstimado)}
                            />
                            <ValuationMetric
                                label="Recepciones OCM"
                                value={formatCurrency(report.resumen.valorRecepcionesCompraEstimado)}
                            />
                            <ValuationMetric
                                label="Otros ingresos"
                                value={formatCurrency(report.resumen.valorOtrosIngresosEstimado)}
                            />
                            <ValuationMetric
                                label="Cobertura de costos"
                                value={formatPercent(report.resumen.coberturaCostosPct)}
                                help={`${formatInteger(report.resumen.materialesConCosto)} con costo | ${formatInteger(report.resumen.materialesSinCosto)} sin costo`}
                            />
                        </SimpleGrid>
                    </Stack>
                </CardBody>
            </Card>

            <ReportNotes notes={report.notas} />
        </Stack>
    );
}

function PhysicalKpi({ label, value, help, accentColor }: {
    label: string;
    value: string;
    help: string;
    accentColor: string;
}) {
    return (
        <Card variant="outline" minW={0} borderTopWidth="3px" borderTopColor={accentColor}>
            <CardBody p={{ base: 3, md: 4 }}>
                <Stat minW={0}>
                    <StatLabel fontSize={{ base: "xs", md: "sm" }} noOfLines={2}>{label}</StatLabel>
                    <StatNumber fontSize={{ base: "xl", md: "2xl" }} lineHeight="shorter" mt={1}>
                        {value}
                    </StatNumber>
                    <StatHelpText fontSize={{ base: "xs", md: "sm" }} mb={0} mt={2} noOfLines={2}>
                        {help}
                    </StatHelpText>
                </Stat>
            </CardBody>
        </Card>
    );
}

function UnitFlowRow({ item }: { item: ResumenUnidadAlmacen }) {
    return (
        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3} py={3} alignItems="center">
            <Box gridColumn={{ base: "1 / -1", md: "auto" }}>
                <Badge colorScheme="gray">{item.unidadMedida}</Badge>
            </Box>
            <Box>
                <Text fontSize="xs" color="app.textMuted">Recibido por OCM</Text>
                <Text fontWeight="semibold">{formatQuantity(item.cantidadRecibidaCompra)} {item.unidadMedida}</Text>
            </Box>
            <Box>
                <Text fontSize="xs" color="app.textMuted">Otros ingresos</Text>
                <Text fontWeight="semibold">{formatQuantity(item.cantidadOtrosIngresos)} {item.unidadMedida}</Text>
            </Box>
        </SimpleGrid>
    );
}

function ValuationMetric({ label, value, help }: { label: string; value: string; help?: string }) {
    return (
        <Box borderLeftWidth="3px" borderColor="gray.300" pl={3} py={1} minW={0}>
            <Text fontSize="xs" color="app.textMuted">{label}</Text>
            <Text fontWeight="semibold" fontSize={{ base: "md", md: "lg" }} overflowWrap="anywhere">
                {value}
            </Text>
            {help ? <Text fontSize="xs" color="app.textMuted">{help}</Text> : null}
        </Box>
    );
}

function EmptyChartMessage({ message }: { message: string }) {
    return (
        <Box py={{ base: 8, md: 10 }} px={4} bg="gray.50" borderWidth="1px" borderColor="app.border" textAlign="center">
            <Text color="app.textMuted">{message}</Text>
        </Box>
    );
}

function EmptyMessage({ message, compact = false }: { message: string; compact?: boolean }) {
    return (
        <Alert status="info" variant="left-accent" py={compact ? 2 : 3}>
            <AlertIcon />
            <Text fontSize="sm">{message}</Text>
        </Alert>
    );
}

function ReportNotes({ notes }: { notes: NotaInformeAlmacen[] }) {
    if (notes.length === 0) return null;
    return (
        <Stack spacing={2}>
            {notes.map((nota) => (
                <Alert
                    key={`${nota.tipo}-${nota.mensaje}`}
                    status={nota.tipo === "WARNING" ? "warning" : "info"}
                    borderRadius="md"
                    alignItems="flex-start"
                >
                    <AlertIcon mt={0.5} />
                    <Text fontSize="sm">{nota.mensaje}</Text>
                </Alert>
            ))}
        </Stack>
    );
}

function formatInteger(value?: number | null) {
    return Number(value ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function formatQuantity(value?: number | null) {
    return Number(value ?? 0).toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function formatPercent(value?: number | null) {
    if (value === undefined || value === null) return "Sin base";
    return `${value.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatCurrency(value?: number | null) {
    return Number(value ?? 0).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}
