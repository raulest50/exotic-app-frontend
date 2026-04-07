import { useState, useEffect, useCallback } from 'react';
import {
    VStack,
    HStack,
    Box,
    Text,
    Heading,
    Card,
    CardBody,
    Badge,
    Button,
    Spinner,
    Alert,
    AlertIcon,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Textarea,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    useDisclosure,
    useToast,
    Divider,
} from '@chakra-ui/react';
import { FiCheckCircle, FiClock, FiFileText, FiPackage, FiUser, FiLogOut } from 'react-icons/fi';
import axios from 'axios';
import EndPointsURL from '../../api/EndPointsURL.tsx';
import BetterPagination from '../../components/BetterPagination/BetterPagination.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

const endpoints = new EndPointsURL();

interface SeguimientoOrdenArea {
    id: number;
    ordenId: number;
    loteAsignado: string | null;
    productoId: string;
    productoNombre: string;
    cantidadProducir: number;
    estadoOrden: number;
    nodeId: number;
    nodeLabel: string;
    areaId: number;
    areaNombre: string;
    estado: number;
    estadoDescripcion: string;
    posicionSecuencia: number;
    fechaCreacion: string;
    fechaVisible: string;
    fechaCompletado: string | null;
    usuarioReportaId: number | null;
    usuarioReportaNombre: string | null;
    observaciones: string | null;
    ordenObservaciones: string | null;
    fechaFinalPlanificada: string | null;
}

interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

