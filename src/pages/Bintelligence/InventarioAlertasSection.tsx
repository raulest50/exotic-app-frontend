import {
    ChevronDownIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    QuestionIcon,
    RepeatIcon,
    SearchIcon,
} from "@chakra-ui/icons";
import {
    Alert,
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
    Tooltip,
    Tr,
    useBreakpointValue,
    useDisclosure,
} from "@chakra-ui/react";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
    fetchInventoryAlerts,
    requestErrorMessage,
} from "./informesGlobales.api";
import {
    formatDateTime,
    formatInteger,
    formatQuantity,
} from "./InformeGlobalUi";
import InventarioAlertaDetailDrawer from "./InventarioAlertaDetailDrawer";
import InventarioAlertasHelpModal from "./InventarioAlertasHelpModal";
import type {
    AlertaStock,
    ExploracionAlertasMateriales,
    FiltroGrupoAlertaInventario,
    FiltroTipoAlertaInventario,
    OrdenAlertaInventario,
    ResumenAlertasStock,
} from "./informesGlobales.types";

type AlertMode = "PRIORIDAD" | "EXPLORAR";
type PageSize = 10 | 20;

export default function InventarioAlertasSection({
    initialAlerts,
    initialCutoff,
}: {
    initialAlerts: ResumenAlertasStock;
    initialCutoff: string;
}) {
    const help = useDisclosure();
    const detail = useDisclosure();
    const [expanded, setExpanded] = useState(true);
    const [mode, setMode] = useState<AlertMode>("PRIORIDAD");
    const [summary, setSummary] = useState(summaryOf(initialAlerts));
    const [priorityItems, setPriorityItems] = useState(initialAlerts.items);
    const [cutoff, setCutoff] = useState(initialCutoff);
    const [selectedAlert, setSelectedAlert] = useState<AlertaStock | null>(null);
    const [draftSearch, setDraftSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [type, setType] = useState<FiltroTipoAlertaInventario>("TODAS");
    const [group, setGroup] =
        useState<FiltroGrupoAlertaInventario>("TODOS");
    const [unit, setUnit] = useState("");
    const [order, setOrder] =
        useState<OrdenAlertaInventario>("PRIORIDAD");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState<PageSize>(10);
    const [result, setResult] =
        useState<ExploracionAlertasMateriales | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        setSummary(summaryOf(initialAlerts));
        setPriorityItems(initialAlerts.items);
        setCutoff(initialCutoff);
    }, [initialAlerts, initialCutoff]);

    const request = useMemo(() => mode === "PRIORIDAD"
        ? {
            type: "TODAS" as const,
            group: "TODOS" as const,
            unit: "",
            order: "PRIORIDAD" as const,
            search: "",
            page: 0,
            size: 10 as const,
        }
        : {
            type,
            group,
            unit,
            order,
            search: appliedSearch,
            page,
            size,
        }, [
        appliedSearch,
        group,
        mode,
        order,
        page,
        size,
        type,
        unit,
    ]);

    useEffect(() => {
        if (!expanded) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);
        if (mode === "EXPLORAR") setResult(null);
        fetchInventoryAlerts({ ...request, signal: controller.signal })
            .then((response) => {
                setSummary(response.resumen);
                setPriorityItems(response.prioritarios);
                setCutoff(response.fechaHoraCorteStock);
                setResult(response);
                if (mode === "EXPLORAR" && response.pagina.page !== page) {
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
    }, [expanded, mode, page, request, retryKey]);

    const exploreType = (nextType: FiltroTipoAlertaInventario) => {
        setExpanded(true);
        setType(nextType);
        setPage(0);
        setMode("EXPLORAR");
    };

    const applySearch = () => {
        setAppliedSearch(draftSearch.trim());
        setPage(0);
        setMode("EXPLORAR");
    };

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") applySearch();
    };

    const clearFilters = () => {
        setDraftSearch("");
        setAppliedSearch("");
        setType("TODAS");
        setGroup("TODOS");
        setUnit("");
        setOrder("PRIORIDAD");
        setPage(0);
        setSize(10);
    };

    const openDetail = (alert: AlertaStock) => {
        setSelectedAlert(alert);
        detail.onOpen();
    };

    const pageData = result?.pagina;
    const facetGroups = result?.facetas.gruposDisponibles ?? [];
    const facetUnits = result?.facetas.unidadesDisponibles ?? [];
    const hasActiveFilters = Boolean(
        appliedSearch
        || type !== "TODAS"
        || group !== "TODOS"
        || unit
        || order !== "PRIORIDAD"
        || size !== 10,
    );

    return (
        <>
            <Card variant="outline">
                <CardBody p={{ base: 3, md: 5 }}>
                    <Stack spacing={4}>
                        <HStack align="flex-start" spacing={2}>
                            <Button
                                variant="ghost"
                                flex={1}
                                h="auto"
                                minH="52px"
                                px={2}
                                py={2}
                                whiteSpace="normal"
                                justifyContent="space-between"
                                rightIcon={expanded
                                    ? <ChevronUpIcon />
                                    : <ChevronDownIcon />}
                                onClick={() => setExpanded((current) => !current)}
                                aria-expanded={expanded}
                            >
                                <Stack
                                    align="flex-start"
                                    spacing={1}
                                    textAlign="left"
                                    minW={0}
                                >
                                    <Text as="span" fontWeight="semibold">
                                        Alertas prioritarias de materiales
                                    </Text>
                                    <Text
                                        as="span"
                                        color="app.textMuted"
                                        fontSize="sm"
                                    >
                                        {formatInteger(summary.total)} referencias
                                        {" · "}Stock actual de GENERAL al{" "}
                                        {formatDateTime(cutoff)}
                                    </Text>
                                </Stack>
                            </Button>
                            <Tooltip label="Cómo se calculan las alertas" hasArrow>
                                <IconButton
                                    aria-label="Cómo se calculan las alertas"
                                    icon={<QuestionIcon />}
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="blue"
                                    onClick={help.onOpen}
                                />
                            </Tooltip>
                            <Tooltip label="Refrescar esta sección" hasArrow>
                                <IconButton
                                    aria-label="Refrescar alertas"
                                    icon={<RepeatIcon />}
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="green"
                                    isLoading={loading}
                                    onClick={() => {
                                        setExpanded(true);
                                        setRetryKey((current) => current + 1);
                                    }}
                                />
                            </Tooltip>
                        </HStack>

                        <ButtonGroup
                            size="xs"
                            variant="outline"
                            spacing={2}
                            flexWrap="wrap"
                            isAttached={false}
                        >
                            <AlertFilterButton
                                label={`${formatInteger(summary.negativas)} negativas`}
                                colorScheme="red"
                                active={mode === "EXPLORAR"
                                    && type === "STOCK_NEGATIVO"}
                                onClick={() => exploreType("STOCK_NEGATIVO")}
                            />
                            <AlertFilterButton
                                label={`${formatInteger(summary.agotadas)} agotadas`}
                                colorScheme="orange"
                                active={mode === "EXPLORAR" && type === "AGOTADO"}
                                onClick={() => exploreType("AGOTADO")}
                            />
                            <AlertFilterButton
                                label={`${formatInteger(summary.bajoUmbral)} bajo umbral`}
                                colorScheme="yellow"
                                active={mode === "EXPLORAR"
                                    && type === "BAJO_UMBRAL"}
                                onClick={() => exploreType("BAJO_UMBRAL")}
                            />
                            <AlertFilterButton
                                label={`${formatInteger(summary.sinCosto)} sin costo`}
                                colorScheme="purple"
                                active={mode === "EXPLORAR" && type === "SIN_COSTO"}
                                onClick={() => exploreType("SIN_COSTO")}
                            />
                        </ButtonGroup>

                        <Collapse in={expanded} animateOpacity>
                            <Stack spacing={4} pt={1}>
                                <Text color="app.textMuted" fontSize="sm">
                                    Estas alertas representan el stock físico actual;
                                    el periodo del informe no reconstruye alertas
                                    históricas.
                                </Text>

                                <ButtonGroup isAttached size="sm">
                                    <Button
                                        minH="40px"
                                        colorScheme={mode === "PRIORIDAD"
                                            ? "green"
                                            : undefined}
                                        variant={mode === "PRIORIDAD"
                                            ? "solid"
                                            : "outline"}
                                        onClick={() => setMode("PRIORIDAD")}
                                    >
                                        Vista prioritaria
                                    </Button>
                                    <Button
                                        minH="40px"
                                        colorScheme={mode === "EXPLORAR"
                                            ? "green"
                                            : undefined}
                                        variant={mode === "EXPLORAR"
                                            ? "solid"
                                            : "outline"}
                                        onClick={() => {
                                            setPage(0);
                                            setMode("EXPLORAR");
                                        }}
                                    >
                                        Explorar alertas
                                    </Button>
                                </ButtonGroup>

                                {error ? (
                                    <Alert status="error" borderRadius="md">
                                        <AlertIcon />
                                        <HStack
                                            justify="space-between"
                                            flex={1}
                                            align="center"
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
                                ) : null}

                                {mode === "PRIORIDAD" ? (
                                    <PriorityView
                                        items={priorityItems}
                                        loading={loading}
                                        onExplore={() => {
                                            setPage(0);
                                            setMode("EXPLORAR");
                                        }}
                                        onSelect={openDetail}
                                    />
                                ) : (
                                    <ExplorationView
                                        draftSearch={draftSearch}
                                        setDraftSearch={setDraftSearch}
                                        appliedSearch={appliedSearch}
                                        type={type}
                                        group={group}
                                        unit={unit}
                                        order={order}
                                        size={size}
                                        facetGroups={facetGroups}
                                        facetUnits={facetUnits}
                                        pageData={pageData}
                                        loading={loading}
                                        hasActiveFilters={hasActiveFilters}
                                        onApplySearch={applySearch}
                                        onSearchKeyDown={handleSearchKeyDown}
                                        onTypeChange={(value) => {
                                            setType(value);
                                            setPage(0);
                                        }}
                                        onGroupChange={(value) => {
                                            setGroup(value);
                                            setPage(0);
                                        }}
                                        onUnitChange={(value) => {
                                            setUnit(value);
                                            if (!value && order === "STOCK_ASC") {
                                                setOrder("PRIORIDAD");
                                            }
                                            setPage(0);
                                        }}
                                        onOrderChange={(value) => {
                                            setOrder(value);
                                            setPage(0);
                                        }}
                                        onSizeChange={(value) => {
                                            setSize(value);
                                            setPage(0);
                                        }}
                                        onClear={clearFilters}
                                        onPageChange={setPage}
                                        onSelect={openDetail}
                                        onBack={() => setMode("PRIORIDAD")}
                                    />
                                )}
                            </Stack>
                        </Collapse>
                    </Stack>
                </CardBody>
            </Card>

            <InventarioAlertasHelpModal
                isOpen={help.isOpen}
                onClose={help.onClose}
            />
            <InventarioAlertaDetailDrawer
                alert={selectedAlert}
                isOpen={detail.isOpen}
                onClose={() => {
                    detail.onClose();
                    setSelectedAlert(null);
                }}
            />
        </>
    );
}

