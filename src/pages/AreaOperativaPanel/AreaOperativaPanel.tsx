import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    ButtonGroup,
    Flex,
    FormControl,
    FormHelperText,
    FormLabel,
    HStack,
    Heading,
    Input,
    InputGroup,
    InputLeftElement,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    NumberInput,
    NumberInputField,
    SimpleGrid,
    Spinner,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Text,
    Textarea,
    VStack,
    useDisclosure,
    useColorModeValue,
    useToast,
} from "@chakra-ui/react";
import { FiArchive, FiCalendar, FiClock, FiLogOut, FiRefreshCw, FiSearch, FiUser } from "react-icons/fi";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL.tsx";
import { useAuth } from "../../context/AuthContext.tsx";
import { useMasterDirectives } from "../../context/MasterDirectivesContext.tsx";
import {
    AREA_OPERATIVA_PANEL_HISTORICO_TOGGLE_ENABLED_DEFAULT,
    MASTER_DIRECTIVE_KEYS,
} from "../../context/masterDirectiveConstants.ts";
import {
    BOARD_COLUMN_META,
    SeguimientoBoardColumn,
    SeguimientoResumenCards,
} from "../Produccion/components/SeguimientoBoardUI.tsx";
import type {
    EstadoTableroKey,
    SeguimientoOrdenAreaCardDTO,
    TableroOperativoDTO,
    TableroVista,
} from "../Produccion/components/seguimientoBoard.types.ts";
import type { SeguimientoActionType } from "../Produccion/components/SeguimientoBoardUI.tsx";
import AreaOperativaOrderDetailDrawer from "./AreaOperativaOrderDetailDrawer.tsx";
import AreaOperativaMpsSemanalTab from "./AreaOperativaMpsSemanalTab.tsx";
import type { AreaOperativaOrdenDetalleDTO } from "./areaOperativaPanel.types.ts";
import { useAreaOperativaNoiseSampler } from "./Analitica/Noise/useAreaOperativaNoiseSampler.ts";
import { formatSemanaMpsDisplayDate } from "../Produccion/ProgProdSemanalTab/semanaMps.utils.ts";

const endpoints = new EndPointsURL();
const TABLERO_VISTA_STORAGE_KEY = "areaOperativaPanel.tableroVista.v2";

const EMPTY_BOARD: TableroOperativoDTO = {
    vista: "HOY",
    periodStartDate: null,
    periodEndDate: null,
    resumen: {
        total: 0,
        cola: 0,
        espera: 0,
        enProceso: 0,
        completado: 0,
    },
    cola: [],
    espera: [],
    enProceso: [],
    completado: [],
};

function isTableroVista(value: unknown): value is TableroVista {
    return value === "HOY" || value === "SEMANA_ACTUAL" || value === "HISTORICO";
}

function getStoredTableroVista(): TableroVista {
    if (typeof window === "undefined") {
        return "HOY";
    }

    try {
        const stored = window.localStorage.getItem(TABLERO_VISTA_STORAGE_KEY);
        return isTableroVista(stored) ? stored : "HOY";
    } catch {
        return "HOY";
    }
}

function storeTableroVista(vista: TableroVista) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(TABLERO_VISTA_STORAGE_KEY, vista);
    } catch {
        // La preferencia local no debe bloquear el tablero operativo.
    }
}

function isEstadoTableroKey(value: unknown): value is EstadoTableroKey {
    return value === "cola"
        || value === "espera"
        || value === "enProceso"
        || value === "completado";
}

function getCardEstadoKey(card: SeguimientoOrdenAreaCardDTO): EstadoTableroKey | null {
    switch (card.estado) {
        case 0:
            return "cola";
        case 1:
            return "espera";
        case 2:
            return "completado";
        case 4:
            return "enProceso";
        default:
            return null;
    }
}

