
import {Container, Tabs, TabList, Tab, TabPanels, TabPanel
} from "@chakra-ui/react";


import MyHeader from '../../components/MyHeader.tsx';


import {my_style_tab} from "../../styles/styles_general.tsx";

import CrearOrdenesTab from "./CrearOrdenesTab/CrearOrdenesTab.tsx";
import HistorialOrdenesTab from "./HistorialOrdenesTab/HistorialOrdenesTab.tsx";
import ConfParamsCategoria from "./ConfParamsCategoria/ConfParamsCategoria.tsx";
import {PlaneacionProduccionTab} from "./PlaneacionProduccionTab/PlaneacionProduccionTab.tsx";
import { Modulo } from '../Usuarios/GestionUsuarios/types.tsx';
import { useModuleAccessLevel } from '../../auth/usePermissions';


export default function ProduccionPage(){
    const { nivel: produccionAccessLevel } = useModuleAccessLevel(Modulo.PRODUCCION);

    return(
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Produccion'}/>

            <Tabs>

                <TabList>
                    <Tab sx={my_style_tab}> Crear ODP Manualmente </Tab>
                    <Tab sx={my_style_tab}> Historial </Tab>
                    {produccionAccessLevel >= 3 && (
                        <Tab sx={my_style_tab}> Parametros por Categoría </Tab>
                    )}
                    <Tab sx={my_style_tab}> Planeacion Produccion </Tab>
                </TabList>

                <TabPanels>

                    <TabPanel>
                        <CrearOrdenesTab />
                    </TabPanel>

                    <TabPanel>
                        <HistorialOrdenesTab/>
                    </TabPanel>

                    {produccionAccessLevel >= 3 && (
                        <TabPanel>
                            <ConfParamsCategoria />
                        </TabPanel>
                    )}

                    <TabPanel>
                        <PlaneacionProduccionTab />
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
