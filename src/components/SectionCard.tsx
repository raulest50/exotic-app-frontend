import {
    Card,
    CardBody,
    CardHeader,
    Heading,
    Icon,
    IconButton,
    Popover,
    PopoverArrow,
    PopoverBody,
    PopoverContent,
    PopoverTrigger,
    useColorModeValue,
    useDisclosure,
} from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { NavLink } from "react-router-dom";
import { MdNotificationsActive } from "react-icons/md";
import { type MouseEvent, useRef } from "react";
import type { ModuleNotificationDTA } from "../api/ModulesNotifications";
import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";
import AlertaInfoDialogCompras from "./AlertaInfoDialogCompras.tsx";
import AlertaInfoDialogStock from "./AlertaInfoDialogStock.tsx";

interface SectionCardProps {
    name: string;
    icon: IconType;
    to: string;
    bgColor?: string;
    notification?: ModuleNotificationDTA;
}

function SectionCard({ name, icon, to, bgColor = "blue.100", notification }: SectionCardProps) {
    const { isOpen, onClose, onToggle } = useDisclosure();
    const bellRef = useRef<HTMLButtonElement | null>(null);

    const isRedCard = bgColor === "red.100";
    const cardBg = useColorModeValue(bgColor, isRedCard ? "red.700" : "blue.700");
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
        onToggle();
    };

    const isComprasNotification = Boolean(
        notification?.requireAtention && notification.modulo === Modulo.COMPRAS
    );
    const isStockNotification = Boolean(
        notification?.requireAtention && notification.modulo === Modulo.STOCK
    );
    const usesNotificationModal = isComprasNotification || isStockNotification;

    const notificationBell = notification && notification.requireAtention && (
        usesNotificationModal ? (
            <IconButton
                ref={bellRef}
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
            <Popover isOpen={isOpen} onClose={onClose} placement="top" closeOnBlur={true}>
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
                <AlertaInfoDialogCompras
                    isOpen={isOpen}
                    onClose={onClose}
                    notification={notification}
                    to={to}
                    name={name}
                    finalFocusRef={bellRef}
                />
            )}

            {isStockNotification && notification && (
                <AlertaInfoDialogStock
                    isOpen={isOpen}
                    onClose={onClose}
                    notification={notification}
                    to={to}
                    name={name}
                    finalFocusRef={bellRef}
                />
            )}
        </>
    );
}

export default SectionCard;
