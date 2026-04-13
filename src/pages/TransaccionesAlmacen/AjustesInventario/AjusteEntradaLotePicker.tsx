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
import { CheckIcon, RepeatIcon } from "@chakra-ui/icons";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import type { AjusteLoteOption, AjusteLotePageResponse } from "./types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAccept: (lote: AjusteLoteOption) => void;
    productoId: string;
    productoNombre: string;
    cantidadAjuste: number;
    initialLoteId?: number | null;
}

export default function AjusteEntradaLotePicker({
    isOpen,
    onClose,
    onAccept,
    productoId,
    productoNombre,
    cantidadAjuste,
    initialLoteId,
}: Props) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [lotes, setLotes] = useState<AjusteLoteOption[]>([]);
    const [selectedLoteId, setSelectedLoteId] = useState<number | null>(initialLoteId ?? null);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [size, setSize] = useState(10);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedLoteId(initialLoteId ?? null);
        }
    }, [initialLoteId, isOpen]);

    useEffect(() => {
        if (isOpen && productoId) {
            void fetchLotes(0, size);
        }
    }, [isOpen, productoId, size]);

    const fetchLotes = async (page: number, pageSize: number) => {
        setLoading(true);
        try {
            const response = await axios.get<AjusteLotePageResponse>(endpoints.ajustes_lotes_existentes, {
                params: { productoId, page, size: pageSize },
            });
            setLotes(response.data.lotesDisponibles);
            setCurrentPage(response.data.currentPage);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (error) {
            toast({
                title: "Error cargando lotes",
                description: "No fue posible consultar los lotes existentes para este producto.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const selectedLote = lotes.find((item) => item.loteId === selectedLoteId) ?? null;

    const formatDate = (value?: string | null) => {
        if (!value) return "N/A";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString("es-CO");
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Ajuste de entrada por lote - {productoNombre}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Flex direction="column" gap={4}>
                        <Text fontSize="sm" color="gray.600">
                            Este ajuste positivo ingresará <strong>{cantidadAjuste.toFixed(4)}</strong> unidades al lote seleccionado.
                        </Text>

                        {!selectedLote && (
                            <Alert status="warning" borderRadius="md">
                                <AlertIcon />
                                Debes elegir un lote existente antes de continuar.
                            </Alert>
                        )}

                        <Box borderWidth="1px" borderRadius="md" p={4}>
                            <Flex justify="space-between" align="center" mb={3}>
                                <Text fontWeight="bold">Lotes existentes del producto</Text>
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
                                        onClick={() => void fetchLotes(currentPage, size)}
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
                                                    <Th>Saldo actual en GENERAL</Th>
                                                    <Th>F. producción</Th>
                                                    <Th>F. vencimiento</Th>
                                                    <Th>Selección</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {lotes.length === 0 ? (
                                                    <Tr>
                                                        <Td colSpan={5} textAlign="center" py={4}>
                                                            Este producto no tiene lotes registrados.
                                                        </Td>
                                                    </Tr>
                                                ) : (
                                                    lotes.map((lote) => {
                                                        const isSelected = lote.loteId === selectedLoteId;
                                                        return (
                                                            <Tr key={lote.loteId} bg={isSelected ? "green.50" : undefined}>
                                                                <Td>{lote.batchNumber}</Td>
                                                                <Td>{lote.cantidadDisponible.toFixed(4)}</Td>
                                                                <Td>{formatDate(lote.productionDate)}</Td>
                                                                <Td>{formatDate(lote.expirationDate)}</Td>
                                                                <Td>
                                                                    <Button
                                                                        size="sm"
                                                                        colorScheme={isSelected ? "green" : "teal"}
                                                                        leftIcon={isSelected ? <CheckIcon /> : undefined}
                                                                        onClick={() => setSelectedLoteId(lote.loteId)}
                                                                    >
                                                                        {isSelected ? "Seleccionado" : "Seleccionar"}
                                                                    </Button>
                                                                </Td>
                                                            </Tr>
                                                        );
                                                    })
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
                    </Flex>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        colorScheme="teal"
                        onClick={() => {
                            if (!selectedLote) return;
                            onAccept(selectedLote);
                            onClose();
                        }}
                        isDisabled={!selectedLote}
                    >
                        Confirmar lote
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
