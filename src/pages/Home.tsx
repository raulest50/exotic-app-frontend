import {
    SimpleGrid,
    Flex,
    Heading,
    Button,
    Spacer,
    Container,
    Box,
    HStack,
    Tooltip,
    IconButton,
    useColorMode,
    useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import SectionCard from "../components/SectionCard.tsx";
import SplitText from "../components/SplitText.tsx";
import SuperMasterOnboardingModal from "../components/SuperMasterOnboardingModal.tsx";
import { PiDownloadDuotone } from "react-icons/pi";
import { BsDatabaseCheck } from "react-icons/bs";
import { AiOutlineAudit } from "react-icons/ai";
import { FaIndustry } from "react-icons/fa";
import { GiBuyCard } from "react-icons/gi";
import { MdWarehouse } from "react-icons/md";
import { FaUsersGear } from "react-icons/fa6";
import { FaSitemap } from "react-icons/fa6";
import { FaFileUpload } from "react-icons/fa";
import { TbReportMoney } from "react-icons/tb";
import { MdOutlineInsights } from "react-icons/md";
import { FaSteam } from "react-icons/fa";
import { PiMicrosoftTeamsLogoFill } from "react-icons/pi";
import { MdNotificationsActive } from "react-icons/md";
import { FaCogs } from "react-icons/fa";
import { FaCalendarAlt } from "react-icons/fa";
import { MdRefresh } from "react-icons/md";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

import "@fontsource-variable/comfortaa";

import { Modulo } from "./Usuarios/GestionUsuarios/types.tsx";

import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import type { AccessRule } from "../auth/accessModel.ts";
import { canAccessModule, moduleAccessRule } from "../auth/accessHelpers.ts";

type HomeCardDef = {
    to: string;
    name: string;
    icon: IconType;
    notificationModulo?: Modulo | string;
    bgColor?: string;
    accesoValido: AccessRule;
};

export default function Home() {
    const { user, logout, meProfile, accesosReady, moduloAccesos, isMasterLike } = useAuth();
    const [showSuperMasterOnboarding, setShowSuperMasterOnboarding] = useState(false);
    const { colorMode, toggleColorMode } = useColorMode();

    const versionBgColor = useColorModeValue("purple.200", "purple.600");
    const userBgColor = useColorModeValue("green.200", "green.600");

    useEffect(() => {
        if (user !== "super_master" || !accesosReady || !meProfile) return;
        if (!meProfile.email || String(meProfile.email).trim() === "") {
            setShowSuperMasterOnboarding(true);
        }
    }, [user, accesosReady, meProfile]);

    const { getNotificationForModule, refreshNotifications } = useNotifications();

    const access = useMemo(
        () => ({ moduloAccesos, isMasterLike }),
        [moduloAccesos, isMasterLike]
    );

    const cards: HomeCardDef[] = [
        { to: "/usuarios", name: "Roles y Usuarios", icon: FaUsersGear, notificationModulo: Modulo.USUARIOS, accesoValido: moduleAccessRule(Modulo.USUARIOS) },
        { to: "/producto", name: "Productos", icon: PiDownloadDuotone, notificationModulo: Modulo.PRODUCTOS, accesoValido: moduleAccessRule(Modulo.PRODUCTOS) },
        { to: "/produccion", name: "Gestion de Produccion", icon: AiOutlineAudit, notificationModulo: Modulo.PRODUCCION, accesoValido: moduleAccessRule(Modulo.PRODUCCION) },
        { to: "/stock", name: "Stock", icon: BsDatabaseCheck, notificationModulo: Modulo.STOCK, accesoValido: moduleAccessRule(Modulo.STOCK) },
        { to: "/Proveedores", name: "Proveedores", icon: FaIndustry, notificationModulo: Modulo.PROVEEDORES, accesoValido: moduleAccessRule(Modulo.PROVEEDORES) },
        { to: "/compras", name: "Compras", icon: GiBuyCard, notificationModulo: Modulo.COMPRAS, accesoValido: moduleAccessRule(Modulo.COMPRAS) },
        { to: "/gestion_areas_operativas", name: "Gestion Areas Operativas", icon: FaCogs, notificationModulo: Modulo.SEGUIMIENTO_PRODUCCION, accesoValido: moduleAccessRule(Modulo.SEGUIMIENTO_PRODUCCION) },
        { to: "/transacciones_almacen", name: "Transacciones de Almacen", icon: MdWarehouse, notificationModulo: Modulo.TRANSACCIONES_ALMACEN, accesoValido: moduleAccessRule(Modulo.TRANSACCIONES_ALMACEN) },
        { to: "/operaciones_criticas_bd", name: "Operaciones Criticas en BD", icon: FaFileUpload, notificationModulo: Modulo.OPERACIONES_CRITICAS_BD, bgColor: "red.100", accesoValido: (snapshot) => snapshot.isMasterLike && canAccessModule(snapshot.moduloAccesos, Modulo.OPERACIONES_CRITICAS_BD) },
        { to: "/Activos", name: "Activos Fijos", icon: FaSteam, notificationModulo: Modulo.ACTIVOS, accesoValido: moduleAccessRule(Modulo.ACTIVOS) },
        { to: "/Contabilidad", name: "Contabilidad", icon: TbReportMoney, notificationModulo: Modulo.CONTABILIDAD, accesoValido: moduleAccessRule(Modulo.CONTABILIDAD) },
        { to: "/Personal", name: "Personal", icon: PiMicrosoftTeamsLogoFill, notificationModulo: Modulo.PERSONAL_PLANTA, accesoValido: moduleAccessRule(Modulo.PERSONAL_PLANTA) },
        { to: "/Bintelligence", name: "BI", icon: MdOutlineInsights, notificationModulo: Modulo.BINTELLIGENCE, accesoValido: moduleAccessRule(Modulo.BINTELLIGENCE) },
        { to: "/administracion_alertas", name: "Administracion Alertas", icon: MdNotificationsActive, notificationModulo: Modulo.ADMINISTRACION_ALERTAS, accesoValido: moduleAccessRule(Modulo.ADMINISTRACION_ALERTAS) },
        { to: "/cronograma", name: "Cronograma", icon: FaCalendarAlt, notificationModulo: Modulo.CRONOGRAMA, accesoValido: moduleAccessRule(Modulo.CRONOGRAMA) },
        { to: "/organigrama", name: "Organigrama", icon: FaSitemap, notificationModulo: Modulo.ORGANIGRAMA, accesoValido: moduleAccessRule(Modulo.ORGANIGRAMA) },
    ];

    return (
        <Container minW={["auto", "container.lg", "container.xl"]}>
            <Flex pb={"0.2em"} direction={"row"} mb={"1em"} borderBottom={"0.04em solid"}>
                <Spacer flex={1} />
                <Heading flex={2} as={"h2"} size={"xl"} fontFamily={"Comfortaa Variable"}>
                    Inicio
                </Heading>
                <Spacer flex={2} />
                <HStack spacing={2}>
                    <Box
                        transform="skewX(-20deg)"
                        pl="1em"
                        pr="1em"
                        backgroundColor={versionBgColor}
                        alignContent={"center"}
                    >
                        <Box transform="skewX(10deg)">
                            <SplitText text="Version: 2.0" />
                        </Box>
                    </Box>

                    <Box
                        transform="skewX(-20deg)"
                        pl="1em"
                        pr="1em"
                        backgroundColor={userBgColor}
                        alignContent={"center"}
                    >
                        <Box transform="skewX(10deg)">
                            <SplitText text={"Usuario : " + user} />
                        </Box>
                    </Box>
                    <Tooltip label="Actualizar notificaciones">
                        <Button
                            size={"md"}
                            colorScheme={"blue"}
                            variant={"ghost"}
                            onClick={refreshNotifications}
                            leftIcon={<MdRefresh />}
                            aria-label="Actualizar notificaciones"
                        >
                            Actualizar
                        </Button>
                    </Tooltip>
                    <Tooltip label={colorMode === "light" ? "Modo oscuro" : "Modo claro"}>
                        <IconButton
                            size={"md"}
                            aria-label="Toggle color mode"
                            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                            onClick={toggleColorMode}
                            variant={"ghost"}
                        />
                    </Tooltip>
                    <Button size={"lg"} colorScheme={"green"} variant={"ghost"} onClick={logout}>
                        Cerrar Sesion
                    </Button>
                </HStack>
            </Flex>

            <SimpleGrid columns={[1, 1, 2, 3, 4]} gap={"0.5em"} rowGap={"1.5em"}>
                {cards
                    .filter((card) => card.accesoValido(access))
                    .map((card) => (
                        <SectionCard
                            key={card.to}
                            to={card.to}
                            name={card.name}
                            icon={card.icon}
                            bgColor={card.bgColor}
                            notification={card.notificationModulo ? getNotificationForModule(card.notificationModulo as Modulo) : undefined}
                        />
                    ))}
                {user === "super_master" && canAccessModule(access.moduloAccesos, Modulo.MASTER_DIRECTIVES) && (
                    <SectionCard
                        to={"/master_directives"}
                        name={"Directivas Super Master"}
                        icon={FaCogs}
                        bgColor="red.100"
                        notification={getNotificationForModule("MASTER_CONFIGS" as Modulo)}
                    />
                )}
            </SimpleGrid>
            <SuperMasterOnboardingModal
                isOpen={showSuperMasterOnboarding}
                onClose={() => setShowSuperMasterOnboarding(false)}
                onSuccess={() => setShowSuperMasterOnboarding(false)}
            />
        </Container>
    );
}
