import {
    Badge,
    Box,
    Button,
    Checkbox,
    Flex,
    Heading,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from "@chakra-ui/react";
import type {
    MpsSemanalItemDTO,
    MpsSemanalLotePlanificadoDTO,
} from "../../Produccion/ProgProdSemanalTab/MpsSemanalService";
import type { MpsReadonlyItemContext } from "../../Produccion/ProgProdSemanalTab/MpsReadonlyReviewPanel";
import { formatSemanaMpsDisplayDate } from "../../Produccion/ProgProdSemanalTab/semanaMps.utils";
import type { AreaOperativaDispensacionV2 } from "./DispensacionV2Step1SelectArea";

export interface DispensacionV2MpsItemSeleccionado {
    item: MpsSemanalItemDTO;
    context: MpsReadonlyItemContext;
}

export interface DispensacionV2OrdenSeleccionada {
    ordenProduccionId: number;
    mpsItemId: number;
    mpsLotePlanificadoId: number;
    mpsLoteOrdinal: number;
    loteAsignado: string | null;
    cantidadPlanificada: number;
    productoId: string | null;
    productoNombre: string;
    categoriaNombre: string | null;
    weekStartDate: string;
    weekEndDate: string;
    semanaMpsCodigo: string | null;
    areaId: number;
    areaNombre: string;
    fechaEntregaPlanificada: string;
}

interface DispensacionV2LotesOrdenModalProps {
    selectedItem: DispensacionV2MpsItemSeleccionado | null;
    selectedOrdenes: DispensacionV2OrdenSeleccionada[];
    selectedArea: AreaOperativaDispensacionV2;
    weekStartDate: string;
    weekEndDate: string;
    semanaMpsCodigo: string | null;
    onToggleOrden: (orden: DispensacionV2OrdenSeleccionada) => void;
    onToggleOrdenes: (ordenes: DispensacionV2OrdenSeleccionada[], shouldSelect: boolean) => void;
    onClose: () => void;
}

function formatNumber(value: number | null | undefined): string {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return safeValue.toLocaleString("es-CO", {
        minimumFractionDigits: safeValue % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function estadoLoteLabel(estado: MpsSemanalLotePlanificadoDTO["estado"]): string {
    switch (estado) {
        case "ODP_GENERADA":
            return "ODP generada";
        case "PENDIENTE_ODP":
            return "Pendiente ODP";
        case "CANCELADO":
            return "Cancelado";
        default:
            return estado ?? "-";
    }
}

function estadoLoteColor(estado: MpsSemanalLotePlanificadoDTO["estado"]): string {
    switch (estado) {
        case "ODP_GENERADA":
            return "green";
        case "PENDIENTE_ODP":
            return "yellow";
        case "CANCELADO":
            return "red";
        default:
            return "gray";
    }
}

export default function DispensacionV2LotesOrdenModal({
    selectedItem,
    selectedOrdenes,
    selectedArea,
    weekStartDate,
    weekEndDate,
    semanaMpsCodigo,
    onToggleOrden,
    onToggleOrdenes,
    onClose,
}: DispensacionV2LotesOrdenModalProps) {
    const isOpen = selectedItem !== null;
    const item = selectedItem?.item ?? null;
    const context = selectedItem?.context ?? null;
    const lotes = item?.lotesPlanificados ?? [];
    const selectedOrdenIds = new Set(selectedOrdenes.map((orden) => orden.ordenProduccionId));

    const buildOrdenSeleccionada = (lote: MpsSemanalLotePlanificadoDTO): DispensacionV2OrdenSeleccionada | null => {
        if (!item || !lote.ordenProduccionId) {
            return null;
        }

        return {
            ordenProduccionId: lote.ordenProduccionId,
            mpsItemId: item.id,
            mpsLotePlanificadoId: lote.id,
            mpsLoteOrdinal: lote.loteOrdinal,
            loteAsignado: lote.loteAsignado,
            cantidadPlanificada: lote.cantidadPlanificada,
            productoId: item.terminadoId,
            productoNombre: item.terminadoNombre,
            categoriaNombre: item.categoriaNombre,
            weekStartDate,
            weekEndDate,
            semanaMpsCodigo,
            areaId: selectedArea.areaId,
            areaNombre: selectedArea.nombre,
            fechaEntregaPlanificada: context?.date ?? item.fechaFinalPlanificada,
        };
    };

    const selectableOrdenes = lotes
        .map(buildOrdenSeleccionada)
        .filter((orden): orden is DispensacionV2OrdenSeleccionada => orden !== null);
    const selectedOrdenesInCard = selectableOrdenes.filter((orden) => selectedOrdenIds.has(orden.ordenProduccionId));
    const allCardOrdenesSelected = selectableOrdenes.length > 0 && selectedOrdenesInCard.length === selectableOrdenes.length;
    const someCardOrdenesSelected = selectedOrdenesInCard.length > 0 && !allCardOrdenesSelected;

    const handleToggle = (lote: MpsSemanalLotePlanificadoDTO) => {
        const orden = buildOrdenSeleccionada(lote);
        if (orden) {
            onToggleOrden(orden);
        }
    };

    const handleToggleAll = () => {
        onToggleOrdenes(selectableOrdenes, !allCardOrdenesSelected);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Lotes del card MPS</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    {item && context && (
                        <VStack align="stretch" spacing={4}>
                            <Box>
                                <Heading size="sm">{item.terminadoNombre}</Heading>
                                <Text fontSize="sm" color="gray.600">
                                    {item.terminadoId} - {context.dayLabel} {formatSemanaMpsDisplayDate(context.date)}
                                </Text>
                                <Flex mt={2} gap={2} wrap="wrap">
                                    <Badge colorScheme="teal">{formatNumber(item.numeroLotes)} lotes</Badge>
                                    <Badge colorScheme="purple">{formatNumber(item.cantidadTotal)} und</Badge>
                                    <Badge colorScheme="gray">{selectedArea.nombre}</Badge>
                                </Flex>
                            </Box>

                            {lotes.length === 0 ? (
                                <Box p={4} bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
                                    <Text color="orange.700" fontSize="sm">
                                        Este card no tiene lotes disponibles para seleccionar.
                                    </Text>
                                </Box>
                            ) : (
                                <TableContainer>
                                    <Table size="sm" variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Lote planificado</Th>
                                                <Th>OP</Th>
                                                <Th>Lote real</Th>
                                                <Th>Producto</Th>
                                                <Th isNumeric>Cantidad</Th>
                                                <Th>Estado</Th>
                                                <Th textAlign="center">
                                                    <Checkbox
                                                        isChecked={allCardOrdenesSelected}
                                                        isIndeterminate={someCardOrdenesSelected}
                                                        isDisabled={selectableOrdenes.length === 0}
                                                        onChange={handleToggleAll}
                                                    >
                                                        Seleccionar
                                                    </Checkbox>
                                                </Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {lotes.map((lote) => {
                                                const isSelected = lote.ordenProduccionId != null && selectedOrdenIds.has(lote.ordenProduccionId);
                                                const isSelectable = Boolean(lote.ordenProduccionId);
                                                return (
                                                    <Tr
                                                        key={lote.id}
                                                        bg={isSelected ? "app.rowSelectedTeal" : undefined}
                                                        opacity={isSelectable ? 1 : 0.65}
                                                    >
                                                        <Td>
                                                            Lote {lote.loteOrdinal}
                                                            <Text fontSize="xs" color="gray.500">#{lote.id}</Text>
                                                        </Td>
                                                        <Td>{lote.ordenProduccionId ?? "-"}</Td>
                                                        <Td>{lote.loteAsignado ?? "-"}</Td>
                                                        <Td>
                                                            <Text fontSize="sm">{item.terminadoNombre}</Text>
                                                            <Text fontSize="xs" color="gray.500">{item.terminadoId}</Text>
                                                        </Td>
                                                        <Td isNumeric>{formatNumber(lote.cantidadPlanificada)}</Td>
                                                        <Td>
                                                            <Badge colorScheme={estadoLoteColor(lote.estado)}>
                                                                {estadoLoteLabel(lote.estado)}
                                                            </Badge>
                                                        </Td>
                                                        <Td>
                                                            <Flex justify="center">
                                                                <Checkbox
                                                                    colorScheme="teal"
                                                                    isChecked={isSelected}
                                                                    isDisabled={!isSelectable}
                                                                    onChange={() => handleToggle(lote)}
                                                                >
                                                                    {isSelected ? "Seleccionada" : "Seleccionar OP"}
                                                                </Checkbox>
                                                            </Flex>
                                                        </Td>
                                                    </Tr>
                                                );
                                            })}
                                        </Tbody>
                                    </Table>
                                </TableContainer>
                            )}
                        </VStack>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Flex justify="space-between" align="center" w="full" gap={3} wrap="wrap">
                        <Text fontSize="sm" color="gray.600">
                            {selectedOrdenes.length} OPs seleccionadas
                        </Text>
                        <Button variant="outline" onClick={onClose}>
                            Cerrar
                        </Button>
                    </Flex>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
