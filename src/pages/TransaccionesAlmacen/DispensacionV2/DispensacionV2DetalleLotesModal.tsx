import {
    Steps,
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    IconButton,
    NativeSelect,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { useEffect, useMemo, useState } from "react";
import CustomDecimalInput from "../../../components/CustomDecimalInput/CustomDecimalInput";
import { getLotesDisponiblesDispensacionV2 } from "./DispensacionV2Service";
import type {
    DispensacionV2LoteDisponibleDTO,
    DispensacionV2LoteOrigenDTO,
    DispensacionV2OrdenDTO,
} from "./DispensacionV2Types";
import { formatDispensacionV2Number } from "./DispensacionV2Types";
import { LuTrash2 } from 'react-icons/lu';

interface DispensacionV2DetalleLotesModalProps {
    orden: DispensacionV2OrdenDTO | null;
    onClose: () => void;
    onSave: (orden: DispensacionV2OrdenDTO) => void;
}

function formatDate(value?: string | null): string {
    if (!value) return "N/A";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("es-CO");
}

function toLoteOrigen(lote: DispensacionV2LoteDisponibleDTO): DispensacionV2LoteOrigenDTO {
    return {
        loteId: lote.loteId,
        batchNumber: lote.batchNumber,
        productionDate: lote.productionDate ?? null,
        expirationDate: lote.expirationDate ?? null,
        cantidadDisponible: lote.cantidadDisponible,
        cantidadAsignada: 0,
        sugerido: false,
    };
}

export default function DispensacionV2DetalleLotesModal({
    orden,
    onClose,
    onSave,
}: DispensacionV2DetalleLotesModalProps) {
    const [draft, setDraft] = useState<DispensacionV2OrdenDTO | null>(orden);
    const [loadingProductoId, setLoadingProductoId] = useState<string | null>(null);
    const [lotesDisponibles, setLotesDisponibles] = useState<Record<string, DispensacionV2LoteDisponibleDTO[]>>({});
    const [selectedLoteId, setSelectedLoteId] = useState<Record<string, string>>({});
    const [dirtyProductoIds, setDirtyProductoIds] = useState<Set<string>>(new Set());
    const toast = useAppToast();

    useEffect(() => {
        setDraft(orden);
        setLotesDisponibles({});
        setSelectedLoteId({});
        setDirtyProductoIds(new Set());
    }, [orden]);

    const isOpen = orden !== null;
    const materialesEditables = useMemo(
        () => draft?.materiales.filter((material) => material.checked && material.inventareable) ?? [],
        [draft],
    );

    const updateLotes = (productoId: string, updater: (lotes: DispensacionV2LoteOrigenDTO[]) => DispensacionV2LoteOrigenDTO[]) => {
        setDirtyProductoIds((current) => new Set(current).add(productoId));
        setDraft((current) => {
            if (!current) return current;
            return {
                ...current,
                materiales: current.materiales.map((material) => {
                    if (material.productoId !== productoId) return material;
                    return { ...material, lotesOrigen: updater(material.lotesOrigen ?? []) };
                }),
            };
        });
    };

    const handleCantidadLote = (productoId: string, loteId: number, value: number) => {
        updateLotes(productoId, (lotes) => lotes.map((lote) => {
            if (lote.loteId !== loteId) return lote;
            return { ...lote, cantidadAsignada: Math.min(value, lote.cantidadDisponible) };
        }));
    };

    const handleRemoveLote = (productoId: string, loteId: number) => {
        updateLotes(productoId, (lotes) => lotes.filter((lote) => lote.loteId !== loteId));
    };

    const handleLoadLotes = async (productoId: string) => {
        setLoadingProductoId(productoId);
        try {
            const response = await getLotesDisponiblesDispensacionV2(productoId, 0, 50);
            setLotesDisponibles((current) => ({
                ...current,
                [productoId]: response.lotesDisponibles,
            }));
        } catch {
            toast({
                title: "Error al cargar lotes",
                description: "No fue posible cargar los lotes disponibles para este material.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoadingProductoId(null);
        }
    };

    const handleAddLote = (productoId: string) => {
        const loteId = Number(selectedLoteId[productoId]);
        if (!Number.isFinite(loteId)) return;
        const lote = lotesDisponibles[productoId]?.find((item) => item.loteId === loteId);
        if (!lote) return;
        updateLotes(productoId, (lotes) => {
            if (lotes.some((item) => item.loteId === loteId)) return lotes;
            return [...lotes, toLoteOrigen(lote)];
        });
        setSelectedLoteId((current) => ({ ...current, [productoId]: "" }));
    };

    const handleSave = () => {
        if (!draft) return;
        const nextOrden = {
            ...draft,
            materiales: draft.materiales.map((material) => {
                if (!dirtyProductoIds.has(material.productoId)) return material;
                if (!material.checked || !material.inventareable) return material;
                const cantidadADispensar = (material.lotesOrigen ?? [])
                    .reduce((sum, lote) => sum + lote.cantidadAsignada, 0);
                return { ...material, cantidadADispensar };
            }),
        };
        onSave(nextOrden);
    };

    return (
        <Dialog.Root open={isOpen} size='xl' placement='center' scrollBehavior="inside" onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Detalle de lotes origen</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body pb={6}>
                            {draft ? (
                                <VStack align="stretch" gap={5}>
                                    <Box>
                                        <Heading size="sm">
                                            OP {draft.ordenProduccionId} - {draft.loteAsignado ?? "Sin lote"}
                                        </Heading>
                                        <Text fontSize="sm" color="app.textMuted">
                                            {draft.productoTerminadoNombre} ({draft.productoTerminadoId})
                                        </Text>
                                    </Box>

                                    {materialesEditables.length === 0 ? (
                                        <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
                                            <Text fontSize="sm" color="app.textMuted">
                                                Esta OP no tiene materiales inventariables marcados para dispensar.
                                            </Text>
                                        </Box>
                                    ) : null}

                                    {materialesEditables.map((material) => {
                                        const disponibles = lotesDisponibles[material.productoId] ?? [];
                                        const lotesSeleccionados = material.lotesOrigen ?? [];
                                        const selectedIds = new Set(lotesSeleccionados.map((lote) => lote.loteId));
                                        const options = disponibles.filter((lote) => !selectedIds.has(lote.loteId));
                                        const totalLotes = lotesSeleccionados.reduce((sum, lote) => sum + lote.cantidadAsignada, 0);

                                        return (
                                            <Box key={material.productoId} borderWidth="1px" borderRadius="md" p={4}>
                                                <Flex justify="space-between" align="start" gap={3} wrap="wrap" mb={3}>
                                                    <Box>
                                                        <Heading size="xs">{material.productoNombre}</Heading>
                                                        <Text fontSize="xs" color="app.textMuted">{material.productoId}</Text>
                                                    </Box>
                                                    <Flex gap={2} wrap="wrap">
                                                        <Badge colorPalette="purple">
                                                            Objetivo {formatDispensacionV2Number(material.cantidadADispensar)} {material.tipoUnidades}
                                                        </Badge>
                                                        <Badge colorPalette={Math.abs(totalLotes - material.cantidadADispensar) > 0.01 ? "orange" : "green"}>
                                                            Lotes {formatDispensacionV2Number(totalLotes)} {material.tipoUnidades}
                                                        </Badge>
                                                    </Flex>
                                                </Flex>

                                                <Table.ScrollArea>
                                                    <Table.Root size="sm">
                                                        <Table.Header>
                                                            <Table.Row>
                                                                <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                                                <Table.ColumnHeader>Vence</Table.ColumnHeader>
                                                                <Table.ColumnHeader textAlign='end'>Disponible</Table.ColumnHeader>
                                                                <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                                                                <Table.ColumnHeader textAlign="center">Acción</Table.ColumnHeader>
                                                            </Table.Row>
                                                        </Table.Header>
                                                        <Table.Body>
                                                            {lotesSeleccionados.map((lote) => (
                                                                <Table.Row key={lote.loteId}>
                                                                    <Table.Cell>
                                                                        <Text fontSize="sm">{lote.batchNumber}</Text>
                                                                        <Badge size="sm" colorPalette={lote.sugerido ? "teal" : "gray"}>
                                                                            {lote.sugerido ? "Sugerido" : "Manual"}
                                                                        </Badge>
                                                                    </Table.Cell>
                                                                    <Table.Cell>{formatDate(lote.expirationDate)}</Table.Cell>
                                                                    <Table.Cell textAlign='end'>{formatDispensacionV2Number(lote.cantidadDisponible)}</Table.Cell>
                                                                    <Table.Cell textAlign='end'>
                                                                        <Flex justify="end">
                                                                            <CustomDecimalInput
                                                                                value={lote.cantidadAsignada}
                                                                                onChange={(value) => handleCantidadLote(material.productoId, lote.loteId, value)}
                                                                                min={0}
                                                                                size="sm"
                                                                                width="110px"
                                                                                maxDecimals={4}
                                                                            />
                                                                        </Flex>
                                                                    </Table.Cell>
                                                                    <Table.Cell>
                                                                        <Flex justify="center">
                                                                            <IconButton
                                                                                aria-label="Quitar lote"
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                colorPalette="red"
                                                                                onClick={() => handleRemoveLote(material.productoId, lote.loteId)}><LuTrash2 /></IconButton>
                                                                        </Flex>
                                                                    </Table.Cell>
                                                                </Table.Row>
                                                            ))}
                                                            {lotesSeleccionados.length === 0 ? (
                                                                <Table.Row>
                                                                    <Table.Cell colSpan={5} textAlign="center" color="app.textMuted">
                                                                        Sin lotes origen seleccionados.
                                                                    </Table.Cell>
                                                                </Table.Row>
                                                            ) : null}
                                                        </Table.Body>
                                                    </Table.Root>
                                                </Table.ScrollArea>

                                                <Flex mt={3} gap={2} wrap="wrap" align="center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleLoadLotes(material.productoId)}
                                                        disabled={loadingProductoId === material.productoId}
                                                    >
                                                        {loadingProductoId === material.productoId ? <Spinner size="xs" mr={2} /> : null}
                                                        Cargar lotes disponibles
                                                    </Button>
                                                    {disponibles.length > 0 ? (
                                                        <>
                                                            <NativeSelect.Root>
                                                                <NativeSelect.Field
                                                                    size="sm"
                                                                    maxW="360px"
                                                                    placeholder="Seleccione lote para agregar"
                                                                    value={selectedLoteId[material.productoId] ?? ""}
                                                                    onValueChange={(event) => setSelectedLoteId((current) => ({
                                                                        ...current,
                                                                        [material.productoId]: event.target.value,
                                                                    }))}>
                                                                    {options.map((lote) => (
                                                                        <option key={lote.loteId} value={lote.loteId}>
                                                                            {lote.batchNumber} - disp. {formatDispensacionV2Number(lote.cantidadDisponible)}
                                                                        </option>
                                                                    ))}
                                                                </NativeSelect.Field>
                                                                <NativeSelect.Indicator />
                                                            </NativeSelect.Root>
                                                            <Button
                                                                size="sm"
                                                                colorPalette="teal"
                                                                onClick={() => handleAddLote(material.productoId)}
                                                                disabled={!selectedLoteId[material.productoId]}
                                                            >
                                                                Agregar lote
                                                            </Button>
                                                        </>
                                                    ) : null}
                                                </Flex>
                                            </Box>
                                        );
                                    })}
                                </VStack>
                            ) : null}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="ghost" mr={3} onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button colorPalette="teal" onClick={handleSave}>
                                Guardar detalle
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
