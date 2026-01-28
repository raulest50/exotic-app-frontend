
import {IoArrowBack} from "react-icons/io5";
import {Flex, Spacer, Heading, IconButton, HStack, Tag, TagLabel} from '@chakra-ui/react'
import {NavLink, useLocation} from "react-router-dom";
import {useEffect, useMemo, useState} from "react";
import {getCurrentUserWithAccess} from "../api/UserApi";
import {Modulo} from "../pages/Usuarios/GestionUsuarios/types";
import {useAuth} from "../context/AuthContext";



interface MyHeaderProps{
    title:string,
}

function MyHeader({title,}:MyHeaderProps){
    const location = useLocation();
    const { user: username } = useAuth();

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
            'asistente_produccion': Modulo.SEGUIMIENTO_PRODUCCION,
            'clientes': Modulo.CLIENTES,
            'ventas': Modulo.VENTAS,
            'transacciones_almacen': Modulo.TRANSACCIONES_ALMACEN,
            'activos': Modulo.ACTIVOS,
            'contabilidad': Modulo.CONTABILIDAD,
            'personal': Modulo.PERSONAL_PLANTA,
            'bintelligence': Modulo.BINTELLIGENCE,
            'administracion_alertas': Modulo.ADMINISTRACION_ALERTAS,
            'cronograma': Modulo.CRONOGRAMA,
            'organigrama': Modulo.ORGANIGRAMA,
            'pagos-proveedores': Modulo.PAGOS_PROVEEDORES,

            // Rutas sin módulo (o no definidas en enum Modulo)
            '': null,
            'informes': null,
            'operaciones_criticas_bd': null,
            'master_directives': null,
            'login': null,
            'reset-password': null,
        };

        return routeToModulo[segment] ?? null;
    }, [location.pathname]);

    const [accessLevelDisplay, setAccessLevelDisplay] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            // Reiniciar el nivel cada vez que cambie ruta/usuario
            setAccessLevelDisplay(null);

            try {
                if (!username || !moduloActual) {
                    return;
                }

                const isMasterUsername = username.toLowerCase() === 'master';
                if (isMasterUsername) {
                    setAccessLevelDisplay('∞');
                    return;
                }

                const expandedUser = await getCurrentUserWithAccess();
                if (cancelled) return;

                const acceso = expandedUser.accesos.find(a => a.moduloAcceso === moduloActual);
                setAccessLevelDisplay(acceso ? String(acceso.nivel) : null);
            } catch {
                if (cancelled) return;
                setAccessLevelDisplay(null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [moduloActual, username]);

    const shouldShowInfo = useMemo(() => Boolean(username), [username]);

    return(
        <Flex pb={'0.2em'} direction={'row'} mb={'1em'} borderBottom={'0.04em solid'} align={'center'}>
            <NavLink to={'/'}>
                <IconButton
                    ml={'1em'} mr={'2em'} my={'0.2em'}
                    flex={1} colorScheme={'teal'}
                    aria-label='atrás' fontSize={'3xl'} boxSize={'2em'} icon={<IoArrowBack/>}/>
            </NavLink>
            <Flex flex={2} minW={0} align={'baseline'}>
                <Heading as={'h2'} size={'xl'} fontFamily={'Comfortaa Variable'}>{title}</Heading>
                <Spacer />
                {shouldShowInfo ? (
                    <HStack spacing={2} minW={0} justify={'flex-end'} maxW={'45vw'}>
                        <Tag size={'sm'} variant={'subtle'} colorScheme={'gray'}>
                            <TagLabel isTruncated maxW={'28vw'}>
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
            <Spacer flex={2}/>
        </Flex>
    )
}

export default MyHeader;