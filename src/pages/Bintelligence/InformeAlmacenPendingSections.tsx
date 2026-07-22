import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Badge,
    Box,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    Center,
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
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    fetchOpenProductionOrdersPage,
    fetchPendingPurchaseOrdersPage,
    requestErrorMessage,
} from "./informesGlobales.api";
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
    MaterialDirectoOp,
    OcmPendiente,
    OcmPendientes,
    OpMaterial,
    PaginaInformeInventario,
} from "./informesGlobales.types";

const PAGE_SIZE = 10;

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
            alignSelf="flex-start"
            onClick={onClick}
            isDisabled={disabled}
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
        <ButtonGroup size="sm" alignSelf="center" alignItems="center">
            <Button
                minH="44px"
                variant="outline"
                isDisabled={result.first}
                onClick={() => onPageChange(result.page - 1)}
            >
                Anterior
            </Button>
            <Text px={2} fontSize="sm" whiteSpace="nowrap">
                Página {result.page + 1} de {result.totalPages}
            </Text>
            <Button
                minH="44px"
                variant="outline"
                isDisabled={result.last}
                onClick={() => onPageChange(result.page + 1)}
            >
                Siguiente
            </Button>
        </ButtonGroup>
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

    return (
        <Card variant="outline">
            <CardBody p={{ base: 3, md: 5 }}>
                <Stack spacing={4}>
                    <SectionHeading
                        title="Materiales pendientes de ingreso por OCM"
                        description="Saldo por recibir de OCM activas, calculado como cantidad ordenada menos recepción aplicada."
                    />
                    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
                        <KpiCard label="Órdenes activas" value={formatInteger(report.ordenes)} help={`${formatInteger(report.referencias)} referencias`} />
                        <KpiCard label="Valor pendiente sin IVA" value={formatCurrency(report.valorPendienteSinIva)} help="Sobre las cantidades pendientes" />
                        <KpiCard label="Cantidades pendientes" value={formatQuantities(report.cantidadesPorUnidad)} help="Separadas por unidad de medida" />
                    </SimpleGrid>
                    <DetailToggle
                        expanded={detail.expanded}
                        disabled={report.ordenes === 0}
                        onClick={() => detail.setExpanded(!detail.expanded)}
                    />
                    {detail.expanded ? (
                        <Stack spacing={3}>
                            <DetailState loading={detail.loading} error={detail.error} />
                            {!detail.loading && !detail.error && detail.result ? (
                                <>
                                    <Accordion allowMultiple>
                                        {detail.result.items.map((order) => (
                                            <AccordionItem key={order.ocmId}>
                                                <h4>
                                                    <AccordionButton minH="48px">
                                                        <Box flex="1" textAlign="left">
                                                            <Text fontWeight="semibold">OCM {order.ocmId} · {order.proveedor}</Text>
                                                            <Text color="app.textMuted" fontSize="sm">
                                                                {formatDateTime(order.fechaEmision)} · {formatCurrency(order.valorPendienteSinIva)}
                                                            </Text>
                                                        </Box>
                                                        <AccordionIcon />
                                                    </AccordionButton>
                                                </h4>
                                                <AccordionPanel px={{ base: 0, md: 4 }}>
                                                    <TableContainer>
                                                        <Table size="sm">
                                                            <Thead><Tr><Th>Material</Th><Th isNumeric>Ordenado</Th><Th isNumeric>Recibido</Th><Th isNumeric>Pendiente</Th><Th isNumeric>Valor pendiente</Th></Tr></Thead>
                                                            <Tbody>
                                                                {order.lineas.map((line) => (
                                                                    <Tr key={line.itemId}>
                                                                        <Td><Text fontWeight="semibold">{line.productoNombre}</Text><Text color="app.textMuted" fontSize="xs">{line.productoId}</Text></Td>
                                                                        <Td isNumeric>{formatQuantity(line.ordenado)}</Td>
                                                                        <Td isNumeric>{formatQuantity(line.recibidoAplicado)}</Td>
                                                                        <Td isNumeric>{formatQuantity(line.pendiente)} {line.unidadMedida}</Td>
                                                                        <Td isNumeric>{formatCurrency(line.valorPendienteSinIva)}</Td>
                                                                    </Tr>
                                                                ))}
                                                            </Tbody>
                                                        </Table>
                                                    </TableContainer>
                                                </AccordionPanel>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                    <PageNavigation result={detail.result} onPageChange={detail.setPage} />
                                </>
                            ) : null}
                        </Stack>
                    ) : null}
                </Stack>
            </CardBody>
        </Card>
    );
}

export function OpenProductionOrdersSection({
    report,
    contractVersion,
    cutoff,
}: PendingSectionProps & { report: MaterialDirectoOp }) {
    const detail = usePagedDetail<OpMaterial>({
        contractVersion,
        cutoff,
        embeddedItems: report.items ?? [],
        fetchPage: fetchOpenProductionOrdersPage,
    });

    return (
        <Card variant="outline">
            <CardBody p={{ base: 3, md: 5 }}>
                <Stack spacing={4}>
                    <SectionHeading title="Estimación de material directo en OP abiertas" description="Dispensaciones directas y reposiciones de averías asociadas a órdenes aún abiertas." />
                    <Text color="app.textMuted" fontSize="sm">No es WIP contable: no incluye mano de obra, capacidad, indirectos, pérdidas ni asientos.</Text>
                    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
                        <KpiCard label="Órdenes abiertas" value={formatInteger(report.ordenes)} help={`${formatInteger(report.referencias)} referencias dispensadas`} />
                        <KpiCard label="Valor estimado" value={formatCurrency(report.valorEstimado)} help="Según costo maestro vigente" />
                        <KpiCard label="Cantidades dispensadas" value={formatQuantities(report.cantidadesPorUnidad)} help="Separadas por unidad de medida" />
                    </SimpleGrid>
                    <DetailToggle
                        expanded={detail.expanded}
                        disabled={report.ordenes === 0}
                        onClick={() => detail.setExpanded(!detail.expanded)}
                    />
                    {detail.expanded ? (
                        <Stack spacing={3}>
                            <DetailState loading={detail.loading} error={detail.error} />
                            {!detail.loading && !detail.error && detail.result ? (
                                <>
                                    <TableContainer>
                                        <Table size="sm">
                                            <Thead><Tr><Th>OP</Th><Th>Lote</Th><Th>Fecha de referencia</Th><Th>Estado</Th><Th isNumeric>Referencias</Th><Th>Cantidades</Th><Th isNumeric>Valor estimado</Th></Tr></Thead>
                                            <Tbody>
                                                {detail.result.items.map((order) => (
                                                    <Tr key={order.opId}>
                                                        <Td fontWeight="semibold">{order.opId}</Td>
                                                        <Td>{order.lote || "—"}</Td>
                                                        <Td>{order.fechaReferencia ? formatDateTime(order.fechaReferencia) : "—"}</Td>
                                                        <Td><Badge colorScheme="blue">{order.estado}</Badge></Td>
                                                        <Td isNumeric>{formatInteger(order.referencias)}</Td>
                                                        <Td>{formatQuantities(order.cantidadesPorUnidad)}</Td>
                                                        <Td isNumeric>{formatCurrency(order.valorEstimado)}</Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    </TableContainer>
                                    <PageNavigation result={detail.result} onPageChange={detail.setPage} />
                                </>
                            ) : null}
                        </Stack>
                    ) : null}
                </Stack>
            </CardBody>
        </Card>
    );
}
