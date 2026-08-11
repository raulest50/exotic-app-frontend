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
import type { AjusteLoteOption, AjusteLotePageResponse } from "./types";
import { LuCheck, LuRepeat } from 'react-icons/lu';

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
    const toast = useAppToast();
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
        <Dialog.Root open={isOpen} size='xl' placement='center' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Ajuste de entrada por lote - {productoNombre}</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <Flex direction="column" gap={4}>
                                <Text fontSize="sm" color="app.textMuted">
                                    Este ajuste positivo ingresará <strong>{cantidadAjuste.toFixed(4)}</strong> unidades al lote seleccionado.
                                </Text>

                                {!selectedLote && (
                                    <Alert.Root status="warning" borderRadius="md">
                                        <Alert.Indicator />
                                        Debes elegir un lote existente antes de continuar.
                                    </Alert.Root>
                                )}

                                <Box borderWidth="1px" borderRadius="md" p={4}>
                                    <Flex justify="space-between" align="center" mb={3}>
                                        <Text fontWeight="bold">Lotes existentes del producto</Text>
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
                                                onClick={() => void fetchLotes(currentPage, size)}
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
                                                            <Table.ColumnHeader>Saldo actual en GENERAL</Table.ColumnHeader>
                                                            <Table.ColumnHeader>F. producción</Table.ColumnHeader>
                                                            <Table.ColumnHeader>F. vencimiento</Table.ColumnHeader>
                                                            <Table.ColumnHeader>Selección</Table.ColumnHeader>
                                                        </Table.Row>
                                                    </Table.Header>
                                                    <Table.Body>
                                                        {lotes.length === 0 ? (
                                                            <Table.Row>
                                                                <Table.Cell colSpan={5} textAlign="center" py={4}>
                                                                    Este producto no tiene lotes registrados.
                                                                </Table.Cell>
                                                            </Table.Row>
                                                        ) : (
                                                            lotes.map((lote) => {
                                                                const isSelected = lote.loteId === selectedLoteId;
                                                                return (
                                                                    <Table.Row key={lote.loteId} bg={isSelected ? "green.50" : undefined}>
                                                                        <Table.Cell>{lote.batchNumber}</Table.Cell>
                                                                        <Table.Cell>{lote.cantidadDisponible.toFixed(4)}</Table.Cell>
                                                                        <Table.Cell>{formatDate(lote.productionDate)}</Table.Cell>
                                                                        <Table.Cell>{formatDate(lote.expirationDate)}</Table.Cell>
                                                                        <Table.Cell>
                                                                            <Button
                                                                                size="sm"
                                                                                colorPalette={isSelected ? "green" : "teal"}
                                                                                onClick={() => setSelectedLoteId(lote.loteId)}>{isSelected ? <LuCheck /> : undefined}{isSelected ? "Seleccionado" : "Seleccionar"}</Button>
                                                                        </Table.Cell>
                                                                    </Table.Row>
                                                                );
                                                            })
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
                            </Flex>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="ghost" mr={3} onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                colorPalette="teal"
                                onClick={() => {
                                    if (!selectedLote) return;
                                    onAccept(selectedLote);
                                    onClose();
                                }}
                                disabled={!selectedLote}
                            >
                                Confirmar lote
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
