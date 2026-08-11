import {
    Badge,
    Box,
    Card,
    HStack,
    IconButton,
    SimpleGrid,
    Stack,
    Stat,
    Text,
    useBreakpointValue,
    useDisclosure,
    Separator,
} from "@chakra-ui/react";
import { Tooltip } from '@/components/ui/tooltip';
import ReactECharts from "echarts-for-react";
import CoberturaCostosHelpModal from "./CoberturaCostosHelpModal";
import InventarioAlertasSection from "./InventarioAlertasSection";
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
import type {
    MaterialesPorTipo,
    StockInventario,
    StockPorUnidad,
} from "./informesGlobales.types";
import { LuHelpCircle } from 'react-icons/lu';

export function StockOverviewSection({ stock }: { stock: StockInventario }) {
    const coverageHelp = useDisclosure();
    const valuation = stock.resumen.valorizacion;
    const costCoverage = stock.resumen.coberturaCostosDetalle;
    const hasGroupCoverage = costCoverage.materialesPct !== undefined
        || costCoverage.terminadosPct !== undefined;

    return (
        <>
            <Stack gap={3}>
                <SimpleGrid columns={{ base: 1, xl: 2 }} gap={3}>
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

                <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
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
                        label="Alertas de materiales"
                        value={formatInteger(stock.alertas.total)}
                        help={`${formatInteger(stock.alertas.negativas)} con stock negativo`}
                    />
                </SimpleGrid>

                <MaterialsStockSection materials={stock.materialesPorTipo} />
            </Stack>

            <CoberturaCostosHelpModal
                isOpen={coverageHelp.open}
                onClose={coverageHelp.onClose}
            />
        </>
    );
}

