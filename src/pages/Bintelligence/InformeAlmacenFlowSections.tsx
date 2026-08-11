import {
    Steps,
    Box,
    Button,
    ButtonGroup,
    Card,
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
    formatInteger,
    formatQuantity,
    KpiCard,
    SectionHeading,
} from "./InformeGlobalUi";
import { buildMovementChart } from "./informesGlobales.charts";
import type { MovimientosInventario } from "./informesGlobales.types";

interface MovementsSectionProps {
    movements: MovimientosInventario;
    singleDate: boolean;
}

export function MovementsSection({
    movements,
    singleDate,
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
        <Stack gap={4}>
            <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={3}>
                {summaries.map(([label, summary]) => (
                    <KpiCard
                        key={label}
                        label={label}
                        value={formatCurrency(summary.valorEstimado)}
                        help={`${formatInteger(summary.movimientos)} movimientos · ${formatInteger(summary.referencias)} refs.`}
                    />
                ))}
            </SimpleGrid>

            {!singleDate ? (
                <Card.Root variant="outline">
                    <Card.Body p={{ base: 3, md: 5 }}>
                        <Stack gap={4}>
                            <Stack
                                direction={{ base: "column", xl: "row" }}
                                justify="space-between"
                                align={{ base: "stretch", xl: "center" }}
                                gap={3}
                            >
                                <SectionHeading
                                    title="Tendencia de movimientos"
                                    description="Alterne entre valor estimado y cantidades físicas; las cantidades conservan su unidad."
                                />
                                <Stack
                                    direction={{ base: "column", sm: "row" }}
                                    align={{ base: "stretch", sm: "center" }}
                                    gap={2}
                                >
                                    <ButtonGroup attached size="sm">
                                        <Button
                                            minH="44px"
                                            onClick={() => setPerspective("valor")}
                                            variant={perspective === "valor" ? "solid" : "outline"}
                                            colorPalette={perspective === "valor" ? "blue" : undefined}
                                            aria-pressed={perspective === "valor"}
                                        >
                                            Valor estimado
                                        </Button>
                                        <Button
                                            minH="44px"
                                            onClick={() => setPerspective("cantidad")}
                                            variant={perspective === "cantidad" ? "solid" : "outline"}
                                            colorPalette={perspective === "cantidad" ? "blue" : undefined}
                                            aria-pressed={perspective === "cantidad"}
                                        >
                                            Cantidad
                                        </Button>
                                    </ButtonGroup>
                                    {perspective === "cantidad" ? (
                                        <ButtonGroup attached size="sm">
                                            {availableUnits.map((unit) => (
                                                <Button
                                                    key={unit}
                                                    minH="44px"
                                                    onClick={() => setSelectedUnit(unit)}
                                                    variant={selectedUnit === unit ? "solid" : "outline"}
                                                    colorPalette={selectedUnit === unit ? "blue" : undefined}
                                                    aria-pressed={selectedUnit === unit}
                                                >
                                                    {unit}
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
                    </Card.Body>
                </Card.Root>
            ) : null}

            <Card.Root variant="outline">
                <Card.Body p={{ base: 3, md: 5 }}>
                    <Stack gap={4}>
                        <SectionHeading
                            title="Flujos físicos por unidad"
                            description="Cantidades del periodo consultado, separadas para evitar sumar magnitudes incompatibles."
                        />
                        {compactChart ? (
                            <Stack gap={3}>
                                {movements.porUnidad.map((unit) => (
                                    <Box
                                        key={unit.unidadMedida}
                                        borderWidth="1px"
                                        borderRadius="md"
                                        p={3}
                                    >
                                        <Stack gap={3}>
                                            <Text fontWeight="semibold">
                                                Unidad {unit.unidadMedida}
                                            </Text>
                                            <SimpleGrid columns={2} gap={3}>
                                                <FlowMetric
                                                    label="Recepciones"
                                                    value={unit.recepcionesOcm}
                                                />
                                                <FlowMetric
                                                    label="Dispensaciones"
                                                    value={unit.dispensaciones}
                                                />
                                                <FlowMetric
                                                    label="Prod. terminado"
                                                    value={unit.productoTerminado}
                                                />
                                                <FlowMetric
                                                    label="Otros ingresos"
                                                    value={unit.otrosIngresos}
                                                />
                                            </SimpleGrid>
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        ) : (
                            <Table.ScrollArea>
                                <Table.Root size="sm">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>Recepciones</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>Dispensaciones</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>Prod. terminado</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign='end'>Otros ingresos</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {movements.porUnidad.map((unit) => (
                                            <Table.Row key={unit.unidadMedida}>
                                                <Table.Cell fontWeight="semibold">{unit.unidadMedida}</Table.Cell>
                                                <Table.Cell textAlign='end'>{formatQuantity(unit.recepcionesOcm)}</Table.Cell>
                                                <Table.Cell textAlign='end'>{formatQuantity(unit.dispensaciones)}</Table.Cell>
                                                <Table.Cell textAlign='end'>{formatQuantity(unit.productoTerminado)}</Table.Cell>
                                                <Table.Cell textAlign='end'>{formatQuantity(unit.otrosIngresos)}</Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                </Table.Root>
                            </Table.ScrollArea>
                        )}
                    </Stack>
                </Card.Body>
            </Card.Root>
        </Stack>
    );
}

function FlowMetric({ label, value }: { label: string; value: number }) {
    return (
        <Box minW={0}>
            <Text color="app.textMuted" fontSize="xs">{label}</Text>
            <Text fontWeight="semibold" overflowWrap="anywhere">
                {formatQuantity(value)}
            </Text>
        </Box>
    );
}
