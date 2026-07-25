import { QuestionIcon } from "@chakra-ui/icons";
import {
    Badge,
    Box,
    Card,
    CardBody,
    Divider,
    HStack,
    IconButton,
    SimpleGrid,
    Stack,
    Stat,
    StatHelpText,
    StatLabel,
    StatNumber,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tooltip,
    Tr,
    useBreakpointValue,
    useDisclosure,
} from "@chakra-ui/react";
import ReactECharts from "echarts-for-react";
import CoberturaCostosHelpModal from "./CoberturaCostosHelpModal";
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
    const coverageHelp = useDisclosure();
    const valuation = stock.resumen.valorizacion;
    const costCoverage = stock.resumen.coberturaCostosDetalle;
    const hasGroupCoverage = costCoverage.materialesPct !== undefined
        || costCoverage.terminadosPct !== undefined;

    return (
        <>
            <Stack spacing={3}>
                <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={3}>
                    <MaterialsValuationCard
                        total={valuation.materiales.total}
                        rawMaterial={valuation.materiales.materiaPrima}
                        packaging={valuation.materiales.empaque}
                    />
                    <KpiCard
                        label="Valorización de producto terminado"
                        value={formatCurrency(valuation.terminados)}
                        help="Solo stock positivo con costo maestro vigente"
                    />
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                    <KpiCard
                        label="Referencias con stock"
                        value={formatInteger(stock.resumen.referenciasConStock)}
                        help={`${formatInteger(stock.resumen.referenciasValorizadas)} valorizadas`}
                    />
                    <CostCoverageCard
                        global={costCoverage.globalPct}
                        materials={costCoverage.materialesPct}
                        finished={costCoverage.terminadosPct}
                        showGroups={hasGroupCoverage}
                        onOpenHelp={coverageHelp.onOpen}
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

            <CoberturaCostosHelpModal
                isOpen={coverageHelp.isOpen}
                onClose={coverageHelp.onClose}
            />
        </>
    );
}

function MaterialsValuationCard({
    total,
    rawMaterial,
    packaging,
}: {
    total: number;
    rawMaterial: number;
    packaging: number;
}) {
    return (
        <Card variant="outline" minW={0}>
            <CardBody p={{ base: 3, md: 4 }}>
                <Stat minW={0}>
                    <StatLabel fontSize="sm">Valorización de materiales</StatLabel>
                    <StatNumber
                        fontSize={{ base: "xl", md: "2xl" }}
                        lineHeight="shorter"
                        overflowWrap="anywhere"
                        mt={1}
                    >
                        {formatCurrency(total)}
                    </StatNumber>
                    <StatHelpText mb={0} mt={2}>
                        Solo stock positivo con costo maestro vigente
                    </StatHelpText>
                </Stat>
                <Divider my={3} />
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                    <ValuationDetail label="Materia prima" value={rawMaterial} />
                    <ValuationDetail label="Material de empaque" value={packaging} />
                </SimpleGrid>
            </CardBody>
        </Card>
    );
}

function ValuationDetail({ label, value }: { label: string; value: number }) {
    return (
        <Box minW={0}>
            <Text color="app.textMuted" fontSize="xs">
                {label}
            </Text>
            <Text
                fontSize={{ base: "sm", md: "md" }}
                fontWeight="semibold"
                overflowWrap="anywhere"
            >
                {formatCurrency(value)}
            </Text>
        </Box>
    );
}

function CostCoverageCard({
    global,
    materials,
    finished,
    showGroups,
    onOpenHelp,
}: {
    global?: number | null;
    materials?: number | null;
    finished?: number | null;
    showGroups: boolean;
    onOpenHelp: () => void;
}) {
    return (
        <Card variant="outline" minW={0}>
            <CardBody p={{ base: 3, md: 4 }}>
                <Stat minW={0}>
                    <HStack justify="space-between" align="flex-start" spacing={2}>
                        <StatLabel fontSize="sm">Cobertura de costos</StatLabel>
                        <Tooltip label="¿Qué significa este indicador?" hasArrow>
                            <IconButton
                                aria-label="Explicación de la cobertura de costos"
                                icon={<QuestionIcon />}
                                onClick={onOpenHelp}
                                size="sm"
                                variant="ghost"
                                colorScheme="blue"
                            />
                        </Tooltip>
                    </HStack>
                    <StatNumber fontSize="xl" lineHeight="shorter" mt={1}>
                        {formatPercent(global)}
                    </StatNumber>
                    {showGroups ? (
                        <SimpleGrid columns={2} spacing={2} mt={3}>
                            <CoverageDetail label="Materiales" value={materials} />
                            <CoverageDetail label="Terminados" value={finished} />
                        </SimpleGrid>
                    ) : (
                        <StatHelpText mb={0} mt={2}>
                            Referencias positivas con costo
                        </StatHelpText>
                    )}
                </Stat>
            </CardBody>
        </Card>
    );
}

function CoverageDetail({
    label,
    value,
}: {
    label: string;
    value?: number | null;
}) {
    return (
        <Box minW={0}>
            <Text color="app.textMuted" fontSize="xs">
                {label}
            </Text>
            <Text fontSize="sm" fontWeight="semibold">
                {formatPercent(value)}
            </Text>
        </Box>
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
