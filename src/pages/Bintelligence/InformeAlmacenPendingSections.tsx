import {
    Accordion,
    Alert,
    Badge,
    Box,
    Button,
    ButtonGroup,
    Card,
    Center,
    HStack,
    IconButton,
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
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { Tooltip } from '@/components/ui/tooltip';
import { useEffect, useMemo, useRef, useState } from "react";
import {
    downloadOpenProductionOrdersMaterialExcel,
    downloadPendingPurchaseOrdersExcel,
    downloadWipMaterialEstimateExcel,
    fetchOpenProductionOrdersPage,
    fetchPendingPurchaseOrdersPage,
    fetchWipMaterialEstimatePage,
    requestErrorMessage,
} from "./informesGlobales.api";
import MaterialOpHelpModal from "./MaterialOpHelpModal";
import {
    formatCurrency,
    formatDateTime,
    formatInteger,
    formatQuantities,
    formatQuantity,
    KpiCard,
    SectionHeading,
} from "./InformeGlobalUi";
import type {
    LineaOcmPendiente,
    MaterialDirectoOp,
    OcmPendiente,
    OcmPendientes,
    OpMaterial,
    OpWipMaterial,
    PaginaInformeInventario,
    WipMaterialEstimado,
} from "./informesGlobales.types";
import { LuDownload, LuHelpCircle } from 'react-icons/lu';

const PAGE_SIZE = 10;
const EXCEL_MIME =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type PageFetcher<T> = (
    page: number,
    size: number,
    signal?: AbortSignal,
) => Promise<PaginaInformeInventario<T>>;

interface PagedDetailOptions<T> {
    contractVersion: number;
    cutoff: string;
    embeddedItems: T[];
    fetchPage: PageFetcher<T>;
}

function usePagedDetail<T>({
    contractVersion,
    cutoff,
    embeddedItems,
    fetchPage,
}: PagedDetailOptions<T>) {
    const [expanded, setExpanded] = useState(false);
    const [page, setPage] = useState(0);
    const [remotePage, setRemotePage] = useState<PaginaInformeInventario<T>>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const cacheRef = useRef(new Map<number, PaginaInformeInventario<T>>());

    useEffect(() => {
        cacheRef.current.clear();
        setPage(0);
        setRemotePage(undefined);
        setError("");
    }, [cutoff]);

    useEffect(() => {
        if (!expanded || contractVersion < 3) return;

        const cached = cacheRef.current.get(page);
        if (cached) {
            setRemotePage(cached);
            setError("");
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError("");
        fetchPage(page, PAGE_SIZE, controller.signal)
            .then((result) => {
                if (result.totalPages > 0 && page >= result.totalPages) {
                    setPage(result.totalPages - 1);
                    return;
                }
                cacheRef.current.set(page, result);
                setRemotePage(result);
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
    }, [contractVersion, cutoff, expanded, fetchPage, page]);

    const embeddedPage = useMemo<PaginaInformeInventario<T>>(() => {
        const totalElements = embeddedItems.length;
        const totalPages = Math.ceil(totalElements / PAGE_SIZE);
        const safePage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
        const start = safePage * PAGE_SIZE;
        return {
            items: embeddedItems.slice(start, start + PAGE_SIZE),
            page: safePage,
            size: PAGE_SIZE,
            totalElements,
            totalPages,
            first: safePage === 0,
            last: totalPages === 0 || safePage >= totalPages - 1,
        };
    }, [embeddedItems, page]);

    return {
        expanded,
        setExpanded,
        page,
        setPage,
        result: contractVersion >= 3 ? remotePage : embeddedPage,
        loading,
        error,
    };
}

function DetailToggle({
    expanded,
    onClick,
    disabled,
}: {
    expanded: boolean;
    onClick: () => void;
    disabled: boolean;
}) {
    return (
        <Button
            variant="outline"
            minH="44px"
            w={{ base: "full", sm: "auto" }}
            alignSelf="flex-start"
            onClick={onClick}
            disabled={disabled}
            aria-expanded={expanded}
        >
            {expanded ? "Ocultar detalle" : "Ver detalle"}
        </Button>
    );
}

function PageNavigation({
    result,
    onPageChange,
}: {
    result?: PaginaInformeInventario<unknown>;
    onPageChange: (page: number) => void;
}) {
    if (!result || result.totalPages <= 1) return null;
    return (
        <Stack
            direction={{ base: "column", sm: "row" }}
            w={{ base: "full", sm: "auto" }}
            alignSelf="center"
            alignItems="center"
            gap={2}
        >
            <Button
                minH="44px"
                w={{ base: "full", sm: "auto" }}
                variant="outline"
                disabled={result.first}
                onClick={() => onPageChange(result.page - 1)}
            >
                Anterior
            </Button>
            <Text px={2} fontSize="sm" whiteSpace="nowrap">
                Página {result.page + 1} de {result.totalPages}
            </Text>
            <Button
                minH="44px"
                w={{ base: "full", sm: "auto" }}
                variant="outline"
                disabled={result.last}
                onClick={() => onPageChange(result.page + 1)}
            >
                Siguiente
            </Button>
        </Stack>
    );
}

function DetailState({ loading, error }: { loading: boolean; error: string }) {
    if (loading) {
        return (
            <Center minH="96px">
                <Spinner size="md" color="blue.500" />
            </Center>
        );
    }
    if (error) return <Text color="red.600" fontSize="sm">{error}</Text>;
    return null;
}

interface PendingSectionProps {
    contractVersion: number;
    cutoff: string;
}

export function PendingPurchaseOrdersSection({
    report,
    contractVersion,
    cutoff,
}: PendingSectionProps & { report: OcmPendientes }) {
    const detail = usePagedDetail<OcmPendiente>({
        contractVersion,
        cutoff,
        embeddedItems: report.items ?? [],
        fetchPage: fetchPendingPurchaseOrdersPage,
    });
    const [downloading, setDownloading] = useState(false);
    const toast = useAppToast();

    const downloadExcel = async () => {
        if (report.ordenes === 0 || downloading) return;
        setDownloading(true);
        try {
            const data = await downloadPendingPurchaseOrdersExcel();
            triggerExcelDownload(
                data,
                pendingPurchaseOrdersExcelFilename(new Date()),
            );
        } catch (error: unknown) {
            toast({
                title: "No se pudo descargar el Excel de OCM pendientes",
                description: requestErrorMessage(error),
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Card.Root variant="outline">
            <Card.Body p={{ base: 3, md: 5 }}>
                <Stack gap={4}>
                    <SectionHeading
                        title="Materiales pendientes de ingreso por OCM"
                        description="Saldo por recibir de OCM activas, calculado como cantidad ordenada menos recepción aplicada."
                    />
                    <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
                        <KpiCard label="Órdenes activas" value={formatInteger(report.ordenes)} help={`${formatInteger(report.referencias)} referencias`} />
                        <KpiCard label="Valor pendiente sin IVA" value={formatCurrency(report.valorPendienteSinIva)} help="Sobre las cantidades pendientes" />
                        <KpiCard label="Cantidades pendientes" value={formatQuantities(report.cantidadesPorUnidad)} help="Separadas por unidad de medida" />
                    </SimpleGrid>
                    <Stack
                        direction={{ base: "column", sm: "row" }}
                        gap={2}
                        align={{ base: "stretch", sm: "center" }}
                    >
                        <DetailToggle
                            expanded={detail.expanded}
                            disabled={report.ordenes === 0}
                            onClick={() => detail.setExpanded(!detail.expanded)}
                        />
                        <Button
                            variant="outline"
                            colorPalette="green"
                            minH="44px"
                            loading={downloading}
                            loadingText="Generando Excel…"
                            disabled={report.ordenes === 0}
                            w={{ base: "full", sm: "auto" }}
                            title={`Exporta las líneas pendientes de ${formatInteger(report.ordenes)} OCM`}
                            onClick={downloadExcel}><LuDownload />Descargar Excel
                                                    </Button>
                    </Stack>
                    {detail.expanded ? (
                        <Stack gap={3}>
                            <DetailState loading={detail.loading} error={detail.error} />
                            {!detail.loading && !detail.error && detail.result ? (
                                <>
                                    <Accordion.Root multiple>
                                        {detail.result.items.map((order) => (
                                            <Accordion.Item key={order.ocmId} value='item-0'>
                                                <h4>
                                                    <Accordion.ItemTrigger minH="48px">
                                                        <Box flex="1" textAlign="left">
                                                            <Text fontWeight="semibold">OCM {order.ocmId} · {order.proveedor}</Text>
                                                            <Text color="app.textMuted" fontSize="sm">
                                                                {formatDateTime(order.fechaEmision)} · {formatCurrency(order.valorPendienteSinIva)}
                                                            </Text>
                                                        </Box>
                                                        <Accordion.ItemIndicator />
                                                    </Accordion.ItemTrigger>
                                                </h4>
                                                <Accordion.ItemContent px={{ base: 0, md: 4 }}><Accordion.ItemBody>
                                                        <PendingOrderLines
                                                            lines={order.lineas}
                                                        />
                                                    </Accordion.ItemBody></Accordion.ItemContent>
                                            </Accordion.Item>
                                        ))}
                                    </Accordion.Root>
                                    <PageNavigation result={detail.result} onPageChange={detail.setPage} />
                                </>
                            ) : null}
                        </Stack>
                    ) : null}
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

function PendingOrderLines({ lines }: { lines: LineaOcmPendiente[] }) {
    const compact = useBreakpointValue({ base: true, lg: false }) ?? true;

    if (compact) {
        return (
            <Stack gap={3}>
                {lines.map((line) => (
                    <Card.Root key={line.itemId} variant="outline">
                        <Card.Body p={3}>
                            <Stack gap={3}>
                                <Box minW={0}>
                                    <Text fontWeight="semibold">
                                        {line.productoNombre}
                                    </Text>
                                    <Text color="app.textMuted" fontSize="xs">
                                        {line.productoId}
                                    </Text>
                                </Box>
                                <SimpleGrid columns={2} gap={3}>
                                    <CompactMetric
                                        label="Ordenado"
                                        value={formatQuantity(line.ordenado)}
                                    />
                                    <CompactMetric
                                        label="Recibido"
                                        value={formatQuantity(line.recibidoAplicado)}
                                    />
                                    <CompactMetric
                                        label="Pendiente"
                                        value={`${formatQuantity(line.pendiente)} ${line.unidadMedida}`}
                                    />
                                    <CompactMetric
                                        label="Valor pendiente"
                                        value={formatCurrency(
                                            line.valorPendienteSinIva,
                                        )}
                                    />
                                </SimpleGrid>
                            </Stack>
                        </Card.Body>
                    </Card.Root>
                ))}
            </Stack>
        );
    }

    return (
        <Table.ScrollArea>
            <Table.Root size="sm">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>Material</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Ordenado</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Recibido</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Pendiente</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Valor pendiente</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {lines.map((line) => (
                        <Table.Row key={line.itemId}>
                            <Table.Cell>
                                <Text fontWeight="semibold">
                                    {line.productoNombre}
                                </Text>
                                <Text color="app.textMuted" fontSize="xs">
                                    {line.productoId}
                                </Text>
                            </Table.Cell>
                            <Table.Cell textAlign='end'>{formatQuantity(line.ordenado)}</Table.Cell>
                            <Table.Cell textAlign='end'>
                                {formatQuantity(line.recibidoAplicado)}
                            </Table.Cell>
                            <Table.Cell textAlign='end'>
                                {formatQuantity(line.pendiente)}{" "}
                                {line.unidadMedida}
                            </Table.Cell>
                            <Table.Cell textAlign='end'>
                                {formatCurrency(line.valorPendienteSinIva)}
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    );
}

function triggerExcelDownload(data: ArrayBuffer, filename: string) {
    const blob = new Blob([data], { type: EXCEL_MIME });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
}

function pendingPurchaseOrdersExcelFilename(date: Date) {
    return reportExcelFilename("ocm_pendientes", date);
}

function reportExcelFilename(prefix: string, date: Date) {
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
        `${prefix}_`,
        `${value("year")}-${value("month")}-${value("day")}`,
        `_${value("hour")}${value("minute")}.xlsx`,
    ].join("");
}

export function OpenProductionOrdersSection({
    report,
    wipReport,
    contractVersion,
    cutoff,
}: PendingSectionProps & {
    report: MaterialDirectoOp;
    wipReport?: WipMaterialEstimado;
}) {
    const [mode, setMode] = useState<"DISPENSADO" | "WIP">("DISPENSADO");
    const [downloading, setDownloading] = useState<
        "DISPENSADO" | "WIP" | null
    >(null);
    const help = useDisclosure();
    const toast = useAppToast();
    const materialDetail = usePagedDetail<OpMaterial>({
        contractVersion,
        cutoff,
        embeddedItems: report.items ?? [],
        fetchPage: fetchOpenProductionOrdersPage,
    });
    const wipDetail = usePagedDetail<OpWipMaterial>({
        contractVersion,
        cutoff,
        embeddedItems: wipReport?.items ?? [],
        fetchPage: fetchWipMaterialEstimatePage,
    });
    const wipAvailable = contractVersion >= 5 && Boolean(wipReport);

    useEffect(() => {
        if (!wipAvailable && mode === "WIP") {
            setMode("DISPENSADO");
        }
    }, [mode, wipAvailable]);

    const downloadExcel = async (target: "DISPENSADO" | "WIP") => {
        const total = target === "DISPENSADO"
            ? report.ordenes
            : wipReport?.ordenes ?? 0;
        if (total === 0 || downloading) return;
        setDownloading(target);
        try {
            const data = target === "DISPENSADO"
                ? await downloadOpenProductionOrdersMaterialExcel()
                : await downloadWipMaterialEstimateExcel();
            triggerExcelDownload(
                data,
                reportExcelFilename(
                    target === "DISPENSADO"
                        ? "material_dispensado_op_abiertas"
                        : "wip_material_estimado",
                    new Date(),
                ),
            );
        } catch (error: unknown) {
            toast({
                title: target === "DISPENSADO"
                    ? "No se pudo descargar el Excel de material dispensado"
                    : "No se pudo descargar el Excel de WIP",
                description: requestErrorMessage(error),
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setDownloading(null);
        }
    };

    return (
        <>
            <Card.Root variant="outline">
                <Card.Body p={{ base: 3, md: 5 }}>
                    <Stack gap={4}>
                        <HStack align="flex-start" gap={2}>
                            <Box flex={1} minW={0}>
                                <SectionHeading
                                    title="Material asociado a OP abiertas"
                                    description="Salidas formales hacia producción y estimación del componente material en proceso."
                                />
                            </Box>
                            <Tooltip
                                content="Cómo se calculan Material dispensado y WIP"
                                showArrow
                            >
                                <IconButton
                                    aria-label="Cómo se calculan Material dispensado y WIP"
                                    variant="ghost"
                                    minW="44px"
                                    minH="44px"
                                    onClick={help.onOpen}><LuHelpCircle /></IconButton>
                            </Tooltip>
                        </HStack>

                        <ButtonGroup
                            attached
                            size="sm"
                            w={{ base: "full", md: "fit-content" }}
                            aria-label="Vista de materiales asociados a OP"
                        >
                            <Button
                                flex={{ base: 1, md: "initial" }}
                                minH="44px"
                                h="auto"
                                py={2}
                                whiteSpace="normal"
                                colorPalette={
                                    mode === "DISPENSADO" ? "green" : undefined
                                }
                                variant={
                                    mode === "DISPENSADO" ? "solid" : "outline"
                                }
                                onClick={() => setMode("DISPENSADO")}
                            >
                                Material dispensado
                            </Button>
                            <Button
                                flex={{ base: 1, md: "initial" }}
                                minH="44px"
                                h="auto"
                                py={2}
                                whiteSpace="normal"
                                colorPalette={mode === "WIP" ? "purple" : undefined}
                                variant={mode === "WIP" ? "solid" : "outline"}
                                disabled={!wipAvailable}
                                title={!wipAvailable
                                    ? "WIP requiere la versión 5 del informe"
                                    : undefined}
                                onClick={() => setMode("WIP")}
                            >
                                WIP
                            </Button>
                        </ButtonGroup>

                        {mode === "DISPENSADO" ? (
                            <ProductionMaterialView
                                report={report}
                                detail={materialDetail}
                                dateLabel="Fecha de referencia"
                                getDate={(order) => order.fechaReferencia}
                                orderLabel="Órdenes abiertas"
                                referencesHelp="referencias dispensadas"
                                quantitiesLabel="Cantidades dispensadas"
                                valueHelp="Según costo maestro vigente"
                                note="Salidas físicas inventariables desde GENERAL. Incluye dispensaciones normales y reposiciones por avería."
                                downloading={downloading === "DISPENSADO"}
                                onDownload={() => downloadExcel("DISPENSADO")}
                            />
                        ) : wipReport ? (
                            <ProductionMaterialView
                                report={wipReport}
                                detail={wipDetail}
                                dateLabel="Inicio WIP"
                                getDate={(order) => order.fechaInicioWip}
                                orderLabel="Órdenes con WIP"
                                referencesHelp="referencias cargadas"
                                quantitiesLabel="Cantidades cargadas"
                                valueHelp="Costo material bruto estimado"
                                note="Incluye material dispensado, reposiciones y consumos directos. No descuenta averías y no representa WIP contable."
                                downloading={downloading === "WIP"}
                                onDownload={() => downloadExcel("WIP")}
                            />
                        ) : (
                            <Alert.Root status="info" borderRadius="md">
                                <Alert.Indicator />
                                La vista WIP estará disponible con la versión 5
                                del informe de almacén.
                            </Alert.Root>
                        )}
                    </Stack>
                </Card.Body>
            </Card.Root>

            <MaterialOpHelpModal
                isOpen={help.open}
                onClose={help.onClose}
            />
        </>
    );
}

interface ProductionOrderRow {
    opId: number;
    lote?: string | null;
    estado: number;
    referencias: number;
    cantidadesPorUnidad: Array<{
        unidadMedida: string;
        cantidad: number;
    }>;
    valorEstimado: number;
}

interface DetailController<T> {
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
    setPage: (page: number) => void;
    result?: PaginaInformeInventario<T>;
    loading: boolean;
    error: string;
}

function ProductionMaterialView<T extends ProductionOrderRow>({
    report,
    detail,
    dateLabel,
    getDate,
    orderLabel,
    referencesHelp,
    quantitiesLabel,
    valueHelp,
    note,
    downloading,
    onDownload,
}: {
    report: MaterialDirectoOp | WipMaterialEstimado;
    detail: DetailController<T>;
    dateLabel: string;
    getDate: (order: T) => string | null | undefined;
    orderLabel: string;
    referencesHelp: string;
    quantitiesLabel: string;
    valueHelp: string;
    note: string;
    downloading: boolean;
    onDownload: () => void;
}) {
    return (
        <Stack gap={4}>
            <Text color="app.textMuted" fontSize="sm">{note}</Text>
            <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
                <KpiCard
                    label={orderLabel}
                    value={formatInteger(report.ordenes)}
                    help={`${formatInteger(report.referencias)} ${referencesHelp}`}
                />
                <KpiCard
                    label="Valor estimado"
                    value={formatCurrency(report.valorEstimado)}
                    help={valueHelp}
                />
                <KpiCard
                    label={quantitiesLabel}
                    value={formatQuantities(report.cantidadesPorUnidad)}
                    help="Separadas por unidad de medida"
                />
            </SimpleGrid>

            <Stack
                direction={{ base: "column", sm: "row" }}
                gap={2}
                align={{ base: "stretch", sm: "center" }}
            >
                <DetailToggle
                    expanded={detail.expanded}
                    disabled={report.ordenes === 0}
                    onClick={() => detail.setExpanded(!detail.expanded)}
                />
                <Button
                    variant="outline"
                    colorPalette="green"
                    minH="44px"
                    w={{ base: "full", sm: "auto" }}
                    loading={downloading}
                    loadingText="Generando Excel…"
                    disabled={report.ordenes === 0}
                    onClick={onDownload}><LuDownload />Descargar Excel
                                    </Button>
            </Stack>

            {detail.expanded ? (
                <Stack gap={3}>
                    <DetailState loading={detail.loading} error={detail.error} />
                    {!detail.loading && !detail.error && detail.result ? (
                        <>
                            <ProductionOrdersDataView
                                items={detail.result.items}
                                dateLabel={dateLabel}
                                getDate={getDate}
                            />
                            <PageNavigation
                                result={detail.result}
                                onPageChange={detail.setPage}
                            />
                        </>
                    ) : null}
                </Stack>
            ) : null}
        </Stack>
    );
}

function ProductionOrdersDataView<T extends ProductionOrderRow>({
    items,
    dateLabel,
    getDate,
}: {
    items: T[];
    dateLabel: string;
    getDate: (order: T) => string | null | undefined;
}) {
    const compact = useBreakpointValue({ base: true, lg: false }) ?? true;

    if (compact) {
        return (
            <Stack gap={3}>
                {items.map((order) => {
                    const date = getDate(order);
                    return (
                        <Card.Root key={order.opId} variant="outline">
                            <Card.Body p={3}>
                                <Stack gap={3}>
                                    <HStack
                                        justify="space-between"
                                        align="flex-start"
                                        flexWrap="wrap"
                                    >
                                        <Box minW={0}>
                                            <Text fontWeight="semibold">
                                                OP {order.opId}
                                            </Text>
                                            <Text
                                                color="app.textMuted"
                                                fontSize="sm"
                                            >
                                                Lote {order.lote || "—"}
                                            </Text>
                                        </Box>
                                        <Badge colorPalette="blue">
                                            {productionOrderState(order.estado)}
                                        </Badge>
                                    </HStack>
                                    <SimpleGrid columns={2} gap={3}>
                                        <CompactMetric
                                            label={dateLabel}
                                            value={date
                                                ? formatDateTime(date)
                                                : "—"}
                                        />
                                        <CompactMetric
                                            label="Referencias"
                                            value={formatInteger(
                                                order.referencias,
                                            )}
                                        />
                                        <CompactMetric
                                            label="Cantidades"
                                            value={formatQuantities(
                                                order.cantidadesPorUnidad,
                                            )}
                                        />
                                        <CompactMetric
                                            label="Valor estimado"
                                            value={formatCurrency(
                                                order.valorEstimado,
                                            )}
                                        />
                                    </SimpleGrid>
                                </Stack>
                            </Card.Body>
                        </Card.Root>
                    );
                })}
            </Stack>
        );
    }

    return (
        <Table.ScrollArea>
            <Table.Root size="sm">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>OP</Table.ColumnHeader>
                        <Table.ColumnHeader>Lote</Table.ColumnHeader>
                        <Table.ColumnHeader>{dateLabel}</Table.ColumnHeader>
                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Referencias</Table.ColumnHeader>
                        <Table.ColumnHeader>Cantidades</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Valor estimado</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {items.map((order) => {
                        const date = getDate(order);
                        return (
                            <Table.Row key={order.opId}>
                                <Table.Cell fontWeight="semibold">{order.opId}</Table.Cell>
                                <Table.Cell>{order.lote || "—"}</Table.Cell>
                                <Table.Cell>{date ? formatDateTime(date) : "—"}</Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette="blue">
                                        {productionOrderState(order.estado)}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell textAlign='end'>
                                    {formatInteger(order.referencias)}
                                </Table.Cell>
                                <Table.Cell>
                                    {formatQuantities(
                                        order.cantidadesPorUnidad,
                                    )}
                                </Table.Cell>
                                <Table.Cell textAlign='end'>
                                    {formatCurrency(order.valorEstimado)}
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
    return (
        <Box minW={0}>
            <Text color="app.textMuted" fontSize="xs">{label}</Text>
            <Text
                fontWeight="semibold"
                fontSize="sm"
                overflowWrap="anywhere"
            >
                {value}
            </Text>
        </Box>
    );
}

function productionOrderState(status: number) {
    if (status === 3) return "Fabricación completada";
    if (status === 0) return "Abierta";
    if (status >= 11) return "Con dispensaciones";
    return `Estado ${status}`;
}
