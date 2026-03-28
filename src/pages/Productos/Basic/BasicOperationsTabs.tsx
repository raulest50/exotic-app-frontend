import { useState } from 'react';
import { Button, Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { FaArrowLeft } from 'react-icons/fa';
import CodificarMaterialesTab from './CodificarMaterialesTab.tsx';
import InformeProductosTab from './InformeProductosTab.tsx';
import { my_style_tab } from '../../../styles/styles_general.tsx';
import { Modulo } from '../../Usuarios/GestionUsuarios/types.tsx';
import { moduleAccessRule } from '../../../auth/accessHelpers.ts';
import { useAccessSnapshot } from '../../../auth/usePermissions.ts';
import type { AccessRule } from '../../../auth/accessModel.ts';

interface Props {
    onBack: () => void;
}

type TabDef = {
    key: string;
    label: string;
    render: () => JSX.Element;
    accesoValido: AccessRule;
};

export function BasicOperationsTabs({ onBack }: Props) {
    const [tabIndex, setTabIndex] = useState(0);
    const access = useAccessSnapshot();

    const tabs: TabDef[] = [
        {
            key: 'codificar-material',
            label: 'Codificar Material',
            render: () => <CodificarMaterialesTab />,
            accesoValido: moduleAccessRule(Modulo.PRODUCTOS, 2),
        },
        {
            key: 'consulta',
            label: 'Consulta',
            render: () => <InformeProductosTab />,
            accesoValido: moduleAccessRule(Modulo.PRODUCTOS, 1),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Flex direction={'column'} gap={4} w="full" h="full">
            <Button leftIcon={<FaArrowLeft />} w="fit-content" onClick={onBack}>
                Volver
            </Button>
            <Tabs isFitted gap="1em" variant="line" index={tabIndex} onChange={setTabIndex}>
                <TabList>
                    {visibleTabs.map((tab) => (
                        <Tab key={tab.key} sx={my_style_tab}>
                            {tab.label}
                        </Tab>
                    ))}
                </TabList>

                <TabPanels>
                    {visibleTabs.map((tab) => (
                        <TabPanel key={tab.key}>{tab.render()}</TabPanel>
                    ))}
                </TabPanels>
            </Tabs>
        </Flex>
    );
}

export default BasicOperationsTabs;
