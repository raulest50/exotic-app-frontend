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
    useColorModeValue,
    VStack,
} from "@chakra-ui/react";
import { useCallback, type MutableRefObject, type ReactNode } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { FiEdit3, FiEye, FiPause, FiPlay, FiRefreshCw } from "react-icons/fi";
import type {
    EstadoTableroKey,
    OrdenProduccionSeguimientoDetalleDTO,
    SeguimientoOrdenAreaCardDTO,
} from "./seguimientoBoard.types.ts";

export type SeguimientoActionType = "iniciar" | "pausar" | "completar";
export type SeguimientoBoardMode = "leader" | "monitor";

export function getSeguimientoColumnDroppableId(estadoKey: EstadoTableroKey): string {
    return `seguimiento-column-${estadoKey}`;
}

export function getSeguimientoCardDraggableId(card: SeguimientoOrdenAreaCardDTO): string {
    return `seguimiento-card-${card.id}`;
}

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

export function getEstadoDispensacionMaterialesLabel(value: string | null | undefined): string {
    switch (value) {
        case "PENDIENTE":
            return "Materiales pendientes";
        case "PARCIAL":
            return "Dispensacion parcial";
        case "COMPLETA":
            return "Dispensacion completa";
        case "LIBERADA_SIN_DISPENSACION":
            return "Liberada sin dispensacion";
        default:
            return "Materiales sin estado";
    }
}

export function getEstadoDispensacionMaterialesColor(value: string | null | undefined): string {
    switch (value) {
        case "PENDIENTE":
            return "yellow";
        case "PARCIAL":
            return "orange";
        case "COMPLETA":
            return "green";
        case "LIBERADA_SIN_DISPENSACION":
            return "purple";
        default:
            return "gray";
    }
}

export function getPoliticaDispensacionInicioLabel(value: string | null | undefined): string {
    switch (value) {
        case "NO_BLOQUEANTE":
            return "Inicio no bloqueante";
        case "BLOQUEANTE":
            return "Inicio bloqueante";
        default:
            return "Politica no registrada";
    }
}

export function getPoliticaDispensacionInicioColor(value: string | null | undefined): string {
    switch (value) {
        case "NO_BLOQUEANTE":
            return "purple";
        case "BLOQUEANTE":
            return "gray";
        default:
            return "gray";
    }
}

interface SeguimientoOrdenCardProps {
    card: SeguimientoOrdenAreaCardDTO;
    mode: SeguimientoBoardMode;
    onOpenDetail: (card: SeguimientoOrdenAreaCardDTO) => void;
    onAction?: (action: SeguimientoActionType, card: SeguimientoOrdenAreaCardDTO) => void;
    onCorrectState?: (card: SeguimientoOrdenAreaCardDTO) => void;
    canCorrectState?: boolean;
    dndEnabled?: boolean;
    touchOptimized?: boolean;
}

function SeguimientoOrdenCard({
    card,
    mode,
    onOpenDetail,
    onAction,
    onCorrectState,
    canCorrectState = false,
    dndEnabled = false,
    touchOptimized = false,
}: SeguimientoOrdenCardProps) {
    const isAlmacenGeneral = card.areaId === -1;
    const isOrdenCerrada = card.estadoOrden === -1 || card.estadoOrden === 2;
    const isCorrectionDragEnabled = mode === "monitor" && canCorrectState && !isAlmacenGeneral && !isOrdenCerrada;
    const isDragEnabled = dndEnabled && (mode === "leader" || isCorrectionDragEnabled);

    if (isDragEnabled) {
        return (
            <DraggableSeguimientoOrdenCard
                card={card}
                mode={mode}
                onOpenDetail={onOpenDetail}
                onAction={onAction}
                onCorrectState={onCorrectState}
                canCorrectState={canCorrectState}
                isAlmacenGeneral={isAlmacenGeneral}
                touchOptimized={touchOptimized}
            />
        );
    }

    return (
        <Box
            borderWidth="1px"
            borderRadius="lg"
            bg="app.surface"
            p={3}
            boxShadow="sm"
        >
            <SeguimientoOrdenCardContent
                card={card}
                mode={mode}
                onOpenDetail={onOpenDetail}
                onAction={onAction}
                onCorrectState={onCorrectState}
                canCorrectState={canCorrectState}
                isAlmacenGeneral={isAlmacenGeneral}
                touchOptimized={touchOptimized}
            />
        </Box>
    );
}

