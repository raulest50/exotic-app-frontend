import {
    SimpleGrid,
    Flex,
    Heading,
    Button,
    Container,
    Box,
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
import { MdOutlineFactCheck, MdOutlineInsights } from "react-icons/md";
import { FaSteam } from "react-icons/fa";
import { PiMicrosoftTeamsLogoFill } from "react-icons/pi";
import { MdNotificationsActive } from "react-icons/md";
import { FaCogs, FaCrown } from "react-icons/fa";
import { FaCalendarAlt } from "react-icons/fa";
import { MdRefresh } from "react-icons/md";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

import "@fontsource-variable/comfortaa";

import { Modulo } from "./Usuarios/GestionUsuarios/types.tsx";

import { useAuth } from "../context/AuthContext";
import { useMasterDirectives } from "../context/MasterDirectivesContext";
import {
    ENABLE_MASTER_SUPERMASTER_DIRECTIVES_ACCESS_DEFAULT,
    MASTER_DIRECTIVE_KEYS,
} from "../context/masterDirectiveConstants";
import { useNotifications } from "../context/NotificationsContext";
import type { AccessRule } from "../auth/accessModel.ts";
import { moduleAccessRule } from "../auth/accessHelpers.ts";

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
    const { loading: directivesLoading, getBooleanDirective } = useMasterDirectives();

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

    const masterCanAccessSuperMasterDirectives = getBooleanDirective(
        MASTER_DIRECTIVE_KEYS.ENABLE_MASTER_SUPERMASTER_DIRECTIVES_ACCESS,
        ENABLE_MASTER_SUPERMASTER_DIRECTIVES_ACCESS_DEFAULT
    );
    const normalizedUser = user?.trim().toLowerCase();
    const isSuperMasterUser = normalizedUser === "super_master";

    const canShowSuperMasterDirectivesCard =
        isSuperMasterUser ||
        (isMasterLike && !isSuperMasterUser && !directivesLoading && masterCanAccessSuperMasterDirectives);

    const cards: HomeCardDef[] = [
        { to: "/usuarios", name: "Roles y Usuarios", icon: FaUsersGear, notificationModulo: Modulo.USUARIOS, accesoValido: moduleAccessRule(Modulo.USUARIOS) },
        { to: "/producto", name: "Productos", icon: PiDownloadDuotone, notificationModulo: Modulo.PRODUCTOS, accesoValido: moduleAccessRule(Modulo.PRODUCTOS) },
        { to: "/produccion", name: "Gestion de Produccion", icon: AiOutlineAudit, notificationModulo: Modulo.PRODUCCION, accesoValido: moduleAccessRule(Modulo.PRODUCCION) },
        { to: "/stock", name: "Stock", icon: BsDatabaseCheck, notificationModulo: Modulo.STOCK, accesoValido: moduleAccessRule(Modulo.STOCK) },
        { to: "/Proveedores", name: "Proveedores", icon: FaIndustry, notificationModulo: Modulo.PROVEEDORES, accesoValido: moduleAccessRule(Modulo.PROVEEDORES) },
        { to: "/compras", name: "Compras", icon: GiBuyCard, notificationModulo: Modulo.COMPRAS, accesoValido: moduleAccessRule(Modulo.COMPRAS) },
        { to: "/gestion_areas_operativas", name: "Gestion Areas Operativas", icon: FaCogs, notificationModulo: Modulo.SEGUIMIENTO_PRODUCCION, accesoValido: moduleAccessRule(Modulo.SEGUIMIENTO_PRODUCCION) },
        { to: "/transacciones_almacen", name: "Transacciones de Almacen", icon: MdWarehouse, notificationModulo: Modulo.TRANSACCIONES_ALMACEN, accesoValido: moduleAccessRule(Modulo.TRANSACCIONES_ALMACEN) },
        { to: "/operaciones_criticas_bd", name: "Operaciones Criticas en BD", icon: FaFileUpload, notificationModulo: Modulo.OPERACIONES_CRITICAS_BD, bgColor: "red.100", accesoValido: (access) => access.isMasterLike && moduleAccessRule(Modulo.OPERACIONES_CRITICAS_BD)(access) },
        { to: "/Activos", name: "Activos Fijos", icon: FaSteam, notificationModulo: Modulo.ACTIVOS, accesoValido: moduleAccessRule(Modulo.ACTIVOS) },
        { to: "/Contabilidad", name: "Contabilidad", icon: TbReportMoney, notificationModulo: Modulo.CONTABILIDAD, accesoValido: moduleAccessRule(Modulo.CONTABILIDAD) },
        { to: "/Personal", name: "Personal", icon: PiMicrosoftTeamsLogoFill, notificationModulo: Modulo.PERSONAL_PLANTA, accesoValido: moduleAccessRule(Modulo.PERSONAL_PLANTA) },
        { to: "/Bintelligence", name: "BI", icon: MdOutlineInsights, notificationModulo: Modulo.BINTELLIGENCE, accesoValido: moduleAccessRule(Modulo.BINTELLIGENCE) },
        { to: "/administracion_alertas", name: "Administracion Alertas", icon: MdNotificationsActive, notificationModulo: Modulo.ADMINISTRACION_ALERTAS, accesoValido: moduleAccessRule(Modulo.ADMINISTRACION_ALERTAS) },
        { to: "/administracion_global", name: "Administracion Global", icon: FaCrown, notificationModulo: Modulo.ADMINISTRACION_GLOBAL, accesoValido: moduleAccessRule(Modulo.ADMINISTRACION_GLOBAL) },
        { to: "/cronograma", name: "Cronograma", icon: FaCalendarAlt, notificationModulo: Modulo.CRONOGRAMA, accesoValido: moduleAccessRule(Modulo.CRONOGRAMA) },
        { to: "/organigrama", name: "Organigrama", icon: FaSitemap, notificationModulo: Modulo.ORGANIGRAMA, accesoValido: moduleAccessRule(Modulo.ORGANIGRAMA) },
        { to: "/calidad", name: "Calidad", icon: MdOutlineFactCheck, notificationModulo: Modulo.CALIDAD, accesoValido: moduleAccessRule(Modulo.CALIDAD) },
    ];

    return (
        <Container
            w="full"
            maxW={{ base: "100%", xl: "container.xl", "2xl": "container.2xl" }}
            px={{ base: 3, md: 5, xl: 6 }}
            py={{ base: 3, md: 4 }}
            mx="auto"
        >
            <Flex
                pb="0.5em"
                direction={{ base: "column", md: "row" }}
                align={{ base: "stretch", md: "center" }}
                justify="space-between"
                gap={{ base: 3, md: 4 }}
                mb="1em"
                borderBottom="0.04em solid"
            >
                <Heading as="h2" size={{ base: "lg", md: "xl" }} fontFamily="Comfortaa Variable">
                    Inicio
                </Heading>
                <Flex gap={2} wrap="wrap" justify={{ base: "flex-start", md: "flex-end" }} align="center">
                    <Box
                        transform={{ base: "none", sm: "skewX(-20deg)" }}
                        px={{ base: 2, md: "1em" }}
                        py={{ base: 1, md: 0 }}
                        backgroundColor={versionBgColor}
                        alignContent="center"
                        borderRadius={{ base: "md", sm: 0 }}
                        maxW="full"
                        overflow="hidden"
                    >
                        <Box transform={{ base: "none", sm: "skewX(10deg)" }}>
                            <SplitText text="Version: 3.0" fontSize={{ base: "sm", md: "md", lg: "xl" }} />
                        </Box>
                    </Box>

                    <Box
                        transform={{ base: "none", sm: "skewX(-20deg)" }}
                        px={{ base: 2, md: "1em" }}
                        py={{ base: 1, md: 0 }}
                        backgroundColor={userBgColor}
                        alignContent="center"
                        borderRadius={{ base: "md", sm: 0 }}
                        maxW={{ base: "100%", md: "18rem" }}
                        overflow="hidden"
                    >
                        <Box transform={{ base: "none", sm: "skewX(10deg)" }}>
                            <SplitText text={"Usuario : " + user} fontSize={{ base: "sm", md: "md", lg: "xl" }} />
                        </Box>
                    </Box>
                    <Tooltip label="Actualizar notificaciones">
                        <Button
                            display={{ base: "none", sm: "inline-flex" }}
                            size="md"
                            colorScheme="blue"
                            variant="ghost"
                            onClick={refreshNotifications}
                            leftIcon={<MdRefresh />}
                            aria-label="Actualizar notificaciones"
                        >
                            Actualizar
                        </Button>
                    </Tooltip>
                    <Tooltip label="Actualizar notificaciones">
                        <IconButton
                            display={{ base: "inline-flex", sm: "none" }}
                            size="md"
                            colorScheme="blue"
                            variant="ghost"
                            onClick={refreshNotifications}
                            icon={<MdRefresh />}
                            aria-label="Actualizar notificaciones"
                        />
                    </Tooltip>
                    <Tooltip label={colorMode === "light" ? "Modo oscuro" : "Modo claro"}>
                        <IconButton
                            size="md"
                            aria-label="Toggle color mode"
                            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                            onClick={toggleColorMode}
                            variant="ghost"
                        />
                    </Tooltip>
                    <Button size="md" colorScheme="green" variant="ghost" onClick={logout}>
                        Cerrar Sesion
                    </Button>
                </Flex>
            </Flex>

            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={{ base: 3, md: "0.5em" }} rowGap={{ base: 3, md: "1.5em" }}>
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
                {canShowSuperMasterDirectivesCard && (
                    <SectionCard
                        to={"/super_master_directives"}
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
