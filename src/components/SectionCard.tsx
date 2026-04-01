import {
    Box,
    Button,
    Card,
    CardBody,
    CardHeader,
    Center,
    Heading,
    Icon,
    IconButton,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Popover,
    PopoverArrow,
    PopoverBody,
    PopoverContent,
    PopoverTrigger,
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
    useColorModeValue,
} from "@chakra-ui/react";
import { IconType } from "react-icons";
import { Link as RouterLink, NavLink } from "react-router-dom";
import { MdNotificationsActive } from "react-icons/md";
import axios from "axios";
import {
    MaterialEnPuntoReordenConOcmDTO,
    MaterialEnPuntoReordenDTO,
    ModuleNotificationDTA,
    PuntoReordenEvaluacionResult,
} from "../api/ModulesNotifications";
import EndPointsURL from "../api/EndPointsURL";
import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";
import { MouseEvent, useEffect, useState } from "react";

interface SectionCardProps {
    name: string;
    icon: IconType;
    to: string;
    bgColor?: string;
    notification?: ModuleNotificationDTA;
}

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

function SectionCard({ name, icon, to, bgColor = "blue.100", notification }: SectionCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [stockDetail, setStockDetail] = useState<PuntoReordenEvaluacionResult | null>(null);
    const [stockLoading, setStockLoading] = useState(false);
    const [stockError, setStockError] = useState<string | null>(null);

    const isRedCard = bgColor === "red.100";
    const cardBg = useColorModeValue(
        bgColor,
        isRedCard ? "red.700" : "blue.700"
    );
    const cardHoverBg = useColorModeValue(
        isRedCard ? "red.300" : "blue.300",
        isRedCard ? "red.600" : "blue.600"
    );
    const cardActiveBg = useColorModeValue(
        isRedCard ? "red.800" : "blue.800",
        isRedCard ? "red.400" : "blue.400"
    );

    const cardStyle = {
        p: "2em",
        m: "1em",
        bg: cardBg,
        ":hover": {
            bg: cardHoverBg,
        },
        ":active": {
            bg: cardActiveBg,
        },
        position: "relative",
    };

    const handleNotificationClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const isComprasNotification =
        Boolean(notification?.requireAtention && notification.modulo === Modulo.COMPRAS);
    const isStockNotification =
        Boolean(notification?.requireAtention && notification.modulo === Modulo.STOCK);
    const usesNotificationModal = isComprasNotification || isStockNotification;

    useEffect(() => {
        if (!isOpen || !isStockNotification) return;
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
    }, [isOpen, isStockNotification]);

    const handleCloseModal = () => {
        setIsOpen(false);
    };

    const notificationBell = notification && notification.requireAtention && (
        usesNotificationModal ? (
            <IconButton
                aria-label="Notificacion"
                icon={<MdNotificationsActive />}
                position="absolute"
                top="0.5rem"
                right="0.5rem"
                size="sm"
                colorScheme="red"
                borderRadius="full"
                onClick={handleNotificationClick}
                zIndex={1}
            />
        ) : (
            <Popover
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                placement="top"
                closeOnBlur={true}
            >
                <PopoverTrigger>
                    <IconButton
                        aria-label="Notificacion"
                        icon={<MdNotificationsActive />}
                        position="absolute"
                        top="0.5rem"
                        right="0.5rem"
                        size="sm"
                        colorScheme="red"
                        borderRadius="full"
                        onClick={handleNotificationClick}
                        zIndex={1}
                    />
                </PopoverTrigger>
                <PopoverContent>
                    <PopoverArrow />
                    <PopoverBody>{notification.message}</PopoverBody>
                </PopoverContent>
            </Popover>
        )
    );

    const liberar = notification?.ordenesPendientesLiberar ?? 0;
    const enviar = notification?.ordenesPendientesEnviar ?? 0;
    const materialesCount = notification?.materialesEnPuntoReorden ?? 0;

    return (
        <>
            <NavLink to={to}>
                <Card h={"full"} sx={cardStyle}>
                    {notificationBell}

                    <CardHeader h={"40%"} borderBottom="0.1em solid" alignContent={"center"}>
                        <Heading as={"h2"} size={"sm"} fontFamily={"Comfortaa Variable"}>
                            {name}
                        </Heading>
                    </CardHeader>
                    <CardBody>
                        <Icon boxSize={"4em"} as={icon} />
                    </CardBody>
                </Card>
            </NavLink>

            {isComprasNotification && notification && (
                <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} isCentered>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>Ordenes de compra pendientes</ModalHeader>
                        <ModalBody>
                            <VStack align="stretch" spacing={3}>
                                <Text>{notification.message}</Text>
                                <Text>
                                    <strong>Pendientes por liberar:</strong> {liberar}
                                </Text>
                                <Text>
                                    <strong>Pendientes por enviar al proveedor:</strong> {enviar}
                                </Text>
                            </VStack>
                        </ModalBody>
                        <ModalFooter gap={2}>
                            <Button variant="ghost" onClick={() => setIsOpen(false)}>
                                Cerrar
                            </Button>
                            <Button
                                as={RouterLink}
                                to={to}
                                colorScheme="blue"
                                onClick={() => setIsOpen(false)}
                            >
                                Ir a {name}
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            )}

            {isStockNotification && notification && (
                <Modal isOpen={isOpen} onClose={handleCloseModal} isCentered size="6xl">
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

                                {stockError && !stockLoading && (
                                    <Text color="red.500">{stockError}</Text>
                                )}

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
                                                    Ya pedidos, pendiente ingreso ({stockDetail.totalPendientesIngresoAlmacen})
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
                            <Button variant="ghost" onClick={handleCloseModal}>
                                Cerrar
                            </Button>
                            <Button
                                as={RouterLink}
                                to={to}
                                colorScheme="blue"
                                onClick={handleCloseModal}
                            >
                                Ir a {name}
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            )}
        </>
    );
}

export default SectionCard;
