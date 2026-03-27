import type { ReactNode } from "react";
import { Container, Tabs, TabList, TabPanels, Tab, TabPanel, Center, Spinner, Text } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import UserFullRoleCRUD from "./GestionUsuarios/UserFullRoleCRUD.tsx";
import InfoNiveles from "./InfoNiveles.tsx";
import GestionNotificacionesTab from "./GestionNotificaciones/GestionNotificacionesTab.tsx";
import { useAuth } from "../../context/AuthContext";
import { Modulo } from "./GestionUsuarios/types.tsx";
import { TABS_BY_MODULO } from "../../auth/moduleTabDefinitions.ts";
import { canAccessTabOrMaster } from "../../auth/accessHelpers";

const USUARIOS_TAB_CONTENT: Record<string, ReactNode> = {
    GESTION_USUARIOS: <UserFullRoleCRUD />,
    INFO_NIVELES: <InfoNiveles />,
    NOTIFICACIONES: <GestionNotificacionesTab />,
};

const USUARIOS_TAB_LABELS: Record<string, string> = {
    GESTION_USUARIOS: "Gestion de Usuarios",
    INFO_NIVELES: "Info Niveles de Acceso",
    NOTIFICACIONES: "Notificaciones",
};

export default function UsuariosPage() {
    const { moduloAccesos, accesosReady, roles, user } = useAuth();
    const tabDefs = TABS_BY_MODULO[Modulo.USUARIOS] ?? [];

    const visibleTabs = tabDefs.filter(
        (d) => accesosReady && canAccessTabOrMaster(roles, user, moduloAccesos, Modulo.USUARIOS, d.tabId)
    );

    if (!accesosReady) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} minH={"100vh"} w={"full"} h={"full"}>
                <MyHeader title={"Roles y Usuarios"} />
                <Center py={10}>
                    <Spinner size="lg" mr={3} />
                    <Text>Cargando permisos…</Text>
                </Center>
            </Container>
        );
    }

    if (visibleTabs.length === 0) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} minH={"100vh"} w={"full"} h={"full"}>
                <MyHeader title={"Roles y Usuarios"} />
                <Text mt={6}>No tienes acceso a ninguna pestaña de este módulo.</Text>
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} minH={"100vh"} w={"full"} h={"full"}>
            <MyHeader title={"Roles y Usuarios"} />
            <Tabs>
                <TabList>
                    {visibleTabs.map((d) => (
                        <Tab key={d.tabId}>{USUARIOS_TAB_LABELS[d.tabId] ?? d.label}</Tab>
                    ))}
                </TabList>
                <TabPanels>
                    {visibleTabs.map((d) => (
                        <TabPanel key={d.tabId}>{USUARIOS_TAB_CONTENT[d.tabId]}</TabPanel>
                    ))}
                </TabPanels>
            </Tabs>
        </Container>
    );
}
