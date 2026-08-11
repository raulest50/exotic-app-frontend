import {
    Box,
    Button,
    Center,
    Heading,
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
        <Table.ScrollArea maxH="18rem" overflowY="auto">
            <Table.Root size="sm" variant="simple">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>Codigo</Table.ColumnHeader>
                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                        <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Stock actual</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Punto reorden</Table.ColumnHeader>
                        <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {rows.map((row) => (
                        <Table.Row key={row.productoId}>
                            <Table.Cell>{row.productoId}</Table.Cell>
                            <Table.Cell>{row.nombre}</Table.Cell>
                            <Table.Cell>{row.tipoMaterialLabel}</Table.Cell>
                            <Table.Cell textAlign='end'>{formatQty(row.stockActual)}</Table.Cell>
                            <Table.Cell textAlign='end'>{formatQty(row.puntoReorden)}</Table.Cell>
                            <Table.Cell>{row.tipoUnidades}</Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    );
}

function renderMaterialConOcmTable(rows: MaterialEnPuntoReordenConOcmDTO[]) {
    return (
        <Table.ScrollArea maxH="18rem" overflowY="auto">
            <Table.Root size="sm" variant="simple">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>Codigo</Table.ColumnHeader>
                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                        <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Stock actual</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='end'>Punto reorden</Table.ColumnHeader>
                        <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                        <Table.ColumnHeader>OCM(s)</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {rows.map((row) => (
                        <Table.Row key={row.productoId}>
                            <Table.Cell>{row.productoId}</Table.Cell>
                            <Table.Cell>{row.nombre}</Table.Cell>
                            <Table.Cell>{row.tipoMaterialLabel}</Table.Cell>
                            <Table.Cell textAlign='end'>{formatQty(row.stockActual)}</Table.Cell>
                            <Table.Cell textAlign='end'>{formatQty(row.puntoReorden)}</Table.Cell>
                            <Table.Cell>{row.tipoUnidades}</Table.Cell>
                            <Table.Cell>
                                <VStack align="start" gap={1}>
                                    {row.ocmsPendientesIngreso.map((ocm) => (
                                        <Text key={`${row.productoId}-${ocm.ordenCompraId}`} fontSize="sm">
                                            {`OCM #${ocm.ordenCompraId} (${formatFecha(ocm.fechaEmision)})`}
                                        </Text>
                                    ))}
                                </VStack>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
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
        <Dialog.Root open={isOpen} placement='center' size='xl' finalFocusEl={() => finalFocusRef.current} onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW="72rem">
                        <Dialog.Header>Materiales en punto de reorden</Dialog.Header>
                        <Dialog.Body>
                            <VStack align="stretch" gap={5}>
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
                        </Dialog.Body>
                        <Dialog.Footer gap={2}>
                            <Button variant="ghost" onClick={onClose}>
                                Cerrar
                            </Button>
                            <Button colorPalette="blue" asChild><RouterLink to={to} onClick={onClose}>Ir a {name}
                                </RouterLink></Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
