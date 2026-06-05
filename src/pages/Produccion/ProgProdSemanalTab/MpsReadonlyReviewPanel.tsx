import {
    Badge,
    Box,
    Flex,
    Grid,
    GridItem,
    Heading,
    HStack,
    SimpleGrid,
    Text,
    VStack,
} from "@chakra-ui/react";
import type {
    MpsSemanalDraftDTO,
    PropuestaMpsCalendarBlockDTO,
    PropuestaMpsUnscheduledBlockDTO,
} from "../ProgProdMensualTab/PlaneacionProduccionService";
import { formatSemanaMpsDisplayDate } from "./semanaMps.utils";

const DAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

function formatNumber(value: number | null | undefined): string {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return safeValue.toLocaleString("es-CO", {
        minimumFractionDigits: safeValue % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function formatDateTimeLabel(value: string | null): string {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getEstadoColorScheme(estado: MpsSemanalDraftDTO["estado"]): string {
    switch (estado) {
        case "BORRADOR":
            return "yellow";
        case "APROBADO":
            return "green";
        case "CERRADO":
            return "gray";
        default:
            return "blue";
    }
}

function getEstadoLabel(estado: MpsSemanalDraftDTO["estado"]): string {
    switch (estado) {
        case "BORRADOR":
            return "Borrador";
        case "APROBADO":
            return "Aprobada";
        case "CERRADO":
            return "Cerrada";
        default:
            return estado;
    }
}

function getCalendarEstadoColorScheme(estado: string): string {
    switch (estado) {
        case "excedida":
            return "red";
        case "al_limite":
            return "yellow";
        case "sin_configurar":
            return "orange";
        default:
            return "green";
    }
}

function getCalendarEstadoLabel(estado: string): string {
    switch (estado) {
        case "excedida":
            return "Excedida";
        case "al_limite":
            return "Al limite";
        case "sin_configurar":
            return "Sin configurar";
        default:
            return "Disponible";
    }
}

function getSemanaMpsLabel(mps: MpsSemanalDraftDTO): string {
    return mps.semanaMpsCodigo ?? mps.weekStartDate;
}

function getSemanaMpsDateRange(mps: MpsSemanalDraftDTO): string {
    return `${formatSemanaMpsDisplayDate(mps.weekStartDate)} a ${formatSemanaMpsDisplayDate(mps.weekEndDate)}`;
}

function getTotalOrdenesEsperadas(mps: MpsSemanalDraftDTO): number {
    return (mps.calendar?.rows ?? [])
        .flatMap((row) => row.days ?? [])
        .flatMap((day) => day.blocks ?? [])
        .reduce((total, block) => total + Math.max(block.lotesAsignados ?? 0, 0), 0);
}

function SummaryCard({
    label,
    value,
    helper,
}: {
    label: string;
    value: string;
    helper?: string;
}) {
    return (
        <Box p={3} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.100">
            <Text fontSize="xs" color="gray.500">{label}</Text>
            <Text fontWeight="semibold" color="gray.800">{value}</Text>
            {helper && <Text fontSize="xs" color="gray.500">{helper}</Text>}
        </Box>
    );
}

export interface MpsReadonlyBlockContext {
    date: string;
    dayIndex: number;
    dayLabel: string;
}

function MpsProductBlock({
    block,
    context,
    isClickable,
    orderCount,
    onClick,
}: {
    block: PropuestaMpsCalendarBlockDTO;
    context: MpsReadonlyBlockContext;
    isClickable: boolean;
    orderCount: number | null;
    onClick?: () => void;
}) {
    const content = (
        <>
            <Text fontWeight="semibold" fontSize="sm" noOfLines={2}>{block.productoNombre}</Text>
            <Text fontSize="xs" color="gray.600">{block.productoId}</Text>
            <Text fontSize="xs" color="gray.600">
                {block.poolCapacidadNombre ?? block.categoriaNombre ?? "Sin unidad de capacidad"}
            </Text>
            <Flex mt={2} gap={2} wrap="wrap">
                <Badge colorScheme="teal">{formatNumber(block.lotesAsignados)} lotes</Badge>
                <Badge colorScheme="purple">{formatNumber(block.cantidadAsignada)} und</Badge>
                {orderCount !== null && (
                    <Badge colorScheme={orderCount > 0 ? "blue" : "orange"}>
                        {formatNumber(orderCount)} OP
                    </Badge>
                )}
            </Flex>
            {block.warning && (
                <Text mt={2} fontSize="xs" color="orange.700">
                    {block.warning}
                </Text>
            )}
        </>
    );

    if (isClickable) {
        return (
            <Box
                as="button"
                type="button"
                textAlign="left"
                w="full"
                borderWidth="1px"
                borderColor="teal.200"
                borderRadius="md"
                bg="teal.50"
                p={2}
                cursor="pointer"
                aria-label={`Ver OPs generadas de ${block.productoNombre} en ${context.dayLabel}`}
                onClick={onClick}
                _hover={{ borderColor: "teal.400", bg: "teal.100" }}
                _focusVisible={{ boxShadow: "outline" }}
            >
                {content}
            </Box>
        );
    }

    return (
        <Box borderWidth="1px" borderColor="teal.200" borderRadius="md" bg="teal.50" p={2}>
            {content}
        </Box>
    );
}

function MpsUnscheduledBlock({ block }: { block: PropuestaMpsUnscheduledBlockDTO }) {
    return (
        <Box borderWidth="1px" borderColor="orange.200" borderRadius="md" bg="orange.50" p={3}>
            <Text fontWeight="semibold" fontSize="sm" noOfLines={2}>{block.productoNombre}</Text>
            <Text fontSize="xs" color="gray.600">{block.productoId}</Text>
            <Text fontSize="xs" color="gray.600">
                {block.poolCapacidadNombre ?? block.categoriaNombre ?? "Sin unidad de capacidad"}
            </Text>
            <Flex mt={2} gap={2} wrap="wrap">
                <Badge colorScheme="orange">{block.reason}</Badge>
                <Badge colorScheme="teal">{formatNumber(block.lotesAsignados)} lotes</Badge>
                <Badge colorScheme="purple">{formatNumber(block.cantidadAsignada)} und</Badge>
            </Flex>
            {block.warning && (
                <Text mt={2} fontSize="xs" color="orange.700">
                    {block.warning}
                </Text>
            )}
        </Box>
    );
}

interface MpsReadonlyReviewPanelProps {
    mps: MpsSemanalDraftDTO;
    totalOrdenesGeneradas: number;
    onBlockClick?: (block: PropuestaMpsCalendarBlockDTO, context: MpsReadonlyBlockContext) => void;
    getBlockOrderCount?: (blockId: string) => number;
    areGeneratedOrdersAvailable?: boolean;
}

export default function MpsReadonlyReviewPanel({
    mps,
    totalOrdenesGeneradas,
    onBlockClick,
    getBlockOrderCount,
    areGeneratedOrdersAvailable = false,
}: MpsReadonlyReviewPanelProps) {
    const rows = mps.calendar?.rows ?? [];
    const days = mps.calendar?.days ?? [];
    const unscheduled = mps.calendar?.unscheduled ?? [];
    const totalOrdenesEsperadas = getTotalOrdenesEsperadas(mps);

    return (
        <VStack align="stretch" spacing={5}>
            <Box>
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                        <Heading size="sm">Revision MPS semanal</Heading>
                        <Text fontSize="sm" color="gray.600">
                            Semana {getSemanaMpsLabel(mps)} - {getSemanaMpsDateRange(mps)}
                        </Text>
                    </Box>
                    <Badge colorScheme={getEstadoColorScheme(mps.estado)}>{getEstadoLabel(mps.estado)}</Badge>
                </Flex>
            </Box>

            <SimpleGrid columns={[1, 2, 4]} gap={3}>
                <SummaryCard label="MPS" value={`#${mps.mpsId}`} />
                <SummaryCard label="Creado" value={formatDateTimeLabel(mps.fechaCreacion)} />
                <SummaryCard
                    label="Aprobacion"
                    value={formatDateTimeLabel(mps.fechaAprobacion)}
                    helper={mps.aprobadoPorUsername ? `Por ${mps.aprobadoPorUsername}` : undefined}
                />
                <SummaryCard
                    label="Generacion ODPs"
                    value={formatDateTimeLabel(mps.fechaGeneracionOdps)}
                    helper={mps.generadoPorUsername ? `Por ${mps.generadoPorUsername}` : undefined}
                />
            </SimpleGrid>

            <SimpleGrid columns={[1, 2, 4]} gap={3}>
                <SummaryCard label="Terminados evaluados" value={formatNumber(mps.summary.totalTerminadosEvaluados)} />
                <SummaryCard label="Lotes propuestos" value={formatNumber(mps.summary.totalLotesPropuestos)} />
                <SummaryCard label="Unidades propuestas" value={formatNumber(mps.summary.totalUnidadesPropuestas)} />
                <SummaryCard
                    label="ODPs"
                    value={`${formatNumber(totalOrdenesGeneradas)} / ${formatNumber(totalOrdenesEsperadas)}`}
                    helper="Generadas / esperadas"
                />
            </SimpleGrid>

            {rows.length === 0 ? (
                <Box p={4} bg="gray.50" borderRadius="md">
                    <Text color="gray.500" fontSize="sm">Este MPS no tiene filas de calendario.</Text>
                </Box>
            ) : (
                <Box overflowX="auto">
                    <Grid templateColumns="repeat(6, minmax(180px, 1fr))" gap={3} minW="1080px">
                        {days.map((day) => (
                            <GridItem key={day.dayIndex}>
                                <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3} bg="gray.50">
                                    <Text fontWeight="bold">
                                        {DAY_LABELS[day.dayIndex] ?? `Dia ${day.dayIndex + 1}`}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                        {formatSemanaMpsDisplayDate(day.date)}
                                    </Text>
                                </Box>
                            </GridItem>
                        ))}

                        {rows.map((row) => (
                            <GridItem key={`row-${row.rowKey}`} colSpan={6}>
                                <Grid templateColumns="repeat(6, minmax(180px, 1fr))" gap={3}>
                                    {days.map((day) => {
                                        const cell = row.days.find((candidate) => candidate.dayIndex === day.dayIndex);
                                        const blocks = cell?.blocks ?? [];
                                        const dayLabel = DAY_LABELS[day.dayIndex] ?? `Dia ${day.dayIndex + 1}`;
                                        return (
                                            <GridItem key={`${row.rowKey}-${day.dayIndex}`}>
                                                <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white" p={2} minH="160px">
                                                    <VStack align="stretch" spacing={2} h="full">
                                                        <HStack justify="space-between" align="start">
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontSize="xs" color="gray.500">
                                                                    {cell ? formatSemanaMpsDisplayDate(cell.date) : "-"}
                                                                </Text>
                                                                <Text fontSize="xs" fontWeight="semibold">
                                                                    {formatNumber(cell?.totalAsignado)} / {formatNumber(cell?.capacidadDiaria)}
                                                                </Text>
                                                            </VStack>
                                                            {cell && (
                                                                <Badge colorScheme={getCalendarEstadoColorScheme(cell.estado)}>
                                                                    {getCalendarEstadoLabel(cell.estado)}
                                                                </Badge>
                                                            )}
                                                        </HStack>
                                                        {blocks.length === 0 ? (
                                                            <Text fontSize="xs" color="gray.400">Sin programacion.</Text>
                                                        ) : (
                                                            <VStack align="stretch" spacing={2}>
                                                                {blocks.map((block) => {
                                                                    const context = {
                                                                        date: cell?.date ?? day.date,
                                                                        dayIndex: day.dayIndex,
                                                                        dayLabel,
                                                                    };
                                                                    const orderCount = getBlockOrderCount
                                                                        ? getBlockOrderCount(block.blockId)
                                                                        : null;
                                                                    const isClickable = areGeneratedOrdersAvailable && Boolean(onBlockClick);
                                                                    return (
                                                                        <MpsProductBlock
                                                                            key={block.blockId}
                                                                            block={block}
                                                                            context={context}
                                                                            isClickable={isClickable}
                                                                            orderCount={areGeneratedOrdersAvailable ? orderCount : null}
                                                                            onClick={() => onBlockClick?.(block, context)}
                                                                        />
                                                                    );
                                                                })}
                                                            </VStack>
                                                        )}
                                                    </VStack>
                                                </Box>
                                            </GridItem>
                                        );
                                    })}
                                </Grid>
                            </GridItem>
                        ))}
                    </Grid>
                </Box>
            )}

            <Box>
                <Flex justify="space-between" align="center" gap={3} wrap="wrap" mb={3}>
                    <Box>
                        <Heading size="sm">Bloques no programados</Heading>
                        <Text fontSize="sm" color="gray.600">
                            Items fuera del calendario por restricciones de capacidad o configuracion.
                        </Text>
                    </Box>
                    <Badge colorScheme={unscheduled.length > 0 ? "orange" : "gray"}>
                        {unscheduled.length} bloques
                    </Badge>
                </Flex>
                {unscheduled.length === 0 ? (
                    <Box p={4} bg="gray.50" borderRadius="md">
                        <Text fontSize="sm" color="gray.500">No hay bloques fuera del calendario.</Text>
                    </Box>
                ) : (
                    <SimpleGrid columns={[1, 1, 2, 3]} gap={3}>
                        {unscheduled.map((block) => (
                            <MpsUnscheduledBlock key={block.blockId} block={block} />
                        ))}
                    </SimpleGrid>
                )}
            </Box>
        </VStack>
    );
}
