import { Container, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import InformesDiariosTab from "./InformesDiariosTab/InformesDiariosTab.tsx";
import {my_style_tab} from "../../styles/styles_general.tsx";
import TimeSeriesTab from "./TimeSeriesTab.tsx";

export default function BintelligencePage() {
    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'BI'} />

            <Tabs>
                <TabList>
                    <Tab sx={my_style_tab}> Informes Diarios </Tab>
                    <Tab sx={my_style_tab}> Series De Tiempo y Proyecciones </Tab>
                </TabList>

                <TabPanels>

                    <TabPanel>
                        <InformesDiariosTab />
                    </TabPanel>

                    <TabPanel>
                        <TimeSeriesTab />
                    </TabPanel>

                </TabPanels>
            </Tabs>
        </Container>
    );
}