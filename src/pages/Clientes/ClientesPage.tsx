import { Container, Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import CodificarCliente from "./CodificarCliente.tsx";
import { ConsultarClientes } from "./consultar/ConsultarClientes.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { moduleAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

const ClientesPage: React.FC = () => {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        {
            key: "registrar-cliente",
            label: "Registrar Cliente",
            render: () => <CodificarCliente />,
            accesoValido: moduleAccessRule(Modulo.CLIENTES, 2),
        },
        {
            key: "consultar-clientes",
            label: "Consultar Clientes",
            render: () => <ConsultarClientes />,
            accesoValido: moduleAccessRule(Modulo.CLIENTES, 1),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Gestión de Clientes'} />
            <Tabs isFitted gap="1em" variant="line">
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
};

export default ClientesPage;
