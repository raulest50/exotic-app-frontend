import { useMemo, useState } from "react";
import axios from "axios";
import {
    Badge,
    Box,
    Button,
    FormControl,
    FormLabel,
    Flex,
    Input,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from "@chakra-ui/react";
import {
    CalcularDistribucionVentas,
    GenerarPropuestaMpsSemanal,
    type PropuestaMpsSemanalDTO,
    type PropuestaMpsSemanalItemRequestDTO,
    type TerminadoConVentas,
} from "../PlaneacionProduccionService.tsx";

interface Step2PlaneacionProduccionProps {
    rawData: TerminadoConVentas[];
    necesidades: Record<string, number>;
    setActiveStep: (step: number) => void;
}

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCurrentWeekMonday(): string {
    const today = new Date();
    const currentDay = today.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    return formatLocalDate(monday);
}

function addDays(dateString: string, days: number): string {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + days);
    return formatLocalDate(date);
}

function isMonday(dateString: string): boolean {
    if (!dateString) {
        return false;
    }
    return new Date(`${dateString}T00:00:00`).getDay() === 1;
}

function formatNumber(value: number): string {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

export default function Step2PlaneacionProduccion({
    rawData,
    necesidades,
    setActiveStep,
}: Step2PlaneacionProduccionProps) {
    const [weekStartDate, setWeekStartDate] = useState<string>(getCurrentWeekMonday());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [propuesta, setPropuesta] = useState<PropuestaMpsSemanalDTO | null>(null);

    const weekEndDate = useMemo(() => addDays(weekStartDate, 5), [weekStartDate]);

    const itemsConNecesidad = useMemo<PropuestaMpsSemanalItemRequestDTO[]>(() => {
        return CalcularDistribucionVentas(rawData, "valor")
            .filter((item) => (necesidades[item.terminado.productoId] ?? 0) > 0)
            .map((item) => ({
                productoId: item.terminado.productoId,
                necesidadManual: necesidades[item.terminado.productoId] ?? 0,
                porcentajeParticipacion: item.porcentaje_participacion,
                cantidadVendida: item.cantidad_vendida,
                valorTotal: item.valor_total,
            }));
    }, [necesidades, rawData]);

    const handleGenerarPropuesta = async () => {
        if (!isMonday(weekStartDate)) {
            setError("La fecha de inicio de semana debe corresponder a un lunes.");
            setPropuesta(null);
            return;
        }

        if (itemsConNecesidad.length === 0) {
            setError("No hay productos con necesidad manual mayor a cero para calcular la propuesta.");
            setPropuesta(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await GenerarPropuestaMpsSemanal({
                weekStartDate,
                items: itemsConNecesidad,
            });
            setPropuesta(response);
        } catch (err) {
            const errorMessage = axios.isAxiosError(err)
                ? (err.response?.data?.error ?? err.message)
                : (err instanceof Error ? err.message : String(err));
            setError(errorMessage);
            setPropuesta(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <VStack align="stretch" spacing={4} p={4}>
            <Box bg="white" borderRadius="md" boxShadow="sm" p={4}>
                <VStack align="stretch" spacing={3}>
                    <Text fontSize="lg" fontWeight="bold">Propuesta semanal de MPS</Text>
                    <Text color="gray.600">
                        Esta pantalla genera una propuesta semanal de produccion. No crea ODPs reales todavia.
                    </Text>

                    <Flex gap={4} align="end" wrap="wrap">
                        <FormControl maxW="220px">
                            <FormLabel>Semana inicio (lunes)</FormLabel>
                            <Input
                                type="date"
                                value={weekStartDate}
                                onChange={(e) => setWeekStartDate(e.target.value)}
                            />
                        </FormControl>

                        <FormControl maxW="220px">
                            <FormLabel>Semana fin (sabado)</FormLabel>
                            <Input value={weekEndDate} isReadOnly bg="gray.50" />
                        </FormControl>

                        <Button
                            colorScheme="teal"
                            onClick={handleGenerarPropuesta}
                            isLoading={isLoading}
                            isDisabled={itemsConNecesidad.length === 0}
                        >
                            Generar propuesta semanal
                        </Button>

                        <Button variant="outline" onClick={() => setActiveStep(1)}>
                            Volver a necesidades
                        </Button>
                    </Flex>

                    {!isMonday(weekStartDate) && (
                        <Text color="orange.500">
                            Seleccione un lunes como inicio de la semana de planeacion.
                        </Text>
                    )}

                    {itemsConNecesidad.length === 0 && (
                        <Text color="orange.500">
                            No hay productos con necesidad manual mayor a cero. Regrese al paso anterior y ajuste necesidades.
                        </Text>
                    )}
                </VStack>
            </Box>

            {isLoading && (
                <Flex direction="column" align="center" justify="center" py={12} gap={4}>
                    <Spinner color="teal.500" size="lg" />
                    <Text color="gray.600">Calculando propuesta semanal...</Text>
                </Flex>
            )}

            {error && (
                <Box p={4} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md">
                    <Text color="red.600">{error}</Text>
                </Box>
            )}

            {propuesta && !isLoading && (
                <VStack align="stretch" spacing={4}>
                    <Box bg="white" borderRadius="md" boxShadow="sm" p={4}>
                        <Text fontWeight="bold" mb={3}>Resumen semanal</Text>
                        <Flex gap={4} wrap="wrap">
                            <Box minW="180px">
                                <Text fontSize="sm" color="gray.500">Terminados evaluados</Text>
                                <Text fontWeight="bold">{propuesta.summary.totalTerminadosEvaluados}</Text>
                            </Box>
                            <Box minW="180px">
                                <Text fontSize="sm" color="gray.500">Planificables</Text>
                                <Text fontWeight="bold">{propuesta.summary.totalPlanificables}</Text>
                            </Box>
                            <Box minW="220px">
                                <Text fontSize="sm" color="gray.500">Sin lote size</Text>
                                <Text fontWeight="bold">{propuesta.summary.totalNoPlanificablesPorFaltaLoteSize}</Text>
                            </Box>
                            <Box minW="180px">
                                <Text fontSize="sm" color="gray.500">Lotes propuestos</Text>
                                <Text fontWeight="bold">{propuesta.summary.totalLotesPropuestos}</Text>
                            </Box>
                            <Box minW="220px">
                                <Text fontSize="sm" color="gray.500">Unidades propuestas</Text>
                                <Text fontWeight="bold">{formatNumber(propuesta.summary.totalUnidadesPropuestas)}</Text>
                            </Box>
                        </Flex>
                    </Box>

                    <Box bg="white" borderRadius="md" boxShadow="sm" p={4}>
                        <Text fontWeight="bold" mb={3}>Renglones de propuesta</Text>
                        <TableContainer>
                            <Table size="sm" variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Codigo</Th>
                                        <Th>Producto</Th>
                                        <Th>Categoria</Th>
                                        <Th isNumeric>% Participacion</Th>
                                        <Th isNumeric>Necesidad</Th>
                                        <Th isNumeric>Stock</Th>
                                        <Th isNumeric>Necesidad neta</Th>
                                        <Th isNumeric>Lote size</Th>
                                        <Th isNumeric>Lotes</Th>
                                        <Th isNumeric>Cantidad propuesta</Th>
                                        <Th isNumeric>Delta</Th>
                                        <Th>Fecha final</Th>
                                        <Th>Estado</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {propuesta.items.map((item) => {
                                        const statusColor = !item.planificable
                                            ? "red"
                                            : item.desbordaSemana
                                                ? "orange"
                                                : item.lotesPropuestos === 0
                                                    ? "gray"
                                                    : "green";

                                        const statusLabel = !item.planificable
                                            ? "No planificable"
                                            : item.desbordaSemana
                                                ? "Desborda semana"
                                                : item.lotesPropuestos === 0
                                                    ? "Sin produccion"
                                                    : "Propuesto";

                                        return (
                                            <Tr key={item.productoId}>
                                                <Td>{item.productoId}</Td>
                                                <Td>{item.productoNombre}</Td>
                                                <Td>{item.categoriaNombre ?? "-"}</Td>
                                                <Td isNumeric>{item.porcentajeParticipacion.toFixed(2)}%</Td>
                                                <Td isNumeric>{formatNumber(item.necesidadManual)}</Td>
                                                <Td isNumeric>{formatNumber(item.stockActual)}</Td>
                                                <Td isNumeric>{formatNumber(item.necesidadNeta)}</Td>
                                                <Td isNumeric>{item.loteSize}</Td>
                                                <Td isNumeric>{item.lotesPropuestos}</Td>
                                                <Td isNumeric>{formatNumber(item.cantidadPropuesta)}</Td>
                                                <Td isNumeric>{formatNumber(item.deltaVsNecesidad)}</Td>
                                                <Td>{item.fechaFinalPlanificadaSugerida ?? "-"}</Td>
                                                <Td>
                                                    <VStack align="start" spacing={1}>
                                                        <Badge colorScheme={statusColor}>{statusLabel}</Badge>
                                                        {item.warning && (
                                                            <Text fontSize="xs" color="gray.600">
                                                                {item.warning}
                                                            </Text>
                                                        )}
                                                    </VStack>
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </Box>
                </VStack>
            )}
        </VStack>
    );
}
