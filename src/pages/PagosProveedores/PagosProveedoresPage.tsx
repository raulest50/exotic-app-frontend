import { Container, Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import BuscarTranOcmAsentar from "./BuscarTranOcmAsentar.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

export default function PagosProveedoresPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "asentar-transacciones", label: "Asentar Transacciones Almacen", render: () => <BuscarTranOcmAsentar />, accesoValido: tabAccessRule(Modulo.PAGOS_PROVEEDORES, "ASENTAR_TRANSACCIONES_ALMACEN", 1) },
        { key: "facturas-vencidas", label: "Facturas Vencidas", render: () => <p>Lista de Facturas Vencidas</p>, accesoValido: tabAccessRule(Modulo.PAGOS_PROVEEDORES, "FACTURAS_VENCIDAS", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Pagos a Proveedores"} />
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
