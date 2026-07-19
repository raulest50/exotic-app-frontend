import {
    Badge,
    Box,
    Card,
    CardBody,
    SimpleGrid,
    Stack,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useBreakpointValue,
} from "@chakra-ui/react";
import ReactECharts from "echarts-for-react";
import {
    EmptyPanel,
    formatDate,
    formatInteger,
    formatPercent,
    KpiCard,
    ReportNotes,
    SectionHeading,
} from "./InformeGlobalUi";
import { buildProductionChart } from "./informesGlobales.charts";
import type { InformeProduccion } from "./informesGlobales.types";

export default function InformeProduccionPage({ report }: { report: InformeProduccion }) {
    const compactChart = useBreakpointValue({ base: true, md: false }) ?? false;
    const chartHeight = useBreakpointValue({ base: 330, md: 420 }) ?? 420;
    const summary = report.resumen;
    const chartOptions = buildProductionChart(
        report.consolidadoCategorias,
        report.detalleReferencias,
        compactChart,
    );
    const hasProduction = report.detalleReferencias.some(
        (reference) => reference.cantidadProducida > 0,
    );

    return (
        <Stack spacing={{ base: 4, md: 5 }}>
            <Stack
                direction={{ base: "column", md: "row" }}
                align={{ base: "flex-start", md: "center" }}
                justify="space-between"
                spacing={2}
            >
                <SectionHeading
                    title="Informe global de producción"
                    description="Cumplimiento de la planeación y uso de capacidad en el periodo consultado."
                />
                <Badge colorScheme="blue">
                    {periodLabel(report)}
                </Badge>
            </Stack>

            <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={3}>
                <KpiCard
                    label="Unidades producidas"
                    value={formatInteger(summary.unidadesProducidas)}
                    help={productionHelp(
                        summary.unidadesPlaneadas,
                        summary.tendenciaProduccionPct,
                    )}
                />
                <KpiCard
                    label="Rendimiento"
                    value={formatPercent(summary.rendimientoPlaneacionPct)}
                    help="Producido frente a planeado"
                />
                <KpiCard
                    label="Capacidad utilizada"
                    value={formatPercent(summary.capacidadUtilizadaPct)}
                    help={`${formatInteger(summary.capacidadProductivaPeriodo)} unidades de capacidad`}
                />
                <KpiCard
                    label="Referencias cumplidas"
                    value={formatPercent(summary.cumplimientoReferenciasPct)}
                    help={`${formatInteger(summary.referenciasPlaneadasProducidas)} de ${formatInteger(summary.referenciasPlaneadas)}`}
                />
            </SimpleGrid>

            <ReportNotes notes={report.notas} />

            <Card variant="outline">
                <CardBody p={{ base: 3, md: 5 }}>
                    <Stack spacing={4}>
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            justify="space-between"
                            align={{ base: "flex-start", md: "center" }}
                            spacing={2}
                        >
                            <SectionHeading
                                title="Producción consolidada por categoría"
                                description="Composición por referencias de las unidades producidas."
                            />
                            <Badge colorScheme="green">
                                {formatInteger(summary.movimientosProduccion)} movimientos
                            </Badge>
                        </Stack>
                        {hasProduction ? (
                            <ReactECharts
                                option={chartOptions}
                                style={{ height: `${chartHeight}px`, width: "100%" }}
                            />
                        ) : (
                            <EmptyPanel message="No hay datos por categoría para este periodo." />
                        )}
                    </Stack>
                </CardBody>
            </Card>

            <Card variant="outline">
                <CardBody p={{ base: 3, md: 5 }}>
                    <Stack spacing={4}>
                        <SectionHeading
                            title="Detalle por referencia"
                            description="Primeras referencias ordenadas por la consolidación del informe."
                        />
                        {report.detalleReferencias.length > 0 ? (
                            <TableContainer>
                                <Table size="sm">
                                    <Thead>
                                        <Tr>
                                            <Th>Referencia</Th>
                                            <Th>Categoría</Th>
                                            <Th isNumeric>Planeado</Th>
                                            <Th isNumeric>Producido</Th>
                                            <Th isNumeric>Diferencia</Th>
                                            <Th>Estado</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {report.detalleReferencias.slice(0, 10).map((item, index) => (
                                            <Tr key={item.productoId ?? `${item.productoNombre}-${index}`}>
                                                <Td>
                                                    <Box>
                                                        <Text fontWeight="semibold">{item.productoNombre}</Text>
                                                        <Text color="app.textMuted" fontSize="xs">
                                                            {item.productoId ?? "Sin código"}
                                                        </Text>
                                                    </Box>
                                                </Td>
                                                <Td>{item.categoriaNombre}</Td>
                                                <Td isNumeric>{formatInteger(item.cantidadPlaneada)}</Td>
                                                <Td isNumeric>{formatInteger(item.cantidadProducida)}</Td>
                                                <Td isNumeric>{formatInteger(item.diferencia)}</Td>
                                                <Td>{referenceStatus(item.noPlaneado, item.producido)}</Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <EmptyPanel message="No hay referencias para mostrar." />
                        )}
                    </Stack>
                </CardBody>
            </Card>
        </Stack>
    );
}

function periodLabel(report: InformeProduccion) {
    if (report.modoFecha === "FECHA_UNICA") return formatDate(report.fechaDesde);
    return `${formatDate(report.fechaDesde)} – ${formatDate(report.fechaHasta)}`;
}

function referenceStatus(notPlanned: boolean, produced: boolean) {
    if (notPlanned) return "No planeada";
    return produced ? "Con producción" : "Sin producción";
}

function productionHelp(planned: number, trend?: number | null) {
    const plannedLabel = `${formatInteger(planned)} planeadas`;
    if (trend === null || trend === undefined) return plannedLabel;
    const sign = trend > 0 ? "+" : "";
    return `${plannedLabel} · ${sign}${formatPercent(trend)} vs. periodo anterior`;
}
