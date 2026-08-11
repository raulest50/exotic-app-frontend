import { useState } from "react";
import { Container, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import CodificarProveedor from "./CodificarProveedor.tsx";
import { ConsultarProveedores } from "./consultar/ConsultarProveedores.tsx";
import { Modulo } from '../Usuarios/GestionUsuarios/types.tsx';
import { moduleAccessRule } from '../../auth/accessHelpers.ts';
import { useAccessSnapshot } from '../../auth/usePermissions.ts';
import type { AccessRule } from '../../auth/accessModel.ts';

function ProveedoresPage() {
    const access = useAccessSnapshot();
    const [selectedTab, setSelectedTab] = useState("");

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        {
            key: 'codificar-proveedor',
            label: 'Codificar Proveedor',
            render: () => <CodificarProveedor />,
            accesoValido: moduleAccessRule(Modulo.PROVEEDORES, 2),
        },
        {
            key: 'consultar-proveedores',
            label: 'Consultar Proveedores',
            render: () => <ConsultarProveedores />,
            accesoValido: moduleAccessRule(Modulo.PROVEEDORES, 1),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));
    const activeTab = visibleTabs.some((tab) => tab.key === selectedTab)
        ? selectedTab
        : (visibleTabs[0]?.key ?? "");

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Registrar Proveedor'} />

            <Tabs.Root value={activeTab} onValueChange={({ value }) => setSelectedTab(value)}>
                <Tabs.List>
                    {visibleTabs.map((tab) => (
                        <Tabs.Trigger
                            key={tab.key}
                            value={tab.key}
                            borderRadius={0}
                            _active={{ bg: 'app.tabSelected' }}
                            _selected={{ bg: 'app.tabSelected' }}
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
        </Container>
    );
}

export default ProveedoresPage;
