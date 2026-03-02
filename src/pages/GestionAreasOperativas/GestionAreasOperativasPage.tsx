import {
    Container,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
} from "@chakra-ui/react";

import MyHeader from '../../components/MyHeader.tsx';
import { my_style_tab } from "../../styles/styles_general.tsx";
import CrearAreaProduccionTab from "./CrearAreaProduccion/CrearAreaProduccionTab.tsx";
import ConsultaAreasOperativasTab from "./ConsultaAreasOperativas/ConsultaAreasOperativasTab.tsx";

export default function GestionAreasOperativasPage() {
    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Gestión Áreas Operativas'} />

            <Tabs>
                <TabList>
                    <Tab sx={my_style_tab}>Crear Área de Producción</Tab>
                    <Tab sx={my_style_tab}>Consulta Áreas Operativas</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <CrearAreaProduccionTab />
                    </TabPanel>
                    <TabPanel>
                        <ConsultaAreasOperativasTab />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Container>
    );
}
