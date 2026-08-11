import React, { useState } from 'react';
import { Container, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import CrearVendedor from './TabsContent/CrearVendedor';
import { Modulo } from '../Usuarios/GestionUsuarios/types.tsx';
import { moduleAccessRule } from '../../auth/accessHelpers.ts';
import { useAccessSnapshot } from '../../auth/usePermissions';
import type { AccessRule } from '../../auth/accessModel.ts';

const VentasPage: React.FC = () => {
    const access = useAccessSnapshot();
    const [selectedTab, setSelectedTab] = useState("");

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
    const activeTab = visibleTabs.some((tab) => tab.key === selectedTab)
        ? selectedTab
        : (visibleTabs[0]?.key ?? "");

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Gestión de Ventas'} />
            <Tabs.Root
                fitted
                gap="1em"
                variant="line"
                value={activeTab}
                onValueChange={({ value }) => setSelectedTab(value)}
            >
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
        </Container>
    );
};

export default VentasPage;
