// src/components/SectionCard.tsx
import {
    Card,
    CardHeader,
    CardBody,
    Heading,
    Icon,
    IconButton,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    PopoverArrow,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Text,
    VStack,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Spinner,
    Center,
} from "@chakra-ui/react";
import { IconType } from "react-icons";
import { Link as RouterLink, NavLink } from "react-router-dom";
import { MdNotificationsActive } from "react-icons/md";
import axios from "axios";
import {
    MaterialEnPuntoReordenDTO,
    ModuleNotificationDTA,
    PageMaterialEnPuntoReorden,
} from "../api/ModulesNotifications";
import EndPointsURL from "../api/EndPointsURL";
import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";
import { useState, useEffect } from "react";
import BetterPagination from "./BetterPagination/BetterPagination";

interface SectionCardProps {
    name: string;
    icon: IconType;
    to: string;
    /** Modules allowed to see this card */
    supportedModules?: string[];
    /** Current accesses of the user */
    currentAccesos?: string[];
    /** Background color of the card */
    bgColor?: string;
    /** Notification for this module */
    notification?: ModuleNotificationDTA;
}

function formatQty(v: number): string {
    if (!Number.isFinite(v)) return "0";
    if (v === Math.trunc(v)) return String(Math.trunc(v));
    return String(v);
}

function SectionCard({ name, icon, to, supportedModules, currentAccesos, bgColor = "blue.100", notification }: SectionCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [stockPage, setStockPage] = useState(0);
    const [stockSize, setStockSize] = useState(10);
    const [stockRows, setStockRows] = useState<MaterialEnPuntoReordenDTO[]>([]);
    const [stockTotalPages, setStockTotalPages] = useState(0);
    const [stockLoading, setStockLoading] = useState(false);
    const [stockError, setStockError] = useState<string | null>(null);

    if (supportedModules && currentAccesos) {
        const isMaster = currentAccesos.includes('ROLE_MASTER');
        const hasAccess = isMaster || currentAccesos.some(acceso => supportedModules.includes(acceso));
        if (!hasAccess) return null;
    }

    const cardStyle = {
        p: "2em",
        m: "1em",
        bg: bgColor,
        ":hover": {
            bg: bgColor === "red.100" ? "red.300" : "blue.300",
        },
        ":active": {
            bg: bgColor === "red.100" ? "red.800" : "blue.800",
        },
        position: "relative",
    };

    const handleNotificationClick = (e: React.MouseEvent) => {
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
                const url = `${ep.stock_materiales_punto_reorden}?page=${stockPage}&size=${stockSize}`;
                const { data } = await axios.get<PageMaterialEnPuntoReorden>(url);
                if (!cancelled) {
                    setStockRows(data.content ?? []);
                    setStockTotalPages(data.totalPages ?? 0);
                }
            } catch {
                if (!cancelled) {
                    setStockError("No se pudo cargar la lista de materiales");
                    setStockRows([]);
                    setStockTotalPages(0);
                }
            } finally {
                if (!cancelled) setStockLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, isStockNotification, stockPage, stockSize]);

    const handleCloseModal = () => {
        setIsOpen(false);
        setStockPage(0);
    };

    const notificationBell = notification && notification.requireAtention && (
        usesNotificationModal ? (
            <IconButton
                aria-label="Notificación"
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
                        aria-label="Notificación"
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
                        <ModalHeader>Órdenes de compra pendientes</ModalHeader>
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
                <Modal isOpen={isOpen} onClose={handleCloseModal} isCentered size="4xl">
                    <ModalOverlay />
                    <ModalContent maxW="56rem">
                        <ModalHeader>Materiales en punto de reorden</ModalHeader>
                        <ModalBody>
                            <VStack align="stretch" spacing={3}>
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
                                {!stockLoading && !stockError && (
                                    <>
                                        <TableContainer maxH="50vh" overflowY="auto">
                                            <Table size="sm" variant="simple">
                                                <Thead>
                                                    <Tr>
                                                        <Th>Código</Th>
                                                        <Th>Nombre</Th>
                                                        <Th>Tipo</Th>
                                                        <Th isNumeric>Stock actual</Th>
                                                        <Th isNumeric>Punto reorden</Th>
                                                        <Th>Unidad</Th>
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {stockRows.map((row) => (
                                                        <Tr key={row.productoId}>
                                                            <Td>{row.productoId}</Td>
                                                            <Td>{row.nombre}</Td>
                                                            <Td>{row.tipoMaterialLabel}</Td>
                                                            <Td isNumeric>
                                                                {formatQty(row.stockActual)}
                                                            </Td>
                                                            <Td isNumeric>
                                                                {formatQty(row.puntoReorden)}
                                                            </Td>
                                                            <Td>{row.tipoUnidades}</Td>
                                                        </Tr>
                                                    ))}
                                                </Tbody>
                                            </Table>
                                        </TableContainer>
                                        <BetterPagination
                                            page={stockPage}
                                            size={stockSize}
                                            totalPages={stockTotalPages}
                                            loading={stockLoading}
                                            onPageChange={setStockPage}
                                            onSizeChange={setStockSize}
                                        />
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
