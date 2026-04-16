import { useMemo, useState } from "react";
import axios from "axios";
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Flex,
    Input,
    Spinner,
    Text,
    VStack,
} from "@chakra-ui/react";
import {
    CalcularDistribucionVentas,
    GenerarPropuestaMpsSemanal,
    type PropuestaMpsCalendarBlockDTO,
    type PropuestaMpsSemanalCalendarDTO,
    type PropuestaMpsSemanalDTO,
    type PropuestaMpsSemanalItemRequestDTO,
    type TerminadoConVentas,
} from "../PlaneacionProduccionService.tsx";
import MpsDetailTable from "./MpsDetailTable";
import MpsSummaryCards from "./MpsSummaryCards";
import MpsUnscheduledPanel from "./MpsUnscheduledPanel";
import MpsWeeklyCalendar from "./MpsWeeklyCalendar";
import {
    computeCalendarInsights,
    findBlockById,
    formatNumber,
    moveBlockOnCalendar,
    parseDropTarget,
} from "./mpsCalendar.utils";

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

function DragPreview({ block }: { block: PropuestaMpsCalendarBlockDTO | null }) {
    if (!block) {
        return null;
    }

    return (
        <Box borderWidth="1px" borderColor="teal.300" borderRadius="md" bg="teal.50" p={2} boxShadow="lg" minW="180px">
            <Text fontWeight="semibold" fontSize="sm" noOfLines={2}>{block.productoNombre}</Text>
            <Text fontSize="xs" color="gray.600">{block.productoId}</Text>
            <Text fontSize="xs" mt={1}>{block.lotesAsignados} lotes</Text>
            <Text fontSize="xs">{formatNumber(block.cantidadAsignada)} und</Text>
        </Box>
    );
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
    const [editableCalendar, setEditableCalendar] = useState<PropuestaMpsSemanalCalendarDTO | null>(null);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

    const weekEndDate = useMemo(() => addDays(weekStartDate, 5), [weekStartDate]);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

    const insights = useMemo(
        () => editableCalendar
            ? computeCalendarInsights(editableCalendar)
            : { categoriasProgramadas: 0, categoriasConSobrecarga: 0, noProgramados: 0 },
        [editableCalendar],
    );

    const activeBlock = useMemo(
        () => editableCalendar ? (findBlockById(editableCalendar, activeBlockId) as PropuestaMpsCalendarBlockDTO | null) : null,
        [activeBlockId, editableCalendar],
    );

    const handleGenerarPropuesta = async () => {
        if (!isMonday(weekStartDate)) {
            setError("La fecha de inicio de semana debe corresponder a un lunes.");
            setPropuesta(null);
            setEditableCalendar(null);
            return;
        }

        if (itemsConNecesidad.length === 0) {
            setError("No hay productos con necesidad manual mayor a cero para calcular la propuesta.");
            setPropuesta(null);
            setEditableCalendar(null);
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
            setEditableCalendar(response.calendar);
        } catch (err) {
            const errorMessage = axios.isAxiosError(err)
                ? (err.response?.data?.error ?? err.message)
                : (err instanceof Error ? err.message : String(err));
            setError(errorMessage);
            setPropuesta(null);
            setEditableCalendar(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveBlockId(null);
        const blockId = String(event.active.id);
        const target = parseDropTarget(event.over?.id ? String(event.over.id) : null);
        if (!editableCalendar || !target) {
            return;
        }
        setEditableCalendar((prev) => (prev ? moveBlockOnCalendar(prev, blockId, target) : prev));
    };

    return (
        <VStack align="stretch" spacing={4} p={4}>
            <Box bg="white" borderRadius="md" boxShadow="sm" p={4}>
                <VStack align="stretch" spacing={3}>
                    <Text fontSize="lg" fontWeight="bold">Propuesta semanal de MPS</Text>
                    <Text color="gray.600">
                        Esta pantalla genera una propuesta semanal por dias. Puede reorganizar bloques dentro de la misma categoria.
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

            {propuesta && editableCalendar && !isLoading && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(event) => setActiveBlockId(String(event.active.id))}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveBlockId(null)}
                >
                    <VStack align="stretch" spacing={4}>
                        <MpsSummaryCards summary={propuesta.summary} insights={insights} />
                        <MpsWeeklyCalendar calendar={editableCalendar} />
                        <MpsUnscheduledPanel items={editableCalendar.unscheduled} />
                        <MpsDetailTable items={propuesta.items} />
                    </VStack>
                    <DragOverlay>
                        <DragPreview block={activeBlock} />
                    </DragOverlay>
                </DndContext>
            )}
        </VStack>
    );
}
