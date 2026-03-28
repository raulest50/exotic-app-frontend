import { Container, Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import InventarioConsolidadoTab from "./InventarioConsolidado/InventarioConsolidadoTab.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import { KardexTab } from "./Kardex/KardexTab.tsx";
import HistorialTransaccionesAlmacenTab from "./HistorialTransaccionesAlamacen/HistorialTransaccionesAlmacenTab.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

export default function StockPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "consolidado", label: "Consolidado", render: () => <InventarioConsolidadoTab />, accesoValido: tabAccessRule(Modulo.STOCK, "CONSOLIDADO", 1) },
        { key: "kardex", label: "Kardex", render: () => <KardexTab />, accesoValido: tabAccessRule(Modulo.STOCK, "KARDEX", 1) },
        { key: "historial-transacciones", label: "Historial Transacciones de Almacen", render: () => <HistorialTransaccionesAlmacenTab />, accesoValido: tabAccessRule(Modulo.STOCK, "HISTORIAL_TRANSACCIONES_ALMACEN", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Stock"} />
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
