import { Container, Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader";
import { my_style_tab } from "../../styles/styles_general";

export default function OperacionesCriticasBDPage() {
    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Operaciones Críticas en BD" />
            <Flex direction="column" w="full" h="full">
                <Tabs>
                    <TabList>
                        <Tab sx={my_style_tab}>Carga Masiva</Tab>
                        <Tab sx={my_style_tab}>Eliminaciones Forzadas</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel>
                            {/* Contenido futuro de Carga Masiva */}
                        </TabPanel>
                        <TabPanel>
                            {/* Contenido futuro de Eliminaciones Forzadas */}
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Flex>
        </Container>
    );
}
