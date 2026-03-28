import { Container, Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import { IncorporarPersonal } from "./IncorporarPersonal.tsx";
import { ConsultaDePersonal } from "./ConsultaDePersonal.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

export default function PersonalPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "incorporacion", label: "Incorporacion", render: () => <IncorporarPersonal />, accesoValido: tabAccessRule(Modulo.PERSONAL_PLANTA, "INCORPORACION", 1) },
        { key: "consulta", label: "Consulta", render: () => <ConsultaDePersonal />, accesoValido: tabAccessRule(Modulo.PERSONAL_PLANTA, "CONSULTA", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Personal"} />
            <Flex direction="column" w="full" h="full">
                <Tabs>
                    <TabList>
                        {visibleTabs.map((tab) => (
                            <Tab key={tab.key} sx={my_style_tab}>{tab.label}</Tab>
                        ))}
                    </TabList>
                    <TabPanels>
                        {visibleTabs.map((tab) => (
                            <TabPanel key={tab.key}>{tab.render()}</TabPanel>
                        ))}
                    </TabPanels>
                </Tabs>
            </Flex>
        </Container>
    );
}
