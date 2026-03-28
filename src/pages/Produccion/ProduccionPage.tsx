import { Container, Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";

import MyHeader from '../../components/MyHeader.tsx';

import { my_style_tab } from "../../styles/styles_general.tsx";

import CrearOrdenesTab from "./CrearOrdenesTab/CrearOrdenesTab.tsx";
import HistorialOrdenesTab from "./HistorialOrdenesTab/HistorialOrdenesTab.tsx";
import ConfParamsCategoria from "./ConfParamsCategoria/ConfParamsCategoria.tsx";
import { PlaneacionProduccionTab } from "./PlaneacionProduccionTab/PlaneacionProduccionTab.tsx";
import { Modulo } from '../Usuarios/GestionUsuarios/types.tsx';
import { moduleAccessRule } from '../../auth/accessHelpers.ts';
import { useAccessSnapshot } from '../../auth/usePermissions';
import type { AccessRule } from '../../auth/accessModel.ts';

export default function ProduccionPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        {
            key: 'crear-odp',
            label: 'Crear ODP Manualmente',
            render: () => <CrearOrdenesTab />,
            accesoValido: moduleAccessRule(Modulo.PRODUCCION, 1),
        },
        {
            key: 'historial',
            label: 'Historial',
            render: () => <HistorialOrdenesTab />,
            accesoValido: moduleAccessRule(Modulo.PRODUCCION, 1),
        },
        {
            key: 'parametros-categoria',
            label: 'Parametros por Categoría',
            render: () => <ConfParamsCategoria />,
            accesoValido: moduleAccessRule(Modulo.PRODUCCION, 3),
        },
        {
            key: 'planeacion',
            label: 'Planeacion Produccion',
            render: () => <PlaneacionProduccionTab />,
            accesoValido: moduleAccessRule(Modulo.PRODUCCION, 1),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Produccion'} />

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
