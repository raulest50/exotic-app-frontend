import { Container, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader";
import { my_style_tab } from "../../styles/styles_general.tsx";
import CrearOCM from "./CrearOCM.tsx";
import ReporteOrdenesCompras from "./ReporteOrdenesCompras.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

function ComprasPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "crear-ocm", label: "Crear OC-M", render: () => <CrearOCM />, accesoValido: tabAccessRule(Modulo.COMPRAS, "CREAR_OCM", 1) },
        { key: "reportes-ordenes-compra", label: "Reportes Ordenes de Compra", render: () => <ReporteOrdenesCompras />, accesoValido: tabAccessRule(Modulo.COMPRAS, "REPORTES_ORDENES_COMPRA", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Modulo de Compras"} />
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

export default ComprasPage;
