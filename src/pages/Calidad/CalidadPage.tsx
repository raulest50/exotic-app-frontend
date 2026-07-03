import { Alert, AlertIcon, Container, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader";
import { my_style_tab } from "../../styles/styles_general";
import { useAccessSnapshot } from "../../auth/usePermissions";
import { tabAccessRule } from "../../auth/accessHelpers";
import type { AccessRule } from "../../auth/accessModel";
import { Modulo } from "../Usuarios/GestionUsuarios/types";
import VersionadoControlProcesoTab from "./VersionadoControlProcesoTab";
import DiligenciarControlProcesoTab from "./DiligenciarControlProcesoTab";
import HistorialControlProcesoTab from "./HistorialControlProcesoTab";

export default function CalidadPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        {
            key: "versionado-control-proceso",
            label: "Versionado Control de Proceso",
            render: () => <VersionadoControlProcesoTab />,
            accesoValido: tabAccessRule(Modulo.CALIDAD, "VERSIONADO_CONTROL_PROCESO", 1),
        },
        {
            key: "diligenciar-control-proceso",
            label: "Diligenciar Control de Proceso",
            render: () => <DiligenciarControlProcesoTab />,
            accesoValido: tabAccessRule(Modulo.CALIDAD, "DILIGENCIAR_CONTROL_PROCESO", 1),
        },
        {
            key: "historial-control-proceso",
            label: "Historial Control de Proceso",
            render: () => <HistorialControlProcesoTab />,
            accesoValido: tabAccessRule(Modulo.CALIDAD, "HISTORIAL_CONTROL_PROCESO", 1),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Calidad" />
            {visibleTabs.length === 0 ? (
                <Alert status="warning">
                    <AlertIcon />
                    No tiene tabs habilitados para este modulo.
                </Alert>
            ) : (
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
            )}
        </Container>
    );
}