function DraggableSeguimientoOrdenCard({
    card,
    mode,
    onOpenDetail,
    onAction,
    onCorrectState,
    canCorrectState,
    isAlmacenGeneral,
    touchOptimized,
}: SeguimientoOrdenCardProps & { isAlmacenGeneral: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: getSeguimientoCardDraggableId(card),
        data: { card },
    });

    return (
        <Box
            ref={setNodeRef}
            borderWidth="1px"
            borderRadius="lg"
            bg="app.surface"
            p={3}
            boxShadow="sm"
            transform={CSS.Translate.toString(transform)}
            opacity={isDragging ? 0.45 : 1}
            position="relative"
            zIndex={isDragging ? 20 : 1}
            cursor="grab"
            {...listeners}
            {...attributes}
        >
            <SeguimientoOrdenCardContent
                card={card}
                mode={mode}
                onOpenDetail={onOpenDetail}
                onAction={onAction}
                onCorrectState={onCorrectState}
                canCorrectState={canCorrectState}
                isAlmacenGeneral={isAlmacenGeneral}
                touchOptimized={touchOptimized}
            />
        </Box>
    );
}

function SeguimientoOrdenCardContent({
    card,
    mode,
    onOpenDetail,
    onAction,
    onCorrectState,
    canCorrectState = false,
    isAlmacenGeneral,
    touchOptimized = false,
}: SeguimientoOrdenCardProps & { isAlmacenGeneral: boolean }) {
    const isOrdenCerrada = card.estadoOrden === -1 || card.estadoOrden === 2;

    return (
        <VStack align="stretch" spacing={2}>
            <VStack align="start" spacing={1}>
                <Badge colorScheme="teal" px={2} py={1}>
                    {card.loteAsignado || `OP-${card.ordenId}`}
                </Badge>
                <Text fontSize="xs" color="app.textSubtle" noOfLines={1}>
                    {card.nodeLabel || "Sin nodo"}
                </Text>
            </VStack>

            <Box>
                <Text fontWeight="bold" noOfLines={2}>{card.productoNombre}</Text>
                <Text fontSize="xs" color="app.textMuted">
                    {card.productoId} · Cant. {card.cantidadProducir}
                </Text>
            </Box>

            <HStack spacing={2} flexWrap="wrap">
                {card.estadoDispensacionMateriales ? (
                    <Badge colorScheme={getEstadoDispensacionMaterialesColor(card.estadoDispensacionMateriales)}>
                        {getEstadoDispensacionMaterialesLabel(card.estadoDispensacionMateriales)}
                    </Badge>
                ) : null}
                {card.politicaDispensacionInicio === "NO_BLOQUEANTE" ? (
                    <Badge colorScheme={getPoliticaDispensacionInicioColor(card.politicaDispensacionInicio)}>
                        No bloqueante
                    </Badge>
                ) : null}
            </HStack>

            <Stack spacing={0.5} fontSize="xs" color="app.textMuted">
                <Text>Desde: {formatDateTime(card.fechaEstadoActual)}</Text>
                <Text>Tiempo: {formatMinutesDuration(card.minutosEnEstadoActual)}</Text>
                <Text>
                    Fin: {card.fechaFinalPlanificada ? formatDateTime(card.fechaFinalPlanificada) : "Sin fecha"}
                </Text>
            </Stack>

            {card.ordenObservaciones?.trim() ? (
                <Box p={2} bg="app.surfaceSubtle" borderRadius="md">
                    <Text fontSize="xs" color="app.textSubtle" mb={1}>
                        Obs.
                    </Text>
                    <Text fontSize="sm" noOfLines={2}>
                        {card.ordenObservaciones}
                    </Text>
                </Box>
            ) : null}

            <HStack justify="space-between" align="center" pt={1} flexWrap="wrap" gap={2}>
                <Button
                    size="sm"
                    minH={touchOptimized ? 12 : undefined}
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
                                minH={touchOptimized ? 12 : undefined}
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
                                    minH={touchOptimized ? 12 : undefined}
                                    variant="outline"
                                    leftIcon={<FiPause />}
                                    onClick={() => onAction?.("pausar", card)}
                                >
                                    Pausar
                                </Button>
                                <Button
                                    size="sm"
                                    minH={touchOptimized ? 12 : undefined}
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

                {mode === "monitor" && canCorrectState && !isAlmacenGeneral && !isOrdenCerrada ? (
                    <Button
                        size="sm"
                        minH={touchOptimized ? 12 : undefined}
                        colorScheme="purple"
                        variant="outline"
                        leftIcon={<FiEdit3 />}
                        onClick={() => onCorrectState?.(card)}
                    >
                        Corregir
                    </Button>
                ) : null}
            </HStack>
        </VStack>
    );
}

