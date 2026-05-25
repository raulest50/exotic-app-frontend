import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Badge,
    Box,
    Button,
    Divider,
    Flex,
    Heading,
    HStack,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    SimpleGrid,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Text,
    Td,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
} from "@chakra-ui/react";
import {
    AprobarMpsSemanal,
    GenerarOdpDesdeMps,
    ListarMpsSemanales,
    ObtenerOdpsDesdeMpsSemanal,
    type MpsSemanalOrdenProduccionListItemDTO,
    type MpsSemanalListItemDTO,
} from "./PlaneacionProduccionTab/PlaneacionProduccionService.tsx";

interface AprobacionMPSWeekTabProps {
    onOpenMpsWeek: (weekStartDate: string) => void;
}

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function getEstadoColorScheme(estado: MpsSemanalListItemDTO["estado"]): string {
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

function SummaryLine({ label, value }: { label: string; value: number }) {
    const formattedValue = Number.isInteger(value)
        ? value.toLocaleString("es-CO")
        : value.toLocaleString("es-CO", { maximumFractionDigits: 2 });

    return (
        <Text fontSize="sm" color="gray.600">
            {label}: <Text as="span" fontWeight="semibold" color="gray.700">{formattedValue}</Text>
        </Text>
    );
}

function getEstadoLabel(estado: MpsSemanalListItemDTO["estado"]): string {
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

function renderEstadoOrdenLabel(estadoOrden: number): string {
    switch (estadoOrden) {
        case -1:
            return "Cancelada";
        case 0:
            return "Abierta";
        case 2:
            return "Terminada";
        case 3:
            return "Fabricacion completada";
        default:
            return `Estado ${estadoOrden}`;
    }
}

function WeekCard({
    item,
    onOpen,
    onApprove,
    onGenerateOdps,
    onViewOdps,
    isApproving,
    isGeneratingOdps,
    isViewingOdps,
}: {
    item: MpsSemanalListItemDTO;
    onOpen: () => void;
    onApprove: () => void;
    onGenerateOdps: () => void;
    onViewOdps: () => void;
    isApproving: boolean;
    isGeneratingOdps: boolean;
    isViewingOdps: boolean;
}) {
    const canGenerateOdps = item.estado === "APROBADO" && !item.odpsGeneradasCompletas && item.totalOrdenesEsperadas > 0;
    const canViewOdps = item.totalOrdenesGeneradas > 0;
    const canApprove = item.estado === "BORRADOR" && item.totalOrdenesEsperadas > 0;

    return (
        <Box borderWidth="1px" borderRadius="lg" bg="white" p={4} boxShadow="sm">
            <VStack align="stretch" spacing={3}>
                <Flex justify="space-between" align="start" gap={3}>
                    <Box>
                        <Heading size="sm">Semana {item.weekStartDate}</Heading>
                        <Text fontSize="sm" color="gray.600">
                            Hasta {item.weekEndDate}
                        </Text>
                    </Box>
                    <Badge colorScheme={getEstadoColorScheme(item.estado)}>{getEstadoLabel(item.estado)}</Badge>
                </Flex>

                <Box>
                    <Text fontSize="sm" color="gray.600">Creado: {formatDateTimeLabel(item.fechaCreacion)}</Text>
                    {item.fechaActualizacion && (
                        <Text fontSize="sm" color="gray.600">Actualizado: {formatDateTimeLabel(item.fechaActualizacion)}</Text>
                    )}
                    {item.fechaAprobacion && (
                        <Text fontSize="sm" color="gray.600">Aprobado: {formatDateTimeLabel(item.fechaAprobacion)}</Text>
                    )}
                    {item.aprobadoPorUsername && (
                        <Text fontSize="sm" color="gray.600">Aprobado por: {item.aprobadoPorUsername}</Text>
                    )}
                    {item.fechaGeneracionOdps && (
                        <Text fontSize="sm" color="gray.600">ODPs generadas: {formatDateTimeLabel(item.fechaGeneracionOdps)}</Text>
                    )}
                    {item.generadoPorUsername && (
                        <Text fontSize="sm" color="gray.600">Generadas por: {item.generadoPorUsername}</Text>
                    )}
                </Box>

                <Divider />

                <Box>
                    <SummaryLine label="Terminados evaluados" value={item.summary.totalTerminadosEvaluados} />
                    <SummaryLine label="Lotes propuestos" value={item.summary.totalLotesPropuestos} />
                    <SummaryLine label="Unidades propuestas" value={item.summary.totalUnidadesPropuestas} />
                </Box>

                <Divider />

                <Box>
                    <SummaryLine label="ODPs esperadas" value={item.totalOrdenesEsperadas} />
                    <SummaryLine label="ODPs generadas" value={item.totalOrdenesGeneradas} />
                    {item.totalOrdenesEsperadas === 0 ? (
                        <Badge colorScheme="gray">Sin ODPs esperadas</Badge>
                    ) : item.odpsGeneradasCompletas ? (
                        <Badge colorScheme="green">ODPs generadas</Badge>
                    ) : (
                        <Badge colorScheme="orange">ODPs pendientes</Badge>
                    )}
                    {item.estado === "BORRADOR" && item.totalOrdenesEsperadas === 0 && (
                        <Text mt={2} fontSize="sm" color="orange.600">
                            No se puede aprobar una semana sin ODPs esperadas.
                        </Text>
                    )}
                    {item.estado === "APROBADO" && item.totalOrdenesEsperadas === 0 && (
                        <Text mt={2} fontSize="sm" color="orange.600">
                            Semana aprobada sin ODPs esperadas. No admite generación de órdenes.
                        </Text>
                    )}
                </Box>

                <Divider />

                <Box>
                    <SummaryLine label="Bloques no programados" value={item.totalBloquesNoProgramados} />
                    <SummaryLine label="Lotes no programados" value={item.totalLotesNoProgramados} />
                    <SummaryLine label="Unidades no programadas" value={item.totalUnidadesNoProgramadas} />
                </Box>

                <HStack justify="end" spacing={3}>
                    <Button variant="outline" onClick={onOpen}>
                        Abrir
                    </Button>
                    {canViewOdps && (
                        <Button
                            variant="outline"
                            colorScheme="teal"
                            onClick={onViewOdps}
                            isLoading={isViewingOdps}
                        >
                            Ver ODPs
                        </Button>
                    )}
                    {item.estado === "BORRADOR" && (
                        <Button
                            colorScheme="green"
                            onClick={onApprove}
                            isLoading={isApproving}
                            isDisabled={!canApprove}
                        >
                            Aprobar
                        </Button>
                    )}
                    {canGenerateOdps && (
                        <Button
                            colorScheme="blue"
                            onClick={onGenerateOdps}
                            isLoading={isGeneratingOdps}
                        >
                            Generar ODPs
                        </Button>
                    )}
                </HStack>
            </VStack>
        </Box>
    );
}

export default function AprobacionMPSWeekTab({ onOpenMpsWeek }: AprobacionMPSWeekTabProps) {
    const [items, setItems] = useState<MpsSemanalListItemDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [approvingWeekStartDate, setApprovingWeekStartDate] = useState<string | null>(null);
    const [generatingWeekStartDate, setGeneratingWeekStartDate] = useState<string | null>(null);
    const [viewingWeekStartDate, setViewingWeekStartDate] = useState<string | null>(null);
    const [selectedWeekForOdps, setSelectedWeekForOdps] = useState<MpsSemanalListItemDTO | null>(null);
    const [selectedWeekOdps, setSelectedWeekOdps] = useState<MpsSemanalOrdenProduccionListItemDTO[]>([]);
    const [isOdpsModalOpen, setIsOdpsModalOpen] = useState(false);
    const [isLoadingOdps, setIsLoadingOdps] = useState(false);
    const toast = useToast();

    const loadItems = async () => {
        setIsLoading(true);
        try {
            const response = await ListarMpsSemanales();
            setItems(response);
        } catch (error) {
            toast({
                title: "No se pudo cargar la bandeja MPS",
                description: getAxiosErrorMessage(error, "No fue posible consultar las semanas guardadas."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadItems();
    }, []);

    const borradores = useMemo(
        () => items.filter((item) => item.estado === "BORRADOR"),
        [items],
    );

    const aprobados = useMemo(
        () => items.filter((item) => item.estado === "APROBADO"),
        [items],
    );

    const handleApprove = async (weekStartDate: string) => {
        setApprovingWeekStartDate(weekStartDate);
        try {
            await AprobarMpsSemanal({ weekStartDate });
            toast({
                title: "Semana aprobada",
                description: `La semana ${weekStartDate} fue aprobada correctamente.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            await loadItems();
        } catch (error) {
            toast({
                title: "No se pudo aprobar la semana",
                description: getAxiosErrorMessage(error, "La aprobacion del MPS semanal fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setApprovingWeekStartDate(null);
        }
    };

    const handleGenerateOdps = async (weekStartDate: string) => {
        setGeneratingWeekStartDate(weekStartDate);
        try {
            const response = await GenerarOdpDesdeMps({ weekStartDate });
            toast({
                title: "ODPs generadas",
                description: `Se crearon ${response.totalOrdenesCreadas} órdenes desde la semana ${weekStartDate}.`,
                status: "success",
                duration: 4000,
                isClosable: true,
            });
            await loadItems();
        } catch (error) {
            toast({
                title: "No se pudieron generar las ODPs",
                description: getAxiosErrorMessage(error, "La generación de órdenes desde el MPS falló."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setGeneratingWeekStartDate(null);
        }
    };

    const handleViewOdps = async (item: MpsSemanalListItemDTO) => {
        setViewingWeekStartDate(item.weekStartDate);
        setIsLoadingOdps(true);
        setSelectedWeekForOdps(item);
        setIsOdpsModalOpen(true);
        try {
            const response = await ObtenerOdpsDesdeMpsSemanal(item.weekStartDate);
            setSelectedWeekOdps(response);
        } catch (error) {
            toast({
                title: "No se pudieron consultar las ODPs",
                description: getAxiosErrorMessage(error, "La consulta de ODPs generadas para la semana fallo."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            setIsOdpsModalOpen(false);
            setSelectedWeekForOdps(null);
            setSelectedWeekOdps([]);
        } finally {
            setViewingWeekStartDate(null);
            setIsLoadingOdps(false);
        }
    };

    const handleCloseOdpsModal = () => {
        setIsOdpsModalOpen(false);
        setSelectedWeekForOdps(null);
        setSelectedWeekOdps([]);
    };

    return (
        <VStack align="stretch" spacing={6}>
            <Box p={6} bg="white" borderRadius="md" boxShadow="sm">
                <VStack align="start" spacing={2}>
                    <Heading size="md">Aprobacion MPS Week</Heading>
                    <Text color="gray.600">
                        Revise las semanas guardadas, abra la planeacion correspondiente y formalice la aprobacion cuando el borrador ya sea el plan oficial.
                    </Text>
                </VStack>
            </Box>

            {isLoading ? (
                <Flex justify="center" align="center" py={12} gap={3}>
                    <Spinner color="teal.500" />
                    <Text color="gray.600">Cargando semanas MPS...</Text>
                </Flex>
            ) : (
                <VStack align="stretch" spacing={6}>
                    <Box>
                        <Heading size="sm" mb={3}>Semanas en BORRADOR</Heading>
                        {borradores.length === 0 ? (
                            <Box p={4} bg="white" borderRadius="md" boxShadow="sm">
                                <Text color="gray.500" fontSize="sm">No hay semanas pendientes de aprobacion.</Text>
                            </Box>
                        ) : (
                            <SimpleGrid columns={[1, 1, 2]} gap={4}>
                                {borradores.map((item) => (
                                    <WeekCard
                                        key={`borrador-${item.mpsId}`}
                                        item={item}
                                        onOpen={() => onOpenMpsWeek(item.weekStartDate)}
                                        onApprove={() => void handleApprove(item.weekStartDate)}
                                        onGenerateOdps={() => undefined}
                                        onViewOdps={() => undefined}
                                        isApproving={approvingWeekStartDate === item.weekStartDate}
                                        isGeneratingOdps={false}
                                        isViewingOdps={false}
                                    />
                                ))}
                            </SimpleGrid>
                        )}
                    </Box>

                    <Box>
                        <Heading size="sm" mb={3}>Semanas APROBADAS</Heading>
                        {aprobados.length === 0 ? (
                            <Box p={4} bg="white" borderRadius="md" boxShadow="sm">
                                <Text color="gray.500" fontSize="sm">No hay semanas aprobadas registradas.</Text>
                            </Box>
                        ) : (
                            <SimpleGrid columns={[1, 1, 2]} gap={4}>
                                {aprobados.map((item) => (
                                    <WeekCard
                                        key={`aprobado-${item.mpsId}`}
                                        item={item}
                                        onOpen={() => onOpenMpsWeek(item.weekStartDate)}
                                        onApprove={() => undefined}
                                        onGenerateOdps={() => void handleGenerateOdps(item.weekStartDate)}
                                        onViewOdps={() => void handleViewOdps(item)}
                                        isApproving={false}
                                        isGeneratingOdps={generatingWeekStartDate === item.weekStartDate}
                                        isViewingOdps={viewingWeekStartDate === item.weekStartDate}
                                    />
                                ))}
                            </SimpleGrid>
                        )}
                    </Box>
                </VStack>
            )}

            <Modal isOpen={isOdpsModalOpen} onClose={handleCloseOdpsModal} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        ODPs generadas
                        {selectedWeekForOdps ? ` - Semana ${selectedWeekForOdps.weekStartDate}` : ""}
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        {selectedWeekForOdps && (
                            <VStack align="stretch" spacing={4}>
                                <Box>
                                    <Text fontSize="sm" color="gray.600">
                                        ODPs generadas: {selectedWeekForOdps.totalOrdenesGeneradas} / {selectedWeekForOdps.totalOrdenesEsperadas}
                                    </Text>
                                    {selectedWeekForOdps.generadoPorUsername && (
                                        <Text fontSize="sm" color="gray.600">
                                            Generadas por: {selectedWeekForOdps.generadoPorUsername}
                                        </Text>
                                    )}
                                    {selectedWeekForOdps.fechaGeneracionOdps && (
                                        <Text fontSize="sm" color="gray.600">
                                            Fecha de generacion: {formatDateTimeLabel(selectedWeekForOdps.fechaGeneracionOdps)}
                                        </Text>
                                    )}
                                </Box>

                                {isLoadingOdps ? (
                                    <Flex justify="center" align="center" py={8} gap={3}>
                                        <Spinner color="teal.500" />
                                        <Text color="gray.600">Cargando ODPs generadas...</Text>
                                    </Flex>
                                ) : selectedWeekOdps.length === 0 ? (
                                    <Box p={4} bg="gray.50" borderRadius="md">
                                        <Text color="gray.500" fontSize="sm">
                                            Esta semana no tiene ODPs generadas registradas.
                                        </Text>
                                    </Box>
                                ) : (
                                    <TableContainer>
                                        <Table size="sm" variant="simple">
                                            <Thead>
                                                <Tr>
                                                    <Th>Orden</Th>
                                                    <Th>Producto</Th>
                                                    <Th>Lote</Th>
                                                    <Th isNumeric>Cantidad</Th>
                                                    <Th>Lanzamiento</Th>
                                                    <Th>Fin planificado</Th>
                                                    <Th>Estado</Th>
                                                    <Th>Block ID</Th>
                                                    <Th>Lote ordinal</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {selectedWeekOdps.map((orden) => (
                                                    <Tr key={orden.ordenId}>
                                                        <Td>{orden.ordenId}</Td>
                                                        <Td>
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontSize="sm" fontWeight="medium">{orden.productoNombre ?? "-"}</Text>
                                                                <Text fontSize="xs" color="gray.500">{orden.productoId ?? "-"}</Text>
                                                            </VStack>
                                                        </Td>
                                                        <Td>{orden.loteAsignado ?? "-"}</Td>
                                                        <Td isNumeric>{orden.cantidadProducir}</Td>
                                                        <Td>{formatDateTimeLabel(orden.fechaLanzamiento)}</Td>
                                                        <Td>{formatDateTimeLabel(orden.fechaFinalPlanificada)}</Td>
                                                        <Td>{renderEstadoOrdenLabel(orden.estadoOrden)}</Td>
                                                        <Td>{orden.mpsBlockId ?? "-"}</Td>
                                                        <Td>{orden.mpsLoteOrdinal ?? "-"}</Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </VStack>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </VStack>
    );
}
