import {
    Box,
    Button,
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
    Separator,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { useColorModeValue } from "./ui/color-mode";
import type { RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import type { ModuleNotificationDTA, OrdenCompraAlertaCampanaDTO } from "../api/ModulesNotifications";
import BetterPagination from "./BetterPagination/BetterPagination.tsx";

export type AlertaInfoDialogComprasProps = {
    isOpen: boolean;
    onClose: () => void;
    notification: ModuleNotificationDTA;
    to: string;
    name: string;
    finalFocusRef: RefObject<HTMLElement | null>;
};

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

function OrdenesTableWithPaginationBelow({
    rows,
    page,
    size,
    onPageChange,
    onSizeChange,
}: {
    rows: OrdenCompraAlertaCampanaDTO[];
    page: number;
    size: number;
    onPageChange: (page: number) => void;
    onSizeChange: (size: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(rows.length / size));
    const pageRows = useMemo(
        () => rows.slice(page * size, page * size + size),
        [rows, page, size]
    );

    const tableBg = useColorModeValue("white", "gray.900");
    const tableBorder = useColorModeValue("gray.200", "gray.600");
    const theadBg = useColorModeValue("gray.100", "gray.700");

    return (
        <>
            <Table.ScrollArea
                maxH="16rem"
                overflowY="auto"
                borderRadius="md"
                borderWidth="1px"
                borderColor={tableBorder}
                boxShadow="sm"
                bg={tableBg}
            >
                <Table.Root size="sm" variant="simple">
                    <Table.Header position="sticky" top={0} bg={theadBg} zIndex={1} boxShadow="sm">
                        <Table.Row>
                            <Table.ColumnHeader py={3}>ID orden</Table.ColumnHeader>
                            <Table.ColumnHeader py={3}>Fecha de creación</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {pageRows.map((row) => (
                            <Table.Row key={row.ordenCompraId}>
                                <Table.Cell py={2.5}>{row.ordenCompraId}</Table.Cell>
                                <Table.Cell py={2.5}>{formatFecha(row.fechaEmision)}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
            <Box pt={4} mt={1}>
                <BetterPagination
                    page={page}
                    size={size}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                    onSizeChange={onSizeChange}
                />
            </Box>
        </>
    );
}

type AlertaSectionCardProps = {
    title: string;
    count: number;
    subtitle: string;
    rows: OrdenCompraAlertaCampanaDTO[];
    page: number;
    size: number;
    onPageChange: (page: number) => void;
    onSizeChange: (size: number) => void;
};

function AlertaSectionCard({
    title,
    count,
    subtitle,
    rows,
    page,
    size,
    onPageChange,
    onSizeChange,
}: AlertaSectionCardProps) {
    const cardBg = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.600");
    const accentColor = useColorModeValue("blue.600", "blue.300");
    const subtleText = useColorModeValue("gray.600", "gray.400");

    return (
        <Box
            borderRadius="xl"
            boxShadow="lg"
            bg={cardBg}
            p={{ base: 5, md: 7 }}
            borderWidth="1px"
            borderColor={borderColor}
        >
            <Heading size="sm" fontWeight="semibold" letterSpacing="tight" mb={4}>
                {title}
            </Heading>
            <Box mb={5}>
                <Text fontSize="sm" color={subtleText} mb={1}>
                    {subtitle}
                </Text>
                <Text fontSize="3xl" fontWeight="bold" lineHeight="shorter" color={accentColor}>
                    {count}
                </Text>
                <Text fontSize="sm" color={subtleText} mt={1}>
                    {count === 1 ? "orden en esta categoría" : "órdenes en esta categoría"}
                </Text>
            </Box>
            <Separator mb={5} borderColor={borderColor} />
            <OrdenesTableWithPaginationBelow
                rows={rows}
                page={page}
                size={size}
                onPageChange={onPageChange}
                onSizeChange={onSizeChange}
            />
        </Box>
    );
}

export default function AlertaInfoDialogCompras({
    isOpen,
    onClose,
    notification,
    to,
    name,
    finalFocusRef,
}: AlertaInfoDialogComprasProps) {
    const liberar = notification.ordenesPendientesLiberar ?? 0;
    const enviar = notification.ordenesPendientesEnviar ?? 0;
    const liberarRows = notification.detalleOrdenesPendientesLiberar ?? [];
    const enviarRows = notification.detalleOrdenesPendientesEnviar ?? [];

    const [pageLiberar, setPageLiberar] = useState(0);
    const [sizeLiberar, setSizeLiberar] = useState(10);
    const [pageEnviar, setPageEnviar] = useState(0);
    const [sizeEnviar, setSizeEnviar] = useState(10);

    const introBg = useColorModeValue("blue.50", "rgba(49, 130, 206, 0.15)");
    const introBorder = useColorModeValue("blue.100", "blue.800");
    const footerBorderColor = useColorModeValue("gray.100", "gray.700");

    useEffect(() => {
        if (!isOpen) return;
        setPageLiberar(0);
        setPageEnviar(0);
    }, [isOpen]);

    return (
        <Dialog.Root
            open={isOpen}
            placement='center'
            scrollBehavior="inside"
            finalFocusEl={() => finalFocusRef.current}
            onOpenChange={e => {
                if (!e.open) {
                    onClose();
                }
            }}
        >
            <Portal>

                <Dialog.Backdrop bg="blackAlpha.400" backdropFilter="blur(2px)" />
                <Dialog.Positioner>
                    <Dialog.Content maxW="lg" borderRadius="xl" boxShadow="2xl" mx={{ base: 3, md: 0 }}>
                        <Dialog.Header pt={8} pb={4} px={{ base: 6, md: 8 }} fontSize="xl" fontWeight="bold">
                            Órdenes de compra pendientes
                        </Dialog.Header>
                        <Dialog.Body px={{ base: 6, md: 8 }} pt={2} pb={8}>
                            <VStack align="stretch" gap={6}>
                                <Box
                                    borderRadius="lg"
                                    bg={introBg}
                                    borderWidth="1px"
                                    borderColor={introBorder}
                                    px={5}
                                    py={4}
                                    boxShadow="sm"
                                >
                                    <Text fontSize="sm" lineHeight="tall">
                                        {notification.message}
                                    </Text>
                                </Box>

                                {liberarRows.length > 0 && (
                                    <AlertaSectionCard
                                        title="Pendientes por liberar"
                                        count={liberar}
                                        subtitle="Cantidad de órdenes pendientes por liberar"
                                        rows={liberarRows}
                                        page={pageLiberar}
                                        size={sizeLiberar}
                                        onPageChange={setPageLiberar}
                                        onSizeChange={setSizeLiberar}
                                    />
                                )}

                                {enviarRows.length > 0 && (
                                    <AlertaSectionCard
                                        title="Pendientes por enviar al proveedor"
                                        count={enviar}
                                        subtitle="Cantidad de órdenes pendientes de envío al proveedor"
                                        rows={enviarRows}
                                        page={pageEnviar}
                                        size={sizeEnviar}
                                        onPageChange={setPageEnviar}
                                        onSizeChange={setSizeEnviar}
                                    />
                                )}
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer
                            gap={3}
                            px={{ base: 6, md: 8 }}
                            py={6}
                            borderTopWidth="1px"
                            borderColor={footerBorderColor}
                        >
                            <Button variant="ghost" onClick={onClose} px={6}>
                                Cerrar
                            </Button>
                            <Button colorPalette="blue" px={6} asChild><RouterLink to={to} onClick={onClose}>Ir a {name}
                                </RouterLink></Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
