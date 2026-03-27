import { Container, Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import CodificarCliente from "./CodificarCliente.tsx";
import { ConsultarClientes } from "./consultar/ConsultarClientes.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { useModuleAccessLevel } from "../../auth/usePermissions";

const ClientesPage: React.FC = () => {
    const { nivel: clientesAccessLevel } = useModuleAccessLevel(Modulo.CLIENTES);

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Gestión de Clientes'} />
            <Tabs isFitted gap="1em" variant="line">
                <TabList>
                    {clientesAccessLevel >= 2 && (
                        <Tab sx={my_style_tab}>Registrar Cliente</Tab>
                    )}
                    <Tab sx={my_style_tab}>Consultar Clientes</Tab>
                </TabList>
                <TabPanels>
                    {clientesAccessLevel >= 2 && (
                        <TabPanel>
                            <CodificarCliente />
                        </TabPanel>
                    )}
                    <TabPanel>
                        <ConsultarClientes />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Container>
    );
};

export default ClientesPage;
