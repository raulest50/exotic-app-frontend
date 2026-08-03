import {
    ChevronDownIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    DownloadIcon,
    SearchIcon,
    WarningTwoIcon,
} from "@chakra-ui/icons";
import {
    Alert,
    AlertDescription,
    AlertIcon,
    Badge,
    Box,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    Collapse,
    FormControl,
    FormLabel,
    HStack,
    IconButton,
    Input,
    Radio,
    RadioGroup,
    Select,
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
    useBreakpointValue,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
import {
    type KeyboardEvent,
    useEffect,
    useMemo,
    useState,
} from "react";
import CoberturaMaterialDetailDrawer from "./CoberturaMaterialDetailDrawer";
import {
    downloadMaterialCoverageExcel,
    fetchMaterialCoverage,
    requestErrorMessage,
} from "./informesGlobales.api";
import {
    formatDate,
    formatInteger,
    formatQuantity,
    KpiCard,
} from "./InformeGlobalUi";
import type {
    CoberturaMateriales,
    EstimacionCoberturaMaterial,
    FiltroGrupoCoberturaMaterial,
    FuenteDemandaCobertura,
    HorizonteCoberturaMaterial,
    OrdenCoberturaMaterial,
} from "./informesGlobales.types";

type CoverageWindow = 7 | 30 | 90;
type CoverageMode = "PRIORIDAD" | "EXPLORAR";
type PageSize = 10 | 20;

export default function CoberturaMaterialesCard() {
    const detail = useDisclosure();
    const toast = useToast();
    const [expanded, setExpanded] = useState(false);
    const [mode, setMode] = useState<CoverageMode>("PRIORIDAD");
    const [windowDays, setWindowDays] = useState<CoverageWindow>(90);
    const [demandSource, setDemandSource] =
        useState<FuenteDemandaCobertura>("SOLO_DISPENSACIONES");
    const [horizon, setHorizon] =
        useState<HorizonteCoberturaMaterial>("TODOS");
    const [group, setGroup] =
        useState<FiltroGrupoCoberturaMaterial>("TODOS");
    const [unit, setUnit] = useState("");
    const [order, setOrder] =
        useState<OrdenCoberturaMaterial>("AGOTAMIENTO");
    const [draftSearch, setDraftSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState<PageSize>(10);
    const [report, setReport] = useState<CoberturaMateriales | null>(null);
    const [selectedEstimate, setSelectedEstimate] =
        useState<EstimacionCoberturaMaterial | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);

    const request = useMemo(() => ({
        windowDays,
        demandSource,
        horizon,
        group,
        unit,
        order,
        search: appliedSearch,
        page,
        size,
    }), [
        appliedSearch,
        demandSource,
        group,
        horizon,
        order,
        page,
        size,
        unit,
        windowDays,
    ]);

    useEffect(() => {
        if (!expanded) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);
        fetchMaterialCoverage({ ...request, signal: controller.signal })
            .then((response) => {
                if (unit
                && !response.facetas.unidadesDisponibles.includes(unit)) {
                    setUnit("");
                    if (order === "MAYOR_DEMANDA") {
                        setOrder("AGOTAMIENTO");
                    }
                    setPage(0);
                    return;
                }
                setReport(response);
                if (response.pagina.page !== page) {
                    setPage(response.pagina.page);
                }
            })
            .catch((requestError: unknown) => {
                if (!controller.signal.aborted) {
                    setError(requestErrorMessage(requestError));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [expanded, order, page, request, retryKey, unit]);

    const closeDetail = () => {
        detail.onClose();
        setSelectedEstimate(null);
    };

    const changeWindow = (value: CoverageWindow) => {
        closeDetail();
        setReport(null);
        setPage(0);
        setWindowDays(value);
    };

    const changeDemandSource = (value: FuenteDemandaCobertura) => {
        closeDetail();
        setReport(null);
        setPage(0);
        setDemandSource(value);
    };

    const applySearch = () => {
        setAppliedSearch(draftSearch.trim());
        setPage(0);
    };

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") applySearch();
    };

    const downloadExcel = async () => {
        if (!report || report.pagina.totalElements === 0 || downloading) return;
        setDownloading(true);
        try {
            const data = await downloadMaterialCoverageExcel({
                windowDays,
                demandSource,
                horizon,
                group,
                unit,
                order,
                search: appliedSearch,
            });
            triggerExcelDownload(data, coverageExcelFilename(new Date()));
        } catch {
            toast({
                title: "No se pudo descargar el Excel de cobertura",
                description:
                    "Compruebe la selección y la conexión antes de intentar nuevamente.",
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setDownloading(false);
        }
    };

    const clearFilters = () => {
        setHorizon("TODOS");
        setGroup("TODOS");
        setUnit("");
        setOrder("AGOTAMIENTO");
        setDraftSearch("");
        setAppliedSearch("");
        setPage(0);
        setSize(10);
    };

    const openDetail = (estimate: EstimacionCoberturaMaterial) => {
        setSelectedEstimate(estimate);
        detail.onOpen();
    };

    const toggleExpanded = () => {
        if (expanded) closeDetail();
        setExpanded((current) => !current);
    };

    return (
        <>
            <Card variant="outline">
                <CardBody p={{ base: 3, md: 5 }}>
                    <Stack spacing={4}>
                        <Button
                            variant="ghost"
                            justifyContent="space-between"
                            minH="44px"
                            px={2}
                            whiteSpace="normal"
                            onClick={toggleExpanded}
                            rightIcon={expanded
                                ? <ChevronUpIcon />
                                : <ChevronDownIcon />}
                            aria-expanded={expanded}
                        >
                            <HStack spacing={2} flexWrap="wrap">
                                {report?.confianzaBaja ? (
                                    <WarningTwoIcon color="yellow.500" />
                                ) : null}
                                <Text as="span">
                                    {coverageToggleLabel(
                                        report?.confianzaBaja,
                                        expanded,
                                    )}
                                </Text>
                                {report?.confianzaBaja ? (
                                    <Badge colorScheme="yellow">
                                        Confianza baja
                                    </Badge>
                                ) : null}
                                {report?.escenarioExploratorio ? (
                                    <Badge colorScheme="purple">
                                        Escenario ampliado
                                    </Badge>
                                ) : null}
                            </HStack>
                        </Button>

                        <Collapse in={expanded} animateOpacity>
                            <Stack spacing={4} pt={1}>
                                <Text color="app.textMuted" fontSize="sm">
                                    Estima cuándo se agotaría el primer material
                                    si se repitiera el ritmo reciente de la fuente
                                    de demanda seleccionada y no ingresaran
                                    materiales. No debe usarse como compromiso de
                                    abastecimiento.
                                </Text>

                                <CoverageContextControls
                                    windowDays={windowDays}
                                    demandSource={demandSource}
                                    onWindowChange={changeWindow}
                                    onDemandSourceChange={changeDemandSource}
                                />

                                {loading ? (
                                    <HStack minH="120px" justify="center">
                                        <Spinner color="green.500" />
                                        <Text color="app.textMuted">
                                            Calculando cobertura…
                                        </Text>
                                    </HStack>
                                ) : error ? (
                                    <Alert status="error" borderRadius="md">
                                        <AlertIcon />
                                        <HStack
                                            justify="space-between"
                                            align="center"
                                            flex={1}
                                        >
                                            <Text fontSize="sm">{error}</Text>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setRetryKey(
                                                    (current) => current + 1,
                                                )}
                                            >
                                                Reintentar
                                            </Button>
                                        </HStack>
                                    </Alert>
                                ) : report ? (
                                    <CoverageResult
                                        report={report}
                                        mode={mode}
                                        setMode={setMode}
                                        horizon={horizon}
                                        group={group}
                                        unit={unit}
                                        order={order}
                                        draftSearch={draftSearch}
                                        appliedSearch={appliedSearch}
                                        size={size}
                                        downloading={downloading}
                                        onHorizonChange={(value) => {
                                            setHorizon(value);
                                            setPage(0);
                                        }}
                                        onGroupChange={(value) => {
                                            setGroup(value);
                                            setPage(0);
                                        }}
                                        onUnitChange={(value) => {
                                            setUnit(value);
                                            if (!value
                                            && order === "MAYOR_DEMANDA") {
                                                setOrder("AGOTAMIENTO");
                                            }
                                            setPage(0);
                                        }}
                                        onOrderChange={(value) => {
                                            setOrder(value);
                                            setPage(0);
                                        }}
                                        setDraftSearch={setDraftSearch}
                                        onApplySearch={applySearch}
                                        onSearchKeyDown={handleSearchKeyDown}
                                        onSizeChange={(value) => {
                                            setSize(value);
                                            setPage(0);
                                        }}
                                        onPageChange={setPage}
                                        onClear={clearFilters}
                                        onSelect={openDetail}
                                        onDownload={downloadExcel}
                                    />
                                ) : null}
                            </Stack>
                        </Collapse>
                    </Stack>
                </CardBody>
            </Card>

            <CoberturaMaterialDetailDrawer
                estimate={selectedEstimate}
                cutoff={report?.fechaHoraCorteStock ?? ""}
                windowDays={windowDays}
                demandSource={demandSource}
                isOpen={detail.isOpen}
                onClose={closeDetail}
            />
        </>
    );
}

function triggerExcelDownload(data: ArrayBuffer, filename: string) {
    const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
}

function coverageExcelFilename(date: Date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    const value = (type: string) =>
        parts.find((part) => part.type === type)?.value ?? "00";
    return [
        "cobertura_materiales_",
        `${value("year")}-${value("month")}-${value("day")}`,
        `_${value("hour")}${value("minute")}.xlsx`,
    ].join("");
}

function CoverageContextControls({
    windowDays,
    demandSource,
    onWindowChange,
    onDemandSourceChange,
}: {
    windowDays: CoverageWindow;
    demandSource: FuenteDemandaCobertura;
    onWindowChange: (value: CoverageWindow) => void;
    onDemandSourceChange: (value: FuenteDemandaCobertura) => void;
}) {
    return (
        <Stack
            direction={{ base: "column", lg: "row" }}
            align={{ base: "stretch", lg: "flex-end" }}
            justify="space-between"
            spacing={4}
        >
            <FormControl>
                <FormLabel fontSize="sm">Fuente de demanda</FormLabel>
                <RadioGroup
                    value={demandSource}
                    onChange={(value) => onDemandSourceChange(
                        value as FuenteDemandaCobertura,
                    )}
                >
                    <Stack spacing={3}>
                        <Box>
                            <Radio value="SOLO_DISPENSACIONES">
                                Consumo operativo
                            </Radio>
                            <Text ml={6} color="app.textMuted" fontSize="xs">
                                Solo dispensaciones formales.
                            </Text>
                        </Box>
                        <Box>
                            <Radio value="DISPENSACIONES_MAS_CONTINGENCIAS">
                                Consumo operativo + contingencias de producción
                            </Radio>
                            <Text ml={6} color="app.textMuted" fontSize="xs">
                                Escenario ampliado con ajustes negativos
                                clasificados como producción por contingencia.
                            </Text>
                        </Box>
                    </Stack>
                </RadioGroup>
            </FormControl>

            <ButtonGroup
                isAttached
                size="sm"
                alignSelf={{ base: "stretch", lg: "flex-end" }}
            >
                {([7, 30, 90] as CoverageWindow[]).map((days) => (
                    <Button
                        key={days}
                        minH="44px"
                        flex={{ base: 1, md: "initial" }}
                        colorScheme={windowDays === days ? "green" : undefined}
                        variant={windowDays === days ? "solid" : "outline"}
                        onClick={() => onWindowChange(days)}
                        aria-pressed={windowDays === days}
                    >
                        {days} días
                    </Button>
                ))}
            </ButtonGroup>
        </Stack>
    );
}

function CoverageResult({
    report,
    mode,
    setMode,
    horizon,
    group,
    unit,
    order,
    draftSearch,
    appliedSearch,
    size,
    downloading,
    onHorizonChange,
    onGroupChange,
    onUnitChange,
    onOrderChange,
    setDraftSearch,
    onApplySearch,
    onSearchKeyDown,
    onSizeChange,
    onPageChange,
    onClear,
    onSelect,
    onDownload,
}: {
    report: CoberturaMateriales;
    mode: CoverageMode;
    setMode: (value: CoverageMode) => void;
    horizon: HorizonteCoberturaMaterial;
    group: FiltroGrupoCoberturaMaterial;
    unit: string;
    order: OrdenCoberturaMaterial;
    draftSearch: string;
    appliedSearch: string;
    size: PageSize;
    downloading: boolean;
    onHorizonChange: (value: HorizonteCoberturaMaterial) => void;
    onGroupChange: (value: FiltroGrupoCoberturaMaterial) => void;
    onUnitChange: (value: string) => void;
    onOrderChange: (value: OrdenCoberturaMaterial) => void;
    setDraftSearch: (value: string) => void;
    onApplySearch: () => void;
    onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onSizeChange: (value: PageSize) => void;
    onPageChange: (page: number) => void;
    onClear: () => void;
    onSelect: (estimate: EstimacionCoberturaMaterial) => void;
    onDownload: () => void;
}) {
    if (report.estado === "SIN_CONSUMO") {
        return (
            <Stack spacing={3}>
                <CoverageSourceNotices report={report} />
                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    No hubo consumo suficiente para estimar agotamientos en esta
                    ventana.
                </Alert>
            </Stack>
        );
    }

    return (
        <Stack spacing={4}>
            <CoverageSourceNotices report={report} />

            {report.confianzaBaja ? (
                <Alert
                    status="warning"
                    alignItems="flex-start"
                    borderRadius="md"
                >
                    <AlertIcon mt={0.5} />
                    <Stack spacing={1}>
                        <Text fontWeight="semibold">
                            Estimación de baja confianza
                        </Text>
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
                    value={intervalLabel(
                        report.intervaloFechaMin,
                        report.intervaloFechaMax,
                    )}
                    help="Rango bootstrap de la demanda"
                />
                <KpiCard
                    label="Materiales con demanda"
                    value={formatInteger(report.materialesConDemanda)}
                    help={`${formatInteger(report.materialesAnalizados)} analizados`}
                />
                <KpiCard
                    label="Días activos"
                    value={formatInteger(report.diasConDemanda)}
                    help={`${formatInteger(report.diasConDispensacion)} con dispensación · ${formatInteger(report.diasObservados)} observados`}
                />
            </SimpleGrid>

            <ButtonGroup isAttached size="sm">
                <Button
                    minH="40px"
                    colorScheme={mode === "PRIORIDAD" ? "green" : undefined}
                    variant={mode === "PRIORIDAD" ? "solid" : "outline"}
                    onClick={() => setMode("PRIORIDAD")}
                >
                    Vista prioritaria
                </Button>
                <Button
                    minH="40px"
                    colorScheme={mode === "EXPLORAR" ? "green" : undefined}
                    variant={mode === "EXPLORAR" ? "solid" : "outline"}
                    onClick={() => {
                        onPageChange(0);
                        setMode("EXPLORAR");
                    }}
                >
                    Explorar materiales
                </Button>
            </ButtonGroup>

            {mode === "PRIORIDAD" ? (
                <PriorityCoverageView
                    items={report.estimaciones}
                    onSelect={onSelect}
                    onExplore={() => {
                        onPageChange(0);
                        setMode("EXPLORAR");
                    }}
                />
            ) : (
                <CoverageExplorationView
                    report={report}
                    horizon={horizon}
                    group={group}
                    unit={unit}
                    order={order}
                    draftSearch={draftSearch}
                    appliedSearch={appliedSearch}
                    size={size}
                    downloading={downloading}
                    onHorizonChange={onHorizonChange}
                    onGroupChange={onGroupChange}
                    onUnitChange={onUnitChange}
                    onOrderChange={onOrderChange}
                    setDraftSearch={setDraftSearch}
                    onApplySearch={onApplySearch}
                    onSearchKeyDown={onSearchKeyDown}
                    onSizeChange={onSizeChange}
                    onPageChange={onPageChange}
                    onClear={onClear}
                    onSelect={onSelect}
                    onDownload={onDownload}
                    onBack={() => setMode("PRIORIDAD")}
                />
            )}
        </Stack>
    );
}

function PriorityCoverageView({
    items,
    onSelect,
    onExplore,
}: {
    items: EstimacionCoberturaMaterial[];
    onSelect: (estimate: EstimacionCoberturaMaterial) => void;
    onExplore: () => void;
}) {
    return (
        <Stack spacing={3}>
            <Box>
                <Text fontWeight="semibold">Próximos agotamientos</Text>
                <Text color="app.textMuted" fontSize="sm">
                    Máximo 10 materiales ordenados por fecha estimada.
                </Text>
            </Box>
            <CoverageTable
                items={items}
                priority
                showGroup={false}
                onSelect={onSelect}
            />
            <Button alignSelf="flex-end" variant="outline" onClick={onExplore}>
                Explorar todos los materiales con cobertura
            </Button>
        </Stack>
    );
}

function CoverageExplorationView({
    report,
    horizon,
    group,
    unit,
    order,
    draftSearch,
    appliedSearch,
    size,
    downloading,
    onHorizonChange,
    onGroupChange,
    onUnitChange,
    onOrderChange,
    setDraftSearch,
    onApplySearch,
    onSearchKeyDown,
    onSizeChange,
    onPageChange,
    onClear,
    onSelect,
    onDownload,
    onBack,
}: {
    report: CoberturaMateriales;
    horizon: HorizonteCoberturaMaterial;
    group: FiltroGrupoCoberturaMaterial;
    unit: string;
    order: OrdenCoberturaMaterial;
    draftSearch: string;
    appliedSearch: string;
    size: PageSize;
    downloading: boolean;
    onHorizonChange: (value: HorizonteCoberturaMaterial) => void;
    onGroupChange: (value: FiltroGrupoCoberturaMaterial) => void;
    onUnitChange: (value: string) => void;
    onOrderChange: (value: OrdenCoberturaMaterial) => void;
    setDraftSearch: (value: string) => void;
    onApplySearch: () => void;
    onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onSizeChange: (value: PageSize) => void;
    onPageChange: (page: number) => void;
    onClear: () => void;
    onSelect: (estimate: EstimacionCoberturaMaterial) => void;
    onDownload: () => void;
    onBack: () => void;
}) {
    const pageData = report.pagina;
    const firstItem = pageData.totalElements > 0
        ? pageData.page * pageData.size + 1
        : 0;
    const lastItem = Math.min(
        (pageData.page + 1) * pageData.size,
        pageData.totalElements,
    );
    const activeLabels = [
        horizon !== "TODOS" ? horizonLabelFromFilter(horizon) : null,
        group !== "TODOS" ? groupLabel(group) : null,
        unit ? `Unidad: ${unit}` : null,
        order !== "AGOTAMIENTO" ? orderLabel(order) : null,
        appliedSearch ? `“${appliedSearch}”` : null,
    ].filter((label): label is string => Boolean(label));
    const hasActiveFilters = activeLabels.length > 0 || size !== 10;

    return (
        <Stack spacing={4}>
            <Box>
                <Text fontWeight="semibold">Horizonte de agotamiento</Text>
                <Text color="app.textMuted" fontSize="xs" mb={2}>
                    Clasifica por días restantes; no modifica la ventana usada
                    para calcular la demanda.
                </Text>
                <ButtonGroup
                    size="sm"
                    spacing={2}
                    flexWrap="wrap"
                    isAttached={false}
                >
                    {HORIZON_OPTIONS.map((option) => (
                        <Button
                            key={option.value}
                            minH="40px"
                            variant={horizon === option.value
                                ? "solid"
                                : "outline"}
                            colorScheme={horizon === option.value
                                ? option.colorScheme
                                : undefined}
                            onClick={() => onHorizonChange(option.value)}
                        >
                            {option.label}
                        </Button>
                    ))}
                </ButtonGroup>
            </Box>

            <Stack
                direction={{ base: "column", xl: "row" }}
                align={{ base: "stretch", xl: "flex-end" }}
                spacing={3}
            >
                <FormControl flex={1}>
                    <FormLabel fontSize="xs" mb={1}>Buscar material</FormLabel>
                    <HStack>
                        <Input
                            minH="40px"
                            value={draftSearch}
                            maxLength={100}
                            placeholder="Código o nombre"
                            onChange={(event) => setDraftSearch(event.target.value)}
                            onKeyDown={onSearchKeyDown}
                        />
                        <IconButton
                            aria-label="Buscar materiales con cobertura"
                            icon={<SearchIcon />}
                            minH="40px"
                            colorScheme="blue"
                            onClick={onApplySearch}
                        />
                    </HStack>
                </FormControl>
                <FormControl maxW={{ xl: "190px" }}>
                    <FormLabel fontSize="xs" mb={1}>Grupo</FormLabel>
                    <Select
                        minH="40px"
                        value={group}
                        onChange={(event) => onGroupChange(
                            event.target.value as FiltroGrupoCoberturaMaterial,
                        )}
                    >
                        <option value="TODOS">Todos</option>
                        {GROUP_OPTIONS.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={!report.facetas.gruposDisponibles
                                    .includes(option.value)}
                            >
                                {option.label}
                            </option>
                        ))}
                    </Select>
                </FormControl>
                <FormControl maxW={{ xl: "150px" }}>
                    <FormLabel fontSize="xs" mb={1}>Unidad</FormLabel>
                    <Select
                        minH="40px"
                        value={unit}
                        onChange={(event) => onUnitChange(event.target.value)}
                    >
                        <option value="">Todas</option>
                        {report.facetas.unidadesDisponibles.map((value) => (
                            <option key={value} value={value}>{value}</option>
                        ))}
                    </Select>
                </FormControl>
                <FormControl maxW={{ xl: "220px" }}>
                    <FormLabel fontSize="xs" mb={1}>Ordenar por</FormLabel>
                    <Select
                        minH="40px"
                        value={order}
                        onChange={(event) => onOrderChange(
                            event.target.value as OrdenCoberturaMaterial,
                        )}
                    >
                        <option value="AGOTAMIENTO">
                            Agotamiento más próximo
                        </option>
                        <option value="MAYOR_DEMANDA" disabled={!unit}>
                            Mayor demanda (requiere unidad)
                        </option>
                        <option value="NOMBRE">Nombre/código</option>
                    </Select>
                </FormControl>
                <FormControl maxW={{ xl: "125px" }}>
                    <FormLabel fontSize="xs" mb={1}>Mostrar</FormLabel>
                    <Select
                        minH="40px"
                        value={size}
                        onChange={(event) => onSizeChange(
                            Number(event.target.value) as PageSize,
                        )}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                    </Select>
                </FormControl>
            </Stack>

            <HStack justify="space-between" align="flex-start" flexWrap="wrap">
                <Stack spacing={1}>
                    {activeLabels.length > 0 ? (
                        <HStack spacing={2} flexWrap="wrap">
                            <Text color="app.textMuted" fontSize="sm">
                                Filtros:
                            </Text>
                            {activeLabels.map((label, index) => (
                                <Badge
                                    key={`${index}-${label}`}
                                    colorScheme="blue"
                                >
                                    {label}
                                </Badge>
                            ))}
                        </HStack>
                    ) : (
                        <Text color="app.textMuted" fontSize="sm">
                            Materiales con demanda y cobertura estimable.
                        </Text>
                    )}
                    <Text fontSize="sm" fontWeight="semibold">
                        {formatInteger(pageData.totalElements)} referencias
                        encontradas
                    </Text>
                </Stack>
                <HStack spacing={2} flexWrap="wrap">
                    {hasActiveFilters ? (
                        <Button size="sm" variant="ghost" onClick={onClear}>
                            Limpiar filtros
                        </Button>
                    ) : null}
                    <Button
                        size="sm"
                        variant="outline"
                        colorScheme="green"
                        leftIcon={<DownloadIcon />}
                        isLoading={downloading}
                        loadingText="Generando Excel…"
                        isDisabled={pageData.totalElements === 0}
                        title={`Exporta las ${pageData.totalElements} referencias encontradas`}
                        onClick={onDownload}
                    >
                        Descargar Excel
                    </Button>
                </HStack>
            </HStack>

            {pageData.items.length > 0 ? (
                <CoverageTable
                    items={pageData.items}
                    priority={false}
                    showGroup
                    onSelect={onSelect}
                />
            ) : (
                <Text color="app.textMuted" fontSize="sm">
                    No se encontraron materiales con estos filtros.
                </Text>
            )}

            <Stack
                direction={{ base: "column", md: "row" }}
                justify="space-between"
                align={{ base: "stretch", md: "center" }}
                spacing={3}
            >
                <Text color="app.textMuted" fontSize="sm">
                    Mostrando {firstItem}–{lastItem} de{" "}
                    {pageData.totalElements}
                </Text>
                <Stack
                    direction={{ base: "column", sm: "row" }}
                    align="center"
                    justify={{ base: "stretch", md: "flex-end" }}
                >
                    <Button
                        size="sm"
                        minH="44px"
                        w={{ base: "full", sm: "auto" }}
                        variant="outline"
                        isDisabled={pageData.first}
                        onClick={() => onPageChange(
                            Math.max(0, pageData.page - 1),
                        )}
                    >
                        ‹ Anterior
                    </Button>
                    <Text fontSize="sm">
                        Página {pageData.totalPages > 0
                            ? pageData.page + 1
                            : 0} de {pageData.totalPages}
                    </Text>
                    <Button
                        size="sm"
                        minH="44px"
                        w={{ base: "full", sm: "auto" }}
                        variant="outline"
                        isDisabled={pageData.last}
                        onClick={() => onPageChange(pageData.page + 1)}
                    >
                        Siguiente ›
                    </Button>
                </Stack>
            </Stack>

            <Button alignSelf="center" variant="outline" onClick={onBack}>
                Volver a vista prioritaria
            </Button>
        </Stack>
    );
}

function CoverageTable({
    items,
    priority,
    showGroup,
    onSelect,
}: {
    items: EstimacionCoberturaMaterial[];
    priority: boolean;
    showGroup: boolean;
    onSelect: (estimate: EstimacionCoberturaMaterial) => void;
}) {
    const compact = useBreakpointValue({ base: true, lg: false }) ?? true;

    if (compact) {
        return (
            <Stack spacing={3}>
                {items.map((estimate, index) => (
                    <Card key={estimate.productoId} variant="outline">
                        <CardBody p={3}>
                            <Stack spacing={3}>
                                <HStack
                                    justify="space-between"
                                    align="flex-start"
                                    flexWrap="wrap"
                                >
                                    <Box minW={0}>
                                        <Text fontWeight="semibold">
                                            {estimate.nombre}
                                        </Text>
                                        <Text
                                            color="app.textMuted"
                                            fontSize="xs"
                                        >
                                            {estimate.productoId}
                                        </Text>
                                    </Box>
                                    <HStack flexWrap="wrap">
                                        {priority && index === 0 ? (
                                            <Badge colorScheme="red">
                                                Crítico
                                            </Badge>
                                        ) : null}
                                        {showGroup ? (
                                            <Badge
                                                colorScheme={horizonColor(
                                                    estimate,
                                                )}
                                            >
                                                {horizonLabel(estimate)}
                                            </Badge>
                                        ) : null}
                                    </HStack>
                                </HStack>
                                <HStack flexWrap="wrap">
                                    {showGroup ? (
                                        <Badge variant="outline">
                                            {groupLabel(estimate.grupo)}
                                        </Badge>
                                    ) : null}
                                    {estimate.confianzaBaja ? (
                                        <Badge colorScheme="yellow">
                                            Confianza baja
                                        </Badge>
                                    ) : null}
                                </HStack>
                                <SimpleGrid columns={2} spacing={3}>
                                    <CoverageMetric
                                        label="Stock"
                                        value={`${formatQuantity(estimate.stockActual)} ${estimate.unidadMedida}`}
                                    />
                                    <CoverageMetric
                                        label="Demanda diaria"
                                        value={`${formatQuantity(estimate.demandaMediaDiaria)} ${estimate.unidadMedida}/día`}
                                    />
                                    <CoverageMetric
                                        label="Días restantes"
                                        value={
                                            estimate.diasHastaAgotamiento
                                                === null
                                            || estimate.diasHastaAgotamiento
                                                === undefined
                                                ? "—"
                                                : formatQuantity(
                                                    estimate
                                                        .diasHastaAgotamiento,
                                                )
                                        }
                                    />
                                    <CoverageMetric
                                        label="Fecha estimada"
                                        value={estimate.fechaAgotamiento
                                            ? formatDate(
                                                estimate.fechaAgotamiento,
                                            )
                                            : "—"}
                                    />
                                </SimpleGrid>
                                <Button
                                    minH="44px"
                                    variant="outline"
                                    colorScheme="blue"
                                    rightIcon={<ChevronRightIcon />}
                                    onClick={() => onSelect(estimate)}
                                >
                                    Ver detalle
                                </Button>
                            </Stack>
                        </CardBody>
                    </Card>
                ))}
            </Stack>
        );
    }

    return (
        <TableContainer>
            <Table size="sm">
                <Thead>
                    <Tr>
                        {showGroup ? <Th>Horizonte</Th> : null}
                        {showGroup ? <Th>Grupo</Th> : null}
                        <Th>Material</Th>
                        <Th isNumeric>Stock</Th>
                        <Th isNumeric>Demanda diaria</Th>
                        <Th isNumeric>Días restantes</Th>
                        <Th>Fecha estimada</Th>
                        <Th textAlign="center">Detalle</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {items.map((estimate, index) => (
                        <Tr key={estimate.productoId}>
                            {showGroup ? (
                                <Td>
                                    <Badge
                                        colorScheme={horizonColor(estimate)}
                                    >
                                        {horizonLabel(estimate)}
                                    </Badge>
                                </Td>
                            ) : null}
                            {showGroup ? (
                                <Td>{groupLabel(estimate.grupo)}</Td>
                            ) : null}
                            <Td>
                                <Stack spacing={0}>
                                    <HStack flexWrap="wrap">
                                        <Text fontWeight="semibold">
                                            {estimate.nombre}
                                        </Text>
                                        {priority && index === 0 ? (
                                            <Badge colorScheme="red">
                                                Crítico
                                            </Badge>
                                        ) : null}
                                        {estimate.confianzaBaja ? (
                                            <Badge colorScheme="yellow">
                                                Confianza baja
                                            </Badge>
                                        ) : null}
                                    </HStack>
                                    <Text
                                        color="app.textMuted"
                                        fontSize="xs"
                                    >
                                        {estimate.productoId}
                                    </Text>
                                </Stack>
                            </Td>
                            <Td isNumeric>
                                {formatQuantity(estimate.stockActual)}{" "}
                                {estimate.unidadMedida}
                            </Td>
                            <Td isNumeric>
                                <Stack spacing={0} align="flex-end">
                                    <Text>
                                        {formatQuantity(
                                            estimate.demandaMediaDiaria,
                                        )}{" "}
                                        {estimate.unidadMedida}/día
                                    </Text>
                                    {estimate.demandaMediaDiariaContingencia
                                    > 0 ? (
                                        <Text
                                            color="app.textMuted"
                                            fontSize="xs"
                                        >
                                            {formatQuantity(
                                                estimate
                                                    .demandaMediaDiariaOperativa,
                                            )}{" "}
                                            operativa +{" "}
                                            {formatQuantity(
                                                estimate
                                                    .demandaMediaDiariaContingencia,
                                            )}{" "}
                                            contingencia
                                        </Text>
                                    ) : null}
                                </Stack>
                            </Td>
                            <Td isNumeric>
                                {estimate.diasHastaAgotamiento === null
                                || estimate.diasHastaAgotamiento === undefined
                                    ? "—"
                                    : formatQuantity(
                                        estimate.diasHastaAgotamiento,
                                    )}
                            </Td>
                            <Td>
                                {estimate.fechaAgotamiento
                                    ? formatDate(estimate.fechaAgotamiento)
                                    : "—"}
                            </Td>
                            <Td textAlign="center">
                                <IconButton
                                    aria-label={`Ver cobertura de ${estimate.nombre}`}
                                    icon={<ChevronRightIcon />}
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="blue"
                                    onClick={() => onSelect(estimate)}
                                />
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </TableContainer>
    );
}

function CoverageMetric({ label, value }: { label: string; value: string }) {
    return (
        <Box minW={0}>
            <Text color="app.textMuted" fontSize="xs">{label}</Text>
            <Text fontWeight="semibold" fontSize="sm" overflowWrap="anywhere">
                {value}
            </Text>
        </Box>
    );
}

function CoverageSourceNotices({ report }: { report: CoberturaMateriales }) {
    const sources = report.resumenFuentesDemanda;

    return (
        <Stack spacing={3}>
            {report.escenarioExploratorio
            && sources.ajustesContingenciaIncluidos > 0 ? (
                <Alert status="info" alignItems="flex-start" borderRadius="md">
                    <AlertIcon mt={0.5} />
                    <AlertDescription>
                        Esta estimación incluyó{" "}
                        {formatInteger(sources.ajustesContingenciaIncluidos)}{" "}
                        movimiento(s) de producción por contingencia.
                    </AlertDescription>
                </Alert>
            ) : null}

            {sources.ajustesNegativosSinClasificarExcluidos > 0 ? (
                <Alert
                    status="warning"
                    alignItems="flex-start"
                    borderRadius="md"
                >
                    <AlertIcon mt={0.5} />
                    <AlertDescription>
                        Se excluyeron{" "}
                        {formatInteger(
                            sources.ajustesNegativosSinClasificarExcluidos,
                        )}{" "}
                        ajuste(s) negativo(s) histórico(s) sin causa
                        estructurada.
                    </AlertDescription>
                </Alert>
            ) : null}

            {report.fuenteDemanda === "DISPENSACIONES_MAS_CONTINGENCIAS"
            && sources.ajustesContingenciaDisponibles === 0 ? (
                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    No hubo contingencias de producción clasificadas en esta
                    ventana; el resultado coincide con el consumo operativo.
                </Alert>
            ) : null}
        </Stack>
    );
}

function intervalLabel(minimum?: string | null, maximum?: string | null) {
    if (!minimum || !maximum) return "No estimable";
    return `${formatDate(minimum)} – ${formatDate(maximum)}`;
}

function coverageToggleLabel(
    lowConfidence: boolean | undefined,
    expanded: boolean,
) {
    if (lowConfidence) {
        return expanded
            ? "Ocultar estimación exploratoria"
            : "Ver estimación exploratoria";
    }
    return expanded
        ? "Ocultar cobertura estimada"
        : "Cobertura estimada de materiales";
}

function horizonLabel(estimate: EstimacionCoberturaMaterial) {
    const days = estimate.diasHastaAgotamiento;
    if (days === null || days === undefined) return "No estimable";
    if (days <= 0) return "Agotado";
    if (days <= 7) return "Hasta 7 días";
    if (days <= 30) return "8–30 días";
    return "Más de 30 días";
}

function horizonColor(estimate: EstimacionCoberturaMaterial) {
    const days = estimate.diasHastaAgotamiento;
    if (days === null || days === undefined) return "gray";
    if (days <= 0) return "red";
    if (days <= 7) return "orange";
    if (days <= 30) return "yellow";
    return "green";
}

function horizonLabelFromFilter(value: HorizonteCoberturaMaterial) {
    return HORIZON_OPTIONS.find((option) => option.value === value)?.label
        ?? value;
}

function groupLabel(group: FiltroGrupoCoberturaMaterial) {
    if (group === "TODOS") return "Todos";
    return GROUP_OPTIONS.find((option) => option.value === group)?.label
        ?? group;
}

function orderLabel(order: OrdenCoberturaMaterial) {
    const labels: Record<OrdenCoberturaMaterial, string> = {
        AGOTAMIENTO: "Agotamiento más próximo",
        MAYOR_DEMANDA: "Mayor demanda",
        NOMBRE: "Nombre/código",
    };
    return labels[order];
}

const HORIZON_OPTIONS: Array<{
    value: HorizonteCoberturaMaterial;
    label: string;
    colorScheme: string;
}> = [
    { value: "TODOS", label: "Todas", colorScheme: "blue" },
    { value: "AGOTADO", label: "Agotadas", colorScheme: "red" },
    {
        value: "HASTA_7_DIAS",
        label: "Hasta 7 días",
        colorScheme: "orange",
    },
    {
        value: "DE_8_A_30_DIAS",
        label: "8–30 días",
        colorScheme: "yellow",
    },
    {
        value: "MAS_DE_30_DIAS",
        label: "Más de 30 días",
        colorScheme: "green",
    },
];

const GROUP_OPTIONS = [
    { value: "MATERIA_PRIMA", label: "Materia prima" },
    { value: "EMPAQUE", label: "Material de empaque" },
    { value: "OTROS", label: "Otros materiales" },
] as const;