export default function AreaOperativaPanel() {
    const { meProfile, logout } = useAuth();
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const {
        isOpen: isObsOrdenOpen,
        onOpen: onObsOrdenOpen,
        onClose: onObsOrdenClose,
    } = useDisclosure();

    const [ordenes, setOrdenes] = useState<SeguimientoOrdenArea[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [selectedOrden, setSelectedOrden] = useState<SeguimientoOrdenArea | null>(null);
    const [ordenObservacionesVer, setOrdenObservacionesVer] = useState<SeguimientoOrdenArea | null>(
        null
    );
    const [observaciones, setObservaciones] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchOrdenesPendientes = useCallback(async (pagina: number, tamanoPagina: number) => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get<PaginatedResponse<SeguimientoOrdenArea>>(
                endpoints.seguimiento_mis_ordenes_pendientes,
                {
                    params: { page: pagina, size: tamanoPagina },
                    withCredentials: true,
                }
            );

            setOrdenes(response.data.content ?? []);
            setTotalPages(response.data.totalPages ?? 0);
            setTotalElements(response.data.totalElements ?? 0);
            setPage(pagina);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Error al cargar ordenes pendientes';
            setError(errorMessage);
            setOrdenes([]);
            setTotalPages(0);
            setTotalElements(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrdenesPendientes(0, size);
    }, [fetchOrdenesPendientes, size]);

    const handlePageChange = (newPage: number) => {
        fetchOrdenesPendientes(newPage, size);
    };

    const handleSizeChange = (newSize: number) => {
        setSize(newSize);
        fetchOrdenesPendientes(0, newSize);
    };

    const handleOpenModal = (orden: SeguimientoOrdenArea) => {
        setSelectedOrden(orden);
        setObservaciones('');
        onOpen();
    };

    const MSG_SIN_OBS_ORDEN = 'No se registran observaciones para esta orden de produccion';

    const handleOpenObservacionesOrden = (orden: SeguimientoOrdenArea) => {
        setOrdenObservacionesVer(orden);
        onObsOrdenOpen();
    };

    const handleCloseObservacionesOrden = () => {
        onObsOrdenClose();
        setOrdenObservacionesVer(null);
    };

    const handleReportarCompletado = async () => {
        if (!selectedOrden) return;

        setSubmitting(true);
        try {
            await axios.post(
                endpoints.seguimiento_reportar_completado,
                {
                    ordenId: selectedOrden.ordenId,
                    areaId: selectedOrden.areaId,
                    observaciones: observaciones.trim() || null,
                },
                { withCredentials: true }
            );

            toast({
                title: 'Completado',
                description: `Orden ${selectedOrden.loteAsignado || selectedOrden.ordenId} reportada como completada`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onClose();
            fetchOrdenesPendientes(page, size);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Error al reportar completado';
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <VStack w="full" spacing={6} align="stretch" p={4}>
            {/* Header */}
            <Box>
                <HStack justify="space-between" align="start">
                    <Box>
                        <Heading size="lg" mb={2}>Panel de Area Operativa</Heading>
                        {meProfile && (
                            <HStack spacing={2} color="gray.600">
                                <FiUser />
                                <Text>{meProfile.nombreCompleto || meProfile.username}</Text>
                            </HStack>
                        )}
                    </Box>
                    <Button
                        colorScheme="red"
                        variant="outline"
                        leftIcon={<FiLogOut />}
                        onClick={logout}
                    >
                        Cerrar Sesión
                    </Button>
                </HStack>
            </Box>

            {/* Estadisticas */}
            <Card>
                <CardBody>
                    <HStack spacing={8}>
                        <Stat>
                            <StatLabel>Ordenes Pendientes</StatLabel>
                            <StatNumber color="blue.500">{totalElements}</StatNumber>
                            <StatHelpText>En tus areas asignadas</StatHelpText>
                        </Stat>
                    </HStack>
                </CardBody>
            </Card>

            {/* Error */}
            {error && (
                <Alert status="error">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {/* Loading */}
            {loading && (
                <Box textAlign="center" py={8}>
                    <Spinner size="xl" color="blue.500" />
                    <Text mt={2}>Cargando ordenes...</Text>
                </Box>
            )}

            {/* Lista de ordenes */}
            {!loading && ordenes.length === 0 && (
                <Box textAlign="center" py={12} bg="gray.50" borderRadius="md">
                    <FiCheckCircle size={48} style={{ margin: '0 auto', color: '#48BB78' }} />
                    <Text mt={4} fontSize="lg" color="gray.600">
                        No tienes ordenes pendientes
                    </Text>
                    <Text color="gray.500">
                        Las ordenes apareceran aqui cuando lleguen a tus areas de trabajo
                    </Text>
                </Box>
            )}

            {!loading && ordenes.length > 0 && (
                <VStack spacing={4} align="stretch">
                    {ordenes.map((orden) => (
                        <Card key={orden.id} variant="outline">
                            <CardBody>
                                <HStack justify="space-between" align="start">
                                    <VStack align="start" spacing={2} flex={1}>
                                        <HStack spacing={3}>
                                            <Badge colorScheme="blue" fontSize="md" px={2} py={1}>
                                                {orden.loteAsignado || `OP-${orden.ordenId}`}
                                            </Badge>
                                            <Badge colorScheme="purple">
                                                {orden.areaNombre}
                                            </Badge>
                                            {orden.nodeLabel && (
                                                <Badge colorScheme="gray">
                                                    {orden.nodeLabel}
                                                </Badge>
                                            )}
                                        </HStack>

                                        <HStack spacing={2}>
                                            <FiPackage />
                                            <Text fontWeight="medium">{orden.productoNombre}</Text>
                                        </HStack>

                                        <HStack spacing={4} fontSize="sm" color="gray.600" flexWrap="wrap">
                                            <Text>Cantidad: {orden.cantidadProducir}</Text>
                                            <Divider orientation="vertical" h={4} />
                                            <HStack spacing={1}>
                                                <FiClock />
                                                <Text>Visible desde: {formatDate(orden.fechaVisible)}</Text>
                                            </HStack>
                                            <Divider orientation="vertical" h={4} />
                                            <Text>
                                                Fin planificada:{' '}
                                                {orden.fechaFinalPlanificada
                                                    ? formatDate(orden.fechaFinalPlanificada)
                                                    : 'Sin fecha planificada'}
                                            </Text>
                                        </HStack>
                                    </VStack>

                                    <VStack align="end" spacing={2}>
                                        <Button
                                            variant="outline"
                                            leftIcon={<FiFileText />}
                                            onClick={() => handleOpenObservacionesOrden(orden)}
                                        >
                                            Ver observaciones
                                        </Button>
                                        <Button
                                            colorScheme="green"
                                            leftIcon={<FiCheckCircle />}
                                            onClick={() => handleOpenModal(orden)}
                                            isDisabled={orden.areaId === -1}
                                        >
                                            {orden.areaId === -1 ? 'Se reporta al dispensar' : 'Reportar Completado'}
                                        </Button>
                                    </VStack>
                                </HStack>
                            </CardBody>
                        </Card>
                    ))}
                </VStack>
            )}

            {/* Paginacion */}
            {totalPages > 0 && (
                <BetterPagination
                    page={page}
                    size={size}
                    totalPages={totalPages}
                    loading={loading}
                    onPageChange={handlePageChange}
                    onSizeChange={handleSizeChange}
                />
            )}

            <Modal isOpen={isObsOrdenOpen} onClose={handleCloseObservacionesOrden} size="md" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Observaciones de la orden</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {ordenObservacionesVer && (
                            <VStack align="stretch" spacing={4}>
                                <Box>
                                    <Text fontWeight="bold" mb={1}>
                                        Orden
                                    </Text>
                                    <Text>
                                        {ordenObservacionesVer.loteAsignado || `OP-${ordenObservacionesVer.ordenId}`}
                                    </Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold" mb={1}>
                                        Producto
                                    </Text>
                                    <Text>{ordenObservacionesVer.productoNombre}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold" mb={2}>
                                        Observaciones
                                    </Text>
                                    <Box
                                        maxH="50vh"
                                        overflowY="auto"
                                        p={3}
                                        bg="gray.50"
                                        borderRadius="md"
                                        borderWidth="1px"
                                        borderColor="gray.200"
                                    >
                                        <Text whiteSpace="pre-wrap">
                                            {ordenObservacionesVer.ordenObservaciones?.trim()
                                                ? ordenObservacionesVer.ordenObservaciones
                                                : MSG_SIN_OBS_ORDEN}
                                        </Text>
                                    </Box>
                                </Box>
                            </VStack>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={handleCloseObservacionesOrden}>Cerrar</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Modal de confirmacion */}
            <Modal isOpen={isOpen} onClose={onClose} size="md">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Reportar Completado</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {selectedOrden && (
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
                                    <Text fontWeight="bold" mb={1}>Area</Text>
                                    <Text>{selectedOrden.areaNombre}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold" mb={1}>Observaciones (opcional)</Text>
                                    <Textarea
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        placeholder="Agregar observaciones..."
                                        maxLength={500}
                                        rows={3}
                                    />
                                    <Text fontSize="xs" color="gray.500" textAlign="right">
                                        {observaciones.length}/500
                                    </Text>
                                </Box>
                            </VStack>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose} isDisabled={submitting}>
                            Cancelar
                        </Button>
                        <Button
                            colorScheme="green"
                            onClick={handleReportarCompletado}
                            isLoading={submitting}
                            loadingText="Reportando..."
                        >
                            Confirmar Completado
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </VStack>
    );
}
