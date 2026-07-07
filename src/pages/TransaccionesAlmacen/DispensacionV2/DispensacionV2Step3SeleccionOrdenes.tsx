import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Checkbox,
    Flex,
    Heading,
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
import { useMemo } from "react";
import type {
    MpsSemanalLotePlanificadoDTO,
} from "../../Produccion/ProgProdSemanalTab/MpsSemanalService";
import { formatSemanaMpsDisplayDate } from "../../Produccion/ProgProdSemanalTab/semanaMps.utils";
import type { AreaOperativaDispensacionV2 } from "./DispensacionV2Step1SelectArea";
import type { DispensacionV2MpsItemSeleccionado, DispensacionV2OrdenSeleccionada } from "./DispensacionV2Types";

interface DispensacionV2Step3SeleccionOrdenesProps {
    selectedItem: DispensacionV2MpsItemSeleccionado;
    selectedOrdenes: DispensacionV2OrdenSeleccionada[];
    selectedArea: AreaOperativaDispensacionV2;
    onToggleOrden: (orden: DispensacionV2OrdenSeleccionada) => void;
    onToggleOrdenes: (ordenes: DispensacionV2OrdenSeleccionada[], shouldSelect: boolean) => void;
    onBack: () => void;
    onNext: () => void;
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

export default function DispensacionV2Step3SeleccionOrdenes({
    selectedItem,
    selectedOrdenes,
    selectedArea,
    onToggleOrden,
    onToggleOrdenes,
    onBack,
    onNext,
}: DispensacionV2Step3SeleccionOrdenesProps) {
    const item = selectedItem.item;
    const context = selectedItem.context;
    const lotes = item.lotesPlanificados ?? [];
    const selectedOrdenIds = useMemo(
        () => new Set(selectedOrdenes.map((orden) => orden.ordenProduccionId)),
        [selectedOrdenes],
    );

    const selectableOrdenes = useMemo(() => lotes
        .map((lote): DispensacionV2OrdenSeleccionada | null => {
            if (!lote.ordenProduccionId) {
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
                weekStartDate: selectedItem.weekStartDate,
                weekEndDate: selectedItem.weekEndDate,
                semanaMpsCodigo: selectedItem.semanaMpsCodigo,
                areaId: selectedArea.areaId,
                areaNombre: selectedArea.nombre,
                fechaEntregaPlanificada: context.date ?? item.fechaFinalPlanificada,
            };
        })
        .filter((orden): orden is DispensacionV2OrdenSeleccionada => orden !== null), [
        context.date,
        item,
        lotes,
        selectedArea.areaId,
        selectedArea.nombre,
        selectedItem.semanaMpsCodigo,
        selectedItem.weekEndDate,
        selectedItem.weekStartDate,
    ]);

    const selectedOrdenesInCard = useMemo(
        () => selectableOrdenes.filter((orden) => selectedOrdenIds.has(orden.ordenProduccionId)),
        [selectableOrdenes, selectedOrdenIds],
    );
    const allCardOrdenesSelected = selectableOrdenes.length > 0 && selectedOrdenesInCard.length === selectableOrdenes.length;
    const someCardOrdenesSelected = selectedOrdenesInCard.length > 0 && !allCardOrdenesSelected;
    const totalCantidadSeleccionada = selectedOrdenesInCard.reduce(
        (total, orden) => total + orden.cantidadPlanificada,
        0,
    );

    const handleToggle = (lote: MpsSemanalLotePlanificadoDTO) => {
        const orden = selectableOrdenes.find((candidate) => candidate.mpsLotePlanificadoId === lote.id);
        if (orden) {
            onToggleOrden(orden);
        }
    };

    const handleToggleAll = () => {
        onToggleOrdenes(selectableOrdenes, !allCardOrdenesSelected);
    };

    return (
        <VStack align="stretch" spacing={5}>
            <Box borderWidth="1px" borderRadius="lg" bg="app.surface" p={4}>
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                        <Heading size="md">Seleccionar OPs</Heading>
                        <Text color="app.textMuted" fontSize="sm" mt={1}>
                            {item.terminadoNombre} - {context.dayLabel} {formatSemanaMpsDisplayDate(context.date)}
                        </Text>
                    </Box>
                    <Flex gap={2} wrap="wrap">
                        <Button variant="outline" onClick={onBack}>
                            Volver al MPS
                        </Button>
                        <Button
                            colorScheme="teal"
                            onClick={onNext}
                            isDisabled={selectedOrdenesInCard.length === 0}
                        >
                            Continuar a materiales
                        </Button>
                    </Flex>
                </Flex>

                <Flex mt={4} gap={2} wrap="wrap">
                    <Badge colorScheme="teal">{formatNumber(item.numeroLotes)} lotes</Badge>
                    <Badge colorScheme="purple">{formatNumber(item.cantidadTotal)} und</Badge>
                    <Badge colorScheme="gray">{selectedArea.nombre}</Badge>
                    <Badge colorScheme={selectedOrdenesInCard.length > 0 ? "green" : "gray"}>
                        {selectedOrdenesInCard.length} OPs seleccionadas
                    </Badge>
                    {selectedOrdenesInCard.length > 0 ? (
                        <Badge colorScheme="purple">{formatNumber(totalCantidadSeleccionada)} und seleccionadas</Badge>
                    ) : null}
                </Flex>
            </Box>

            {lotes.length === 0 ? (
                <Alert status="warning" borderRadius="md" alignItems="flex-start">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="semibold">Sin lotes disponibles</Text>
                        <Text fontSize="sm">Este card no tiene lotes MPS para seleccionar.</Text>
                    </Box>
                </Alert>
            ) : (
                <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
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
                </Box>
            )}

            <Flex justify="flex-end" gap={3}>
                <Button variant="outline" onClick={onBack}>
                    Atrás
                </Button>
                <Button colorScheme="teal" onClick={onNext} isDisabled={selectedOrdenesInCard.length === 0}>
                    Continuar a materiales
                </Button>
            </Flex>
        </VStack>
    );
}
