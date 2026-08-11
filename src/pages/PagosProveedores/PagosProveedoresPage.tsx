import { useState, type JSX } from "react";
import { Container, Flex, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import BuscarTranOcmAsentar from "./BuscarTranOcmAsentar.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

export default function PagosProveedoresPage() {
    const access = useAccessSnapshot();
    const [selectedTab, setSelectedTab] = useState("");

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "asentar-transacciones", label: "Asentar Transacciones Almacen", render: () => <BuscarTranOcmAsentar />, accesoValido: tabAccessRule(Modulo.PAGOS_PROVEEDORES, "ASENTAR_TRANSACCIONES_ALMACEN", 1) },
        { key: "facturas-vencidas", label: "Facturas Vencidas", render: () => <p>Lista de Facturas Vencidas</p>, accesoValido: tabAccessRule(Modulo.PAGOS_PROVEEDORES, "FACTURAS_VENCIDAS", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));
    const activeTab = visibleTabs.some((tab) => tab.key === selectedTab)
        ? selectedTab
        : (visibleTabs[0]?.key ?? "");

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Pagos a Proveedores"} />
            <Flex direction="column" w="full" h="full">
                <Tabs.Root value={activeTab} onValueChange={({ value }) => setSelectedTab(value)}>
                    <Tabs.List>
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
