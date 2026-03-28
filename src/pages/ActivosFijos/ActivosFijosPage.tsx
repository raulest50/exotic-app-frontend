import { Container, Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { IncorporacionActivosFijos } from "./Incorporacion/IncorporacionActivosFijos.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import CrearOC_AF from "./OC/CrearOC_AF.tsx";
import { ReportesTabAf } from "./Reportes/ReportesTabAF.tsx";
import ReportesActivosFijosTab from "./Reportes/ReportesActivosFijosTab";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

export default function ActivosFijosPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "incorporacion", label: "Incorporacion", render: () => <IncorporacionActivosFijos />, accesoValido: tabAccessRule(Modulo.ACTIVOS, "INCORPORACION", 1) },
        { key: "crear-oc-af", label: "Crear OC-AF", render: () => <CrearOC_AF />, accesoValido: tabAccessRule(Modulo.ACTIVOS, "CREAR_OC_AF", 1) },
        { key: "reportes-oc-af", label: "Reportes OC-AF", render: () => <ReportesTabAf />, accesoValido: tabAccessRule(Modulo.ACTIVOS, "REPORTES_OC_AF", 1) },
        { key: "reportes-af", label: "Reportes Activos Fijos", render: () => <ReportesActivosFijosTab />, accesoValido: tabAccessRule(Modulo.ACTIVOS, "REPORTES_ACTIVOS_FIJOS", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Activos"} />
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
