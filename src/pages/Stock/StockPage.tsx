
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
import HistorialTransaccionesAlmacenTab from "./HistorialTransaccionesAlamacen/HistorialTransaccionesAlmacenTab.tsx";


export default function StockPage() {

    return(
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Stock'}/>

            <Tabs>
                <TabList>
                    <Tab sx={my_style_tab}>Consolidado</Tab>
                    <Tab sx={my_style_tab}>Kardex</Tab>
                    <Tab sx={my_style_tab}>Historial Transacciones de Almacen</Tab>
                </TabList>
                <TabPanels>

                    <TabPanel>
                        <InventarioConsolidadoTab />
                    </TabPanel>

                    <TabPanel>
                        <KardexTab />
                    </TabPanel>

                    <TabPanel>
                        <HistorialTransaccionesAlmacenTab />
                    </TabPanel>

                </TabPanels>
            </Tabs>

        </Container>
    )
}

