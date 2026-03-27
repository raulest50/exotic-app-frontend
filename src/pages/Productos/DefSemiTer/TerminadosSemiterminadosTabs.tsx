/**
 * Componente: TerminadosSemiterminadosTabs
 * 
 * Ubicación en la navegación:
 * Productos > Definir Terminado/Semiterminado
 * 
 * Descripción:
 * Componente principal que gestiona las pestañas de la sección de Definir Terminado/Semiterminado.
 * Incluye pestañas para codificar productos, gestionar categorías y realizar modificaciones
 * a productos existentes (esta última solo disponible para usuarios con nivel de acceso 3 o superior).
 */

import {useState} from 'react';
import {Button, Flex, Tab, TabList, TabPanel, TabPanels, Tabs} from '@chakra-ui/react';
import {FaArrowLeft} from 'react-icons/fa';
import CodificarSemioTermiTab from './CodificarSemioTermiTab/CodificarSemioTermiTab.tsx';
import {CategoriasTab} from './CategoriasTab.tsx';
import InformeProductosTab from '../Basic/InformeProductosTab.tsx';
import InformeProductosTabAdvanced from './consulta/InformeProductosTabAdvanced.tsx';
import {my_style_tab} from '../../../styles/styles_general.tsx';

interface Props {
    productosAccessLevel: number;
    onBack: () => void;
}

export function TerminadosSemiterminadosTabs({productosAccessLevel, onBack}: Props) {
    const [tabIndex, setTabIndex] = useState(0);

    return (
        <Flex direction={'column'} gap={4} w="full" h="full">
            <Button leftIcon={<FaArrowLeft />} w="fit-content" onClick={onBack}>
                Volver
            </Button>
            <Tabs isFitted gap="1em" variant="line" index={tabIndex} onChange={setTabIndex}>
                <TabList>
                    {productosAccessLevel >= 2 && (
                        <Tab sx={my_style_tab}>Codificar Terminado/Semiterminado</Tab>
                    )}
                    {productosAccessLevel >= 2 && (
                        <Tab sx={my_style_tab}>Categorías</Tab>
                    )}
                    {/* Nueva pestaña para la versión avanzada */}
                    {productosAccessLevel >= 3 && (
                        <Tab sx={my_style_tab}>Modificaciones</Tab>
                    )}
                </TabList>

                <TabPanels>
                    {productosAccessLevel >= 2 && (
                        <TabPanel>
                            <CodificarSemioTermiTab isActive={tabIndex === 0} />
                        </TabPanel>
                    )}
                    {productosAccessLevel >= 2 && (
                        <TabPanel>
                            <CategoriasTab />
                        </TabPanel>
                    )}
                    {/* Panel para modificaciones */}
                    {productosAccessLevel >= 3 && (
                        <TabPanel>
                            <InformeProductosTabAdvanced />
                        </TabPanel>
                    )}
                </TabPanels>
            </Tabs>
        </Flex>
    );
}

export default TerminadosSemiterminadosTabs;
