// src/pages/Home.tsx
import {SimpleGrid, Flex, Heading, Button, Spacer, Container, Box, HStack, Tooltip} from "@chakra-ui/react";
import SectionCard from "../components/SectionCard.tsx";
import SplitText from "../components/SplitText.tsx";
import { PiDownloadDuotone } from "react-icons/pi";
import { BsDatabaseCheck } from "react-icons/bs";
import { AiOutlineAudit } from "react-icons/ai";
import { FaIndustry } from "react-icons/fa";
import { GiChemicalDrop } from "react-icons/gi";
import { GiBuyCard } from "react-icons/gi";
// import { TbReportSearch } from "react-icons/tb";
// import { FaTruckRampBox } from "react-icons/fa6";
import { MdWarehouse } from "react-icons/md";
import { FaUsersGear } from "react-icons/fa6";
import { FaSitemap } from "react-icons/fa6";
import { FaFileUpload } from "react-icons/fa";
import { TbReportMoney } from 'react-icons/tb';
import { MdOutlineInsights } from "react-icons/md";
import { FaSteam } from "react-icons/fa";
import { PiMicrosoftTeamsLogoFill } from "react-icons/pi";
import { MdNotificationsActive } from "react-icons/md";
import { FaCogs } from "react-icons/fa";
import { FaCalendarAlt } from "react-icons/fa";
import { FaUsers } from "react-icons/fa"; // Nuevo icono para Clientes
import { FaShoppingCart } from "react-icons/fa"; // Nuevo icono para Ventas
import { FaMoneyBillWave } from "react-icons/fa"; // Icono para Pagos a Proveedores
import { MdRefresh } from "react-icons/md"; // Icono para el botón de actualizar

import '@fontsource-variable/comfortaa'

import { Modulo } from "./Usuarios/GestionUsuarios/types.tsx";

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';

