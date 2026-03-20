import {Container, Tabs, TabList, TabPanels, Tab, TabPanel} from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import UserFullRoleCRUD from "./GestionUsuarios/UserFullRoleCRUD.tsx";
import InfoNiveles from "./InfoNiveles.tsx";
import GestionNotificacionesTab from "./GestionNotificaciones/GestionNotificacionesTab.tsx";


export default function UsuariosPage(){

    return(
        <Container minW={['auto', 'container.lg', 'container.xl']} minH={"100vh"} w={"full"} h={'full'}>
            <MyHeader title={'Roles y Usuarios'}/>
            <Tabs>
                <TabList>
                    <Tab>Gestion de Usuarios</Tab>
                    <Tab>Info Niveles de Acceso</Tab>
                    <Tab>Notificaciones</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <UserFullRoleCRUD/>
                    </TabPanel>
                    <TabPanel>
                        <InfoNiveles />
                    </TabPanel>
                    <TabPanel>
                        <GestionNotificacionesTab />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Container>
    );
}