function getDropAction(
    card: SeguimientoOrdenAreaCardDTO,
    targetEstadoKey: EstadoTableroKey,
): SeguimientoActionType | null {
    if (card.areaId === -1) {
        return null;
    }

    const sourceEstadoKey = getCardEstadoKey(card);
    if (!sourceEstadoKey || sourceEstadoKey === targetEstadoKey) {
        return null;
    }

    if (sourceEstadoKey === "espera" && targetEstadoKey === "enProceso") {
        return "iniciar";
    }

    if (sourceEstadoKey === "enProceso" && targetEstadoKey === "espera") {
        return "pausar";
    }

    if (sourceEstadoKey === "enProceso" && targetEstadoKey === "completado") {
        return "completar";
    }

    return null;
}

function getActionMeta(action: SeguimientoActionType | null): {
    title: string;
    submitLabel: string;
    endpoint: string;
    colorScheme: string;
} {
    switch (action) {
        case "iniciar":
            return {
                title: "Iniciar orden",
                submitLabel: "Confirmar inicio",
                endpoint: endpoints.seguimiento_reportar_en_proceso,
                colorScheme: "blue",
            };
        case "pausar":
            return {
                title: "Pausar orden",
                submitLabel: "Confirmar pausa",
                endpoint: endpoints.seguimiento_pausar_proceso,
                colorScheme: "orange",
            };
        case "completar":
        default:
            return {
                title: "Completar orden",
                submitLabel: "Confirmar completado",
                endpoint: endpoints.seguimiento_reportar_completado,
                colorScheme: "green",
            };
    }
}

function matchesFilter(card: SeguimientoOrdenAreaCardDTO, searchTerm: string): boolean {
    if (!searchTerm.trim()) {
        return true;
    }

    const normalized = searchTerm.trim().toLowerCase();
    return [
        card.loteAsignado || "",
        `op-${card.ordenId}`,
        card.productoNombre,
        card.productoId,
        card.areaNombre,
        card.nodeLabel,
    ].some((value) => value.toLowerCase().includes(normalized));
}

