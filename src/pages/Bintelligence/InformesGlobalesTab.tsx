import { RepeatIcon } from "@chakra-ui/icons";
import {
    Button,
    ButtonGroup,
    Card,
    CardBody,
    FormControl,
    FormErrorMessage,
    FormLabel,
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
type TrendWindow = 7 | 30 | 90;

interface ReportState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

const MAX_RANGE_DAYS = 31;
const INITIAL_TREND_WINDOW: TrendWindow = 30;

export default function InformesGlobalesTab() {
    const toast = useToast();
    const today = useMemo(getTodayIsoDate, []);
    const monthStart = useMemo(getCurrentMonthStartIsoDate, []);
    const [activePage, setActivePage] = useState<ReportPage>("almacen");
    const [dateMode, setDateMode] = useState<DateMode>("fecha_unica");
    const [date, setDate] = useState(today);
    const [startDate, setStartDate] = useState(monthStart);
    const [endDate, setEndDate] = useState(today);
    const [trendWindowDays, setTrendWindowDays] = useState<TrendWindow>(
        INITIAL_TREND_WINDOW,
    );
    const [inventory, setInventory] = useState<ReportState<InformeInventario>>(
        () => emptyReportState<InformeInventario>(),
    );
    const [production, setProduction] = useState<ReportState<InformeProduccion>>(
        () => emptyReportState<InformeProduccion>(),
    );
    const initialRequestStarted = useRef(false);
    const appliedInventoryQuery = useRef<InformeQuery | null>(null);
    const inventoryRequestId = useRef(0);
    const productionRequestId = useRef(0);

    const rangeDays = getRangeDaysInclusive(startDate, endDate);
    const rangeInverted = dateMode === "rango"
        && Boolean(startDate && endDate && startDate > endDate);
    const rangeTooLong = dateMode === "rango" && rangeDays > MAX_RANGE_DAYS;
    const currentQuery = useMemo(
        () => buildQuery(dateMode, date, startDate, endDate),
        [dateMode, date, startDate, endDate],
    );
    const datesAreValid = currentQuery !== null && !rangeInverted && !rangeTooLong;

    const loadInventory = useCallback(async (
        query: InformeQuery,
        windowDays: TrendWindow,
    ) => {
        const requestId = ++inventoryRequestId.current;
        setInventory((current) => ({ ...current, loading: true, error: null }));
        try {
            const report = await fetchInventoryReport(query, windowDays);
            if (requestId !== inventoryRequestId.current) return;
            appliedInventoryQuery.current = query;
            setInventory({ data: report, loading: false, error: null });
        } catch (error) {
            if (requestId !== inventoryRequestId.current) return;
            setInventory((current) => ({
                ...current,
                loading: false,
                error: requestErrorMessage(error),
            }));
        }
    }, []);

    const loadProduction = useCallback(async (query: InformeQuery) => {
        const requestId = ++productionRequestId.current;
        setProduction((current) => ({ ...current, loading: true, error: null }));
        try {
            const report = await fetchProductionReport(query);
            if (requestId !== productionRequestId.current) return;
            setProduction({ data: report, loading: false, error: null });
        } catch (error) {
            if (requestId !== productionRequestId.current) return;
            setProduction((current) => ({
                ...current,
                loading: false,
                error: requestErrorMessage(error),
            }));
        }
    }, []);

    useEffect(() => {
        if (initialRequestStarted.current) return;
        initialRequestStarted.current = true;
        void loadInventory({ fecha: today }, INITIAL_TREND_WINDOW);
    }, [loadInventory, today]);

    const showInvalidDatesToast = () => {
        toast({
            title: "Revise las fechas",
            description: `Seleccione una fecha o un rango válido de máximo ${MAX_RANGE_DAYS} días.`,
            status: "warning",
            duration: 4500,
            isClosable: true,
        });
    };

    const updateActivePage = () => {
        if (!datesAreValid || !currentQuery) {
            showInvalidDatesToast();
            return;
        }
        if (activePage === "almacen") {
            void loadInventory(currentQuery, trendWindowDays);
        } else {
            void loadProduction(currentQuery);
        }
    };

    const selectPage = (page: ReportPage) => {
        setActivePage(page);
        if (page === "produccion"
            && !production.data
            && !production.loading) {
            if (!datesAreValid || !currentQuery) {
                showInvalidDatesToast();
                return;
            }
            void loadProduction(currentQuery);
        }
    };

    const changeTrendWindow = (windowDays: TrendWindow) => {
        setTrendWindowDays(windowDays);
        const query = appliedInventoryQuery.current ?? currentQuery;
        if (query) void loadInventory(query, windowDays);
    };

    const activeState = activePage === "almacen" ? inventory : production;

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
                    onClick={() => selectPage("almacen")}
                    aria-pressed={activePage === "almacen"}
                >
                    Almacén e inventario
                </Button>
                <Button
                    flex={{ base: 1, md: "initial" }}
                    minH="44px"
                    colorScheme={activePage === "produccion" ? "green" : undefined}
                    variant={activePage === "produccion" ? "solid" : "outline"}
                    onClick={() => selectPage("produccion")}
                    aria-pressed={activePage === "produccion"}
                >
                    Producción
                </Button>
            </ButtonGroup>

            <Card variant="outline">
                <CardBody p={{ base: 3, md: 5 }}>
                    <Stack spacing={4}>
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
                            <Text color="app.textMuted" fontSize="sm">
                                Los cambios de fecha se aplican al pulsar actualizar y solo afectan la página activa.
                            </Text>
                            <Button
                                leftIcon={<RepeatIcon />}
                                colorScheme="green"
                                onClick={updateActivePage}
                                isLoading={activeState.loading}
                                isDisabled={!datesAreValid}
                                minH="44px"
                                w={{ base: "full", md: "auto" }}
                            >
                                Actualizar {activePage === "almacen" ? "almacén" : "producción"}
                            </Button>
                        </Stack>
                    </Stack>
                </CardBody>
            </Card>

            {activeState.loading && activeState.data ? (
                <Progress size="xs" isIndeterminate colorScheme="green" borderRadius="full" />
            ) : null}

            {activeState.error ? <ErrorPanel message={activeState.error} /> : null}

            {activePage === "almacen" ? (
                inventory.data ? (
                    <InformeAlmacenPage
                        report={inventory.data}
                        trendWindowDays={trendWindowDays}
                        onTrendWindowChange={changeTrendWindow}
                        refreshing={inventory.loading}
                    />
                ) : inventory.loading ? (
                    <LoadingPanel label="Cargando inventario y movimientos…" />
                ) : null
            ) : production.data ? (
                <InformeProduccionPage report={production.data} />
            ) : production.loading ? (
                <LoadingPanel label="Cargando informe de producción…" />
            ) : null}
        </Stack>
    );
}

function emptyReportState<T>(): ReportState<T> {
    return { data: null, loading: false, error: null };
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
