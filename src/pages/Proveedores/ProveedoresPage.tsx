
import {
    Container, Tab, TabList, TabPanel, TabPanels, Tabs,
} from "@chakra-ui/react";
import { Modulo } from '../Usuarios/GestionUsuarios/types.tsx';
import { useModuleAccessLevel } from '../../auth/usePermissions';

import MyHeader from "../../components/MyHeader.tsx";
import {my_style_tab} from "../../styles/styles_general.tsx";
import CodificarProveedor from "./CodificarProveedor.tsx";
import {ConsultarProveedores} from "./consultar/ConsultarProveedores.tsx";

function ProveedoresPage() {
    const { nivel: proveedoresAccessLevel } = useModuleAccessLevel(Modulo.PROVEEDORES);

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Registrar Proveedor'} />

            <Tabs>
                <TabList>
                    {/* Solo mostrar la pestaña de codificar si el usuario es master o tiene nivel 2 o superior */}
                    {proveedoresAccessLevel >= 2 && (
                        <Tab sx={my_style_tab}> Codificar Proveedor </Tab>
                    )}
                    <Tab sx={my_style_tab}> Consultar Proveedores </Tab>
                </TabList>

                <TabPanels>
                    {/* Solo renderizar el panel de codificar si el usuario es master o tiene nivel 2 o superior */}
                    {proveedoresAccessLevel >= 2 && (
                        <TabPanel>
                            <CodificarProveedor/>
                        </TabPanel>
                    )}

                    <TabPanel>
                        <ConsultarProveedores />
                    </TabPanel>

                </TabPanels>
            </Tabs>

        </Container>
    );
}

export default ProveedoresPage;
