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
} from "@chakra-ui/react";
import { IconType } from "react-icons";
import { Link as RouterLink, NavLink } from "react-router-dom";
import { MdNotificationsActive } from "react-icons/md";
import { ModuleNotificationDTA } from "../api/ModulesNotifications";
import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";
import { useState } from "react";

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

function SectionCard({ name, icon, to, supportedModules, currentAccesos, bgColor = "blue.100", notification }: SectionCardProps) {
    const [isOpen, setIsOpen] = useState(false);

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

    const notificationBell = notification && notification.requireAtention && (
        isComprasNotification ? (
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
        </>
    );
}

export default SectionCard;