interface SeguimientoBoardColumnProps {
    estadoKey: EstadoTableroKey;
    items: SeguimientoOrdenAreaCardDTO[];
    mode: SeguimientoBoardMode;
    onOpenDetail: (card: SeguimientoOrdenAreaCardDTO) => void;
    onAction?: (action: SeguimientoActionType, card: SeguimientoOrdenAreaCardDTO) => void;
    onCorrectState?: (card: SeguimientoOrdenAreaCardDTO) => void;
    canCorrectState?: boolean;
    dndEnabled?: boolean;
    containerRef?: MutableRefObject<HTMLDivElement | null>;
    totalItems?: number;
    footer?: ReactNode;
    isLoading?: boolean;
    touchOptimized?: boolean;
}

export function SeguimientoBoardColumn({
    estadoKey,
    items,
    mode,
    onOpenDetail,
    onAction,
    onCorrectState,
    canCorrectState = false,
    dndEnabled = false,
    containerRef,
    totalItems,
    footer,
    isLoading = false,
    touchOptimized = false,
}: SeguimientoBoardColumnProps) {
    const meta = BOARD_COLUMN_META[estadoKey];
    const columnBg = useColorModeValue("whiteAlpha.900", "whiteAlpha.100");

    if (dndEnabled) {
        return (
            <DroppableSeguimientoBoardColumn
                estadoKey={estadoKey}
                items={items}
                mode={mode}
                onOpenDetail={onOpenDetail}
                onAction={onAction}
                onCorrectState={onCorrectState}
                canCorrectState={canCorrectState}
                columnBg={columnBg}
                meta={meta}
                containerRef={containerRef}
                totalItems={totalItems}
                footer={footer}
                isLoading={isLoading}
                touchOptimized={touchOptimized}
            />
        );
    }

    return (
        <Box
            ref={containerRef}
            borderWidth="1px"
            borderRadius="xl"
            bg={columnBg}
            overflow="hidden"
            minH="280px"
            scrollMarginTop={4}
        >
            <SeguimientoBoardColumnContent
                meta={meta}
                items={items}
                mode={mode}
                onOpenDetail={onOpenDetail}
                onAction={onAction}
                onCorrectState={onCorrectState}
                canCorrectState={canCorrectState}
                dndEnabled={false}
                totalItems={totalItems}
                footer={footer}
                isLoading={isLoading}
                touchOptimized={touchOptimized}
            />
        </Box>
    );
}

function DroppableSeguimientoBoardColumn({
    estadoKey,
    items,
    mode,
    onOpenDetail,
    onAction,
    onCorrectState,
    canCorrectState,
    columnBg,
    meta,
    containerRef,
    totalItems,
    footer,
    isLoading,
    touchOptimized,
}: SeguimientoBoardColumnProps & {
    columnBg: string;
    meta: (typeof BOARD_COLUMN_META)[EstadoTableroKey];
}) {
    const columnOverBg = useColorModeValue("teal.50", "whiteAlpha.200");
    const { setNodeRef, isOver } = useDroppable({
        id: getSeguimientoColumnDroppableId(estadoKey),
        data: { estadoKey },
    });
    const setCombinedNodeRef = useCallback((node: HTMLDivElement | null) => {
        setNodeRef(node);
        if (containerRef) {
            containerRef.current = node;
        }
    }, [containerRef, setNodeRef]);

    return (
        <Box
            ref={setCombinedNodeRef}
            borderWidth="1px"
            borderRadius="xl"
            borderColor={isOver ? "teal.300" : undefined}
            bg={isOver ? columnOverBg : columnBg}
            overflow="visible"
            minH="280px"
            scrollMarginTop={4}
        >
            <SeguimientoBoardColumnContent
                meta={meta}
                items={items}
                mode={mode}
                onOpenDetail={onOpenDetail}
                onAction={onAction}
                onCorrectState={onCorrectState}
                canCorrectState={canCorrectState}
                dndEnabled
                totalItems={totalItems}
                footer={footer}
                isLoading={isLoading}
                touchOptimized={touchOptimized}
            />
        </Box>
    );
}

