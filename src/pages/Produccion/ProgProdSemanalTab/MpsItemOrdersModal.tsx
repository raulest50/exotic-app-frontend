import {
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
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
} from "@chakra-ui/react";
import type {
    MpsSemanalItemDTO,
    MpsSemanalOrdenProduccionListItemDTO,
} from "./MpsSemanalService";
import type { MpsReadonlyItemContext } from "./MpsReadonlyReviewPanel";
import { formatSemanaMpsDisplayDate } from "./semanaMps.utils";

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
        <Modal isOpen={isOpen} onClose={onClose} size="5xl" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>OPs generadas del item MPS</ModalHeader>
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
                                    <Badge colorScheme="gray">Item #{item.id}</Badge>
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
                                <TableContainer>
                                    <Table size="sm" variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Orden</Th>
                                                <Th>Lote real</Th>
                                                <Th isNumeric>Cantidad</Th>
                                                <Th>Lanzamiento estimado</Th>
                                                <Th>Entrega planificada</Th>
                                                <Th>Estado</Th>
                                                <Th>Lote planificado</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {ordenes.map((orden) => (
                                                <Tr key={orden.ordenId}>
                                                    <Td>{orden.ordenId}</Td>
                                                    <Td>{orden.loteAsignado ?? "-"}</Td>
                                                    <Td isNumeric>{formatNumber(orden.cantidadProducir)}</Td>
                                                    <Td>{formatDateTimeLabel(orden.fechaLanzamiento)}</Td>
                                                    <Td>{formatDateTimeLabel(orden.fechaFinalPlanificada)}</Td>
                                                    <Td>{renderEstadoOrdenLabel(orden.estadoOrden)}</Td>
                                                    <Td>
                                                        {orden.mpsLoteOrdinal ?? "-"}
                                                        {orden.mpsLotePlanificadoId ? ` (#${orden.mpsLotePlanificadoId})` : ""}
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </TableContainer>
                            )}
                        </VStack>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>
                        Cerrar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
