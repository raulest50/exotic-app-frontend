import {
    Alert,
    Badge,
    Box,
    Button,
    ButtonGroup,
    Card,
    Collapsible,
    HStack,
    IconButton,
    Input,
    Progress,
    NativeSelect,
    SimpleGrid,
    Spinner,
    Stack,
    Text,
    useBreakpointValue,
    useDisclosure,
    Field,
} from "@chakra-ui/react";
import { Tooltip } from '@/components/ui/tooltip';
import ReactECharts from "echarts-for-react";
import {
    type KeyboardEvent,
    useEffect,
    useMemo,
    useState,
} from "react";
import AjustesImpactoHelpModal from "./AjustesImpactoHelpModal";
import {
    fetchAdjustmentMaterialsPage,
    requestErrorMessage,
} from "./informesGlobales.api";
import { buildAdjustmentTrendChart } from "./informesGlobales.charts";
import {
    formatCurrency,
    formatDateTime,
    formatInteger,
    formatPercent,
    formatQuantity,
    KpiCard,
    SectionHeading,
} from "./InformeGlobalUi";
import type {
    AjustesInventario,
    GrupoAjustesInventario,
    GrupoMaterialAjuste,
    InformeQuery,
    MaterialImpactoAjuste,
    OrdenAjusteMaterial,
    PaginaInformeInventario,
    PeriodoInforme,
    TipoFiltroAjuste,
} from "./informesGlobales.types";
import { LuChevronDown, LuChevronUp, LuCircleHelp, LuSearch } from 'react-icons/lu';

type TrendGroup = "TODOS" | GrupoMaterialAjuste;
type TrendPerspective = "valor" | "cantidad";
type ExplorerMode = "MAYOR_IMPACTO" | "EXPLORAR";
type PageSize = 5 | 10;

interface AdjustmentsSectionProps {
    adjustments: AjustesInventario;
    period: PeriodoInforme;
}

