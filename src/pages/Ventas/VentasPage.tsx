import React from 'react';
import {
    Container,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
} from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import CrearVendedor from './TabsContent/CrearVendedor';
import { Modulo } from '../Usuarios/GestionUsuarios/types.tsx';
import { moduleAccessRule } from '../../auth/accessHelpers.ts';
import { useAccessSnapshot } from '../../auth/usePermissions';
import type { AccessRule } from '../../auth/accessModel.ts';

const VentasPage: React.FC = () => {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        {
            key: 'crear-venta',
            label: 'Crear Venta',
            render: () => <p>Formulario de registro de ventas en desarrollo.</p>,
            accesoValido: moduleAccessRule(Modulo.VENTAS, 1),
        },
        {
            key: 'historial-ventas',
            label: 'Historial de Ventas',
            render: () => <p>Historial de ventas en desarrollo.</p>,
            accesoValido: moduleAccessRule(Modulo.VENTAS, 1),
        },
        {
            key: 'reportes',
            label: 'Reportes',
            render: () => <p>Reportes de ventas en desarrollo.</p>,
            accesoValido: moduleAccessRule(Modulo.VENTAS, 1),
        },
        {
            key: 'crear-vendedor',
            label: 'Crear vendedor nuevo',
            render: () => <CrearVendedor />,
            accesoValido: moduleAccessRule(Modulo.VENTAS, 3),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Gestión de Ventas'} />
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

export default VentasPage;
