import React from 'react';
import {
    Container,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Text,
} from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import CrearVendedor from './TabsContent/CrearVendedor';
import { Modulo } from '../Usuarios/GestionUsuarios/types.tsx';
import { useModuleAccessLevel } from '../../auth/usePermissions';

const VentasPage: React.FC = () => {
    const { nivel: ventasAccessLevel } = useModuleAccessLevel(Modulo.VENTAS);


    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Gestión de Ventas'} />
            <Tabs isFitted gap="1em" variant="line">
                <TabList>
                    <Tab sx={my_style_tab}>Crear Venta</Tab>
                    <Tab sx={my_style_tab}>Historial de Ventas</Tab>
                    <Tab sx={my_style_tab}>Reportes</Tab>
                    {ventasAccessLevel >= 3 && (
                        <Tab sx={my_style_tab}>Crear vendedor nuevo</Tab>
                    )}
                </TabList>
                <TabPanels>
                    <TabPanel>
                        {/* Contenido para crear ventas */}
                        <p>Formulario de registro de ventas en desarrollo.</p>
                    </TabPanel>
                    <TabPanel>
                        {/* Contenido para historial de ventas */}
                        <p>Historial de ventas en desarrollo.</p>
                    </TabPanel>
                    <TabPanel>
                        {/* Contenido para reportes */}
                        <p>Reportes de ventas en desarrollo.</p>
                    </TabPanel>
                    {ventasAccessLevel >= 3 && (
                        <TabPanel>
                            <CrearVendedor />
                        </TabPanel>
                    )}
                </TabPanels>
            </Tabs>
        </Container>
    );
};

export default VentasPage;