export default function InformeAlmacenAdjustmentsSection({
    adjustments,
    period,
}: AdjustmentsSectionProps) {
    const [expanded, setExpanded] = useState(false);
    const periodKey = `${period.fechaDesde}|${period.fechaHasta}|${period.modoFecha}`;

    useEffect(() => {
        setExpanded(false);
    }, [periodKey]);

    const summary = adjustments.resumen;
    const compactSummary = summary.movimientos > 0
        ? `${formatInteger(summary.transacciones)} transacciones · `
            + `${formatInteger(summary.movimientos)} movimientos · `
            + `Positivos ${formatCurrency(summary.positivos.valorEstimado)} · `
            + `Negativos ${formatCurrency(summary.negativos.valorEstimado)}`
        : "Sin ajustes registrados en el período.";

    return (
        <Card.Root variant="outline">
            <Card.Body p={{ base: 3, md: 5 }}>
                <Stack gap={4}>
                    <Button
                        variant="ghost"
                        minH="52px"
                        h="auto"
                        px={2}
                        py={2}
                        justifyContent="space-between"
                        onClick={() => setExpanded((current) => !current)}
                        aria-expanded={expanded}><Stack
                            align="flex-start"
                            gap={1}
                            textAlign="left"
                            minW={0}
                            whiteSpace="normal"
                        >
                            <Text as="span" fontWeight="semibold">
                                Ajustes de inventario del período
                            </Text>
                            <Text
                                as="span"
                                color="app.textMuted"
                                fontSize="sm"
                                overflowWrap="anywhere"
                            >
                                {compactSummary}
                            </Text>
                        </Stack>{expanded ? <LuChevronUp /> : <LuChevronDown />}</Button>

                    <Collapsible.Root open={expanded}>
                        <Collapsible.Content>
                            <Stack gap={{ base: 5, md: 6 }} pt={1}>
                                <Text color="app.textMuted" fontSize="sm">
                                    Correcciones registradas durante el período consultado.
                                    Afectan el stock actual, pero no se consideran
                                    automáticamente dispensaciones ni demanda productiva.
                                </Text>

                                <AdjustmentKpis adjustments={adjustments} />
                                <AdjustmentComparison adjustments={adjustments} />
                                <AdjustmentTrend
                                    adjustments={adjustments}
                                    period={period}
                                />
                                <ImpactExplorer
                                    adjustments={adjustments}
                                    period={period}
                                />
                            </Stack>
                        </Collapsible.Content>
                    </Collapsible.Root>
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

function AdjustmentKpis({ adjustments }: { adjustments: AjustesInventario }) {
    const summary = adjustments.resumen;
    return (
        <Stack gap={3}>
            <Text
                color="app.textMuted"
                fontSize="xs"
                fontWeight="semibold"
                letterSpacing="wide"
                textTransform="uppercase"
            >
                Resumen global · Todos los productos
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={3}>
                <KpiCard
                    label="Ajustes positivos"
                    value={formatCurrency(summary.positivos.valorEstimado)}
                    help={`${formatInteger(summary.positivos.movimientos)} mov. · `
                        + `${formatInteger(summary.positivos.referencias)} refs.`}
                />
                <KpiCard
                    label="Ajustes negativos"
                    value={formatCurrency(summary.negativos.valorEstimado)}
                    help={`${formatInteger(summary.negativos.movimientos)} mov. · `
                        + `${formatInteger(summary.negativos.referencias)} refs.`}
                />
                <KpiCard
                    label="Balance neto"
                    value={formatSignedCurrency(summary.balanceNeto)}
                    help="Valor estimado positivo menos negativo"
                />
                <KpiCard
                    label="Actividad"
                    value={`${formatInteger(summary.transacciones)} transacciones`}
                    help={`${formatInteger(summary.movimientos)} mov. · `
                        + `${formatInteger(summary.referencias)} refs.`}
                />
            </SimpleGrid>
        </Stack>
    );
}

function AdjustmentComparison({
    adjustments,
}: {
    adjustments: AjustesInventario;
}) {
    const other = adjustments.comparativo.otros;
    return (
        <Card.Root variant="outline">
            <Card.Body p={{ base: 3, md: 5 }}>
                <Stack gap={4}>
                    <SectionHeading
                        title="Comparativo de materiales"
                        description="Entradas y salidas por ajustes, separadas según la naturaleza del material."
                    />

                    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                        <AdjustmentGroupCard
                            title="Materias primas"
                            group={adjustments.comparativo.materiaPrima}
                        />
                        <AdjustmentGroupCard
                            title="Materiales de empaque"
                            group={adjustments.comparativo.empaque}
                        />
                    </SimpleGrid>

                    {other.movimientos > 0 ? (
                        <Alert.Root status="info" borderRadius="md">
                            <Alert.Indicator />
                            <Text fontSize="sm">
                                Otros productos: {formatCurrency(
                                    totalImpact(other),
                                )} · {formatInteger(other.movimientos)} movimientos
                                {" · "}{formatInteger(other.referencias)} referencias.
                                Se incluyen únicamente en el resumen y tendencia global.
                            </Text>
                        </Alert.Root>
                    ) : null}
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

function AdjustmentGroupCard({
    title,
    group,
}: {
    title: string;
    group: GrupoAjustesInventario;
}) {
    const maximum = Math.max(
        group.positivos.valorEstimado,
        group.negativos.valorEstimado,
        1,
    );
    return (
        <Card.Root variant="outline" bg="app.surfaceSubtle">
            <Card.Body p={{ base: 3, md: 4 }}>
                <Stack gap={3}>
                    <HStack justify="space-between" align="flex-start">
                        <Text fontWeight="semibold">{title}</Text>
                        <Badge colorPalette="blue">
                            {formatPercent(group.participacionValorAjustadoPct)}
                        </Badge>
                    </HStack>

                    <SimpleGrid columns={2} gap={3}>
                        <Metric label="Positivos" value={group.positivos.valorEstimado} />
                        <Metric label="Negativos" value={group.negativos.valorEstimado} />
                    </SimpleGrid>
                    <Metric label="Balance neto" value={group.balanceNeto} signed />

                    <Stack gap={2}>
                        <ProgressRow
                            label="Positivos"
                            value={group.positivos.valorEstimado}
                            maximum={maximum}
                            colorScheme="green"
                        />
                        <ProgressRow
                            label="Negativos"
                            value={group.negativos.valorEstimado}
                            maximum={maximum}
                            colorScheme="red"
                        />
                    </Stack>

                    <Text color="app.textMuted" fontSize="sm">
                        {formatInteger(group.movimientos)} movimientos ·{" "}
                        {formatInteger(group.referencias)} referencias ·{" "}
                        {formatInteger(group.transacciones)} transacciones
                    </Text>
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

function Metric({
    label,
    value,
    signed = false,
}: {
    label: string;
    value: number;
    signed?: boolean;
}) {
    return (
        <Box minW={0}>
            <Text color="app.textMuted" fontSize="xs">
                {label}
            </Text>
            <Text fontWeight="semibold" overflowWrap="anywhere">
                {signed ? formatSignedCurrency(value) : formatCurrency(value)}
            </Text>
        </Box>
    );
}

function ProgressRow({
    label,
    value,
    maximum,
    colorScheme,
}: {
    label: string;
    value: number;
    maximum: number;
    colorScheme: "green" | "red";
}) {
    return (
        <Stack gap={1}>
            <HStack justify="space-between">
                <Text color="app.textMuted" fontSize="xs">{label}</Text>
                <Text fontSize="xs">{formatCurrency(value)}</Text>
            </HStack>
            <Progress.Root
                value={value * 100 / maximum}
                colorPalette={colorScheme}
                borderRadius="full"
                size="sm">
                <Progress.Track>
                    <Progress.Range />
                </Progress.Track>
            </Progress.Root>
        </Stack>
    );
}

function AdjustmentTrend({
    adjustments,
    period,
}: {
    adjustments: AjustesInventario;
    period: PeriodoInforme;
}) {
    const compactChart = useBreakpointValue({ base: true, md: false }) ?? false;
    const chartHeight = useBreakpointValue({ base: 320, md: 390 }) ?? 390;
    const [group, setGroup] = useState<TrendGroup>("TODOS");
    const [perspective, setPerspective] = useState<TrendPerspective>("valor");

    const availableUnits = useMemo(() => Array.from(new Set(
        adjustments.serieDiaria
            .filter((item) => group === "TODOS" || item.grupo === group)
            .map((item) => item.unidadMedida),
    )).sort(), [adjustments.serieDiaria, group]);
    const [unit, setUnit] = useState(availableUnits[0] ?? "");

    useEffect(() => {
        if (!availableUnits.includes(unit)) {
            setUnit(availableUnits[0] ?? "");
        }
    }, [availableUnits, unit]);

    const options = useMemo(
        () => buildAdjustmentTrendChart(
            adjustments.serieDiaria,
            perspective,
            unit,
            group,
            compactChart,
        ),
        [
            adjustments.serieDiaria,
            compactChart,
            group,
            perspective,
            unit,
        ],
    );
    const hasTrendData = adjustments.serieDiaria.some((item) =>
        (group === "TODOS" || item.grupo === group)
        && (perspective === "valor" || item.unidadMedida === unit)
        && (
            perspective === "valor"
                ? item.valorPositivo > 0 || item.valorNegativo > 0
                : item.cantidadPositiva > 0 || item.cantidadNegativa > 0
        ));

    if (period.modoFecha === "FECHA_UNICA") return null;

    return (
        <Card.Root variant="outline">
            <Card.Body p={{ base: 3, md: 5 }}>
                <Stack gap={4}>
                    <Stack
                        direction={{ base: "column", xl: "row" }}
                        justify="space-between"
                        align={{ base: "stretch", xl: "flex-end" }}
                        gap={3}
                    >
                        <SectionHeading
                            title="Tendencia de ajustes"
                            description="Evolución diaria de entradas y salidas por corrección de inventario."
                        />
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            align={{ base: "stretch", md: "flex-end" }}
                            gap={3}
                        >
                            <Field.Root minW={{ md: "190px" }}>
                                <Field.Label fontSize="xs" mb={1}>Grupo</Field.Label>
                                <NativeSelect.Root size="sm">
                                    <NativeSelect.Field
                                        minH="40px"
                                        value={group}
                                        onChange={(event) =>
                                            setGroup(event.target.value as TrendGroup)}>
                                        <option value="TODOS">Todos los productos</option>
                                        <option value="MATERIA_PRIMA">Materias primas</option>
                                        <option value="EMPAQUE">Materiales de empaque</option>
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </Field.Root>
                            <ButtonGroup attached size="sm">
                                <Button
                                    minH="40px"
                                    colorPalette={perspective === "valor" ? "blue" : undefined}
                                    variant={perspective === "valor" ? "solid" : "outline"}
                                    onClick={() => setPerspective("valor")}
                                    aria-pressed={perspective === "valor"}
                                >
                                    Valor
                                </Button>
                                <Button
                                    minH="40px"
                                    colorPalette={perspective === "cantidad" ? "blue" : undefined}
                                    variant={perspective === "cantidad" ? "solid" : "outline"}
                                    onClick={() => setPerspective("cantidad")}
                                    aria-pressed={perspective === "cantidad"}
                                >
                                    Cantidad
                                </Button>
                            </ButtonGroup>
                            {perspective === "cantidad" ? (
                                <Field.Root minW={{ md: "120px" }}>
                                    <Field.Label fontSize="xs" mb={1}>Unidad</Field.Label>
                                    <NativeSelect.Root size="sm">
                                        <NativeSelect.Field
                                            minH="40px"
                                            value={unit}
                                            onChange={(event) => setUnit(event.target.value)}>
                                            {availableUnits.map((item) => (
                                                <option key={item} value={item}>{item}</option>
                                            ))}
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                </Field.Root>
                            ) : null}
                        </Stack>
                    </Stack>

                    {hasTrendData && (perspective === "valor" || unit) ? (
                        <ReactECharts
                            option={options}
                            notMerge
                            style={{ height: `${chartHeight}px`, width: "100%" }}
                        />
                    ) : (
                        <Text color="app.textMuted" fontSize="sm">
                            No hay ajustes para graficar en el período seleccionado.
                        </Text>
                    )}
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

function ImpactExplorer({
    adjustments,
    period,
}: {
    adjustments: AjustesInventario;
    period: PeriodoInforme;
}) {
    const help = useDisclosure();
    const [mode, setMode] = useState<ExplorerMode>("MAYOR_IMPACTO");
    const [draftSearch, setDraftSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [type, setType] = useState<TipoFiltroAjuste>("TODOS");
    const [order, setOrder] = useState<OrdenAjusteMaterial>("IMPACTO");
    const [size, setSize] = useState<PageSize>(5);
    const [rawPage, setRawPage] = useState(0);
    const [packagingPage, setPackagingPage] = useState(0);
    const periodKey = `${period.fechaDesde}|${period.fechaHasta}|${period.modoFecha}`;

    useEffect(() => {
        setMode("MAYOR_IMPACTO");
        setDraftSearch("");
        setAppliedSearch("");
        setType("TODOS");
        setOrder("IMPACTO");
        setSize(5);
        setRawPage(0);
        setPackagingPage(0);
    }, [periodKey]);

    const query = useMemo(() => periodToQuery(period), [period]);

    const explore = () => {
        setRawPage(0);
        setPackagingPage(0);
        setMode("EXPLORAR");
    };

    const backToImpact = () => {
        setMode("MAYOR_IMPACTO");
        setDraftSearch("");
        setAppliedSearch("");
        setType("TODOS");
        setOrder("IMPACTO");
        setSize(5);
        setRawPage(0);
        setPackagingPage(0);
    };

    const resetPages = () => {
        setRawPage(0);
        setPackagingPage(0);
    };

    const applySearch = () => {
        setAppliedSearch(draftSearch.trim());
        resetPages();
    };

    const clearSearch = () => {
        setDraftSearch("");
        setAppliedSearch("");
        resetPages();
    };

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") applySearch();
    };

    return (
        <>
            <Card.Root variant="outline">
                <Card.Body p={{ base: 3, md: 5 }}>
                    <Stack gap={4}>
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            justify="space-between"
                            align={{ base: "stretch", md: "flex-start" }}
                            gap={3}
                        >
                            <HStack align="flex-start" gap={2}>
                                <SectionHeading
                                    title="Materiales con mayor impacto"
                                    description="Clasificación por valor absoluto ajustado, sin compensar entradas contra salidas."
                                />
                                <Tooltip
                                    content="¿Cómo se calcula mayor impacto?"
                                    showArrow
                                >
                                    <IconButton
                                        aria-label="¿Cómo se calcula mayor impacto?"
                                        onClick={help.onOpen}
                                        size="sm"
                                        variant="ghost"
                                        colorPalette="blue"
                                        flexShrink={0}><LuCircleHelp /></IconButton>
                                </Tooltip>
                            </HStack>

                            <ButtonGroup attached size="sm">
                                <Button
                                    minH="40px"
                                    variant={mode === "MAYOR_IMPACTO" ? "solid" : "outline"}
                                    colorPalette={mode === "MAYOR_IMPACTO" ? "green" : undefined}
                                    onClick={backToImpact}
                                    aria-pressed={mode === "MAYOR_IMPACTO"}
                                >
                                    Mayor impacto
                                </Button>
                                <Button
                                    minH="40px"
                                    variant={mode === "EXPLORAR" ? "solid" : "outline"}
                                    colorPalette={mode === "EXPLORAR" ? "green" : undefined}
                                    onClick={explore}
                                    aria-pressed={mode === "EXPLORAR"}
                                >
                                    Explorar materiales
                                </Button>
                            </ButtonGroup>
                        </Stack>

                        {mode === "MAYOR_IMPACTO" ? (
                            <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                                <ImpactGroupPanel
                                    title="Materias primas"
                                    items={adjustments.mayorImpacto.materiaPrima}
                                    onExplore={explore}
                                    exploreLabel="Explorar otras materias primas"
                                />
                                <ImpactGroupPanel
                                    title="Materiales de empaque"
                                    items={adjustments.mayorImpacto.empaque}
                                    onExplore={explore}
                                    exploreLabel="Explorar otros empaques"
                                />
                            </SimpleGrid>
                        ) : (
                            <Stack gap={4}>
                                <ExplorerControls
                                    draftSearch={draftSearch}
                                    setDraftSearch={setDraftSearch}
                                    appliedSearch={appliedSearch}
                                    type={type}
                                    order={order}
                                    size={size}
                                    onSearch={applySearch}
                                    onClearSearch={clearSearch}
                                    onSearchKeyDown={handleSearchKeyDown}
                                    onTypeChange={(nextType) => {
                                        setType(nextType);
                                        resetPages();
                                    }}
                                    onOrderChange={(nextOrder) => {
                                        setOrder(nextOrder);
                                        resetPages();
                                    }}
                                    onSizeChange={(nextSize) => {
                                        setSize(nextSize);
                                        resetPages();
                                    }}
                                    onBack={backToImpact}
                                />

                                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                                    <ExplorationGroupPanel
                                        title="Materias primas"
                                        group="MATERIA_PRIMA"
                                        query={query}
                                        type={type}
                                        order={order}
                                        search={appliedSearch}
                                        page={rawPage}
                                        size={size}
                                        onPageChange={setRawPage}
                                    />
                                    <ExplorationGroupPanel
                                        title="Materiales de empaque"
                                        group="EMPAQUE"
                                        query={query}
                                        type={type}
                                        order={order}
                                        search={appliedSearch}
                                        page={packagingPage}
                                        size={size}
                                        onPageChange={setPackagingPage}
                                    />
                                </SimpleGrid>

                                <Button
                                    alignSelf="center"
                                    variant="outline"
                                    onClick={backToImpact}
                                >
                                    Volver a materiales de mayor impacto
                                </Button>
                            </Stack>
                        )}
                    </Stack>
                </Card.Body>
            </Card.Root>

            <AjustesImpactoHelpModal
                isOpen={help.open}
                onClose={help.onClose}
            />
        </>
    );
}

function ExplorerControls({
    draftSearch,
    setDraftSearch,
    appliedSearch,
    type,
    order,
    size,
    onSearch,
    onClearSearch,
    onSearchKeyDown,
    onTypeChange,
    onOrderChange,
    onSizeChange,
    onBack,
}: {
    draftSearch: string;
    setDraftSearch: (value: string) => void;
    appliedSearch: string;
    type: TipoFiltroAjuste;
    order: OrdenAjusteMaterial;
    size: PageSize;
    onSearch: () => void;
    onClearSearch: () => void;
    onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onTypeChange: (value: TipoFiltroAjuste) => void;
    onOrderChange: (value: OrdenAjusteMaterial) => void;
    onSizeChange: (value: PageSize) => void;
    onBack: () => void;
}) {
    return (
        <Stack gap={3}>
            <Stack
                direction={{ base: "column", xl: "row" }}
                align={{ base: "stretch", xl: "flex-end" }}
                gap={3}
            >
                <Field.Root flex={1}>
                    <Field.Label fontSize="xs" mb={1}>Buscar material</Field.Label>
                    <HStack>
                        <Input
                            minH="40px"
                            value={draftSearch}
                            placeholder="Código o nombre"
                            onChange={(event) => setDraftSearch(event.target.value)}
                            onKeyDown={onSearchKeyDown}
                        />
                        <IconButton
                            aria-label="Buscar materiales ajustados"
                            minH="40px"
                            onClick={onSearch}
                            colorPalette="blue"><LuSearch /></IconButton>
                    </HStack>
                </Field.Root>
                <Field.Root maxW={{ xl: "190px" }}>
                    <Field.Label fontSize="xs" mb={1}>Tipo de ajuste</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            minH="40px"
                            value={type}
                            onChange={(event) =>
                                onTypeChange(event.target.value as TipoFiltroAjuste)}>
                            <option value="TODOS">Todos</option>
                            <option value="POSITIVO">Solo positivos</option>
                            <option value="NEGATIVO">Solo negativos</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>
                <Field.Root maxW={{ xl: "230px" }}>
                    <Field.Label fontSize="xs" mb={1}>Ordenar por</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            minH="40px"
                            value={order}
                            onChange={(event) =>
                                onOrderChange(event.target.value as OrdenAjusteMaterial)}>
                            <option value="IMPACTO">Mayor impacto económico</option>
                            <option value="MOVIMIENTOS">Más movimientos</option>
                            <option value="RECIENTES">Más recientes</option>
                            <option value="NOMBRE">Código/nombre</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>
                <Field.Root maxW={{ xl: "140px" }}>
                    <Field.Label fontSize="xs" mb={1}>Mostrar</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            minH="40px"
                            value={size}
                            onChange={(event) =>
                                onSizeChange(Number(event.target.value) as PageSize)}>
                            <option value={5}>5 por grupo</option>
                            <option value={10}>10 por grupo</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>
            </Stack>

            <HStack justify="space-between" flexWrap="wrap">
                <Text color="app.textMuted" fontSize="sm">
                    {appliedSearch
                        ? `Búsqueda aplicada: “${appliedSearch}”`
                        : "Explore todos los materiales ajustados del período."}
                </Text>
                <ButtonGroup size="sm">
                    {appliedSearch || draftSearch ? (
                        <Button variant="ghost" onClick={onClearSearch}>
                            Limpiar búsqueda
                        </Button>
                    ) : null}
                    <Button variant="ghost" onClick={onBack}>
                        Volver a mayor impacto
                    </Button>
                </ButtonGroup>
            </HStack>
        </Stack>
    );
}

function ImpactGroupPanel({
    title,
    items,
    onExplore,
    exploreLabel,
}: {
    title: string;
    items: MaterialImpactoAjuste[];
    onExplore: () => void;
    exploreLabel: string;
}) {
    return (
        <Card.Root variant="outline">
            <Card.Body p={{ base: 3, md: 4 }}>
                <Stack gap={3}>
                    <HStack justify="space-between">
                        <Text fontWeight="semibold">{title}</Text>
                        <Badge>{formatInteger(items.length)} visibles</Badge>
                    </HStack>
                    {items.length > 0 ? (
                        <Stack gap={2}>
                            {items.map((item, index) => (
                                <ImpactMaterialItem
                                    key={item.productoId}
                                    item={item}
                                    rank={index + 1}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <Text color="app.textMuted" fontSize="sm">
                            No hay materiales ajustados en este grupo.
                        </Text>
                    )}
                    <Button variant="outline" size="sm" onClick={onExplore}>
                        {exploreLabel}
                    </Button>
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

function ExplorationGroupPanel({
    title,
    group,
    query,
    type,
    order,
    search,
    page,
    size,
    onPageChange,
}: {
    title: string;
    group: GrupoMaterialAjuste;
    query: InformeQuery;
    type: TipoFiltroAjuste;
    order: OrdenAjusteMaterial;
    search: string;
    page: number;
    size: PageSize;
    onPageChange: (page: number) => void;
}) {
    const [result, setResult] =
        useState<PaginaInformeInventario<MaterialImpactoAjuste> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        fetchAdjustmentMaterialsPage({
            query,
            group,
            type,
            order,
            search,
            page,
            size,
            signal: controller.signal,
        })
            .then(setResult)
            .catch((requestError: unknown) => {
                if (!controller.signal.aborted) {
                    setResult(null);
                    setError(requestErrorMessage(requestError));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [group, order, page, query, retryKey, search, size, type]);

    return (
        <Card.Root variant="outline">
            <Card.Body p={{ base: 3, md: 4 }}>
                <Stack gap={3}>
                    <HStack justify="space-between">
                        <Text fontWeight="semibold">{title}</Text>
                        {result ? (
                            <Badge colorPalette="blue">
                                {formatInteger(result.totalElements)} encontrados
                            </Badge>
                        ) : null}
                    </HStack>

                    {loading ? (
                        <HStack minH="120px" justify="center">
                            <Spinner color="green.500" />
                            <Text color="app.textMuted">Consultando…</Text>
                        </HStack>
                    ) : error ? (
                        <Alert.Root status="error" borderRadius="md">
                            <Alert.Indicator />
                            <Stack gap={2}>
                                <Text fontSize="sm">{error}</Text>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setRetryKey((current) => current + 1)}
                                >
                                    Reintentar
                                </Button>
                            </Stack>
                        </Alert.Root>
                    ) : result && result.items.length > 0 ? (
                        <>
                            <Stack gap={2}>
                                {result.items.map((item) => (
                                    <ImpactMaterialItem
                                        key={item.productoId}
                                        item={item}
                                    />
                                ))}
                            </Stack>
                            <HStack justify="space-between">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={result.first}
                                    onClick={() => onPageChange(Math.max(0, page - 1))}
                                >
                                    ‹ Anterior
                                </Button>
                                <Text color="app.textMuted" fontSize="sm">
                                    Página {result.totalPages === 0 ? 0 : result.page + 1}
                                    {" de "}{result.totalPages}
                                </Text>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={result.last}
                                    onClick={() => onPageChange(page + 1)}
                                >
                                    Siguiente ›
                                </Button>
                            </HStack>
                        </>
                    ) : (
                        <Text color="app.textMuted" fontSize="sm">
                            No se encontraron materiales con estos filtros.
                        </Text>
                    )}
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

function ImpactMaterialItem({
    item,
    rank,
}: {
    item: MaterialImpactoAjuste;
    rank?: number;
}) {
    const [expanded, setExpanded] = useState(false);
    return (
        <Box borderWidth="1px" borderRadius="md" overflow="hidden">
            <Button
                variant="ghost"
                w="full"
                h="auto"
                minH="48px"
                px={3}
                py={2}
                justifyContent="space-between"
                onClick={() => setExpanded((current) => !current)}
                aria-expanded={expanded}><Stack align="flex-start" gap={1} textAlign="left" minW={0}>
                    <HStack flexWrap="wrap">
                        <Text as="span" fontWeight="semibold" whiteSpace="normal">
                            {rank ? `${rank}. ` : ""}
                            {item.productoId} · {item.productoNombre}
                        </Text>
                        {!item.costoVigente ? (
                            <Badge colorPalette="yellow">Sin costo vigente</Badge>
                        ) : null}
                    </HStack>
                    <Text
                        as="span"
                        color="app.textMuted"
                        fontSize="sm"
                        whiteSpace="normal"
                    >
                        Impacto {formatCurrency(item.impactoEstimado)} ·{" "}
                        {formatInteger(item.movimientos)} movimientos
                    </Text>
                </Stack>{expanded ? <LuChevronUp /> : <LuChevronDown />}</Button>

            <Collapsible.Root open={expanded}>
                <Collapsible.Content>
                    <Stack
                        gap={3}
                        px={3}
                        pb={3}
                        pt={1}
                        borderTopWidth="1px"
                    >
                        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                            <DetailMetric
                                label="Entradas"
                                quantity={item.cantidadPositiva}
                                unit={item.unidadMedida}
                                value={item.valorPositivo}
                            />
                            <DetailMetric
                                label="Salidas"
                                quantity={item.cantidadNegativa}
                                unit={item.unidadMedida}
                                value={item.valorNegativo}
                            />
                            <DetailMetric
                                label="Balance"
                                quantity={item.balanceCantidad}
                                unit={item.unidadMedida}
                                value={item.balanceValor}
                                signed
                            />
                            <Box>
                                <Text color="app.textMuted" fontSize="xs">
                                    Actividad
                                </Text>
                                <Text fontSize="sm" fontWeight="semibold">
                                    {formatInteger(item.movimientos)} movimientos ·{" "}
                                    {formatInteger(item.transacciones)} transacciones
                                </Text>
                            </Box>
                        </SimpleGrid>
                        <Text color="app.textMuted" fontSize="xs">
                            Último ajuste:{" "}
                            {item.ultimoAjuste
                                ? formatDateTime(item.ultimoAjuste)
                                : "Sin fecha"}
                        </Text>
                    </Stack>
                </Collapsible.Content>
            </Collapsible.Root>
        </Box>
    );
}

function DetailMetric({
    label,
    quantity,
    unit,
    value,
    signed = false,
}: {
    label: string;
    quantity: number;
    unit: string;
    value: number;
    signed?: boolean;
}) {
    return (
        <Box>
            <Text color="app.textMuted" fontSize="xs">{label}</Text>
            <Text fontSize="sm" fontWeight="semibold">
                {signed
                    ? formatSignedQuantity(quantity, unit)
                    : `${formatQuantity(quantity)} ${unit}`}
            </Text>
            <Text color="app.textMuted" fontSize="xs">
                {signed ? formatSignedCurrency(value) : formatCurrency(value)}
            </Text>
        </Box>
    );
}

function totalImpact(group: GrupoAjustesInventario) {
    return group.positivos.valorEstimado + group.negativos.valorEstimado;
}

function formatSignedCurrency(value: number) {
    if (value > 0) return `+ ${formatCurrency(value)}`;
    return formatCurrency(value);
}

function formatSignedQuantity(value: number, unit: string) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatQuantity(value)} ${unit}`;
}

function periodToQuery(period: PeriodoInforme): InformeQuery {
    return period.modoFecha === "FECHA_UNICA"
        ? { fecha: period.fechaDesde }
        : {
            fechaDesde: period.fechaDesde,
            fechaHasta: period.fechaHasta,
        };
}
