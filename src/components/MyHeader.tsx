
import {IoArrowBack} from "react-icons/io5";
import {Box, Flex, Heading, IconButton, HStack, Tag, TagLabel} from '@chakra-ui/react'
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
            'master_directives': Modulo.MASTER_DIRECTIVES,
            'cronograma': Modulo.CRONOGRAMA,
            'organigrama': Modulo.ORGANIGRAMA,
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

    return(
        <Flex w="full" minW={0} pb={'0.2em'} direction={'row'} mb={'1em'} borderBottom={'0.04em solid'} align={'center'}>
            <NavLink to={'/'}>
                <IconButton
                    ml={'1em'} mr={'2em'} my={'0.2em'}
                    colorScheme={'teal'}
                    aria-label='atrás' fontSize={'3xl'} boxSize={'2em'} icon={<IoArrowBack/>}/>
            </NavLink>
            <Box flex={1} minW={0} overflow="hidden" display="flex" alignItems="baseline">
                <Heading as={'h2'} size={'xl'} fontFamily={'Comfortaa Variable'} noOfLines={1} minW={0}>
                    {title}
                </Heading>
            </Box>
            {shouldShowInfo ? (
                <HStack flexShrink={0} spacing={2} align="center" ml={2}>
                    <Tag size={'sm'} variant={'subtle'} colorScheme={'gray'} minW={0} maxW="200px">
                        <TagLabel isTruncated>
                            {username}
                        </TagLabel>
                    </Tag>
                    {accessLevelDisplay ? (
                        <Tag size={'sm'} variant={'outline'} colorScheme={'teal'}>
                            <TagLabel whiteSpace={'nowrap'}>
                                Nivel {accessLevelDisplay}
                            </TagLabel>
                        </Tag>
                    ) : null}
                </HStack>
            ) : null}
        </Flex>
    )
}

export default MyHeader;
