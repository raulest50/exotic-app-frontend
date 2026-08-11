import { useState } from 'react';
import { Button, Flex, Tabs } from '@chakra-ui/react';
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
    const activeTabKey = visibleTabs[tabIndex]?.key ?? visibleTabs[0]?.key;

    const handleTabChange = ({ value }: { value: string }) => {
        const nextIndex = visibleTabs.findIndex((tab) => tab.key === value);
        if (nextIndex >= 0) {
            setTabIndex(nextIndex);
        }
    };

    return (
        <Flex direction={'column'} gap={4} w="full" h="full">
            <Button w="fit-content" onClick={onBack}><FaArrowLeft />Volver
                            </Button>
            <Tabs.Root fitted gap="1em" variant='line' value={activeTabKey} onValueChange={handleTabChange}>
                <Tabs.List>
                    {visibleTabs.map((tab) => (
                        <Tabs.Trigger key={tab.key} value={tab.key} css={my_style_tab}>
                            {tab.label}
                        </Tabs.Trigger>
                    ))}
                </Tabs.List>

                <Tabs.ContentGroup>
                    {visibleTabs.map((tab) => (
                        <Tabs.Content key={tab.key} value={tab.key}>
                            {tab.render()}
                        </Tabs.Content>
                    ))}
                </Tabs.ContentGroup>
            </Tabs.Root>
        </Flex>
    );
}

export default BasicOperationsTabs;
