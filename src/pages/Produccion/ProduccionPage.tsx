
import {Container, Tabs, TabList, Tab, TabPanels, TabPanel
} from "@chakra-ui/react";


import MyHeader from '../../components/MyHeader.tsx';


import {my_style_tab} from "../../styles/styles_general.tsx";

import CrearOrdenes from "./CrearOrdenes.tsx";
import HistorialOrdenes from "./HistorialOrdenes.tsx";
import ConfLotesCategoriaTab from "./ConfLotesCategoriaTab.tsx";


export default function ProduccionPage(){

    return(
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Produccion'}/>

            <Tabs>

                <TabList>
                    <Tab sx={my_style_tab}> Crear ODP Manualmente </Tab>
                    <Tab sx={my_style_tab}> Historial </Tab>
                    <Tab sx={my_style_tab}> Config. Lotes por Categoría </Tab>
                </TabList>

                <TabPanels>

                    <TabPanel>
                        <CrearOrdenes />
                    </TabPanel>

                    <TabPanel>
                        <HistorialOrdenes/>
                    </TabPanel>

                    <TabPanel>
                        <ConfLotesCategoriaTab />
                    </TabPanel>

                </TabPanels>
            </Tabs>

        </Container>
    )
}



/*
<FormControl p={'1em'}>
    <FormLabel>Seccion Responsable: </FormLabel>
    <Select
        value={seccion_responsable_sel}
        onChange={(e)=>setSeccionResponsable(Number(e.target.value))}
    >
        {
            Object.keys(SECCION).map((key)=> (
                    <option key={SECCION[key].id} value={SECCION[key].id} >
                        {SECCION[key].nombre}
                    </option>
                )
            )
        }
    </Select>
</FormControl>
*/