export default function Home(){

    // pull out user, roles, logout from auth context
    const { user, roles, logout } = useAuth();
//     console.log('Home - Usuario actual:', user);
//     console.log('Home - Roles del usuario:', roles);

    // Get the getNotificationForModule function from the notifications context
    const { getNotificationForModule, refreshNotifications } = useNotifications();


    return (
        <Container minW={['auto', 'container.lg', 'container.xl']}>
            <Flex pb={'0.2em'} direction={'row'} mb={'1em'} borderBottom={'0.04em solid'}>
                <Spacer flex={1}/>
                <Heading flex={2} as={'h2'} size={'xl'} fontFamily={'Comfortaa Variable'}>
                    Inicio
                </Heading>
                <Spacer flex={2}/>
                <HStack spacing={2}>
                    {/* Box para mostrar la versión */}
                    <Box
                        transform="skewX(-20deg)"
                        pl="1em"
                        pr="1em"
                        backgroundColor="purple.200"
                        alignContent={'center'}
                    >
                        <Box transform="skewX(10deg)">
                            <SplitText text="Version: 1.4" />
                        </Box>
                    </Box>

                    <Box
                        transform="skewX(-20deg)" // Skews the entire outer box
                        pl="1em"
                        pr="1em"
                        backgroundColor="green.200"
                        alignContent={'center'}
                    >
                        <Box transform="skewX(10deg)"> {/* Counter-skews the content */}
                            <SplitText text={ "Usuario : " + user } />
                        </Box>

                    </Box>
                    <Tooltip label="Actualizar notificaciones">
                        <Button
                            size={'md'}
                            colorScheme={'blue'}
                            variant={'ghost'}
                            onClick={refreshNotifications}
                            leftIcon={<MdRefresh />}
                            aria-label="Actualizar notificaciones"
                        >
                            Actualizar
                        </Button>
                    </Tooltip>
                    <Button
                        size={'lg'}
                        colorScheme={'green'}
                        variant={'ghost'}
                        onClick={logout}
                    >
                        Cerrar Sesion
                    </Button>
                </HStack>
            </Flex>

            <SimpleGrid columns={[1,1,2,3,4]} gap={'0.5em'} rowGap={'1.5em'}>
                <SectionCard to={"/usuarios"} name={"Roles y Usuarios"} icon={FaUsersGear} supportedModules={[Modulo.USUARIOS]} currentAccesos={roles} notification={getNotificationForModule(Modulo.USUARIOS)}/>
                <SectionCard to={'/producto'} name={'Productos'} icon={PiDownloadDuotone} supportedModules={[Modulo.PRODUCTOS]} currentAccesos={roles} notification={getNotificationForModule(Modulo.PRODUCTOS)}/>
                <SectionCard to={'/produccion'} name={'Gestion de Produccion'} icon={AiOutlineAudit} supportedModules={[Modulo.PRODUCCION]} currentAccesos={roles} notification={getNotificationForModule(Modulo.PRODUCCION)}/>
                <SectionCard to={'/stock'} name={'Stock'} icon={BsDatabaseCheck} supportedModules={[Modulo.STOCK]} currentAccesos={roles} notification={getNotificationForModule(Modulo.STOCK)}/>
                <SectionCard to={'/Proveedores'} name={'Proveedores'} icon={FaIndustry} supportedModules={[Modulo.PROVEEDORES]} currentAccesos={roles} notification={getNotificationForModule(Modulo.PROVEEDORES)}/>
                <SectionCard to={'/compras'} name={'Compras'} icon={GiBuyCard} supportedModules={[Modulo.COMPRAS]} currentAccesos={roles} notification={getNotificationForModule(Modulo.COMPRAS)}/>
                {/*<SectionCard to={'/informes'} name={'Informes'} icon={TbReportSearch} supportedModules={[Modulo.INFORMES]} currentAccesos={roles} notification={getNotificationForModule(Modulo.INFORMES)}/>*/}
                <SectionCard to={'/asistente_produccion'} name={'Reporte Progreso en Procesos de Produccion'} icon={GiChemicalDrop} supportedModules={[Modulo.SEGUIMIENTO_PRODUCCION]} currentAccesos={roles} notification={getNotificationForModule(Modulo.SEGUIMIENTO_PRODUCCION)}/>
                <SectionCard to={'/clientes'} name={'Clientes'} icon={FaUsers} supportedModules={[Modulo.CLIENTES]} currentAccesos={roles} notification={getNotificationForModule(Modulo.CLIENTES)}/>
                <SectionCard to={'/ventas'} name={'Ventas'} icon={FaShoppingCart} supportedModules={[Modulo.VENTAS]} currentAccesos={roles} notification={getNotificationForModule(Modulo.VENTAS)}/>
                <SectionCard to={'/transacciones_almacen'} name={'Transacciones de Almacen'} icon={MdWarehouse} supportedModules={[Modulo.TRANSACCIONES_ALMACEN]} currentAccesos={roles} notification={getNotificationForModule(Modulo.TRANSACCIONES_ALMACEN)}/>
                <SectionCard to={'/operaciones_criticas_bd'} name={'Operaciones Críticas en BD'} icon={FaFileUpload} supportedModules={[]} currentAccesos={roles} bgColor="red.100" notification={getNotificationForModule('CARGA_MASIVA' as Modulo)}/>
                <SectionCard to={'/Activos'} name={'Activos Fijos'} icon={FaSteam} supportedModules={[Modulo.ACTIVOS]} currentAccesos={roles} notification={getNotificationForModule(Modulo.ACTIVOS)}/>
                <SectionCard to={'/Contabilidad'} name={'Contabilidad'} icon={TbReportMoney} supportedModules={[Modulo.CONTABILIDAD]} currentAccesos={roles} notification={getNotificationForModule(Modulo.CONTABILIDAD)}/>
                <SectionCard to={'/Personal'} name={'Personal'} icon={PiMicrosoftTeamsLogoFill} supportedModules={[Modulo.PERSONAL_PLANTA]} currentAccesos={roles} notification={getNotificationForModule(Modulo.PERSONAL_PLANTA)}/>
                <SectionCard to={'/Bintelligence'} name={'BI'} icon={MdOutlineInsights} supportedModules={[Modulo.BINTELLIGENCE]} currentAccesos={roles} notification={getNotificationForModule(Modulo.BINTELLIGENCE)}/>
                <SectionCard to={'/administracion_alertas'} name={'Administracion Alertas'} icon={MdNotificationsActive} supportedModules={[Modulo.ADMINISTRACION_ALERTAS]} currentAccesos={roles} notification={getNotificationForModule(Modulo.ADMINISTRACION_ALERTAS)}/>
                <SectionCard to={'/master_directives'} name={'Master Directives'} icon={FaCogs} supportedModules={[]} currentAccesos={roles} bgColor="red.100" notification={getNotificationForModule('MASTER_CONFIGS' as Modulo)}/>
                <SectionCard to={'/cronograma'} name={'Cronograma'} icon={FaCalendarAlt} supportedModules={[Modulo.CRONOGRAMA]} currentAccesos={roles} notification={getNotificationForModule(Modulo.CRONOGRAMA)}/>
                <SectionCard to={'/organigrama'} name={'Organigrama'} icon={FaSitemap} supportedModules={[Modulo.ORGANIGRAMA]} currentAccesos={roles} notification={getNotificationForModule(Modulo.ORGANIGRAMA)}/>
                <SectionCard to={'/pagos-proveedores'} name={'Pagos a Proveedores'} icon={FaMoneyBillWave} supportedModules={[Modulo.PAGOS_PROVEEDORES]} currentAccesos={roles} notification={getNotificationForModule(Modulo.PAGOS_PROVEEDORES)}/>
            </SimpleGrid>
        </Container>
    );
}
