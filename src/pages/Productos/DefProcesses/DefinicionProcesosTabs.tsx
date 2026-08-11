/**
 * Componente: DefinicionProcesosTabs
 * 
 * Ubicación en la navegación:
 * Productos > Definición de Procesos
 * 
 * Descripción:
 * Componente principal que gestiona las pestañas de la sección de Definición de Procesos.
 * Incluye pestañas para definir procesos, consultar procesos, y crear y consultar recursos
 * de producción.
 */

import { Steps, Button, Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import {FaArrowLeft} from 'react-icons/fa';
import DefinicionProcesosTab from './ProcesosProduccion/DefinicionProcesosTab.tsx';
import CrearRecursoProduccion from './RecursosProduccion/CrearRecursoProduccion.tsx';
import ConsultaRecursosProduccion from './RecursosProduccion/ConsultaRecursosProduccion.tsx';
import {my_style_tab} from '../../../styles/styles_general.tsx';
import {ConsultaProcesosProduccion} from "./ProcesosProduccion/ConsultaProcesosProduccion.tsx";

interface Props {
    onBack: () => void;
}

export function DefinicionProcesosTabs({onBack}: Props) {
    return (
        <Flex direction={'column'} gap={4} w="full" h="full">
            <Button w="fit-content" onClick={onBack}><FaArrowLeft />Volver
                            </Button>
            <Tabs.Root fitted gap="1em" variant='line'>
                <Tabs.List>
                    <Tab sx={my_style_tab}>Definición de Procesos</Tab>
                    <Tab sx={my_style_tab}>Consultar Procesos de Produccion</Tab>
                    <Tab sx={my_style_tab}>Crear Recurso Producción</Tab>
                    <Tab sx={my_style_tab}>Consulta Recursos Producción</Tab>
                </Tabs.List>
                <TabPanels>
                    <TabPanel>
                        <DefinicionProcesosTab />
                    </TabPanel>
                    <TabPanel>
                        <ConsultaProcesosProduccion />
                    </TabPanel>
                    <TabPanel>
                        <CrearRecursoProduccion />
                    </TabPanel>
                    <TabPanel>
                        <ConsultaRecursosProduccion />
                    </TabPanel>
                </TabPanels>
            </Tabs.Root>
        </Flex>
    );
}

export default DefinicionProcesosTabs;
