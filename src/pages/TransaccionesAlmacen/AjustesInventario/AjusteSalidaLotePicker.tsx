import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Flex,
    HStack,
    IconButton,
    NativeSelect,
    Spinner,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    Field,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";
import CustomDecimalInput from "../../../components/CustomDecimalInput/CustomDecimalInput";
import type { AjusteLoteAsignado, AjusteLoteOption, AjusteLotePageResponse } from "./types";
import { LuPlus, LuRepeat, LuTrash2 } from 'react-icons/lu';

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
    const toast = useAppToast();
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
        <Dialog.Root open={isOpen} size='xl' placement='center' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Ajuste de salida por lotes - {productoNombre}</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <Flex direction="column" gap={4}>
                                <Text fontSize="sm" color="app.textMuted">
                                    Cantidad de salida requerida: <strong>{cantidadRequerida.toFixed(4)}</strong> ·
                                    Asignada: <strong>{totalAsignado.toFixed(4)}</strong>
                                </Text>

                                {!canAccept && (
                                    <Alert.Root status="warning" borderRadius="md">
                                        <Alert.Indicator />
                                        La suma de cantidades por lote debe coincidir exactamente con la salida requerida.
                                    </Alert.Root>
                                )}

                                <Flex gap={4} direction={{ base: "column", lg: "row" }}>
                                    <Box flex="1" borderWidth="1px" borderRadius="md" p={4}>
                                        <Flex justify="space-between" align="center" mb={3}>
                                            <Text fontWeight="bold">Lotes disponibles en GENERAL</Text>
                                            <HStack gap={2}>
                                                <Field.Root width="auto" minW="120px">
                                                    <NativeSelect.Root>
                                                        <NativeSelect.Field
                                                            size="sm"
                                                            value={size}
                                                            onChange={(e) => setSize(Number(e.target.value))}>
                                                            <option value={5}>5 por página</option>
                                                            <option value={10}>10 por página</option>
                                                            <option value={20}>20 por página</option>
                                                        </NativeSelect.Field>
                                                        <NativeSelect.Indicator />
                                                    </NativeSelect.Root>
                                                </Field.Root>
                                                <IconButton
                                                    aria-label="Actualizar lotes"
                                                    size="sm"
                                                    colorPalette="blue"
                                                    onClick={handleRefresh}
                                                    loading={loading}><LuRepeat /></IconButton>
                                            </HStack>
                                        </Flex>

                                        {loading ? (
                                            <Flex minH="220px" align="center" justify="center">
                                                <Spinner size="lg" />
                                            </Flex>
                                        ) : (
                                            <>
                                                <Box overflowX="auto">
                                                    <Table.Root size="sm">
                                                        <Table.Header>
                                                            <Table.Row>
                                                                <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                                                <Table.ColumnHeader>Disponible</Table.ColumnHeader>
                                                                <Table.ColumnHeader>F. produccion</Table.ColumnHeader>
                                                                <Table.ColumnHeader>F. vencimiento</Table.ColumnHeader>
                                                                <Table.ColumnHeader>Acción</Table.ColumnHeader>
                                                            </Table.Row>
                                                        </Table.Header>
                                                        <Table.Body>
                                                            {lotesDisponibles.length === 0 ? (
                                                                <Table.Row>
                                                                    <Table.Cell colSpan={5} textAlign="center" py={4}>
                                                                        No hay lotes disponibles con saldo positivo.
                                                                    </Table.Cell>
                                                                </Table.Row>
                                                            ) : (
                                                                lotesDisponibles.map((lote) => (
                                                                    <Table.Row key={lote.loteId}>
                                                                        <Table.Cell>{lote.batchNumber}</Table.Cell>
                                                                        <Table.Cell>{lote.cantidadDisponible.toFixed(4)}</Table.Cell>
                                                                        <Table.Cell>{formatDate(lote.productionDate)}</Table.Cell>
                                                                        <Table.Cell>{formatDate(lote.expirationDate)}</Table.Cell>
                                                                        <Table.Cell>
                                                                            <IconButton
                                                                                aria-label="Agregar lote"
                                                                                size="sm"
                                                                                colorPalette="teal"
                                                                                onClick={() => handleAddLote(lote)}
                                                                                disabled={lotesSeleccionados.some((item) => item.loteId === lote.loteId)}><LuPlus /></IconButton>
                                                                        </Table.Cell>
                                                                    </Table.Row>
                                                                ))
                                                            )}
                                                        </Table.Body>
                                                    </Table.Root>
                                                </Box>

                                                {totalPages > 1 && (
                                                    <HStack justify="center" mt={4}>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => void fetchLotes(currentPage - 1, size)}
                                                            disabled={currentPage === 0}
                                                        >
                                                            Anterior
                                                        </Button>
                                                        <Text fontSize="sm">
                                                            Página {currentPage + 1} de {totalPages} ({totalElements} lotes)
                                                        </Text>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => void fetchLotes(currentPage + 1, size)}
                                                            disabled={currentPage >= totalPages - 1}
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
                                            <Text color="app.textSubtle" py={8} textAlign="center">
                                                Aún no has asignado lotes a esta salida.
                                            </Text>
                                        ) : (
                                            <Box overflowX="auto">
                                                <Table.Root size="sm">
                                                    <Table.Header>
                                                        <Table.Row>
                                                            <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                                            <Table.ColumnHeader>Disponible</Table.ColumnHeader>
                                                            <Table.ColumnHeader>Cantidad a salir</Table.ColumnHeader>
                                                            <Table.ColumnHeader>Acción</Table.ColumnHeader>
                                                        </Table.Row>
                                                    </Table.Header>
                                                    <Table.Body>
                                                        {lotesSeleccionados.map((lote) => (
                                                            <Table.Row key={lote.loteId}>
                                                                <Table.Cell>{lote.batchNumber}</Table.Cell>
                                                                <Table.Cell>{lote.cantidadDisponible.toFixed(4)}</Table.Cell>
                                                                <Table.Cell>
                                                                    <CustomDecimalInput
                                                                        value={lote.cantidadAsignada}
                                                                        onChange={(value) => handleCantidadChange(lote.loteId, value)}
                                                                        min={0}
                                                                        maxDecimals={4}
                                                                        size="sm"
                                                                        width="120px"
                                                                        placeholder="0.0000"
                                                                    />
                                                                </Table.Cell>
                                                                <Table.Cell>
                                                                    <IconButton
                                                                        aria-label="Remover lote"
                                                                        size="sm"
                                                                        colorPalette="red"
                                                                        onClick={() => handleRemoveLote(lote.loteId)}><LuTrash2 /></IconButton>
                                                                </Table.Cell>
                                                            </Table.Row>
                                                        ))}
                                                    </Table.Body>
                                                </Table.Root>
                                            </Box>
                                        )}
                                    </Box>
                                </Flex>
                            </Flex>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="ghost" mr={3} onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                colorPalette="teal"
                                onClick={() => {
                                    onAccept(lotesSeleccionados);
                                    onClose();
                                }}
                                disabled={!canAccept}
                            >
                                Confirmar lotes
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
