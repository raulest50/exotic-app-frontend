import { Container, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import CodificarProveedor from "./CodificarProveedor.tsx";
import { ConsultarProveedores } from "./consultar/ConsultarProveedores.tsx";
import { Modulo } from '../Usuarios/GestionUsuarios/types.tsx';
import { moduleAccessRule } from '../../auth/accessHelpers.ts';
import { useAccessSnapshot } from '../../auth/usePermissions.ts';
import type { AccessRule } from '../../auth/accessModel.ts';

function ProveedoresPage() {
    const access = useAccessSnapshot();

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

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Registrar Proveedor'} />

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

export default ProveedoresPage;
