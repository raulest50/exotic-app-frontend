
import {
    Container,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
} from "@chakra-ui/react";

import MyHeader from '../../components/MyHeader.tsx';
import InventarioConsolidadoTab from "./InventarioConsolidado/InventarioConsolidadoTab.tsx";

import { my_style_tab } from "../../styles/styles_general.tsx";


export default function StockPage() {

    return(
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Stock'}/>

            <Tabs>
                <TabList>
                    <Tab sx={my_style_tab}>Inventario</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <InventarioConsolidadoTab />
                    </TabPanel>
                </TabPanels>
            </Tabs>

        </Container>
    )
}

