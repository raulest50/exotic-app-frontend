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
    formatCurrency,
    formatInteger,
    formatPercent,
    formatQuantity,
    KpiCard,
    SectionHeading,
} from "./InformeGlobalUi";
import {
    buildAbcChart,
    buildCompositionChart,
} from "./informesGlobales.charts";
import type { StockInventario } from "./informesGlobales.types";

export function StockOverviewSection({ stock }: { stock: StockInventario }) {
    return (
        <Stack spacing={4}>
            <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={3}>
                <KpiCard
                    label="Valor estimado del stock"
                    value={formatCurrency(stock.resumen.valorEstimado)}
                    help="Solo stock positivo con costo vigente"
                />
                <KpiCard
                    label="Referencias con stock"
                    value={formatInteger(stock.resumen.referenciasConStock)}
                    help={`${formatInteger(stock.resumen.referenciasValorizadas)} valorizadas`}
                />
                <KpiCard
                    label="Cobertura de costos"
                    value={formatPercent(stock.resumen.coberturaCostosPct)}
                    help="Referencias positivas con costo"
                />
                <KpiCard
                    label="Alertas activas"
                    value={formatInteger(stock.alertas.total)}
                    help={`${formatInteger(stock.resumen.referenciasNegativas)} referencias negativas`}
                />
            </SimpleGrid>

            <Card variant="outline">
                <CardBody p={{ base: 3, md: 5 }}>
                    <Stack spacing={4}>
                        <SectionHeading
                            title="Stock por unidad de medida"
                            description="Las unidades no se suman entre sí; cada tarjeta conserva su magnitud física."
                        />
                        <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} spacing={3}>
                            {stock.porUnidad.map((unit) => (
                                <Box
                                    key={unit.unidadMedida}
                                    borderWidth="1px"
                                    borderColor="app.border"
                                    borderRadius="md"
                                    p={3}
                                >
                                    <Text color="app.textMuted" fontSize="sm">
                                        {unit.unidadMedida}
                                    </Text>
                                    <Text fontSize="xl" fontWeight="bold">
                                        {formatQuantity(unit.cantidadNeta)}
                                    </Text>
                                    <Text color="app.textMuted" fontSize="sm">
                                        {formatInteger(unit.referenciasConStock)} refs. positivas · {formatQuantity(unit.cantidadNegativa)} negativas
                                    </Text>
                                </Box>
                            ))}
                        </SimpleGrid>
                    </Stack>
                </CardBody>
            </Card>
        </Stack>
    );
}

export function InventoryAnalyticsSection({ stock }: { stock: StockInventario }) {
    const chartHeight = useBreakpointValue({ base: 300, md: 350 }) ?? 350;

    return (
        <Stack spacing={4}>
            <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                <Card variant="outline">
                    <CardBody p={{ base: 3, md: 5 }}>
                        <Stack spacing={3}>
                            <SectionHeading
                                title="Composición del inventario"
                                description="Participación sobre el valor estimado positivo."
                            />
                            <ReactECharts
                                option={buildCompositionChart(stock.composicion)}
                                style={{ height: `${chartHeight}px`, width: "100%" }}
                            />
                        </Stack>
                    </CardBody>
                </Card>

                <Card variant="outline">
                    <CardBody p={{ base: 3, md: 5 }}>
                        <Stack spacing={3}>
                            <SectionHeading
                                title="Clasificación ABC"
                                description="A: mayor concentración de valor; C: menor concentración."
                            />
                            <ReactECharts
                                option={buildAbcChart(stock.abc.clases)}
                                style={{ height: `${chartHeight}px`, width: "100%" }}
                            />
                            {stock.abc.referenciasExcluidasSinCosto > 0 ? (
                                <Text color="app.textMuted" fontSize="sm">
                                    {formatInteger(stock.abc.referenciasExcluidasSinCosto)} referencias sin costo fueron excluidas.
                                </Text>
                            ) : null}
                        </Stack>
                    </CardBody>
                </Card>
            </SimpleGrid>

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
                                title="Alertas prioritarias de stock"
                                description="Máximo 10 referencias, ordenadas por criticidad y nivel de stock."
                            />
                            <Stack direction="row" spacing={2} flexWrap="wrap">
                                <Badge colorScheme="red">{stock.alertas.negativas} negativas</Badge>
                                <Badge colorScheme="orange">{stock.alertas.bajoUmbral} bajo umbral</Badge>
                                <Badge colorScheme="yellow">{stock.alertas.sinCosto} sin costo</Badge>
                            </Stack>
                        </Stack>
                        {stock.alertas.items.length > 0 ? (
                            <TableContainer>
                                <Table size="sm">
                                    <Thead>
                                        <Tr>
                                            <Th>Prioridad</Th>
                                            <Th>Referencia</Th>
                                            <Th isNumeric>Stock</Th>
                                            <Th isNumeric>Umbral</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {stock.alertas.items.map((alert) => (
                                            <Tr key={`${alert.tipo}-${alert.productoId}`}>
                                                <Td>
                                                    <Badge colorScheme={alertColor(alert.prioridad)}>
                                                        {alertLabel(alert.tipo)}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    <Text fontWeight="semibold">{alert.productoNombre}</Text>
                                                    <Text color="app.textMuted" fontSize="xs">
                                                        {alert.productoId}
                                                    </Text>
                                                </Td>
                                                <Td isNumeric>
                                                    {formatQuantity(alert.stock)} {alert.unidadMedida}
                                                </Td>
                                                <Td isNumeric>
                                                    {alert.umbral === null || alert.umbral === undefined
                                                        ? "—"
                                                        : formatQuantity(alert.umbral)}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Text color="app.textMuted" fontSize="sm">
                                No se detectaron alertas de stock.
                            </Text>
                        )}
                    </Stack>
                </CardBody>
            </Card>
        </Stack>
    );
}

function alertColor(priority: number) {
    if (priority === 1) return "red";
    if (priority === 2) return "orange";
    return "yellow";
}

function alertLabel(type: string) {
    const labels: Record<string, string> = {
        STOCK_NEGATIVO: "Stock negativo",
        AGOTADO: "Agotado",
        BAJO_UMBRAL: "Bajo umbral",
        SIN_COSTO: "Sin costo",
    };
    return labels[type] ?? type;
}
