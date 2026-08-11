import { Card, Heading, Icon, IconButton, Popover, useDisclosure } from "@chakra-ui/react";
import { useColorModeValue } from "./ui/color-mode";
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
    const { open, onClose, onToggle } = useDisclosure();
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
                position="absolute"
                top="0.5rem"
                right="0.5rem"
                size="sm"
                colorPalette="red"
                borderRadius="full"
                onClick={handleNotificationClick}
                zIndex={1}><MdNotificationsActive /></IconButton>
        ) : (
            <Popover.Root open={isOpen} closeOnInteractOutside={true} onOpenChange={e => {
                if (e.open)
                    {} else {
                    onClose();
                }
            }} positioning={{
                placement: 'top'
            }}>
                <Popover.Trigger asChild>
                    <IconButton
                        aria-label="Notificacion"
                        position="absolute"
                        top="0.5rem"
                        right="0.5rem"
                        size="sm"
                        colorPalette="red"
                        borderRadius="full"
                        onClick={handleNotificationClick}
                        zIndex={1}><MdNotificationsActive /></IconButton>
                </Popover.Trigger>
                <Popover.Positioner>
                    <Popover.Content maxW={{ base: "calc(100vw - 2rem)", sm: "sm" }}>
                        <Popover.Arrow />
                        <Popover.Body>{notification.message}</Popover.Body>
                    </Popover.Content>
                </Popover.Positioner>
            </Popover.Root>
        )
    );

    return (
        <>
            <NavLink to={to}>
                <Card.Root
                    h="full"
                    p={{ base: 4, md: 6, lg: "2em" }}
                    m={{ base: 0, md: 2, lg: "1em" }}
                    bg={cardBg}
                    _hover={{ bg: cardHoverBg }}
                    _active={{ bg: cardActiveBg }}
                    position="relative"
                    minH={{ base: "8.5rem", md: "10rem" }}
                >
                    {notificationBell}

                    <Card.Header
                        h={{ base: "auto", md: "40%" }}
                        minH={{ base: "3.25rem", md: "4rem" }}
                        borderBottom="0.1em solid"
                        alignContent="center"
                        px={0}
                        pt={0}
                    >
                        <Heading as="h2" size={{ base: "xs", md: "sm" }} fontFamily="Comfortaa Variable" lineClamp={2}>
                            {name}
                        </Heading>
                    </Card.Header>
                    <Card.Body display="flex" alignItems="center" justifyContent="center" px={0} pb={0}>
                        <Icon boxSize={{ base: "2.75em", md: "4em" }} as={icon} />
                    </Card.Body>
                </Card.Root>
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
