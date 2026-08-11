
import {IoArrowBack} from "react-icons/io5";
import { Steps, Box, Flex, Heading, IconButton, HStack, Tag, TagLabel } from '@chakra-ui/react';
import {NavLink, useLocation} from "react-router-dom";
import {useMemo} from "react";
import {Modulo} from "../pages/Usuarios/GestionUsuarios/types";
import {useAuth} from "../context/AuthContext";
import {maxNivelForModule} from "../auth/accessHelpers";



interface MyHeaderProps{
    title:string,
}

function MyHeader({title,}:MyHeaderProps){
    const location = useLocation();
    const { user: username, moduloAccesos, isMasterLike, accesosReady } = useAuth();

    const moduloActual = useMemo(() => {
        const segment = (location.pathname.split('/')[1] ?? '').toLowerCase();

        // Mapping basado en App.tsx (rutas principales)
        const routeToModulo: Record<string, Modulo | null> = {
            'usuarios': Modulo.USUARIOS,
            'producto': Modulo.PRODUCTOS,
            'produccion': Modulo.PRODUCCION,
            'stock': Modulo.STOCK,
            'proveedores': Modulo.PROVEEDORES,
            'compras': Modulo.COMPRAS,
            'gestion_areas_operativas': Modulo.SEGUIMIENTO_PRODUCCION,
            'clientes': Modulo.CLIENTES,
            'ventas': Modulo.VENTAS,
            'transacciones_almacen': Modulo.TRANSACCIONES_ALMACEN,
            'activos': Modulo.ACTIVOS,
            'contabilidad': Modulo.CONTABILIDAD,
            'personal': Modulo.PERSONAL_PLANTA,
            'bintelligence': Modulo.BINTELLIGENCE,
            'operaciones_criticas_bd': Modulo.OPERACIONES_CRITICAS_BD,
            'administracion_alertas': Modulo.ADMINISTRACION_ALERTAS,
            'administracion_global': Modulo.ADMINISTRACION_GLOBAL,
            'super_master_directives': Modulo.MASTER_DIRECTIVES,
            'cronograma': Modulo.CRONOGRAMA,
            'organigrama': Modulo.ORGANIGRAMA,
            'calidad': Modulo.CALIDAD,
            'pagos-proveedores': Modulo.PAGOS_PROVEEDORES,

            // Rutas sin módulo (o no definidas en enum Modulo)
            '': null,
            'informes': null,
            'login': null,
            'reset-password': null,
        };

        return routeToModulo[segment] ?? null;
    }, [location.pathname]);

    const accessLevelDisplay = useMemo(() => {
        if (!username || !moduloActual || !accesosReady) return null;
        if (isMasterLike) return '∞';
        const maxNivel = maxNivelForModule(moduloAccesos, moduloActual);
        return maxNivel != null ? String(maxNivel) : null;
    }, [username, moduloActual, accesosReady, isMasterLike, moduloAccesos]);

    const shouldShowInfo = useMemo(() => Boolean(username), [username]);

    return (
        <Flex w="full" minW={0} pb={'0.2em'} direction={'row'} mb={'1em'} borderBottom={'0.04em solid'} align={'center'}>
            <NavLink to={'/'}>
                <IconButton
                    ml={'1em'}
                    mr={'2em'}
                    my={'0.2em'}
                    colorPalette={'teal'}
                    aria-label='atrás'
                    fontSize={'3xl'}
                    boxSize={'2em'}><IoArrowBack/></IconButton>
            </NavLink>
            <Box flex={1} minW={0} overflow="hidden" display="flex" alignItems="baseline">
                <Heading as={'h2'} size={'xl'} fontFamily={'Comfortaa Variable'} lineClamp={1} minW={0}>
                    {title}
                </Heading>
            </Box>
            {shouldShowInfo ? (
                <HStack flexShrink={0} gap={2} align="center" ml={2}>
                    <Tag.Root size={'sm'} variant={'subtle'} colorPalette={'gray'} minW={0} maxW="200px">
                        <Tag.Label isTruncated>
                            {username}
                        </Tag.Label>
                    </Tag.Root>
                    {accessLevelDisplay ? (
                        <Tag.Root size={'sm'} variant={'outline'} colorPalette={'teal'}>
                            <Tag.Label whiteSpace={'nowrap'}>
                                Nivel {accessLevelDisplay}
                            </Tag.Label>
                        </Tag.Root>
                    ) : null}
                </HStack>
            ) : null}
        </Flex>
    );
}

export default MyHeader;
