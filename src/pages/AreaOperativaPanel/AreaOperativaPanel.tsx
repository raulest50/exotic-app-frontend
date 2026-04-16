import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Flex,
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
    SimpleGrid,
    Spinner,
    Text,
    Textarea,
    VStack,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
import { FiLogOut, FiRefreshCw, FiSearch, FiUser } from "react-icons/fi";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL.tsx";
import { useAuth } from "../../context/AuthContext.tsx";
import {
    BOARD_COLUMN_META,
    SeguimientoBoardColumn,
    SeguimientoOrdenDetailDrawer,
    SeguimientoResumenCards,
} from "../Produccion/components/SeguimientoBoardUI.tsx";
import type {
    EstadoTableroKey,
    OrdenProduccionSeguimientoDetalleDTO,
    SeguimientoOrdenAreaCardDTO,
    TableroOperativoDTO,
} from "../Produccion/components/seguimientoBoard.types.ts";
import type { SeguimientoActionType } from "../Produccion/components/SeguimientoBoardUI.tsx";

const endpoints = new EndPointsURL();

const EMPTY_BOARD: TableroOperativoDTO = {
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
    const { meProfile, logout } = useAuth();
    const toast = useToast();

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

    const [selectedOrden, setSelectedOrden] = useState<SeguimientoOrdenAreaCardDTO | null>(null);
    const [selectedAction, setSelectedAction] = useState<SeguimientoActionType | null>(null);
    const [observaciones, setObservaciones] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<OrdenProduccionSeguimientoDetalleDTO | null>(null);

    const fetchTablero = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get<TableroOperativoDTO>(
                endpoints.seguimiento_mis_ordenes_tablero,
                { withCredentials: true },
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
    }, []);

    useEffect(() => {
        void fetchTablero();
    }, [fetchTablero]);

    const openDetail = useCallback(async (orden: SeguimientoOrdenAreaCardDTO) => {
        setSelectedOrden(orden);
        setDetail(null);
        setDetailLoading(true);
        onDetailOpen();

        try {
            const response = await axios.get<OrdenProduccionSeguimientoDetalleDTO>(
                endpoints.seguimiento_detalle_orden.replace("{ordenId}", String(orden.ordenId)),
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
        onActionOpen();
    };

    const handleSubmitAction = async () => {
        if (!selectedOrden || !selectedAction) {
            return;
        }

        const actionMeta = getActionMeta(selectedAction);
        setSubmitting(true);

        try {
            await axios.post(
                actionMeta.endpoint,
                {
                    ordenId: selectedOrden.ordenId,
                    areaId: selectedOrden.areaId,
                    observaciones: observaciones.trim() || null,
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

    return (
        <VStack w="full" spacing={6} align="stretch" p={4}>
            <Box>
                <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
                    <Box>
                        <Heading size="lg" mb={2}>Centro Operativo del Área</Heading>
                        {meProfile ? (
                            <HStack spacing={2} color="gray.600">
                                <FiUser />
                                <Text>{meProfile.nombreCompleto || meProfile.username}</Text>
                            </HStack>
                        ) : null}
                    </Box>

                    <HStack spacing={3}>
                        <Button
                            variant="outline"
                            leftIcon={<FiRefreshCw />}
                            onClick={() => void fetchTablero()}
                            isLoading={loading}
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

            <SeguimientoResumenCards
                total={tablero.resumen.total}
                cola={tablero.resumen.cola}
                espera={tablero.resumen.espera}
                enProceso={tablero.resumen.enProceso}
                completado={tablero.resumen.completado}
            />

            <Box borderWidth="1px" borderRadius="lg" bg="white" p={4}>
                <VStack align="stretch" spacing={3}>
                    <Text fontWeight="semibold">Filtros y vista rápida</Text>
                    <HStack flexWrap="wrap" gap={3}>
                        <Box flex="1" minW={{ base: "100%", md: "320px" }}>
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
                        <Text fontSize="sm" color="gray.600">
                            Mostrando {totalFilteredCards} órdenes en el tablero filtrado.
                        </Text>
                    </HStack>
                </VStack>
            </Box>

            {error ? (
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {error}
                </Alert>
            ) : null}

            {loading ? (
                <Flex justify="center" align="center" py={12}>
                    <Spinner size="xl" color="teal.500" />
                </Flex>
            ) : null}

            {!loading && tablero.resumen.total === 0 ? (
                <Box borderWidth="1px" borderRadius="xl" bg="gray.50" p={10} textAlign="center">
                    <Heading size="md" color="gray.700" mb={2}>No hay órdenes en seguimiento</Heading>
                    <Text color="gray.500">
                        Las órdenes aparecerán aquí cuando una ruta productiva involucre tus áreas asignadas.
                    </Text>
                </Box>
            ) : null}

            {!loading && tablero.resumen.total > 0 ? (
                <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                    {(Object.keys(BOARD_COLUMN_META) as EstadoTableroKey[]).map((estadoKey) => (
                        <SeguimientoBoardColumn
                            key={estadoKey}
                            estadoKey={estadoKey}
                            items={filteredBoard[estadoKey]}
                            mode="leader"
                            onOpenDetail={openDetail}
                            onAction={openActionModal}
                        />
                    ))}
                </SimpleGrid>
            ) : null}

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
                                <Box>
                                    <Text fontWeight="bold" mb={1}>Observaciones (opcionales)</Text>
                                    <Textarea
                                        value={observaciones}
                                        onChange={(event) => setObservaciones(event.target.value)}
                                        placeholder="Agregar observaciones para esta transición"
                                        maxLength={500}
                                        rows={4}
                                    />
                                    <Text fontSize="xs" color="gray.500" textAlign="right">
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
                        >
                            {actionMeta.submitLabel}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <SeguimientoOrdenDetailDrawer
                isOpen={isDetailOpen}
                onClose={onDetailClose}
                detail={detail}
                loading={detailLoading}
            />
        </VStack>
    );
}