function MaterialsStockSection({ materials }: { materials: MaterialesPorTipo }) {
    return (
        <Card.Root variant="outline">
            <Card.Body p={{ base: 3, md: 5 }}>
                <Stack gap={4}>
                    <SectionHeading
                        title="Stock de materiales"
                        description="Materia prima y empaque se presentan por separado; las unidades no se suman entre sí."
                    />
                    <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
                        <MaterialStockCard
                            title="Materia prima"
                            primaryUnit="KG"
                            units={materials.materiaPrima}
                        />
                        <MaterialStockCard
                            title="Material de empaque"
                            primaryUnit="U"
                            units={materials.empaque}
                        />
                    </SimpleGrid>
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

function MaterialStockCard({
    title,
    primaryUnit,
    units,
}: {
    title: string;
    primaryUnit: string;
    units: StockPorUnidad[];
}) {
    const primary = units.find((unit) => unit.unidadMedida === primaryUnit)
        ?? emptyStockUnit(primaryUnit);
    const secondary = units
        .filter((unit) => unit.unidadMedida !== primaryUnit)
        .sort((left, right) => {
            const referenceOrder = right.referenciasConStock - left.referenciasConStock;
            return referenceOrder !== 0
                ? referenceOrder
                : left.unidadMedida.localeCompare(right.unidadMedida);
        });

    return (
        <Card.Root variant="outline" minW={0}>
            <Card.Body p={{ base: 3, md: 4 }}>
                <Stack gap={4}>
                    <HStack justify="space-between" align="flex-start" gap={3}>
                        <Box minW={0}>
                            <Text fontWeight="semibold">{title}</Text>
                            <Text color="app.textMuted" fontSize="xs">
                                Unidad principal
                            </Text>
                        </Box>
                        <Badge colorPalette="green" fontSize="sm">
                            {primaryUnit}
                        </Badge>
                    </HStack>

                    <Box minW={0}>
                        <Text color="app.textMuted" fontSize="xs">
                            Stock neto
                        </Text>
                        <Text
                            color={primary.cantidadNeta < 0 ? "red.500" : undefined}
                            fontSize={{ base: "xl", md: "2xl" }}
                            fontWeight="bold"
                            lineHeight="shorter"
                            overflowWrap="anywhere"
                        >
                            {formatQuantity(primary.cantidadNeta)} {primaryUnit}
                        </Text>
                    </Box>

                    <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
                        <StockMetric
                            label="Stock positivo"
                            value={`${formatQuantity(primary.cantidadPositiva)} ${primaryUnit}`}
                        />
                        <StockMetric
                            label="Stock negativo"
                            value={`${formatQuantity(primary.cantidadNegativa)} ${primaryUnit}`}
                            warning={primary.cantidadNegativa < 0}
                        />
                        <StockMetric
                            label="Referencias positivas"
                            value={formatInteger(primary.referenciasConStock)}
                        />
                    </SimpleGrid>

                    <Separator borderColor="app.border" />

                    <Stack gap={2}>
                        <Text fontSize="sm" fontWeight="semibold">
                            Otras unidades
                        </Text>
                        {secondary.length > 0 ? (
                            secondary.map((unit) => (
                                <SecondaryUnitRow key={unit.unidadMedida} unit={unit} />
                            ))
                        ) : (
                            <Text color="app.textMuted" fontSize="sm">
                                Sin otras unidades con stock.
                            </Text>
                        )}
                    </Stack>
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

function StockMetric({
    label,
    value,
    warning = false,
}: {
    label: string;
    value: string;
    warning?: boolean;
}) {
    return (
        <Box minW={0}>
            <Text color="app.textMuted" fontSize="xs">
                {label}
            </Text>
            <Text
                color={warning ? "red.500" : undefined}
                fontSize="sm"
                fontWeight="semibold"
                overflowWrap="anywhere"
            >
                {value}
            </Text>
        </Box>
    );
}

function SecondaryUnitRow({ unit }: { unit: StockPorUnidad }) {
    return (
        <Box
            borderWidth="1px"
            borderColor="app.border"
            borderRadius="md"
            p={3}
        >
            <Stack
                direction={{ base: "column", sm: "row" }}
                justify="space-between"
                align={{ base: "flex-start", sm: "center" }}
                gap={1}
            >
                <Text fontWeight="semibold">{unit.unidadMedida}</Text>
                <Text
                    color={unit.cantidadNeta < 0 ? "red.500" : undefined}
                    fontWeight="semibold"
                >
                    {formatQuantity(unit.cantidadNeta)} {unit.unidadMedida} netos
                </Text>
            </Stack>
            <Text color="app.textMuted" fontSize="xs" mt={1}>
                Positivo: {formatQuantity(unit.cantidadPositiva)} ·{" "}
                <Text
                    as="span"
                    color={unit.cantidadNegativa < 0 ? "red.500" : undefined}
                >
                    Negativo: {formatQuantity(unit.cantidadNegativa)}
                </Text>
                {" "}· {formatInteger(unit.referenciasConStock)} refs. positivas
            </Text>
        </Box>
    );
}

function emptyStockUnit(unit: string): StockPorUnidad {
    return {
        unidadMedida: unit,
        cantidadNeta: 0,
        cantidadPositiva: 0,
        cantidadNegativa: 0,
        referenciasConStock: 0,
    };
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
        <Card.Root variant="outline" minW={0}>
            <Card.Body p={{ base: 3, md: 4 }}>
                <Stat.Root minW={0}>
                    <Stat.Label fontSize="sm">Valorización de materiales</Stat.Label>
                    <Stat.ValueText
                        fontSize={{ base: "xl", md: "2xl" }}
                        lineHeight="shorter"
                        overflowWrap="anywhere"
                        mt={1}
                    >
                        {formatCurrency(total)}
                    </Stat.ValueText>
                    <Stat.HelpText mb={0} mt={2}>
                        Solo stock positivo con costo maestro vigente
                    </Stat.HelpText>
                </Stat.Root>
                <Separator my={3} />
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                    <ValuationDetail label="Materia prima" value={rawMaterial} />
                    <ValuationDetail label="Material de empaque" value={packaging} />
                </SimpleGrid>
            </Card.Body>
        </Card.Root>
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
        <Card.Root variant="outline" minW={0}>
            <Card.Body p={{ base: 3, md: 4 }}>
                <Stat.Root minW={0}>
                    <HStack justify="space-between" align="flex-start" gap={2}>
                        <Stat.Label fontSize="sm">Cobertura de costos</Stat.Label>
                        <Tooltip content="¿Qué significa este indicador?" showArrow>
                            <IconButton
                                aria-label="Explicación de la cobertura de costos"
                                onClick={onOpenHelp}
                                size="sm"
                                variant="ghost"
                                colorPalette="blue"><LuHelpCircle /></IconButton>
                        </Tooltip>
                    </HStack>
                    <Stat.ValueText fontSize="xl" lineHeight="shorter" mt={1}>
                        {formatPercent(global)}
                    </Stat.ValueText>
                    {showGroups ? (
                        <SimpleGrid columns={2} gap={2} mt={3}>
                            <CoverageDetail label="Materiales" value={materials} />
                            <CoverageDetail label="Terminados" value={finished} />
                        </SimpleGrid>
                    ) : (
                        <Stat.HelpText mb={0} mt={2}>
                            Referencias positivas con costo
                        </Stat.HelpText>
                    )}
                </Stat.Root>
            </Card.Body>
        </Card.Root>
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

export function InventoryAnalyticsSection({
    stock,
    cutoff,
}: {
    stock: StockInventario;
    cutoff: string;
}) {
    const chartHeight = useBreakpointValue({ base: 300, md: 350 }) ?? 350;

    return (
        <Stack gap={4}>
            <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
                <Card.Root variant="outline">
                    <Card.Body p={{ base: 3, md: 5 }}>
                        <Stack gap={3}>
                            <SectionHeading
                                title="Composición del inventario"
                                description="Participación sobre el valor estimado positivo."
                            />
                            <ReactECharts
                                option={buildCompositionChart(stock.composicion)}
                                style={{ height: `${chartHeight}px`, width: "100%" }}
                            />
                        </Stack>
                    </Card.Body>
                </Card.Root>

                <Card.Root variant="outline">
                    <Card.Body p={{ base: 3, md: 5 }}>
                        <Stack gap={3}>
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
                    </Card.Body>
                </Card.Root>
            </SimpleGrid>

            <InventarioAlertasSection
                initialAlerts={stock.alertas}
                initialCutoff={cutoff}
            />
        </Stack>
    );
}
