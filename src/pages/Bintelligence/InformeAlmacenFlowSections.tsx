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
import { useEffect, useMemo, useState } from "react";
import {
    formatCurrency,
    formatDateTime,
    formatInteger,
    formatQuantities,
    formatQuantity,
    KpiCard,
    SectionHeading,
} from "./InformeGlobalUi";
import { buildMovementChart } from "./informesGlobales.charts";
import type {
    MaterialDirectoOp,
    MovimientosInventario,
    OcmPendientes,
} from "./informesGlobales.types";

type TrendWindow = 7 | 30 | 90;

interface MovementsSectionProps {
    movements: MovimientosInventario;
    singleDate: boolean;
    trendWindowDays: TrendWindow;
    onTrendWindowChange: (days: TrendWindow) => void;
    refreshing: boolean;
}

export function MovementsSection({
    movements,
    singleDate,
    trendWindowDays,
    onTrendWindowChange,
    refreshing,
}: MovementsSectionProps) {
    const compactChart = useBreakpointValue({ base: true, md: false }) ?? false;
    const chartHeight = useBreakpointValue({ base: 330, md: 390 }) ?? 390;
    const availableUnits = useMemo(
        () => Array.from(new Set(movements.serieDiaria.map((item) => item.unidadMedida))),
        [movements.serieDiaria],
    );
    const [selectedUnit, setSelectedUnit] = useState(availableUnits[0] ?? "");
    const [perspective, setPerspective] = useState<"valor" | "cantidad">("valor");

    useEffect(() => {
        if (!availableUnits.includes(selectedUnit)) {
            setSelectedUnit(availableUnits[0] ?? "");
        }
    }, [availableUnits, selectedUnit]);

    const summaries = [
        ["Recepciones OCM", movements.resumen.recepcionesOcm],
        ["Dispensaciones", movements.resumen.dispensaciones],
        ["Producto terminado", movements.resumen.productoTerminado],
        ["Otros ingresos", movements.resumen.otrosIngresos],
    ] as const;

    return (
        <Stack spacing={4}>
            <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={3}>
                {summaries.map(([label, summary]) => (
                    <KpiCard
                        key={label}
                        label={label}
                        value={formatCurrency(summary.valorEstimado)}
                        help={`${formatInteger(summary.movimientos)} movimientos · ${formatInteger(summary.referencias)} refs.`}
                    />
                ))}
            </SimpleGrid>

            <Card variant="outline">
                <CardBody p={{ base: 3, md: 5 }}>
                    <Stack spacing={4}>
                        <Stack
                            direction={{ base: "column", xl: "row" }}
                            justify="space-between"
                            align={{ base: "stretch", xl: "center" }}
                            spacing={3}
                        >
                            <SectionHeading
                                title="Tendencia de movimientos"
                                description="Alterne entre valor estimado y cantidades físicas; las cantidades conservan su unidad."
                            />
                            <Stack
                                direction={{ base: "column", sm: "row" }}
                                align={{ base: "stretch", sm: "center" }}
                                spacing={2}
                            >
                                <ButtonGroup isAttached size="sm">
                                    <Button
                                        minH="44px"
                                        onClick={() => setPerspective("valor")}
                                        variant={perspective === "valor" ? "solid" : "outline"}
                                        colorScheme={perspective === "valor" ? "blue" : undefined}
                                        aria-pressed={perspective === "valor"}
                                    >
                                        Valor estimado
                                    </Button>
                                    <Button
                                        minH="44px"
                                        onClick={() => setPerspective("cantidad")}
                                        variant={perspective === "cantidad" ? "solid" : "outline"}
                                        colorScheme={perspective === "cantidad" ? "blue" : undefined}
                                        aria-pressed={perspective === "cantidad"}
                                    >
                                        Cantidad
                                    </Button>
                                </ButtonGroup>
                                {perspective === "cantidad" ? (
                                    <ButtonGroup isAttached size="sm">
                                        {availableUnits.map((unit) => (
                                            <Button
                                                key={unit}
                                                minH="44px"
                                                onClick={() => setSelectedUnit(unit)}
                                                variant={selectedUnit === unit ? "solid" : "outline"}
                                                colorScheme={selectedUnit === unit ? "blue" : undefined}
                                                aria-pressed={selectedUnit === unit}
                                            >
                                                {unit}
                                            </Button>
                                        ))}
                                    </ButtonGroup>
                                ) : null}
                                {singleDate ? (
                                    <ButtonGroup isAttached size="sm">
                                        {([7, 30, 90] as TrendWindow[]).map((days) => (
                                            <Button
                                                key={days}
                                                minH="44px"
                                                onClick={() => onTrendWindowChange(days)}
                                                variant={trendWindowDays === days ? "solid" : "outline"}
                                                colorScheme={trendWindowDays === days ? "green" : undefined}
                                                isLoading={refreshing && trendWindowDays === days}
                                                aria-pressed={trendWindowDays === days}
                                            >
                                                {trendWindowLabel(days)}
                                            </Button>
                                        ))}
                                    </ButtonGroup>
                                ) : null}
                            </Stack>
                        </Stack>

                        {movements.serieDiaria.length > 0
                        && (perspective === "valor" || selectedUnit) ? (
                            <ReactECharts
                                option={buildMovementChart(
                                    movements.serieDiaria,
                                    perspective,
                                    selectedUnit,
                                    compactChart,
                                )}
                                style={{ height: `${chartHeight}px`, width: "100%" }}
                            />
                        ) : (
                            <Text color="app.textMuted" fontSize="sm">
                                No hay movimientos en la ventana seleccionada.
                            </Text>
                        )}
                    </Stack>
                </CardBody>
            </Card>

            <Card variant="outline">
                <CardBody p={{ base: 3, md: 5 }}>
                    <Stack spacing={4}>
                        <SectionHeading
                            title="Flujos físicos por unidad"
                            description="Cantidades del periodo consultado, separadas para evitar sumar magnitudes incompatibles."
                        />
                        <TableContainer>
                            <Table size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Unidad</Th>
                                        <Th isNumeric>Recepciones</Th>
                                        <Th isNumeric>Dispensaciones</Th>
                                        <Th isNumeric>Prod. terminado</Th>
                                        <Th isNumeric>Otros ingresos</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {movements.porUnidad.map((unit) => (
                                        <Tr key={unit.unidadMedida}>
                                            <Td fontWeight="semibold">{unit.unidadMedida}</Td>
                                            <Td isNumeric>{formatQuantity(unit.recepcionesOcm)}</Td>
                                            <Td isNumeric>{formatQuantity(unit.dispensaciones)}</Td>
                                            <Td isNumeric>{formatQuantity(unit.productoTerminado)}</Td>
                                            <Td isNumeric>{formatQuantity(unit.otrosIngresos)}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </Stack>
                </CardBody>
            </Card>
        </Stack>
    );
}

function trendWindowLabel(days: TrendWindow) {
    if (days === 7) return "Semana";
    if (days === 90) return "Trimestre";
    return "30 días";
}

export function PendingPurchaseOrdersSection({ report }: { report: OcmPendientes }) {
    return (
        <Card variant="outline">
            <CardBody p={{ base: 3, md: 5 }}>
                <Stack spacing={4}>
                    <SectionHeading
                        title="Materiales pendientes de ingreso por OCM"
                        description="Saldo por recibir de OCM activas, calculado como cantidad ordenada menos recepción aplicada."
                    />
                    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
                        <KpiCard
                            label="Órdenes activas"
                            value={formatInteger(report.ordenes)}
                            help={`${formatInteger(report.referencias)} referencias`}
                        />
                        <KpiCard
                            label="Valor pendiente sin IVA"
                            value={formatCurrency(report.valorPendienteSinIva)}
                            help="Sobre las cantidades pendientes"
                        />
                        <KpiCard
                            label="Cantidades pendientes"
                            value={formatQuantities(report.cantidadesPorUnidad)}
                            help="Separadas por unidad de medida"
                        />
                    </SimpleGrid>
                    {report.items.length > 0 ? (
                        <Accordion allowMultiple>
                            {report.items.map((order) => (
                                <AccordionItem key={order.ocmId}>
                                    <h4>
                                        <AccordionButton minH="48px">
                                            <Box flex="1" textAlign="left">
                                                <Text fontWeight="semibold">
                                                    OCM {order.ocmId} · {order.proveedor}
                                                </Text>
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
                                                <Thead>
                                                    <Tr>
                                                        <Th>Material</Th>
                                                        <Th isNumeric>Ordenado</Th>
                                                        <Th isNumeric>Recibido</Th>
                                                        <Th isNumeric>Pendiente</Th>
                                                        <Th isNumeric>Valor pendiente</Th>
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {order.lineas.map((line) => (
                                                        <Tr key={line.itemId}>
                                                            <Td>
                                                                <Text fontWeight="semibold">{line.productoNombre}</Text>
                                                                <Text color="app.textMuted" fontSize="xs">{line.productoId}</Text>
                                                            </Td>
                                                            <Td isNumeric>{formatQuantity(line.ordenado)}</Td>
                                                            <Td isNumeric>{formatQuantity(line.recibidoAplicado)}</Td>
                                                            <Td isNumeric>
                                                                {formatQuantity(line.pendiente)} {line.unidadMedida}
                                                            </Td>
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
                    ) : (
                        <Text color="app.textMuted" fontSize="sm">
                            No hay órdenes de compra pendientes.
                        </Text>
                    )}
                </Stack>
            </CardBody>
        </Card>
    );
}

export function OpenProductionOrdersSection({ report }: { report: MaterialDirectoOp }) {
    return (
        <Card variant="outline">
            <CardBody p={{ base: 3, md: 5 }}>
                <Stack spacing={4}>
                    <SectionHeading
                        title="Estimación de material directo en OP abiertas"
                        description="Dispensaciones directas y reposiciones de averías asociadas a órdenes aún abiertas."
                    />
                    <Text color="app.textMuted" fontSize="sm">
                        No es WIP contable: no incluye mano de obra, capacidad, indirectos, pérdidas ni asientos.
                    </Text>
                    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
                        <KpiCard
                            label="Órdenes abiertas"
                            value={formatInteger(report.ordenes)}
                            help={`${formatInteger(report.referencias)} referencias dispensadas`}
                        />
                        <KpiCard
                            label="Valor estimado"
                            value={formatCurrency(report.valorEstimado)}
                            help="Según costo maestro vigente"
                        />
                        <KpiCard
                            label="Cantidades dispensadas"
                            value={formatQuantities(report.cantidadesPorUnidad)}
                            help="Separadas por unidad de medida"
                        />
                    </SimpleGrid>
                    {report.items.length > 0 ? (
                        <TableContainer>
                            <Table size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>OP</Th>
                                        <Th>Lote</Th>
                                        <Th>Estado</Th>
                                        <Th isNumeric>Referencias</Th>
                                        <Th>Cantidades</Th>
                                        <Th isNumeric>Valor estimado</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {report.items.map((order) => (
                                        <Tr key={order.opId}>
                                            <Td fontWeight="semibold">{order.opId}</Td>
                                            <Td>{order.lote || "—"}</Td>
                                            <Td><Badge colorScheme="blue">{order.estado}</Badge></Td>
                                            <Td isNumeric>{formatInteger(order.referencias)}</Td>
                                            <Td>{formatQuantities(order.cantidadesPorUnidad)}</Td>
                                            <Td isNumeric>{formatCurrency(order.valorEstimado)}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Text color="app.textMuted" fontSize="sm">
                            No hay material directo asociado a órdenes abiertas.
                        </Text>
                    )}
                </Stack>
            </CardBody>
        </Card>
    );
}
