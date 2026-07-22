import {
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

            {!singleDate ? (
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
            ) : null}

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
