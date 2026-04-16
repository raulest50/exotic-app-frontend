import {
    Badge,
    Box,
    Button,
    Divider,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    Flex,
    HStack,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    StatLabel,
    StatNumber,
    Text,
    VStack,
} from "@chakra-ui/react";
import { FiEye, FiPause, FiPlay, FiRefreshCw } from "react-icons/fi";
import type {
    EstadoTableroKey,
    OrdenProduccionSeguimientoDetalleDTO,
    SeguimientoOrdenAreaCardDTO,
} from "./seguimientoBoard.types.ts";

export type SeguimientoActionType = "iniciar" | "pausar" | "completar";
export type SeguimientoBoardMode = "leader" | "monitor";

export const BOARD_COLUMN_META: Record<
    EstadoTableroKey,
    { title: string; accentColor: string; emptyLabel: string }
> = {
    cola: {
        title: "En cola",
        accentColor: "orange.400",
        emptyLabel: "No hay órdenes en cola.",
    },
    espera: {
        title: "En espera",
        accentColor: "yellow.400",
        emptyLabel: "No hay órdenes en espera.",
    },
    enProceso: {
        title: "En proceso",
        accentColor: "blue.400",
        emptyLabel: "No hay órdenes en proceso.",
    },
    completado: {
        title: "Completadas",
        accentColor: "green.400",
        emptyLabel: "No hay órdenes completadas.",
    },
};