function PriorityView({
    items,
    loading,
    onExplore,
    onSelect,
}: {
    items: AlertaStock[];
    loading: boolean;
    onExplore: () => void;
    onSelect: (alert: AlertaStock) => void;
}) {
    return (
        <Stack spacing={3}>
            <HStack justify="space-between" align="flex-start">
                <Box>
                    <Text fontWeight="semibold">Vista prioritaria</Text>
                    <Text color="app.textMuted" fontSize="sm">
                        Máximo 10 referencias ordenadas por criticidad.
                    </Text>
                </Box>
                {loading ? <Spinner size="sm" color="green.500" /> : null}
            </HStack>
            {items.length > 0 ? (
                <AlertsTable items={items} onSelect={onSelect} />
            ) : (
                <Text color="app.textMuted" fontSize="sm">
                    No se detectaron alertas de materiales.
                </Text>
            )}
            <Button alignSelf="flex-end" variant="outline" onClick={onExplore}>
                Explorar todas las alertas
            </Button>
        </Stack>
    );
}

function ExplorationView({
    draftSearch,
    setDraftSearch,
    appliedSearch,
    type,
    group,
    unit,
    order,
    size,
    facetGroups,
    facetUnits,
    pageData,
    loading,
    hasActiveFilters,
    onApplySearch,
    onSearchKeyDown,
    onTypeChange,
    onGroupChange,
    onUnitChange,
    onOrderChange,
    onSizeChange,
    onClear,
    onPageChange,
    onSelect,
    onBack,
}: {
    draftSearch: string;
    setDraftSearch: (value: string) => void;
    appliedSearch: string;
    type: FiltroTipoAlertaInventario;
    group: FiltroGrupoAlertaInventario;
    unit: string;
    order: OrdenAlertaInventario;
    size: PageSize;
    facetGroups: string[];
    facetUnits: string[];
    pageData?: ExploracionAlertasMateriales["pagina"];
    loading: boolean;
    hasActiveFilters: boolean;
    onApplySearch: () => void;
    onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onTypeChange: (value: FiltroTipoAlertaInventario) => void;
    onGroupChange: (value: FiltroGrupoAlertaInventario) => void;
    onUnitChange: (value: string) => void;
    onOrderChange: (value: OrdenAlertaInventario) => void;
    onSizeChange: (value: PageSize) => void;
    onClear: () => void;
    onPageChange: (page: number) => void;
    onSelect: (alert: AlertaStock) => void;
    onBack: () => void;
}) {
    const firstItem = pageData && pageData.totalElements > 0
        ? pageData.page * pageData.size + 1
        : 0;
    const lastItem = pageData
        ? Math.min(
            (pageData.page + 1) * pageData.size,
            pageData.totalElements,
        )
        : 0;
    const activeFilterLabels = [
        type !== "TODAS"
            ? ALERT_TYPES.find((option) => option.value === type)?.label
            : null,
        group !== "TODOS"
            ? GROUP_OPTIONS.find((option) => option.value === group)?.label
            : null,
        unit ? `Unidad: ${unit}` : null,
        order !== "PRIORIDAD" ? orderLabel(order) : null,
        appliedSearch ? `“${appliedSearch}”` : null,
    ].filter((label): label is string => Boolean(label));

    return (
        <Stack spacing={4}>
            <ButtonGroup size="sm" spacing={2} flexWrap="wrap" isAttached={false}>
                {ALERT_TYPES.map((option) => (
                    <Button
                        key={option.value}
                        minH="40px"
                        variant={type === option.value ? "solid" : "outline"}
                        colorScheme={type === option.value
                            ? option.colorScheme
                            : undefined}
                        onClick={() => onTypeChange(option.value)}
                    >
                        {option.label}
                    </Button>
                ))}
            </ButtonGroup>

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
                            aria-label="Buscar alertas"
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
                            event.target.value as FiltroGrupoAlertaInventario,
                        )}
                    >
                        <option value="TODOS">Todos</option>
                        {GROUP_OPTIONS
                            .filter((option) => facetGroups.includes(option.value))
                            .map((option) => (
                                <option key={option.value} value={option.value}>
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
                        {facetUnits.map((value) => (
                            <option key={value} value={value}>{value}</option>
                        ))}
                    </Select>
                </FormControl>
                <FormControl maxW={{ xl: "235px" }}>
                    <FormLabel fontSize="xs" mb={1}>Ordenar por</FormLabel>
                    <Select
                        minH="40px"
                        value={order}
                        onChange={(event) => onOrderChange(
                            event.target.value as OrdenAlertaInventario,
                        )}
                    >
                        <option value="PRIORIDAD">Prioridad</option>
                        <option value="MAYOR_BRECHA_RELATIVA">
                            Mayor brecha relativa
                        </option>
                        <option value="STOCK_ASC" disabled={!unit}>
                            Menor stock (requiere unidad)
                        </option>
                        <option value="NOMBRE">Nombre/código</option>
                    </Select>
                </FormControl>
                <FormControl maxW={{ xl: "135px" }}>
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
                    {activeFilterLabels.length > 0 ? (
                        <HStack spacing={2} flexWrap="wrap">
                            <Text color="app.textMuted" fontSize="sm">
                                Filtros:
                            </Text>
                            {activeFilterLabels.map((label, index) => (
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
                            Explore todas las referencias con alerta actual.
                        </Text>
                    )}
                    <Text fontSize="sm" fontWeight="semibold">
                        {pageData
                            ? `${formatInteger(pageData.totalElements)} referencias encontradas`
                            : "Preparando resultados…"}
                    </Text>
                </Stack>
                {hasActiveFilters ? (
                    <Button size="sm" variant="ghost" onClick={onClear}>
                        Limpiar filtros
                    </Button>
                ) : null}
            </HStack>

            {loading ? (
                <HStack minH="120px" justify="center">
                    <Spinner color="green.500" />
                    <Text color="app.textMuted">Consultando alertas…</Text>
                </HStack>
            ) : pageData && pageData.items.length > 0 ? (
                <AlertsTable items={pageData.items} onSelect={onSelect} />
            ) : (
                <Text color="app.textMuted" fontSize="sm">
                    No se encontraron alertas con estos filtros.
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
                    {pageData?.totalElements ?? 0}
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
                        isDisabled={!pageData || pageData.first || loading}
                        onClick={() => onPageChange(
                            Math.max(0, (pageData?.page ?? 0) - 1),
                        )}
                    >
                        ‹ Anterior
                    </Button>
                    <Text fontSize="sm">
                        Página {pageData && pageData.totalPages > 0
                            ? pageData.page + 1
                            : 0} de {pageData?.totalPages ?? 0}
                    </Text>
                    <Button
                        size="sm"
                        minH="44px"
                        w={{ base: "full", sm: "auto" }}
                        variant="outline"
                        isDisabled={!pageData || pageData.last || loading}
                        onClick={() => onPageChange((pageData?.page ?? 0) + 1)}
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

function AlertsTable({
    items,
    onSelect,
}: {
    items: AlertaStock[];
    onSelect: (alert: AlertaStock) => void;
}) {
    const compact = useBreakpointValue({ base: true, lg: false }) ?? true;

    if (compact) {
        return (
            <Stack spacing={3}>
                {items.map((alert) => (
                    <Card
                        key={`${alert.tipo}-${alert.productoId}`}
                        variant="outline"
                    >
                        <CardBody p={3}>
                            <Stack spacing={3}>
                                <HStack
                                    justify="space-between"
                                    align="flex-start"
                                    flexWrap="wrap"
                                >
                                    <Box minW={0}>
                                        <Text fontWeight="semibold">
                                            {alert.productoNombre}
                                        </Text>
                                        <Text
                                            color="app.textMuted"
                                            fontSize="xs"
                                        >
                                            {alert.productoId}
                                        </Text>
                                    </Box>
                                    <Badge colorScheme={alertColor(alert.tipo)}>
                                        {alertLabel(alert.tipo)}
                                    </Badge>
                                </HStack>
                                <Badge
                                    variant="outline"
                                    alignSelf="flex-start"
                                >
                                    {groupLabel(alert.grupo)}
                                </Badge>
                                <SimpleGrid columns={2} spacing={3}>
                                    <AlertMetric
                                        label="Stock"
                                        value={`${formatQuantity(alert.stock)} ${alert.unidadMedida}`}
                                    />
                                    <AlertMetric
                                        label="Umbral"
                                        value={quantityOrDash(
                                            alert.umbral,
                                            alert.unidadMedida,
                                        )}
                                    />
                                    <AlertMetric
                                        label="Brecha"
                                        value={quantityOrDash(
                                            alert.brechaUmbral,
                                            alert.unidadMedida,
                                        )}
                                    />
                                </SimpleGrid>
                                <Button
                                    minH="44px"
                                    variant="outline"
                                    colorScheme="blue"
                                    rightIcon={<ChevronRightIcon />}
                                    onClick={() => onSelect(alert)}
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
                        <Th>Alerta</Th>
                        <Th>Grupo</Th>
                        <Th>Referencia</Th>
                        <Th isNumeric>Stock</Th>
                        <Th isNumeric>Umbral</Th>
                        <Th isNumeric>Brecha</Th>
                        <Th textAlign="center">Detalle</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {items.map((alert) => (
                        <Tr key={`${alert.tipo}-${alert.productoId}`}>
                            <Td>
                                <Badge colorScheme={alertColor(alert.tipo)}>
                                    {alertLabel(alert.tipo)}
                                </Badge>
                            </Td>
                            <Td>{groupLabel(alert.grupo)}</Td>
                            <Td>
                                <Text fontWeight="semibold">
                                    {alert.productoNombre}
                                </Text>
                                <Text color="app.textMuted" fontSize="xs">
                                    {alert.productoId}
                                </Text>
                            </Td>
                            <Td isNumeric>
                                {formatQuantity(alert.stock)} {alert.unidadMedida}
                            </Td>
                            <Td isNumeric>
                                {quantityOrDash(alert.umbral, alert.unidadMedida)}
                            </Td>
                            <Td isNumeric>
                                {quantityOrDash(
                                    alert.brechaUmbral,
                                    alert.unidadMedida,
                                )}
                            </Td>
                            <Td textAlign="center">
                                <IconButton
                                    aria-label={`Ver detalle de ${alert.productoNombre}`}
                                    icon={<ChevronRightIcon />}
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="blue"
                                    onClick={() => onSelect(alert)}
                                />
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </TableContainer>
    );
}

function AlertMetric({ label, value }: { label: string; value: string }) {
    return (
        <Box minW={0}>
            <Text color="app.textMuted" fontSize="xs">{label}</Text>
            <Text fontWeight="semibold" fontSize="sm" overflowWrap="anywhere">
                {value}
            </Text>
        </Box>
    );
}

function AlertFilterButton({
    label,
    colorScheme,
    active,
    onClick,
}: {
    label: string;
    colorScheme: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <Button
            colorScheme={colorScheme}
            variant={active ? "solid" : "outline"}
            onClick={onClick}
            aria-pressed={active}
        >
            {label}
        </Button>
    );
}

function summaryOf(alerts: ResumenAlertasStock) {
    return {
        total: alerts.total,
        negativas: alerts.negativas,
        agotadas: alerts.agotadas ?? 0,
        bajoUmbral: alerts.bajoUmbral,
        sinCosto: alerts.sinCosto,
    };
}

function quantityOrDash(value: number | null | undefined, unit: string) {
    return value === null || value === undefined
        ? "—"
        : `${formatQuantity(value)} ${unit}`;
}

function orderLabel(order: OrdenAlertaInventario) {
    const labels: Record<OrdenAlertaInventario, string> = {
        PRIORIDAD: "Prioridad",
        MAYOR_BRECHA_RELATIVA: "Mayor brecha relativa",
        STOCK_ASC: "Menor stock",
        NOMBRE: "Nombre/código",
    };
    return labels[order];
}

const ALERT_TYPES: Array<{
    value: FiltroTipoAlertaInventario;
    label: string;
    colorScheme: string;
}> = [
    { value: "TODAS", label: "Todas", colorScheme: "blue" },
    { value: "STOCK_NEGATIVO", label: "Negativas", colorScheme: "red" },
    { value: "AGOTADO", label: "Agotadas", colorScheme: "orange" },
    { value: "BAJO_UMBRAL", label: "Bajo umbral", colorScheme: "yellow" },
    { value: "SIN_COSTO", label: "Sin costo", colorScheme: "purple" },
];

const GROUP_OPTIONS = [
    { value: "MATERIA_PRIMA", label: "Materia prima" },
    { value: "EMPAQUE", label: "Material de empaque" },
    { value: "OTROS", label: "Otros materiales" },
] as const;

function alertColor(type: AlertaStock["tipo"]) {
    if (type === "STOCK_NEGATIVO") return "red";
    if (type === "AGOTADO") return "orange";
    if (type === "BAJO_UMBRAL") return "yellow";
    return "purple";
}

function alertLabel(type: AlertaStock["tipo"]) {
    const labels: Record<AlertaStock["tipo"], string> = {
        STOCK_NEGATIVO: "Stock negativo",
        AGOTADO: "Agotado",
        BAJO_UMBRAL: "Bajo umbral",
        SIN_COSTO: "Sin costo",
    };
    return labels[type];
}

function groupLabel(group: AlertaStock["grupo"]) {
    const labels: Record<AlertaStock["grupo"], string> = {
        MATERIA_PRIMA: "Materia prima",
        EMPAQUE: "Empaque",
        OTROS: "Otros",
    };
    return labels[group];
}