export default function AreaOperativaPanel() {
    const { meProfile, logout, areaResponsable } = useAuth();
    const { loading: directivesLoading, getBooleanDirective, refreshDirectives } = useMasterDirectives();
    const toast = useToast();
    const emptyTitleColor = useColorModeValue("gray.700", "gray.200");
    const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const boardColumnsStartRef = useRef<HTMLDivElement | null>(null);
    const colaColumnRef = useRef<HTMLDivElement | null>(null);
    const esperaColumnRef = useRef<HTMLDivElement | null>(null);
    const enProcesoColumnRef = useRef<HTMLDivElement | null>(null);
    const completadoColumnRef = useRef<HTMLDivElement | null>(null);
    useAreaOperativaNoiseSampler();

    const {
        isOpen: isActionOpen,
        onOpen: onActionOpen,
        onClose: onActionClose,
    } = useDisclosure();
    const {
        isOpen: isDetailOpen,
        onOpen: onDetailOpen,
        onClose: onDetailClose,
    } = useDisclosure();

    const [tablero, setTablero] = useState<TableroOperativoDTO>(EMPTY_BOARD);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [tableroVista, setTableroVista] = useState<TableroVista>(getStoredTableroVista);

    const [selectedOrden, setSelectedOrden] = useState<SeguimientoOrdenAreaCardDTO | null>(null);
    const [selectedAction, setSelectedAction] = useState<SeguimientoActionType | null>(null);
    const [observaciones, setObservaciones] = useState("");
    const [cantidadProducida, setCantidadProducida] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<AreaOperativaOrdenDetalleDTO | null>(null);

    const scrollToElement = useCallback((element: HTMLDivElement | null) => {
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    const scrollToBoardColumns = useCallback(() => {
        scrollToElement(boardColumnsStartRef.current);
    }, [scrollToElement]);

    const scrollToColumn = useCallback((estadoKey: EstadoTableroKey) => {
        const columnRef = (() => {
            switch (estadoKey) {
                case "cola":
                    return colaColumnRef;
                case "espera":
                    return esperaColumnRef;
                case "enProceso":
                    return enProcesoColumnRef;
                case "completado":
                    return completadoColumnRef;
                default:
                    return null;
            }
        })();

        scrollToElement(columnRef?.current ?? null);
    }, [scrollToElement]);

    const getColumnContainerRef = (estadoKey: EstadoTableroKey) => {
        switch (estadoKey) {
            case "cola":
                return colaColumnRef;
            case "espera":
                return esperaColumnRef;
            case "enProceso":
                return enProcesoColumnRef;
            case "completado":
            default:
                return completadoColumnRef;
        }
    };

    const tableroVistaToggleEnabled = !directivesLoading && getBooleanDirective(
        MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_PANEL_HISTORICO_TOGGLE_ENABLED,
        AREA_OPERATIVA_PANEL_HISTORICO_TOGGLE_ENABLED_DEFAULT,
    );
    const effectiveTableroVista: TableroVista = tableroVistaToggleEnabled ? tableroVista : "HISTORICO";

    const handleTableroVistaChange = useCallback((nextVista: TableroVista) => {
        setTableroVista(nextVista);
        storeTableroVista(nextVista);
    }, []);

    const fetchTablero = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get<TableroOperativoDTO>(
                endpoints.seguimiento_mis_ordenes_tablero,
                {
                    params: { vista: effectiveTableroVista },
                    withCredentials: true,
                },
            );
            setTablero(response.data ?? EMPTY_BOARD);
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "No fue posible cargar el tablero operativo.",
            );
            setTablero(EMPTY_BOARD);
        } finally {
            setLoading(false);
        }
    }, [effectiveTableroVista]);

    useEffect(() => {
        if (directivesLoading) {
            return;
        }
        void fetchTablero();
    }, [directivesLoading, fetchTablero]);

    const handleRefreshPanel = useCallback(async () => {
        await refreshDirectives();
        await fetchTablero();
    }, [fetchTablero, refreshDirectives]);

    const openDetail = useCallback(async (orden: SeguimientoOrdenAreaCardDTO) => {
        setSelectedOrden(orden);
        setDetail(null);
        setDetailLoading(true);
        onDetailOpen();

        try {
            const response = await axios.get<AreaOperativaOrdenDetalleDTO>(
                endpoints.area_operativa_panel_detalle_operativo_orden.replace("{ordenId}", String(orden.ordenId)),
                { withCredentials: true },
            );
            setDetail(response.data);
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.response?.data?.message || err.message || "No fue posible cargar el detalle.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setDetailLoading(false);
        }
    }, [onDetailOpen, toast]);

    const openActionModal = (action: SeguimientoActionType, orden: SeguimientoOrdenAreaCardDTO) => {
        setSelectedAction(action);
        setSelectedOrden(orden);
        setObservaciones("");
        setCantidadProducida("");
        onActionOpen();
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const card = event.active.data.current?.card as SeguimientoOrdenAreaCardDTO | undefined;
        const targetEstadoKey = event.over?.data.current?.estadoKey;

        if (!card || !isEstadoTableroKey(targetEstadoKey)) {
            return;
        }

        const action = getDropAction(card, targetEstadoKey);
        if (!action) {
            const sourceEstadoKey = getCardEstadoKey(card);
            const targetTitle = BOARD_COLUMN_META[targetEstadoKey].title;
            const sourceTitle = sourceEstadoKey ? BOARD_COLUMN_META[sourceEstadoKey].title : "estado actual";
            toast({
                title: "Movimiento no permitido",
                description: `No se puede mover de ${sourceTitle} a ${targetTitle}.`,
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        openActionModal(action, card);
    };

    const handleSubmitAction = async () => {
        if (!selectedOrden || !selectedAction) {
            return;
        }

        const actionMeta = getActionMeta(selectedAction);
        const isFinalCompletion = selectedAction === "completar" && selectedOrden.esNodoFinal;
        const parsedCantidad = Number(cantidadProducida);
        if (isFinalCompletion && (!Number.isFinite(parsedCantidad) || parsedCantidad <= 0)) {
            toast({
                title: "Cantidad requerida",
                description: "Ingrese una cantidad producida mayor que cero.",
                status: "warning",
                duration: 3500,
                isClosable: true,
            });
            return;
        }
        setSubmitting(true);

        try {
            await axios.post(
                actionMeta.endpoint,
                {
                    ordenId: selectedOrden.ordenId,
                    areaId: selectedOrden.areaId,
                    observaciones: observaciones.trim() || null,
                    cantidadProducida: isFinalCompletion ? parsedCantidad : null,
                },
                { withCredentials: true },
            );

            toast({
                title: "Actualización registrada",
                description: `${selectedOrden.loteAsignado || `OP-${selectedOrden.ordenId}`} actualizada correctamente.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });

            onActionClose();
            await fetchTablero();
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.response?.data?.message || err.message || "No fue posible registrar el cambio.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredBoard = useMemo<TableroOperativoDTO>(() => ({
        vista: tablero.vista,
        periodStartDate: tablero.periodStartDate,
        periodEndDate: tablero.periodEndDate,
        resumen: tablero.resumen,
        cola: tablero.cola.filter((card) => matchesFilter(card, searchTerm)),
        espera: tablero.espera.filter((card) => matchesFilter(card, searchTerm)),
        enProceso: tablero.enProceso.filter((card) => matchesFilter(card, searchTerm)),
        completado: tablero.completado.filter((card) => matchesFilter(card, searchTerm)),
    }), [searchTerm, tablero]);

    const actionMeta = getActionMeta(selectedAction);
    const totalFilteredCards =
        filteredBoard.cola.length +
        filteredBoard.espera.length +
        filteredBoard.enProceso.length +
        filteredBoard.completado.length;
    const periodRangeLabel = tablero.periodStartDate && tablero.periodEndDate
        ? `${formatSemanaMpsDisplayDate(tablero.periodStartDate)} a ${formatSemanaMpsDisplayDate(tablero.periodEndDate)}`
        : "semana actual";
    const activeVistaLabel = effectiveTableroVista === "HOY"
        ? "hoy"
        : effectiveTableroVista === "SEMANA_ACTUAL"
            ? `esta semana (${periodRangeLabel})`
            : "todo el histórico";
    const boardLoading = loading || directivesLoading;

    return (
        <VStack w="full" spacing={6} align="stretch" p={4}>
            <Box>
                <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
                    <Box>
                        <Heading size="lg" mb={2}>Centro Operativo del Área</Heading>
                        {meProfile ? (
                            <HStack spacing={2} color="app.textMuted">
                                <FiUser />
                                <Text>{meProfile.nombreCompleto || meProfile.username}</Text>
                            </HStack>
                        ) : null}
                    </Box>

                    <HStack spacing={3}>
                        <Button
                            variant="outline"
                            leftIcon={<FiRefreshCw />}
                            onClick={() => void handleRefreshPanel()}
                            isLoading={boardLoading}
                            isDisabled={directivesLoading}
                        >
                            Refrescar
                        </Button>
                        <Button
                            colorScheme="red"
                            variant="outline"
                            leftIcon={<FiLogOut />}
                            onClick={logout}
                        >
                            Cerrar sesión
                        </Button>
                    </HStack>
                </HStack>
            </Box>

            <Tabs variant="enclosed" colorScheme="teal" isLazy>
                <TabList>
                    <Tab>Tablero operativo</Tab>
                    <Tab>MPS semanal</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel px={0} pb={0}>
                        <VStack w="full" spacing={6} align="stretch">
                            <Box borderWidth="1px" borderRadius="lg" bg="app.surface" p={4}>
                                <Flex
                                    align={{ base: "stretch", lg: "flex-end" }}
                                    direction={{ base: "column", lg: "row" }}
                                    gap={4}
                                >
                                    {tableroVistaToggleEnabled ? (
                                        <Box minW={{ base: "100%", md: "430px" }}>
                                            <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                                Periodo de completadas
                                            </Text>
                                            <ButtonGroup
                                                isAttached
                                                size="md"
                                                variant="outline"
                                                w={{ base: "full", md: "auto" }}
                                            >
                                                <Button
                                                    flex={{ base: 1, md: "initial" }}
                                                    leftIcon={(
                                                        <Box display={{ base: "none", sm: "inline-flex" }}>
                                                            <FiClock />
                                                        </Box>
                                                    )}
                                                    colorScheme={effectiveTableroVista === "HOY" ? "teal" : "gray"}
                                                    variant={effectiveTableroVista === "HOY" ? "solid" : "outline"}
                                                    aria-pressed={effectiveTableroVista === "HOY"}
                                                    onClick={() => handleTableroVistaChange("HOY")}
                                                >
                                                    Hoy
                                                </Button>
                                                <Button
                                                    flex={{ base: 1, md: "initial" }}
                                                    leftIcon={(
                                                        <Box display={{ base: "none", sm: "inline-flex" }}>
                                                            <FiCalendar />
                                                        </Box>
                                                    )}
                                                    colorScheme={effectiveTableroVista === "SEMANA_ACTUAL" ? "teal" : "gray"}
                                                    variant={effectiveTableroVista === "SEMANA_ACTUAL" ? "solid" : "outline"}
                                                    aria-pressed={effectiveTableroVista === "SEMANA_ACTUAL"}
                                                    onClick={() => handleTableroVistaChange("SEMANA_ACTUAL")}
                                                >
                                                    Semana actual
                                                </Button>
                                                <Button
                                                    flex={{ base: 1, md: "initial" }}
                                                    leftIcon={(
                                                        <Box display={{ base: "none", sm: "inline-flex" }}>
                                                            <FiArchive />
                                                        </Box>
                                                    )}
                                                    colorScheme={effectiveTableroVista === "HISTORICO" ? "teal" : "gray"}
                                                    variant={effectiveTableroVista === "HISTORICO" ? "solid" : "outline"}
                                                    aria-pressed={effectiveTableroVista === "HISTORICO"}
                                                    onClick={() => handleTableroVistaChange("HISTORICO")}
                                                >
                                                    Histórico
                                                </Button>
                                            </ButtonGroup>
                                        </Box>
                                    ) : null}

                                    <Box flex="1" minW={{ base: "100%", lg: "360px" }}>
                                        <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                            Buscar
                                        </Text>
                                        <InputGroup>
                                            <InputLeftElement pointerEvents="none">
                                                <FiSearch />
                                            </InputLeftElement>
                                            <Input
                                                value={searchTerm}
                                                onChange={(event) => setSearchTerm(event.target.value)}
                                                placeholder="Buscar por lote, OP, producto o nodo"
                                            />
                                        </InputGroup>
                                    </Box>

                                    <Text
                                        alignSelf={{ base: "flex-start", lg: "center" }}
                                        color="app.textMuted"
                                        fontSize="sm"
                                    >
                                        {tableroVistaToggleEnabled
                                            ? `Mostrando ${totalFilteredCards} órdenes; completadas: ${activeVistaLabel}.`
                                            : `Mostrando ${totalFilteredCards} órdenes en el tablero.`}
                                    </Text>
                                </Flex>
                            </Box>

                            <SeguimientoResumenCards
                                total={tablero.resumen.total}
                                cola={tablero.resumen.cola}
                                espera={tablero.resumen.espera}
                                enProceso={tablero.resumen.enProceso}
                                completado={tablero.resumen.completado}
                                onTotalClick={scrollToBoardColumns}
                                onColaClick={() => scrollToColumn("cola")}
                                onEsperaClick={() => scrollToColumn("espera")}
                                onEnProcesoClick={() => scrollToColumn("enProceso")}
                                onCompletadoClick={() => scrollToColumn("completado")}
                            />

                            {error ? (
                                <Alert status="error" borderRadius="md">
                                    <AlertIcon />
                                    {error}
                                </Alert>
                            ) : null}

                            {boardLoading ? (
                                <Flex justify="center" align="center" py={12}>
                                    <Spinner size="xl" color="teal.500" />
                                </Flex>
                            ) : null}

                            {!boardLoading && tablero.resumen.total === 0 ? (
                                <Box borderWidth="1px" borderRadius="xl" bg="app.surfaceSubtle" p={10} textAlign="center">
                                    <Heading size="md" color={emptyTitleColor} mb={2}>No hay órdenes en seguimiento</Heading>
                                    <Text color="app.textSubtle">
                                        {tableroVistaToggleEnabled
                                            ? "No hay órdenes activas ni completadas en el periodo seleccionado."
                                            : "Las órdenes aparecerán aquí cuando una ruta productiva involucre tus áreas asignadas."}
                                    </Text>
                                </Box>
                            ) : null}

                            {!boardLoading && tablero.resumen.total > 0 ? (
                                <Box ref={boardColumnsStartRef} scrollMarginTop={4}>
                                    <DndContext
                                        sensors={dndSensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                                            {(Object.keys(BOARD_COLUMN_META) as EstadoTableroKey[]).map((estadoKey) => (
                                                <SeguimientoBoardColumn
                                                    key={estadoKey}
                                                    estadoKey={estadoKey}
                                                    items={filteredBoard[estadoKey]}
                                                    mode="leader"
                                                    onOpenDetail={openDetail}
                                                    onAction={openActionModal}
                                                    dndEnabled
                                                    containerRef={getColumnContainerRef(estadoKey)}
                                                />
                                            ))}
                                        </SimpleGrid>
                                    </DndContext>
                                </Box>
                            ) : null}
                        </VStack>
                    </TabPanel>
                    <TabPanel px={0} pb={0}>
                        <AreaOperativaMpsSemanalTab />
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <Modal isOpen={isActionOpen} onClose={onActionClose} size="md">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{actionMeta.title}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {selectedOrden ? (
                            <VStack align="stretch" spacing={4}>
                                <Box>
                                    <Text fontWeight="bold" mb={1}>Orden</Text>
                                    <Text>{selectedOrden.loteAsignado || `OP-${selectedOrden.ordenId}`}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold" mb={1}>Producto</Text>
                                    <Text>{selectedOrden.productoNombre}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold" mb={1}>Estado actual</Text>
                                    <Text>{selectedOrden.estadoDescripcion}</Text>
                                </Box>
                                {selectedAction === "completar" && selectedOrden.esNodoFinal ? (
                                    <FormControl isRequired>
                                        <FormLabel>Cantidad producida</FormLabel>
                                        <NumberInput
                                            value={cantidadProducida}
                                            onChange={(value) => setCantidadProducida(value)}
                                            min={0.0001}
                                            precision={4}
                                            clampValueOnBlur={false}
                                        >
                                            <NumberInputField
                                                inputMode="decimal"
                                                placeholder="0"
                                                aria-label="Cantidad de producto terminado fabricado"
                                            />
                                        </NumberInput>
                                        <FormHelperText>
                                            Planeado: {selectedOrden.cantidadProducir.toLocaleString("es-CO")}{" "}
                                            {selectedOrden.tipoUnidades || "unidades"}. Este reporte deja la OP pendiente de cierre.
                                        </FormHelperText>
                                    </FormControl>
                                ) : null}
                                <Box>
                                    <Text fontWeight="bold" mb={1}>Observaciones (opcionales)</Text>
                                    <Textarea
                                        value={observaciones}
                                        onChange={(event) => setObservaciones(event.target.value)}
                                        placeholder="Agregar observaciones para esta transición"
                                        maxLength={500}
                                        rows={4}
                                    />
                                    <Text fontSize="xs" color="app.textSubtle" textAlign="right">
                                        {observaciones.length}/500
                                    </Text>
                                </Box>
                            </VStack>
                        ) : null}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onActionClose} isDisabled={submitting}>
                            Cancelar
                        </Button>
                        <Button
                            colorScheme={actionMeta.colorScheme}
                            onClick={() => void handleSubmitAction()}
                            isLoading={submitting}
                            isDisabled={
                                selectedAction === "completar"
                                && Boolean(selectedOrden?.esNodoFinal)
                                && (!Number.isFinite(Number(cantidadProducida)) || Number(cantidadProducida) <= 0)
                            }
                        >
                            {actionMeta.submitLabel}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <AreaOperativaOrderDetailDrawer
                isOpen={isDetailOpen}
                onClose={onDetailClose}
                detail={detail}
                loading={detailLoading}
                currentAreaId={areaResponsable?.areaId ?? null}
            />
        </VStack>
    );
}