function SeguimientoBoardColumnContent({
    meta,
    items,
    mode,
    onOpenDetail,
    onAction,
    onCorrectState,
    canCorrectState,
    dndEnabled,
    totalItems,
    footer,
    isLoading = false,
    touchOptimized = false,
}: Omit<SeguimientoBoardColumnProps, "estadoKey"> & {
    meta: (typeof BOARD_COLUMN_META)[EstadoTableroKey];
}) {
    return (
        <>
            <Box borderTop="4px solid" borderTopColor={meta.accentColor} px={4} py={3} bg="app.surfaceSubtle">
                <HStack justify="space-between">
                    <Text fontWeight="bold">{meta.title}</Text>
                    <Badge colorScheme="gray">{totalItems ?? items.length}</Badge>
                </HStack>
            </Box>

            <VStack
                align="stretch"
                spacing={3}
                p={4}
                minH={touchOptimized ? "240px" : undefined}
                maxH={touchOptimized ? { base: "none", md: "calc(100dvh - 24rem)" } : "70vh"}
                overflowY={touchOptimized ? { base: "visible", md: "auto" } : "auto"}
            >
                {isLoading ? (
                    <Flex justify="center" align="center" minH="180px" aria-live="polite">
                        <Spinner color="teal.500" />
                    </Flex>
                ) : null}
                {!isLoading && items.length === 0 ? (
                    <Text fontSize="sm" color="app.textSubtle">
                        {meta.emptyLabel}
                    </Text>
                ) : null}
                {!isLoading && items.length > 0 ? (
                    items.map((item) => (
                        <SeguimientoOrdenCard
                            key={item.id}
                            card={item}
                            mode={mode}
                            onOpenDetail={onOpenDetail}
                            onAction={onAction}
                            onCorrectState={onCorrectState}
                            canCorrectState={canCorrectState}
                            dndEnabled={dndEnabled}
                            touchOptimized={touchOptimized}
                        />
                    ))
                ) : null}
            </VStack>
            {footer ? (
                <Box borderTopWidth="1px" px={3} py={3} bg="app.surfaceSubtle">
                    {footer}
                </Box>
            ) : null}
        </>
    );
}

interface SeguimientoResumenCardsProps {
    total: number;
    cola: number;
    espera: number;
    enProceso: number;
    completado: number;
    onTotalClick?: () => void;
    onColaClick?: () => void;
    onEsperaClick?: () => void;
    onEnProcesoClick?: () => void;
    onCompletadoClick?: () => void;
    tabletOptimized?: boolean;
}

