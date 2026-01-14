
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
import { KardexTab } from "./Kardex/KardexTab.tsx";


export default function StockPage() {

    return(
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Stock'}/>

            <Tabs>
                <TabList>
                    <Tab sx={my_style_tab}>Consolidado</Tab>
                    <Tab sx={my_style_tab}>Kardex</Tab>
                </TabList>
                <TabPanels>

                    <TabPanel>
                        <InventarioConsolidadoTab />
                    </TabPanel>

                    <TabPanel>
                        <KardexTab />
                    </TabPanel>

                </TabPanels>
            </Tabs>

        </Container>
    )
}

