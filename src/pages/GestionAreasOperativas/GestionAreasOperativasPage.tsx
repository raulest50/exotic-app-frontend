import { Container, Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import CrearAreaProduccionTab from "./CrearAreaProduccion/CrearAreaProduccionTab.tsx";
import ConsultaAreasOperativasTab from "./ConsultaAreasOperativas/ConsultaAreasOperativasTab.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

export default function GestionAreasOperativasPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "crear-area-produccion", label: "Crear Area de Produccion", render: () => <CrearAreaProduccionTab />, accesoValido: tabAccessRule(Modulo.SEGUIMIENTO_PRODUCCION, "CREAR_AREA_PRODUCCION", 1) },
        { key: "consulta-areas-operativas", label: "Consulta Areas Operativas", render: () => <ConsultaAreasOperativasTab />, accesoValido: tabAccessRule(Modulo.SEGUIMIENTO_PRODUCCION, "CONSULTA_AREAS_OPERATIVAS", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Gestion Areas Operativas"} />
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
