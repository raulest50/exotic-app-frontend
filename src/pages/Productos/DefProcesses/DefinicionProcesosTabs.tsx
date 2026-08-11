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

import { Button, Flex, Tabs } from '@chakra-ui/react';
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
            <Tabs.Root fitted gap="1em" variant='line' defaultValue="definicion-procesos">
                <Tabs.List>
                    <Tabs.Trigger value="definicion-procesos" css={my_style_tab}>Definición de Procesos</Tabs.Trigger>
                    <Tabs.Trigger value="consultar-procesos" css={my_style_tab}>Consultar Procesos de Produccion</Tabs.Trigger>
                    <Tabs.Trigger value="crear-recurso" css={my_style_tab}>Crear Recurso Producción</Tabs.Trigger>
                    <Tabs.Trigger value="consultar-recursos" css={my_style_tab}>Consulta Recursos Producción</Tabs.Trigger>
                </Tabs.List>
                <Tabs.ContentGroup>
                    <Tabs.Content value="definicion-procesos">
                        <DefinicionProcesosTab />
                    </Tabs.Content>
                    <Tabs.Content value="consultar-procesos">
                        <ConsultaProcesosProduccion />
                    </Tabs.Content>
                    <Tabs.Content value="crear-recurso">
                        <CrearRecursoProduccion />
                    </Tabs.Content>
                    <Tabs.Content value="consultar-recursos">
                        <ConsultaRecursosProduccion />
                    </Tabs.Content>
                </Tabs.ContentGroup>
            </Tabs.Root>
        </Flex>
    );
}

export default DefinicionProcesosTabs;
