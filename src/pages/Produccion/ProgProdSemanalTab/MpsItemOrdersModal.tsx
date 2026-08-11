import {
    CloseButton,
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    Spinner,
    Table,
    Text,
    VStack,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import type {
    MpsSemanalItemDTO,
    MpsSemanalOrdenProduccionListItemDTO,
} from "./MpsSemanalService";
import type { MpsReadonlyItemContext } from "./MpsReadonlyReviewPanel";
import { formatSemanaMpsDisplayDate } from "./semanaMps.utils";
import {
    getEstadoDispensacionMaterialesColor,
    getEstadoDispensacionMaterialesLabel,
    getPoliticaDispensacionInicioColor,
    getPoliticaDispensacionInicioLabel,
} from "../components/SeguimientoBoardUI";

export type SelectedMpsItemOrders = {
    item: MpsSemanalItemDTO;
    context: MpsReadonlyItemContext;
};

function formatNumber(value: number | null | undefined): string {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return safeValue.toLocaleString("es-CO", {
        minimumFractionDigits: safeValue % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
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

interface MpsItemOrdersModalProps {
    selectedItem: SelectedMpsItemOrders | null;
    ordenes: MpsSemanalOrdenProduccionListItemDTO[];
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}

export default function MpsItemOrdersModal({
    selectedItem,
    ordenes,
    isLoading,
    error,
    onClose,
}: MpsItemOrdersModalProps) {
    const isOpen = selectedItem !== null;
    const item = selectedItem?.item ?? null;
    const context = selectedItem?.context ?? null;

    return (
        <Dialog.Root open={isOpen} size='xl' placement='center' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW="5xl">
                        <Dialog.Header><Dialog.Title>OPs generadas del item MPS</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body pb={6}>
                            {item && context && (
                                <VStack align="stretch" gap={4}>
                                    <Box>
                                        <Heading size="sm">{item.terminadoNombre}</Heading>
                                        <Text fontSize="sm" color="gray.600">
                                            {item.terminadoId} - {context.dayLabel} {formatSemanaMpsDisplayDate(context.date)}
                                        </Text>
                                        <Flex mt={2} gap={2} wrap="wrap">
                                            <Badge colorPalette="teal">{formatNumber(item.numeroLotes)} lotes</Badge>
                                            <Badge colorPalette="purple">{formatNumber(item.cantidadTotal)} und</Badge>
                                            <Badge colorPalette="gray">Item #{item.id}</Badge>
                                        </Flex>
                                    </Box>

                                    {isLoading ? (
                                        <Flex justify="center" align="center" py={8} gap={3}>
                                            <Spinner color="teal.500" />
                                            <Text color="gray.600">Cargando OPs del item...</Text>
                                        </Flex>
                                    ) : error ? (
                                        <Box p={4} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md">
                                            <Text color="red.700" fontSize="sm">{error}</Text>
                                        </Box>
                                    ) : ordenes.length === 0 ? (
                                        <Box p={4} bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
                                            <Text color="orange.700" fontSize="sm">
                                                No se encontraron OPs asociadas a este item MPS.
                                            </Text>
                                        </Box>
                                    ) : (
                                        <Table.ScrollArea>
                                            <Table.Root size="sm" variant="line">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>Orden</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Lote real</Table.ColumnHeader>
                                                        <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Lanzamiento estimado</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Entrega planificada</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Materiales</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Lote planificado</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {ordenes.map((orden) => (
                                                        <Table.Row key={orden.ordenId}>
                                                            <Table.Cell>{orden.ordenId}</Table.Cell>
                                                            <Table.Cell>{orden.loteAsignado ?? "-"}</Table.Cell>
                                                            <Table.Cell textAlign='end'>{formatNumber(orden.cantidadProducir)}</Table.Cell>
                                                            <Table.Cell>{formatDateTimeLabel(orden.fechaLanzamiento)}</Table.Cell>
                                                            <Table.Cell>{formatDateTimeLabel(orden.fechaFinalPlanificada)}</Table.Cell>
                                                            <Table.Cell>{renderEstadoOrdenLabel(orden.estadoOrden)}</Table.Cell>
                                                            <Table.Cell>
                                                                <Flex gap={2} wrap="wrap">
                                                                    <Badge colorPalette={getEstadoDispensacionMaterialesColor(orden.estadoDispensacionMateriales)}>
                                                                        {getEstadoDispensacionMaterialesLabel(orden.estadoDispensacionMateriales)}
                                                                    </Badge>
                                                                    <Badge colorPalette={getPoliticaDispensacionInicioColor(orden.politicaDispensacionInicio)}>
                                                                        {getPoliticaDispensacionInicioLabel(orden.politicaDispensacionInicio)}
                                                                    </Badge>
                                                                </Flex>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                {orden.mpsLoteOrdinal ?? "-"}
                                                                {orden.mpsLotePlanificadoId ? ` (#${orden.mpsLotePlanificadoId})` : ""}
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table.Root>
                                        </Table.ScrollArea>
                                    )}
                                </VStack>
                            )}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button colorPalette="blue" onClick={onClose}>
                                Cerrar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
