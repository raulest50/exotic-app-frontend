/**
 * Componente: BasicOperationsTabs
 * 
 * Ubicación en la navegación:
 * Productos > Basic
 * 
 * Descripción:
 * Componente principal que gestiona las pestañas de la sección Basic de Productos.
 * Incluye pestañas para codificar materiales y consultar productos.
 */

import {useState} from 'react';
import {Button, Flex, Tab, TabList, TabPanel, TabPanels, Tabs} from '@chakra-ui/react';
import {FaArrowLeft} from 'react-icons/fa';
import CodificarMaterialesTab from './CodificarMaterialesTab.tsx';
import InformeProductosTab from './InformeProductosTab.tsx';
import {my_style_tab} from '../../../styles/styles_general.tsx';

interface Props {
    productosAccessLevel: number;
    onBack: () => void;
}

export function BasicOperationsTabs({productosAccessLevel, onBack}: Props) {
    const [tabIndex, setTabIndex] = useState(0);

    return (
        <Flex direction={'column'} gap={4} w="full" h="full">
            <Button leftIcon={<FaArrowLeft />} w="fit-content" onClick={onBack}>
                Volver
            </Button>
            <Tabs isFitted gap="1em" variant="line" index={tabIndex} onChange={setTabIndex}>
                <TabList>
                    {productosAccessLevel >= 2 && (
                        <Tab sx={my_style_tab}>Codificar Material</Tab>
                    )}
                    <Tab sx={my_style_tab}>Consulta</Tab>
                </TabList>

                <TabPanels>
                    {productosAccessLevel >= 2 && (
                        <TabPanel>
                            <CodificarMaterialesTab />
                        </TabPanel>
                    )}
                    <TabPanel>
                        <InformeProductosTab />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Flex>
    );
}

export default BasicOperationsTabs;
