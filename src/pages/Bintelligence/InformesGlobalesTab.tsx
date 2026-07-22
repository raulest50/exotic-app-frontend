import { RepeatIcon } from "@chakra-ui/icons";
import {
    Badge,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    FormControl,
    FormErrorMessage,
    FormLabel,
    HStack,
    Input,
    Progress,
    Select,
    SimpleGrid,
    Stack,
    Text,
    useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InformeAlmacenPage from "./InformeAlmacenPage";
import InformeProduccionPage from "./InformeProduccionPage";
import {
    ErrorPanel,
    formatDate,
    LoadingPanel,
} from "./InformeGlobalUi";
import {
    fetchInventoryReport,
    fetchProductionReport,
    requestErrorMessage,
} from "./informesGlobales.api";
import type {
    InformeInventario,
    InformeProduccion,
    InformeQuery,
} from "./informesGlobales.types";

type ReportPage = "almacen" | "produccion";
type DateMode = "fecha_unica" | "rango";

interface ReportState<T> {
    data: T | null;
    dataQueryKey: string | null;
    requestQueryKey: string | null;
    loading: boolean;
    error: string | null;
}

const MAX_RANGE_DAYS = 31;

export default function InformesGlobalesTab() {
    const toast = useToast();
    const today = useMemo(getTodayIsoDate, []);
    const monthStart = useMemo(getCurrentMonthStartIsoDate, []);
    const [activePage, setActivePage] = useState<ReportPage>("almacen");
    const [dateMode, setDateMode] = useState<DateMode>("fecha_unica");
    const [date, setDate] = useState(today);
    const [startDate, setStartDate] = useState(monthStart);
    const [endDate, setEndDate] = useState(today);
    const [appliedQuery, setAppliedQuery] = useState<InformeQuery>(() => ({ fecha: today }));
    const [inventory, setInventory] = useState<ReportState<InformeInventario>>(
        () => emptyReportState<InformeInventario>(),
    );
    const [production, setProduction] = useState<ReportState<InformeProduccion>>(
        () => emptyReportState<InformeProduccion>(),
    );
    const inventoryRequestId = useRef(0);
    const productionRequestId = useRef(0);
    const inventoryRequestQueryKey = useRef<string | null>(null);
    const productionRequestQueryKey = useRef<string | null>(null);

    const rangeDays = getRangeDaysInclusive(startDate, endDate);
    const rangeInverted = dateMode === "rango"
        && Boolean(startDate && endDate && startDate > endDate);
    const rangeTooLong = dateMode === "rango" && rangeDays > MAX_RANGE_DAYS;
    const currentQuery = useMemo(
        () => buildQuery(dateMode, date, startDate, endDate),
        [dateMode, date, startDate, endDate],
    );
    const datesAreValid = currentQuery !== null && !rangeInverted && !rangeTooLong;
    const appliedQueryKey = queryKey(appliedQuery);
    const draftQueryKey = currentQuery ? queryKey(currentQuery) : null;
    const hasUnappliedChanges = draftQueryKey !== appliedQueryKey;

    const loadInventory = useCallback(async (query: InformeQuery) => {
        const requestQueryKey = queryKey(query);
        inventoryRequestQueryKey.current = requestQueryKey;
        const requestId = ++inventoryRequestId.current;
        setInventory((current) => ({
            ...current,
            requestQueryKey,
            loading: true,
            error: null,
        }));
        try {
            const report = await fetchInventoryReport(query);
            if (requestId !== inventoryRequestId.current) return;
            setInventory({
                data: report,
                dataQueryKey: requestQueryKey,
                requestQueryKey,
                loading: false,
                error: null,
            });
        } catch (error) {
            if (requestId !== inventoryRequestId.current) return;
            setInventory((current) => ({
                ...current,
                requestQueryKey,
                loading: false,
                error: requestErrorMessage(error),
            }));
        }
    }, []);

    const loadProduction = useCallback(async (query: InformeQuery) => {
        const requestQueryKey = queryKey(query);
        productionRequestQueryKey.current = requestQueryKey;
        const requestId = ++productionRequestId.current;
        setProduction((current) => ({
            ...current,
            requestQueryKey,
            loading: true,
            error: null,
        }));
        try {
            const report = await fetchProductionReport(query);
            if (requestId !== productionRequestId.current) return;
            setProduction({
                data: report,
                dataQueryKey: requestQueryKey,
                requestQueryKey,
                loading: false,
                error: null,
            });
        } catch (error) {
            if (requestId !== productionRequestId.current) return;
            setProduction((current) => ({
                ...current,
                requestQueryKey,
                loading: false,
                error: requestErrorMessage(error),
            }));
        }
    }, []);

    useEffect(() => {
        if (activePage === "almacen") {
            if (inventoryRequestQueryKey.current === appliedQueryKey) return;
            void loadInventory(appliedQuery);
        } else {
            if (productionRequestQueryKey.current === appliedQueryKey) return;
            void loadProduction(appliedQuery);
        }
    }, [
        activePage,
        appliedQuery,
        appliedQueryKey,
        loadInventory,
        loadProduction,
    ]);

    const showInvalidDatesToast = () => {
        toast({
            title: "Revise las fechas",
            description: `Seleccione una fecha o un rango válido de máximo ${MAX_RANGE_DAYS} días.`,
            status: "warning",
            duration: 4500,
            isClosable: true,
        });
    };

    const applyPeriod = () => {
        if (!datesAreValid || !currentQuery) {
            showInvalidDatesToast();
            return;
        }
        const nextQueryKey = queryKey(currentQuery);
        setAppliedQuery(currentQuery);

        if (nextQueryKey === appliedQueryKey) {
            if (activePage === "almacen") {
                void loadInventory(currentQuery);
            } else {
                void loadProduction(currentQuery);
            }
        }
    };

    const activeState = activePage === "almacen" ? inventory : production;
    const activeHasCurrentData = activeState.data !== null
        && activeState.dataQueryKey === appliedQueryKey;
    const activeIsLoading = activeState.loading
        && activeState.requestQueryKey === appliedQueryKey;
    const activeError = activeState.requestQueryKey === appliedQueryKey
        ? activeState.error
        : null;

    return (
        <Stack spacing={{ base: 4, md: 5 }}>
            <ButtonGroup
                isAttached
                w={{ base: "full", md: "fit-content" }}
                aria-label="Página del informe global"
            >
                <Button
                    flex={{ base: 1, md: "initial" }}
                    minH="44px"
                    colorScheme={activePage === "almacen" ? "green" : undefined}
                    variant={activePage === "almacen" ? "solid" : "outline"}
                    onClick={() => setActivePage("almacen")}
                    aria-pressed={activePage === "almacen"}
                >
                    Almacén e inventario
                </Button>
                <Button
                    flex={{ base: 1, md: "initial" }}
                    minH="44px"
                    colorScheme={activePage === "produccion" ? "green" : undefined}
                    variant={activePage === "produccion" ? "solid" : "outline"}
                    onClick={() => setActivePage("produccion")}
                    aria-pressed={activePage === "produccion"}
                >
                    Producción
                </Button>
            </ButtonGroup>

            <Card variant="outline">
                <CardBody p={{ base: 3, md: 5 }}>
                    <Stack spacing={4}>
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            align={{ base: "flex-start", md: "center" }}
                            justify="space-between"
                            spacing={2}
                        >
                            <Stack spacing={1}>
                                <Text fontWeight="semibold">Periodo de movimientos y producción</Text>
                                <Text color="app.textMuted" fontSize="sm">
                                    El stock, las OCM pendientes, las OP abiertas y la cobertura representan el estado actual.
                                </Text>
                            </Stack>
                            <Badge colorScheme="blue">
                                Periodo aplicado: {queryPeriodLabel(appliedQuery)}
                            </Badge>
                        </Stack>

                        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                            <FormControl>
                                <FormLabel>Tipo de consulta</FormLabel>
                                <Select
                                    minH="44px"
                                    value={dateMode}
                                    onChange={(event) => setDateMode(event.target.value as DateMode)}
                                >
                                    <option value="fecha_unica">Fecha única</option>
                                    <option value="rango">Rango de fechas</option>
                                </Select>
                            </FormControl>

                            {dateMode === "fecha_unica" ? (
                                <FormControl isRequired isInvalid={!date}>
                                    <FormLabel>Fecha</FormLabel>
                                    <Input
                                        minH="44px"
                                        type="date"
                                        value={date}
                                        onChange={(event) => setDate(event.target.value)}
                                    />
                                    <FormErrorMessage>Seleccione una fecha.</FormErrorMessage>
                                </FormControl>
                            ) : (
                                <>
                                    <FormControl isRequired isInvalid={!startDate || rangeInverted}>
                                        <FormLabel>Fecha desde</FormLabel>
                                        <Input
                                            minH="44px"
                                            type="date"
                                            value={startDate}
                                            onChange={(event) => setStartDate(event.target.value)}
                                        />
                                        <FormErrorMessage>Revise la fecha inicial.</FormErrorMessage>
                                    </FormControl>
                                    <FormControl
                                        isRequired
                                        isInvalid={!endDate || rangeInverted || rangeTooLong}
                                    >
                                        <FormLabel>Fecha hasta</FormLabel>
                                        <Input
                                            minH="44px"
                                            type="date"
                                            value={endDate}
                                            onChange={(event) => setEndDate(event.target.value)}
                                        />
                                        <FormErrorMessage>
                                            {rangeTooLong
                                                ? `El rango máximo es de ${MAX_RANGE_DAYS} días.`
                                                : "La fecha final debe ser posterior a la inicial."}
                                        </FormErrorMessage>
                                    </FormControl>
                                </>
                            )}
                        </SimpleGrid>

                        <Stack
                            direction={{ base: "column", md: "row" }}
                            align={{ base: "stretch", md: "center" }}
                            justify="space-between"
                            spacing={3}
                        >
                            <HStack spacing={2} flexWrap="wrap">
                                <Text color="app.textMuted" fontSize="sm">
                                    El periodo se comparte entre Almacén y Producción.
                                </Text>
                                {hasUnappliedChanges ? (
                                    <Badge colorScheme="yellow">Cambios sin aplicar</Badge>
                                ) : null}
                            </HStack>
                            <Button
                                leftIcon={<RepeatIcon />}
                                colorScheme="green"
                                onClick={applyPeriod}
                                isLoading={activeIsLoading}
                                isDisabled={!datesAreValid}
                                minH="44px"
                                w={{ base: "full", md: "auto" }}
                            >
                                Aplicar periodo
                            </Button>
                        </Stack>
                    </Stack>
                </CardBody>
            </Card>

            {activeIsLoading && activeHasCurrentData ? (
                <Progress size="xs" isIndeterminate colorScheme="green" borderRadius="full" />
            ) : null}

            {activeError ? <ErrorPanel message={activeError} /> : null}

            {activePage === "almacen" ? (
                activeHasCurrentData && inventory.data ? (
                    <InformeAlmacenPage
                        report={inventory.data}
                    />
                ) : activeIsLoading ? (
                    <LoadingPanel label="Cargando inventario y movimientos…" />
                ) : null
            ) : activeHasCurrentData && production.data ? (
                <InformeProduccionPage report={production.data} />
            ) : activeIsLoading ? (
                <LoadingPanel label="Cargando informe de producción…" />
            ) : null}
        </Stack>
    );
}

function emptyReportState<T>(): ReportState<T> {
    return {
        data: null,
        dataQueryKey: null,
        requestQueryKey: null,
        loading: false,
        error: null,
    };
}

function queryKey(query: InformeQuery) {
    if (query.fecha) return `fecha:${query.fecha}`;
    return `rango:${query.fechaDesde}:${query.fechaHasta}`;
}

function queryPeriodLabel(query: InformeQuery) {
    if (query.fecha) return formatDate(query.fecha);
    if (query.fechaDesde && query.fechaHasta) {
        return `${formatDate(query.fechaDesde)} – ${formatDate(query.fechaHasta)}`;
    }
    return "Sin periodo";
}

function buildQuery(
    dateMode: DateMode,
    date: string,
    startDate: string,
    endDate: string,
): InformeQuery | null {
    if (dateMode === "fecha_unica") return date ? { fecha: date } : null;
    if (!startDate || !endDate) return null;
    return { fechaDesde: startDate, fechaHasta: endDate };
}

function getTodayIsoDate() {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
}

function getCurrentMonthStartIsoDate() {
    const today = getTodayIsoDate();
    return `${today.slice(0, 8)}01`;
}

function getRangeDaysInclusive(startDate: string, endDate: string) {
    if (!startDate || !endDate || startDate > endDate) return 0;
    const start = Date.parse(`${startDate}T00:00:00Z`);
    const end = Date.parse(`${endDate}T00:00:00Z`);
    return Math.floor((end - start) / 86_400_000) + 1;
}
