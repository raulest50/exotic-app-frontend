import { Container, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import InformesDiariosTab from "./InformesDiariosTab/InformesDiariosTab.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import TimeSeriesTab from "./TimeSeriesTab.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

export default function BintelligencePage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "informes-diarios", label: "Informes Diarios", render: () => <InformesDiariosTab />, accesoValido: tabAccessRule(Modulo.BINTELLIGENCE, "INFORMES_DIARIOS", 1) },
        { key: "series-tiempo", label: "Series De Tiempo y Proyecciones", render: () => <TimeSeriesTab />, accesoValido: tabAccessRule(Modulo.BINTELLIGENCE, "SERIES_TIEMPO_PROYECCIONES", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"BI"} />
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
        </Container>
    );
}
