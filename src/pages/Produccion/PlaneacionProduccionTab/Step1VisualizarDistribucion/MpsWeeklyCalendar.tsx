import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Box, Grid, GridItem, HStack, Text, Tooltip, VStack } from "@chakra-ui/react";
import type {
    PropuestaMpsCalendarBlockDTO,
    PropuestaMpsSemanalCalendarDTO,
} from "../PlaneacionProduccionService";
import {
    formatNumber,
    getDayDroppableId,
    getDayLabel,
    getEstadoColorScheme,
    getEstadoLabel,
} from "./mpsCalendar.utils";

interface MpsWeeklyCalendarProps {
    calendar: PropuestaMpsSemanalCalendarDTO;
}

function MpsProductBlock({ block }: { block: PropuestaMpsCalendarBlockDTO }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: block.blockId,
        data: { blockId: block.blockId, categoriaId: block.categoriaId },
    });

    return (
        <Tooltip label={block.warning ?? `${block.lotesAsignados} lotes`} openDelay={250}>
            <Box
                ref={setNodeRef}
                transform={CSS.Translate.toString(transform)}
                opacity={isDragging ? 0.45 : 1}
                cursor="grab"
                borderWidth="1px"
                borderColor="teal.200"
                borderRadius="md"
                bg="teal.50"
                p={2}
                {...listeners}
                {...attributes}
            >
                <Text fontWeight="semibold" fontSize="sm" noOfLines={2}>{block.productoNombre}</Text>
                <Text fontSize="xs" color="gray.600">{block.productoId}</Text>
                <Text fontSize="xs" mt={1}>{block.lotesAsignados} lotes</Text>
                <Text fontSize="xs">{formatNumber(block.cantidadAsignada)} und</Text>
            </Box>
        </Tooltip>
    );
}

function MpsDayCell({
    categoriaId,
    dayIndex,
    date,
    totalAsignado,
    capacidadDiaria,
    estado,
    blocks,
}: PropuestaMpsSemanalCalendarDTO["rows"][number]["days"][number] & { categoriaId: number | null }) {
    const { setNodeRef, isOver } = useDroppable({ id: getDayDroppableId(categoriaId, dayIndex) });

    return (
        <GridItem
            ref={setNodeRef}
            borderWidth="1px"
            borderColor={isOver ? "teal.300" : "gray.200"}
            bg={isOver ? "teal.50" : "white"}
            borderRadius="md"
            p={2}
            minH="140px"
        >
            <VStack align="stretch" spacing={2} h="full">
                <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={0}>
                        <Text fontSize="xs" color="gray.500">
                            {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </Text>
                        <Text fontSize="xs" fontWeight="semibold">
                            {formatNumber(totalAsignado)}/{formatNumber(capacidadDiaria)}
                        </Text>
                    </VStack>
                    <Badge colorScheme={getEstadoColorScheme(estado)}>{getEstadoLabel(estado)}</Badge>
                </HStack>
                <VStack align="stretch" spacing={2}>
                    {blocks.map((block) => (
                        <MpsProductBlock key={block.blockId} block={block} />
                    ))}
                </VStack>
            </VStack>
        </GridItem>
    );
}

export default function MpsWeeklyCalendar({ calendar }: MpsWeeklyCalendarProps) {
    return (
        <Box bg="white" borderRadius="md" boxShadow="sm" p={4}>
            <Text fontWeight="bold" mb={3}>Calendario semanal MPS</Text>
            <Box overflowX="auto">
                <Grid templateColumns="240px repeat(6, minmax(170px, 1fr))" gap={3} minW="1260px">
                    <GridItem />
                    {calendar.days.map((day) => (
                        <GridItem key={day.dayIndex}>
                            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3} bg="gray.50">
                                <Text fontWeight="bold">{getDayLabel(day.dayIndex)}</Text>
                                <Text fontSize="sm" color="gray.600">
                                    {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </Text>
                            </Box>
                        </GridItem>
                    ))}

                    {calendar.rows.map((row) => (
                        <GridItem key={`row-${row.categoriaId ?? "null"}`} colSpan={7}>
                            <Grid templateColumns="240px repeat(6, minmax(170px, 1fr))" gap={3}>
                                <GridItem>
                                    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3} bg="gray.50" h="full">
                                        <Text fontWeight="bold">{row.categoriaNombre}</Text>
                                        <Text fontSize="sm" color="gray.600">
                                            Capacidad diaria: {formatNumber(row.capacidadDiaria)}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            Semana: {formatNumber(row.totalAsignadoSemana)}/{formatNumber(row.capacidadTeoricaSemana)}
                                        </Text>
                                        <Badge mt={2} colorScheme={getEstadoColorScheme(row.estadoSemana)}>
                                            {getEstadoLabel(row.estadoSemana)}
                                        </Badge>
                                    </Box>
                                </GridItem>
                                {row.days.map((cell) => (
                                    <MpsDayCell
                                        key={`row-${row.categoriaId ?? "null"}-day-${cell.dayIndex}`}
                                        categoriaId={row.categoriaId}
                                        {...cell}
                                    />
                                ))}
                            </Grid>
                        </GridItem>
                    ))}
                </Grid>
            </Box>
        </Box>
    );
}