export function SeguimientoResumenCards({
    total,
    cola,
    espera,
    enProceso,
    completado,
    onTotalClick,
    onColaClick,
    onEsperaClick,
    onEnProcesoClick,
    onCompletadoClick,
    tabletOptimized = false,
}: SeguimientoResumenCardsProps) {
    const stats = [
        { label: "Total", value: total, color: "teal.500", onClick: onTotalClick, ariaLabel: "Ir al tablero operativo" },
        { label: "En cola", value: cola, color: "orange.500", onClick: onColaClick, ariaLabel: "Ir a la columna En cola" },
        { label: "En espera", value: espera, color: "yellow.500", onClick: onEsperaClick, ariaLabel: "Ir a la columna En espera" },
        { label: "En proceso", value: enProceso, color: "blue.500", onClick: onEnProcesoClick, ariaLabel: "Ir a la columna En proceso" },
        { label: "Completadas", value: completado, color: "green.500", onClick: onCompletadoClick, ariaLabel: "Ir a la columna Completadas" },
    ];

    return (
        <SimpleGrid
            columns={tabletOptimized ? { base: 2, md: 3, lg: 5 } : { base: 2, md: 3, xl: 5 }}
            spacing={{ base: 3, md: 4 }}
        >
            {stats.map((item) => {
                const content = (
                    <Stat>
                        <StatLabel>{item.label}</StatLabel>
                        <StatNumber color={item.color}>{item.value}</StatNumber>
                    </Stat>
                );

                if (item.onClick) {
                    return (
                        <Box
                            key={item.label}
                            as="button"
                            type="button"
                            borderWidth="1px"
                            borderRadius="lg"
                            bg="app.surface"
                            p={tabletOptimized ? { base: 3, md: 4 } : 4}
                            minH={tabletOptimized ? 24 : undefined}
                            w="full"
                            textAlign="left"
                            fontFamily="inherit"
                            color="inherit"
                            cursor="pointer"
                            transition="border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease"
                            _hover={{ borderColor: "teal.300", boxShadow: "sm", transform: "translateY(-1px)" }}
                            _focusVisible={{ outline: "2px solid", outlineColor: "teal.400", outlineOffset: "2px" }}
                            aria-label={item.ariaLabel}
                            onClick={item.onClick}
                        >
                            {content}
                        </Box>
                    );
                }

                return (
                    <Box
                        key={item.label}
                        borderWidth="1px"
                        borderRadius="lg"
                        bg="app.surface"
                        p={tabletOptimized ? { base: 3, md: 4 } : 4}
                        minH={tabletOptimized ? 24 : undefined}
                    >
                        {content}
                    </Box>
                );
            })}
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
                                <Text color="app.textMuted">
                                    {detail.productoNombre} · {detail.productoId}
                                </Text>
                                <Text color="app.textMuted">Cantidad: {detail.cantidadProducir}</Text>
                                <HStack mt={2} spacing={2} flexWrap="wrap">
                                    <Badge colorScheme={getEstadoDispensacionMaterialesColor(detail.estadoDispensacionMateriales)}>
                                        {getEstadoDispensacionMaterialesLabel(detail.estadoDispensacionMateriales)}
                                    </Badge>
                                    <Badge colorScheme={getPoliticaDispensacionInicioColor(detail.politicaDispensacionInicio)}>
                                        {getPoliticaDispensacionInicioLabel(detail.politicaDispensacionInicio)}
                                    </Badge>
                                </HStack>
                            </Box>

                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="app.textSubtle">Politica dispensacion</Text>
                                    <Text>{getPoliticaDispensacionInicioLabel(detail.politicaDispensacionInicio)}</Text>
                                    <Text fontSize="xs" color="app.textMuted">
                                        {formatDateTime(detail.fechaAplicacionPoliticaDispensacion)}
                                    </Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="app.textSubtle">Estado materiales</Text>
                                    <Text>{getEstadoDispensacionMaterialesLabel(detail.estadoDispensacionMateriales)}</Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="app.textSubtle">Creación</Text>
                                    <Text>{formatDateTime(detail.fechaCreacion)}</Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="app.textSubtle">Fin planificada</Text>
                                    <Text>{formatDateTime(detail.fechaFinalPlanificada)}</Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="app.textSubtle">Inicio estimado</Text>
                                    <Text>{formatDateTime(detail.fechaInicioEstimacion)}</Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="app.textSubtle">Fin estimado</Text>
                                    <Text>{formatDateTime(detail.fechaFinalEstimada)}</Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="app.textSubtle">Duración estimada</Text>
                                    <Text>{formatMinutesDuration(detail.duracionCalendarioRutaCriticaMinutos)}</Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="app.textSubtle">Inicio real</Text>
                                    <Text>{formatDateTime(detail.fechaInicio)}</Text>
                                </Box>
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                    <Text fontSize="sm" color="app.textSubtle">Fin real</Text>
                                    <Text>{formatDateTime(detail.fechaFinal)}</Text>
                                </Box>
                            </SimpleGrid>

                            <Box>
                                <Text fontWeight="semibold" mb={2}>Observaciones de la orden</Text>
                                <Box borderWidth="1px" borderRadius="md" p={3} bg="app.surfaceSubtle">
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
                                                    <Text fontSize="sm" color="app.textMuted">
                                                        {ruta.areaNombre}
                                                    </Text>
                                                </Box>
                                                <Badge colorScheme={getEstadoBadgeColor(ruta.estado)}>
                                                    {ruta.estadoDescripcion}
                                                </Badge>
                                            </HStack>

                                            <Stack spacing={1} fontSize="sm" color="app.textMuted">
                                                <Text>
                                                    Estimado: {formatMinutesDuration(ruta.duracionEstimadaMinutos)} · {ruta.requiereJornadaLaboral ? "Jornada laboral" : "Tiempo continuo"}
                                                </Text>
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
                        <Text color="app.textSubtle">No se encontró detalle para esta orden.</Text>
                    ) : null}
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
}
