import {
    Badge,
    Box,
    Button,
    Flex,
    Grid,
    GridItem,
    Heading,
    SimpleGrid,
    Text,
    VStack,
} from "@chakra-ui/react";
import type {
    MpsSemanalDraftDTO,
    MpsSemanalItemDTO,
    MpsSemanalLotePlanificadoDTO,
} from "./MpsSemanalService";
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

function getLoteEstadoColor(estado: MpsSemanalLotePlanificadoDTO["estado"]): string {
    switch (estado) {
        case "ODP_GENERADA":
            return "green";
        case "CANCELADO":
            return "red";
        default:
            return "yellow";
    }
}

function getSemanaMpsLabel(mps: MpsSemanalDraftDTO): string {
    return mps.semanaMpsCodigo ?? mps.weekStartDate;
}

function getSemanaMpsDateRange(mps: MpsSemanalDraftDTO): string {
    return `${formatSemanaMpsDisplayDate(mps.weekStartDate)} a ${formatSemanaMpsDisplayDate(mps.weekEndDate)}`;
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

export interface MpsReadonlyItemContext {
    date: string;
    dayIndex: number;
    dayLabel: string;
}

interface MpsItemCardProps {
    item: MpsSemanalItemDTO;
    context: MpsReadonlyItemContext;
    onItemClick?: (item: MpsSemanalItemDTO, context: MpsReadonlyItemContext) => void;
    areGeneratedOrdersAvailable: boolean;
}

function MpsItemCard({
    item,
    context,
    onItemClick,
    areGeneratedOrdersAvailable,
}: MpsItemCardProps) {
    const generatedLots = item.lotesPlanificados.filter((lote) => lote.estado === "ODP_GENERADA").length;
    const isClickable = areGeneratedOrdersAvailable && generatedLots > 0 && Boolean(onItemClick);

    return (
        <Box borderWidth="1px" borderColor="teal.200" borderRadius="md" bg="teal.50" p={2}>
            <Flex justify="space-between" gap={2} align="start">
                <Box minW={0}>
                    <Text fontWeight="semibold" fontSize="sm" noOfLines={2}>{item.terminadoNombre}</Text>
                    <Text fontSize="xs" color="gray.600">{item.terminadoId}</Text>
                    <Text fontSize="xs" color="gray.600">{item.categoriaNombre ?? "Sin categoria"}</Text>
                </Box>
                {isClickable && (
                    <Button size="xs" colorScheme="teal" variant="outline" onClick={() => onItemClick?.(item, context)}>
                        OPs
                    </Button>
                )}
            </Flex>

            <Flex mt={2} gap={2} wrap="wrap">
                <Badge colorScheme="teal">{formatNumber(item.numeroLotes)} lotes</Badge>
                <Badge colorScheme="purple">{formatNumber(item.cantidadTotal)} und</Badge>
                <Badge colorScheme="blue">Lote {formatNumber(item.loteSize)}</Badge>
                <Badge colorScheme={generatedLots > 0 ? "green" : "gray"}>
                    {formatNumber(generatedLots)} ODP
                </Badge>
            </Flex>

            <Text mt={2} fontSize="xs" color="gray.600">
                Lanzamiento {formatSemanaMpsDisplayDate(item.fechaLanzamiento)} | Fin {formatSemanaMpsDisplayDate(item.fechaFinalPlanificada)}
            </Text>

            {item.observacion && (
                <Text mt={2} fontSize="xs" color="gray.700">
                    Obs.: {item.observacion}
                </Text>
            )}
            {item.warning && (
                <Text mt={2} fontSize="xs" color="orange.700">
                    {item.warning}
                </Text>
            )}

            <VStack align="stretch" spacing={1} mt={2}>
                {item.lotesPlanificados.map((lote) => (
                    <Flex
                        key={lote.id}
                        justify="space-between"
                        align="center"
                        gap={2}
                        p={1.5}
                        bg="white"
                        borderRadius="sm"
                        borderWidth="1px"
                        borderColor="gray.100"
                    >
                        <Text fontSize="xs" color="gray.700">
                            Lote {lote.loteOrdinal} | {formatNumber(lote.cantidadPlanificada)} und
                        </Text>
                        <Flex gap={1} wrap="wrap" justify="end">
                            <Badge colorScheme={getLoteEstadoColor(lote.estado)}>{lote.estado}</Badge>
                            {lote.ordenProduccionId && <Badge colorScheme="blue">OP {lote.ordenProduccionId}</Badge>}
                            {lote.loteAsignado && <Badge colorScheme="gray">{lote.loteAsignado}</Badge>}
                        </Flex>
                    </Flex>
                ))}
            </VStack>
        </Box>
    );
}

interface MpsReadonlyReviewPanelProps {
    mps: MpsSemanalDraftDTO;
    totalOrdenesGeneradas: number;
    onItemClick?: (item: MpsSemanalItemDTO, context: MpsReadonlyItemContext) => void;
    areGeneratedOrdersAvailable?: boolean;
}

export default function MpsReadonlyReviewPanel({
    mps,
    totalOrdenesGeneradas,
    onItemClick,
    areGeneratedOrdersAvailable = false,
}: MpsReadonlyReviewPanelProps) {
    const totalUnidades = mps.dias
        .flatMap((dia) => dia.items)
        .reduce((total, item) => total + item.cantidadTotal, 0);

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
                <SummaryCard label="Items" value={formatNumber(mps.totalItems)} />
                <SummaryCard label="Lotes planificados" value={formatNumber(mps.totalLotesPlanificados)} />
                <SummaryCard label="Unidades planificadas" value={formatNumber(totalUnidades)} />
                <SummaryCard
                    label="ODPs"
                    value={`${formatNumber(totalOrdenesGeneradas)} / ${formatNumber(mps.totalLotesPlanificados)}`}
                    helper="Generadas / planificadas"
                />
            </SimpleGrid>

            <Box overflowX="auto">
                <Grid templateColumns="repeat(6, minmax(190px, 1fr))" gap={3} minW="1140px">
                    {mps.dias.map((dia) => {
                        const dayLabel = DAY_LABELS[dia.dayIndex] ?? `Dia ${dia.dayIndex + 1}`;
                        return (
                            <GridItem key={dia.id ?? dia.dayIndex}>
                                <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3} bg="gray.50" minH="420px">
                                    <Flex justify="space-between" align="start" gap={2} mb={3}>
                                        <Box>
                                            <Text fontWeight="bold">{dayLabel}</Text>
                                            <Text fontSize="sm" color="gray.600">
                                                {formatSemanaMpsDisplayDate(dia.fecha)}
                                            </Text>
                                        </Box>
                                        <Badge colorScheme="gray">{dia.items.length} items</Badge>
                                    </Flex>

                                    {dia.items.length === 0 ? (
                                        <Text fontSize="sm" color="gray.500">Sin programacion.</Text>
                                    ) : (
                                        <VStack align="stretch" spacing={2}>
                                            {dia.items.map((item) => (
                                                <MpsItemCard
                                                    key={item.id}
                                                    item={item}
                                                    context={{ date: dia.fecha, dayIndex: dia.dayIndex, dayLabel }}
                                                    onItemClick={onItemClick}
                                                    areGeneratedOrdersAvailable={areGeneratedOrdersAvailable}
                                                />
                                            ))}
                                        </VStack>
                                    )}
                                </Box>
                            </GridItem>
                        );
                    })}
                </Grid>
            </Box>
        </VStack>
    );
}
