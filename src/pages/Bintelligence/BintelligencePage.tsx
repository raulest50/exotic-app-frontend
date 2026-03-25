import { Container, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import InformesDiariosTab from "./InformesDiariosTab/InformesDiariosTab.tsx";

export default function BintelligencePage() {
    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'BI'} />

            <Tabs>
                <TabList>
                    <Tab> Informes Diarios </Tab>
                </TabList>

                <TabPanels>

                    <TabPanel>
                        <InformesDiariosTab />
                    </TabPanel>

                </TabPanels>
            </Tabs>
        </Container>
    );
}