export function formatDateTime(value: string | null | undefined): string {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatMinutesDuration(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) {
        return "-";
    }

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) {
        return `${hours} h ${remainingMinutes} min`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} d ${remainingHours} h`;
}

function getEstadoBadgeColor(estado: number): string {
    switch (estado) {
        case 0:
            return "orange";
        case 1:
            return "yellow";
        case 2:
            return "green";
        case 4:
            return "blue";
        default:
            return "gray";
    }
}

interface SeguimientoOrdenCardProps {
    card: SeguimientoOrdenAreaCardDTO;
    mode: SeguimientoBoardMode;
    onOpenDetail: (card: SeguimientoOrdenAreaCardDTO) => void;
    onAction?: (action: SeguimientoActionType, card: SeguimientoOrdenAreaCardDTO) => void;
}

function SeguimientoOrdenCard({
    card,
    mode,
    onOpenDetail,
    onAction,
}: SeguimientoOrdenCardProps) {
    const isAlmacenGeneral = card.areaId === -1;

    return (
        <Box
            borderWidth="1px"
            borderRadius="lg"
            bg="white"
            p={4}
            boxShadow="sm"
        >
            <VStack align="stretch" spacing={3}>
                <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                        <Badge colorScheme="teal" px={2} py={1}>
                            {card.loteAsignado || `OP-${card.ordenId}`}
                        </Badge>
                        <Text fontSize="sm" color="gray.500">
                            {card.nodeLabel || "Sin nodo"}
                        </Text>
                    </VStack>
                    <Badge colorScheme={getEstadoBadgeColor(card.estado)}>
                        {card.estadoDescripcion}
                    </Badge>
                </HStack>

                <Box>
                    <Text fontWeight="bold">{card.productoNombre}</Text>
                    <Text fontSize="sm" color="gray.600">
                        {card.productoId} · Cantidad: {card.cantidadProducir}
                    </Text>
                </Box>

                <Stack spacing={1} fontSize="sm" color="gray.600">
                    <Text>Área: {card.areaNombre}</Text>
                    <Text>Visible desde: {formatDateTime(card.fechaVisible)}</Text>
                    <Text>Estado actual desde: {formatDateTime(card.fechaEstadoActual)}</Text>
                    <Text>Tiempo en estado: {formatMinutesDuration(card.minutosEnEstadoActual)}</Text>
                    <Text>
                        Fin planificada: {card.fechaFinalPlanificada ? formatDateTime(card.fechaFinalPlanificada) : "Sin fecha"}
                    </Text>
                </Stack>

                {card.ordenObservaciones?.trim() ? (
                    <Box p={2} bg="gray.50" borderRadius="md">
                        <Text fontSize="xs" color="gray.500" mb={1}>
                            Observaciones de la orden
                        </Text>
                        <Text fontSize="sm" noOfLines={2}>
                            {card.ordenObservaciones}
                        </Text>
                    </Box>
                ) : null}

                <HStack justify="space-between" align="center" pt={1}>
                    <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<FiEye />}
                        onClick={() => onOpenDetail(card)}
                    >
                        Detalle
                    </Button>

                    {mode === "leader" ? (
                        <HStack spacing={2}>
                            {card.estado === 1 && !isAlmacenGeneral ? (
                                <Button
                                    size="sm"
                                    colorScheme="blue"
                                    leftIcon={<FiPlay />}
                                    onClick={() => onAction?.("iniciar", card)}
                                >
                                    Iniciar
                                </Button>
                            ) : null}

                            {card.estado === 4 && !isAlmacenGeneral ? (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        leftIcon={<FiPause />}
                                        onClick={() => onAction?.("pausar", card)}
                                    >
                                        Pausar
                                    </Button>
                                    <Button
                                        size="sm"
                                        colorScheme="green"
                                        leftIcon={<FiRefreshCw />}
                                        onClick={() => onAction?.("completar", card)}
                                    >
                                        Completar
                                    </Button>
                                </>
                            ) : null}

                            {isAlmacenGeneral ? (
                                <Badge colorScheme="purple">Se reporta al dispensar</Badge>
                            ) : null}
                        </HStack>
                    ) : null}
                </HStack>
            </VStack>
        </Box>
    );
}

interface SeguimientoBoardColumnProps {
    estadoKey: EstadoTableroKey;
    items: SeguimientoOrdenAreaCardDTO[];
    mode: SeguimientoBoardMode;
    onOpenDetail: (card: SeguimientoOrdenAreaCardDTO) => void;
    onAction?: (action: SeguimientoActionType, card: SeguimientoOrdenAreaCardDTO) => void;
}

export function SeguimientoBoardColumn({
    estadoKey,
    items,
    mode,
    onOpenDetail,
    onAction,
}: SeguimientoBoardColumnProps) {
    const meta = BOARD_COLUMN_META[estadoKey];

    return (
        <Box
            borderWidth="1px"
            borderRadius="xl"
            bg="whiteAlpha.900"
            overflow="hidden"
            minH="280px"
        >
            <Box borderTop="4px solid" borderTopColor={meta.accentColor} px={4} py={3} bg="gray.50">
                <HStack justify="space-between">
                    <Text fontWeight="bold">{meta.title}</Text>
                    <Badge colorScheme="gray">{items.length}</Badge>
                </HStack>
            </Box>

            <VStack align="stretch" spacing={3} p={4} maxH="70vh" overflowY="auto">
                {items.length === 0 ? (
                    <Text fontSize="sm" color="gray.500">
                        {meta.emptyLabel}
                    </Text>
                ) : (
                    items.map((item) => (
                        <SeguimientoOrdenCard
                            key={item.id}
                            card={item}
                            mode={mode}
                            onOpenDetail={onOpenDetail}
                            onAction={onAction}
                        />
                    ))
                )}
            </VStack>
        </Box>
    );
}

interface SeguimientoResumenCardsProps {
    total: number;
    cola: number;
    espera: number;
    enProceso: number;
    completado: number;
}

export function SeguimientoResumenCards({
    total,
    cola,
    espera,
    enProceso,
    completado,
}: SeguimientoResumenCardsProps) {
    const stats = [
        { label: "Total", value: total, color: "teal.500" },
        { label: "En cola", value: cola, color: "orange.500" },
        { label: "En espera", value: espera, color: "yellow.500" },
        { label: "En proceso", value: enProceso, color: "blue.500" },
        { label: "Completadas", value: completado, color: "green.500" },
    ];

    return (
        <SimpleGrid columns={{ base: 2, md: 3, xl: 5 }} spacing={4}>
            {stats.map((item) => (
                <Box key={item.label} borderWidth="1px" borderRadius="lg" bg="white" p={4}>
                    <Stat>
                        <StatLabel>{item.label}</StatLabel>
                        <StatNumber color={item.color}>{item.value}</StatNumber>
                    </Stat>
                </Box>
            ))}
        </SimpleGrid>
    );
}

interface SeguimientoOrdenDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    detail: OrdenProduccionSeguimientoDetalleDTO | null;
    loading: boolean;
}

export function SeguimientoOrdenDetailDrawer({
    isOpen,
    onClose,
    detail,
    loading,
}: SeguimientoOrdenDetailDrawerProps) {
    return (
        <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="lg">
            <DrawerOverlay />
            <DrawerContent>
                <DrawerCloseButton />
                <DrawerHeader>Detalle de seguimiento</DrawerHeader>

                <DrawerBody>
                    {loading ? (
                        <Flex align="center" justify="center" py={10}>
                            <Spinner />
                        </Flex>
                    ) : null}

                    {!loading && detail ? (
                        <VStack align="stretch" spacing={5}>
                            <Box>
                                <Text fontWeight="bold">{detail.loteAsignado || `OP-${detail.ordenId}`}</Text>
                                <Text color="gray.600">
                                    {detail.productoNombre} · {detail.productoId}
                                </Text>
                                <Text color="gray.600">Cantidad: {detail.cantidadProducir}</Text>
                            </Box>

                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="gray.500">Creación</Text>
                                    <Text>{formatDateTime(detail.fechaCreacion)}</Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="gray.500">Fin planificada</Text>
                                    <Text>{formatDateTime(detail.fechaFinalPlanificada)}</Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="gray.500">Inicio real</Text>
                                    <Text>{formatDateTime(detail.fechaInicio)}</Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="gray.500">Fin real</Text>
                                    <Text>{formatDateTime(detail.fechaFinal)}</Text>
                                </Box>
                            </SimpleGrid>

                            <Box>
                                <Text fontWeight="semibold" mb={2}>Observaciones de la orden</Text>
                                <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                                    <Text whiteSpace="pre-wrap">
                                        {detail.ordenObservaciones?.trim() || "Sin observaciones registradas."}
                                    </Text>
                                </Box>
                            </Box>

                            <Box>
                                <Text fontWeight="semibold" mb={3}>Ruta y estado actual</Text>
                                <VStack align="stretch" spacing={3}>
                                    {detail.rutaEstados.map((ruta, index) => (
                                        <Box key={ruta.seguimientoId} borderWidth="1px" borderRadius="md" p={3}>
                                            <HStack justify="space-between" align="start" mb={2}>
                                                <Box>
                                                    <Text fontWeight="bold">
                                                        {index + 1}. {ruta.nodeLabel}
                                                    </Text>
                                                    <Text fontSize="sm" color="gray.600">
                                                        {ruta.areaNombre}
                                                    </Text>
                                                </Box>
                                                <Badge colorScheme={getEstadoBadgeColor(ruta.estado)}>
                                                    {ruta.estadoDescripcion}
                                                </Badge>
                                            </HStack>

                                            <Stack spacing={1} fontSize="sm" color="gray.600">
                                                <Text>Visible desde: {formatDateTime(ruta.fechaVisible)}</Text>
                                                <Text>Estado actual desde: {formatDateTime(ruta.fechaEstadoActual)}</Text>
                                                <Text>Completado: {formatDateTime(ruta.fechaCompletado)}</Text>
                                                <Text>
                                                    Último reporte por: {ruta.usuarioReportaNombre || "Sistema / sin registro"}
                                                </Text>
                                            </Stack>

                                            {ruta.observaciones?.trim() ? (
                                                <>
                                                    <Divider my={3} />
                                                    <Text fontSize="sm" whiteSpace="pre-wrap">
                                                        {ruta.observaciones}
                                                    </Text>
                                                </>
                                            ) : null}
                                        </Box>
                                    ))}
                                </VStack>
                            </Box>
                        </VStack>
                    ) : null}

                    {!loading && !detail ? (
                        <Text color="gray.500">No se encontró detalle para esta orden.</Text>
                    ) : null}
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
}
