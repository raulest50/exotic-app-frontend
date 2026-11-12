import { useState, type JSX } from "react";
import { Container, Flex, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { IncorporarPersonal } from "./IncorporarPersonal.tsx";
import { ConsultaDePersonal } from "./ConsultaDePersonal.tsx";
import { HorasExtraPersonal } from "./HorasExtraPersonal.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { exactTabAccessRuleWithMasterBypass, tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";
import PermisosPersonal from "./Permisos/PermisosPersonal";

export default function PersonalPage() {
    const access = useAccessSnapshot();
    const [selectedTab, setSelectedTab] = useState("");

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "incorporacion", label: "Incorporacion", render: () => <IncorporarPersonal />, accesoValido: tabAccessRule(Modulo.PERSONAL_PLANTA, "INCORPORACION", 1) },
        { key: "consulta", label: "Consulta", render: () => <ConsultaDePersonal />, accesoValido: tabAccessRule(Modulo.PERSONAL_PLANTA, "CONSULTA", 1) },
        { key: "horas-extra", label: "Horas Extra", render: () => <HorasExtraPersonal />, accesoValido: tabAccessRule(Modulo.PERSONAL_PLANTA, "CONSULTA", 1) },
        { key: "permisos", label: "Permisos", render: () => <PermisosPersonal />, accesoValido: exactTabAccessRuleWithMasterBypass(Modulo.PERSONAL_PLANTA, "PERMISOS", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));
    const activeTab = visibleTabs.some((tab) => tab.key === selectedTab)
        ? selectedTab
        : (visibleTabs[0]?.key ?? "");

    return (
        <Container minW={0} maxW="full" w="full" h="full" px={{ base: 2, md: 5 }}>
            <MyHeader title={"Personal"} />
            <Flex direction="column" w="full" h="full">
                <Tabs.Root value={activeTab} onValueChange={({ value }) => setSelectedTab(value)} w="full" minW={0} lazyMount>
                    <Tabs.List flexWrap="wrap">
                        {visibleTabs.map((tab) => (
                            <Tabs.Trigger
                                key={tab.key}
                                value={tab.key}
                                borderRadius={0}
                                _active={{ bg: "app.tabSelected" }}
                                _selected={{ bg: "app.tabSelected" }}
                            >
                                {tab.label}
                            </Tabs.Trigger>
                        ))}
                    </Tabs.List>
                    {visibleTabs.map((tab) => (
                        <Tabs.Content key={tab.key} value={tab.key}>
                            {tab.render()}
                        </Tabs.Content>
                    ))}
                </Tabs.Root>
            </Flex>
        </Container>
    );
}
