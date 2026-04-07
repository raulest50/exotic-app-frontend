import {
    Box,
    Button,
    Center,
    Heading,
    Modal,
    ModalBody,
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
import axios from "axios";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
    MaterialEnPuntoReordenConOcmDTO,
    MaterialEnPuntoReordenDTO,
    ModuleNotificationDTA,
    PuntoReordenEvaluacionResult,
} from "../api/ModulesNotifications";
import EndPointsURL from "../api/EndPointsURL";

export type AlertaInfoDialogStockProps = {
    isOpen: boolean;
    onClose: () => void;
    notification: ModuleNotificationDTA;
    to: string;
    name: string;
    finalFocusRef: RefObject<HTMLElement | null>;
};

function formatQty(value: number): string {
    if (!Number.isFinite(value)) return "0";
    if (value === Math.trunc(value)) return String(Math.trunc(value));
    return String(value);
}

function formatFecha(fecha?: string | null): string {
    if (!fecha) return "";
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return fecha;
    return new Intl.DateTimeFormat("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(parsed);
}

function renderMaterialBaseTable(rows: MaterialEnPuntoReordenDTO[]) {
    return (
        <TableContainer maxH="18rem" overflowY="auto">
            <Table size="sm" variant="simple">
                <Thead>
                    <Tr>
                        <Th>Codigo</Th>
                        <Th>Nombre</Th>
                        <Th>Tipo</Th>
                        <Th isNumeric>Stock actual</Th>
                        <Th isNumeric>Punto reorden</Th>
                        <Th>Unidad</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {rows.map((row) => (
                        <Tr key={row.productoId}>
                            <Td>{row.productoId}</Td>
                            <Td>{row.nombre}</Td>
                            <Td>{row.tipoMaterialLabel}</Td>
                            <Td isNumeric>{formatQty(row.stockActual)}</Td>
                            <Td isNumeric>{formatQty(row.puntoReorden)}</Td>
                            <Td>{row.tipoUnidades}</Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </TableContainer>
    );
}

function renderMaterialConOcmTable(rows: MaterialEnPuntoReordenConOcmDTO[]) {
    return (
        <TableContainer maxH="18rem" overflowY="auto">
            <Table size="sm" variant="simple">
                <Thead>
                    <Tr>
                        <Th>Codigo</Th>
                        <Th>Nombre</Th>
                        <Th>Tipo</Th>
                        <Th isNumeric>Stock actual</Th>
                        <Th isNumeric>Punto reorden</Th>
                        <Th>Unidad</Th>
                        <Th>OCM(s)</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {rows.map((row) => (
                        <Tr key={row.productoId}>
                            <Td>{row.productoId}</Td>
                            <Td>{row.nombre}</Td>
                            <Td>{row.tipoMaterialLabel}</Td>
                            <Td isNumeric>{formatQty(row.stockActual)}</Td>
                            <Td isNumeric>{formatQty(row.puntoReorden)}</Td>
                            <Td>{row.tipoUnidades}</Td>
                            <Td>
                                <VStack align="start" spacing={1}>
                                    {row.ocmsPendientesIngreso.map((ocm) => (
                                        <Text key={`${row.productoId}-${ocm.ordenCompraId}`} fontSize="sm">
                                            {`OCM #${ocm.ordenCompraId} (${formatFecha(ocm.fechaEmision)})`}
                                        </Text>
                                    ))}
                                </VStack>
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </TableContainer>
    );
}

export default function AlertaInfoDialogStock({
    isOpen,
    onClose,
    notification,
    to,
    name,
    finalFocusRef,
}: AlertaInfoDialogStockProps) {
    const [stockDetail, setStockDetail] = useState<PuntoReordenEvaluacionResult | null>(null);
    const [stockLoading, setStockLoading] = useState(false);
    const [stockError, setStockError] = useState<string | null>(null);

    const materialesCount = notification.materialesEnPuntoReorden ?? 0;

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        (async () => {
            setStockLoading(true);
            setStockError(null);
            try {
                const ep = new EndPointsURL();
                const { data } = await axios.get<PuntoReordenEvaluacionResult>(ep.stock_materiales_punto_reorden);
                if (!cancelled) {
                    setStockDetail(data);
                }
            } catch {
                if (!cancelled) {
                    setStockError("No se pudo cargar la lista de materiales");
                    setStockDetail(null);
                }
            } finally {
                if (!cancelled) setStockLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="6xl" finalFocusRef={finalFocusRef}>
            <ModalOverlay />
            <ModalContent maxW="72rem">
                <ModalHeader>Materiales en punto de reorden</ModalHeader>
                <ModalBody>
                    <VStack align="stretch" spacing={5}>
                        <Text>{notification.message}</Text>
                        <Text fontSize="sm" color="gray.600">
                            <strong>Total en alerta:</strong> {materialesCount}
                        </Text>

                        {stockLoading && (
                            <Center py={6}>
                                <Spinner size="lg" />
                            </Center>
                        )}

                        {stockError && !stockLoading && <Text color="red.500">{stockError}</Text>}

                        {!stockLoading && !stockError && stockDetail && (
                            <>
                                {stockDetail.pendientesOrdenar.length > 0 && (
                                    <Box>
                                        <Heading size="sm" mb={2}>
                                            Pendientes por pedir ({stockDetail.totalPendientesOrdenar})
                                        </Heading>
                                        {renderMaterialBaseTable(stockDetail.pendientesOrdenar)}
                                    </Box>
                                )}

                                {stockDetail.pendientesIngresoAlmacen.length > 0 && (
                                    <Box>
                                        <Heading size="sm" mb={2}>
                                            Ya pedidos, pendiente ingreso (
                                            {stockDetail.totalPendientesIngresoAlmacen})
                                        </Heading>
                                        {renderMaterialConOcmTable(stockDetail.pendientesIngresoAlmacen)}
                                    </Box>
                                )}

                                {stockDetail.sinPuntoReorden.length > 0 && (
                                    <Box>
                                        <Heading size="sm" mb={2}>
                                            Sin punto de reorden ({stockDetail.totalSinPuntoReorden})
                                        </Heading>
                                        {renderMaterialBaseTable(stockDetail.sinPuntoReorden)}
                                    </Box>
                                )}
                            </>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter gap={2}>
                    <Button variant="ghost" onClick={onClose}>
                        Cerrar
                    </Button>
                    <Button as={RouterLink} to={to} colorScheme="blue" onClick={onClose}>
                        Ir a {name}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
