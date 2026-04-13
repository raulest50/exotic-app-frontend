import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Flex,
    FormControl,
    HStack,
    IconButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
    Spinner,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon, RepeatIcon } from "@chakra-ui/icons";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import CustomDecimalInput from "../../../components/CustomDecimalInput/CustomDecimalInput";
import type { AjusteLoteAsignado, AjusteLoteOption, AjusteLotePageResponse } from "./types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAccept: (lotes: AjusteLoteAsignado[]) => void;
    productoId: string;
    productoNombre: string;
    cantidadRequerida: number;
    initialSelection?: AjusteLoteAsignado[];
}

export default function AjusteSalidaLotePicker({
    isOpen,
    onClose,
    onAccept,
    productoId,
    productoNombre,
    cantidadRequerida,
    initialSelection = [],
}: Props) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [lotesDisponibles, setLotesDisponibles] = useState<AjusteLoteOption[]>([]);
    const [lotesSeleccionados, setLotesSeleccionados] = useState<AjusteLoteAsignado[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [size, setSize] = useState(10);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLotesSeleccionados(initialSelection);
        }
    }, [initialSelection, isOpen]);

    useEffect(() => {
        if (isOpen && productoId) {
            void fetchLotes(0, size);
        }
    }, [isOpen, productoId, size]);

    const fetchLotes = async (page: number, pageSize: number) => {
        setLoading(true);
        try {
            const response = await axios.get<AjusteLotePageResponse>(endpoints.ajustes_lotes_disponibles, {
                params: { productoId, page, size: pageSize },
            });
            setLotesDisponibles(response.data.lotesDisponibles);
            setCurrentPage(response.data.currentPage);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (error) {
            toast({
                title: "Error cargando lotes",
                description: "No fue posible consultar los lotes disponibles para este ajuste.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        void fetchLotes(currentPage, size);
    };

    const handleAddLote = (lote: AjusteLoteOption) => {
        setLotesSeleccionados((prev) => {
            if (prev.some((item) => item.loteId === lote.loteId)) {
                return prev;
            }

            return [
                ...prev,
                {
                    ...lote,
                    cantidadAsignada: 0,
                },
            ];
        });
    };

    const handleRemoveLote = (loteId: number) => {
        setLotesSeleccionados((prev) => prev.filter((item) => item.loteId !== loteId));
    };

    const handleCantidadChange = (loteId: number, cantidadAsignada: number) => {
        setLotesSeleccionados((prev) =>
            prev.map((item) =>
                item.loteId === loteId
                    ? { ...item, cantidadAsignada: Math.min(cantidadAsignada, item.cantidadDisponible) }
                    : item
            )
        );
    };

    const totalAsignado = lotesSeleccionados.reduce((acc, lote) => acc + lote.cantidadAsignada, 0);
    const diferencia = Math.abs(totalAsignado - cantidadRequerida);
    const asignacionExacta = diferencia <= 0.0001 && lotesSeleccionados.length > 0;
    const excedeDisponible = lotesSeleccionados.some((lote) => lote.cantidadAsignada - lote.cantidadDisponible > 0.0001);

    const formatDate = (value?: string | null) => {
        if (!value) return "N/A";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString("es-CO");
    };

    const canAccept = asignacionExacta && !excedeDisponible;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Ajuste de salida por lotes - {productoNombre}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Flex direction="column" gap={4}>
                        <Text fontSize="sm" color="gray.600">
                            Cantidad de salida requerida: <strong>{cantidadRequerida.toFixed(4)}</strong> ·
                            Asignada: <strong>{totalAsignado.toFixed(4)}</strong>
                        </Text>

                        {!canAccept && (
                            <Alert status="warning" borderRadius="md">
                                <AlertIcon />
                                La suma de cantidades por lote debe coincidir exactamente con la salida requerida.
                            </Alert>
                        )}

                        <Flex gap={4} direction={{ base: "column", lg: "row" }}>
                            <Box flex="1" borderWidth="1px" borderRadius="md" p={4}>
                                <Flex justify="space-between" align="center" mb={3}>
                                    <Text fontWeight="bold">Lotes disponibles en GENERAL</Text>
                                    <HStack spacing={2}>
                                        <FormControl width="auto" minW="120px">
                                            <Select size="sm" value={size} onChange={(e) => setSize(Number(e.target.value))}>
                                                <option value={5}>5 por página</option>
                                                <option value={10}>10 por página</option>
                                                <option value={20}>20 por página</option>
                                            </Select>
                                        </FormControl>
                                        <IconButton
                                            aria-label="Actualizar lotes"
                                            icon={<RepeatIcon />}
                                            size="sm"
                                            colorScheme="blue"
                                            onClick={handleRefresh}
                                            isLoading={loading}
                                        />
                                    </HStack>
                                </Flex>

                                {loading ? (
                                    <Flex minH="220px" align="center" justify="center">
                                        <Spinner size="lg" />
                                    </Flex>
                                ) : (
                                    <>
                                        <Box overflowX="auto">
                                            <Table size="sm">
                                                <Thead>
                                                    <Tr>
                                                        <Th>Lote</Th>
                                                        <Th>Disponible</Th>
                                                        <Th>F. produccion</Th>
                                                        <Th>F. vencimiento</Th>
                                                        <Th>Acción</Th>
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {lotesDisponibles.length === 0 ? (
                                                        <Tr>
                                                            <Td colSpan={5} textAlign="center" py={4}>
                                                                No hay lotes disponibles con saldo positivo.
                                                            </Td>
                                                        </Tr>
                                                    ) : (
                                                        lotesDisponibles.map((lote) => (
                                                            <Tr key={lote.loteId}>
                                                                <Td>{lote.batchNumber}</Td>
                                                                <Td>{lote.cantidadDisponible.toFixed(4)}</Td>
                                                                <Td>{formatDate(lote.productionDate)}</Td>
                                                                <Td>{formatDate(lote.expirationDate)}</Td>
                                                                <Td>
                                                                    <IconButton
                                                                        aria-label="Agregar lote"
                                                                        icon={<AddIcon />}
                                                                        size="sm"
                                                                        colorScheme="teal"
                                                                        onClick={() => handleAddLote(lote)}
                                                                        isDisabled={lotesSeleccionados.some((item) => item.loteId === lote.loteId)}
                                                                    />
                                                                </Td>
                                                            </Tr>
                                                        ))
                                                    )}
                                                </Tbody>
                                            </Table>
                                        </Box>

                                        {totalPages > 1 && (
                                            <HStack justify="center" mt={4}>
                                                <Button
                                                    size="sm"
                                                    onClick={() => void fetchLotes(currentPage - 1, size)}
                                                    isDisabled={currentPage === 0}
                                                >
                                                    Anterior
                                                </Button>
                                                <Text fontSize="sm">
                                                    Página {currentPage + 1} de {totalPages} ({totalElements} lotes)
                                                </Text>
                                                <Button
                                                    size="sm"
                                                    onClick={() => void fetchLotes(currentPage + 1, size)}
                                                    isDisabled={currentPage >= totalPages - 1}
                                                >
                                                    Siguiente
                                                </Button>
                                            </HStack>
                                        )}
                                    </>
                                )}
                            </Box>

                            <Box flex="1" borderWidth="1px" borderRadius="md" p={4}>
                                <Text fontWeight="bold" mb={3}>Lotes asignados</Text>
                                {lotesSeleccionados.length === 0 ? (
                                    <Text color="gray.500" py={8} textAlign="center">
                                        Aún no has asignado lotes a esta salida.
                                    </Text>
                                ) : (
                                    <Box overflowX="auto">
                                        <Table size="sm">
                                            <Thead>
                                                <Tr>
                                                    <Th>Lote</Th>
                                                    <Th>Disponible</Th>
                                                    <Th>Cantidad a salir</Th>
                                                    <Th>Acción</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {lotesSeleccionados.map((lote) => (
                                                    <Tr key={lote.loteId}>
                                                        <Td>{lote.batchNumber}</Td>
                                                        <Td>{lote.cantidadDisponible.toFixed(4)}</Td>
                                                        <Td>
                                                            <CustomDecimalInput
                                                                value={lote.cantidadAsignada}
                                                                onChange={(value) => handleCantidadChange(lote.loteId, value)}
                                                                min={0}
                                                                maxDecimals={4}
                                                                size="sm"
                                                                width="120px"
                                                                placeholder="0.0000"
                                                            />
                                                        </Td>
                                                        <Td>
                                                            <IconButton
                                                                aria-label="Remover lote"
                                                                icon={<DeleteIcon />}
                                                                size="sm"
                                                                colorScheme="red"
                                                                onClick={() => handleRemoveLote(lote.loteId)}
                                                            />
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    </Box>
                                )}
                            </Box>
                        </Flex>
                    </Flex>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        colorScheme="teal"
                        onClick={() => {
                            onAccept(lotesSeleccionados);
                            onClose();
                        }}
                        isDisabled={!canAccept}
                    >
                        Confirmar lotes
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
