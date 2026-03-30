import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    HStack,
    IconButton,
    Input,
    Select,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
    Tag
} from '@chakra-ui/react';
import {useEffect, useMemo, useState} from 'react';
import {AreaOperativaDestinoOption, DispensacionDTO, InsumoDesglosado, ItemPendienteReposicion, LoteSeleccionado} from '../types';
import UserPickerGeneric from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric';
import {User} from '../../../pages/Usuarios/GestionUsuarios/types';
import EndPointsURL from '../../../api/EndPointsURL';
import axios from 'axios';
import {DeleteIcon} from '@chakra-ui/icons';
import DispensacionPDF_Generator_Class from './AsistenteDispensacionComponents/DispensacionPDF_Generator';
import { useAuth } from '../../../context/AuthContext';

const DispensacionPDF_Generator = new DispensacionPDF_Generator_Class();

interface Props {
    setActiveStep: (step: number) => void;
    dispensacion: DispensacionDTO | null;
    setDispensacion: (dto: DispensacionDTO) => void;
    insumosDesglosados?: InsumoDesglosado[];
    ordenProduccionId?: number | null;
    lotesPorMaterial?: Map<string, LoteSeleccionado[]>;
    insumosEmpaque?: InsumoDesglosado[];
    lotesPorMaterialEmpaque?: Map<string, LoteSeleccionado[]>;
    itemsPendientesReposicion?: ItemPendienteReposicion[];
    lotesPorReposicionAveria?: Map<string, LoteSeleccionado[]>;
    onDispensacionSuccess?: () => void;
}

interface SeguimientoOrdenAreaProgressItem {
    areaId: number;
    areaNombre: string;
}

export default function DispensacionStep3ReviewSubmit({
    setActiveStep,
    dispensacion,
    setDispensacion,
    insumosDesglosados,
    ordenProduccionId,
    lotesPorMaterial,
    insumosEmpaque = [],
    lotesPorMaterialEmpaque,
    itemsPendientesReposicion = [],
    lotesPorReposicionAveria,
    onDispensacionSuccess
}: Props) {
    const { meProfile: currentUser } = useAuth();
    const [token, setToken] = useState('');
    const [inputToken, setInputToken] = useState('');
    const [usuariosRealizadores, setUsuariosRealizadores] = useState<User[]>([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingAreasDestino, setLoadingAreasDestino] = useState(false);
    const [areasDestinoDisponibles, setAreasDestinoDisponibles] = useState<AreaOperativaDestinoOption[]>([]);
    const toast = useToast();
    const endPoints = useMemo(() => new EndPointsURL(), []);

    useEffect(() => {
        if (!currentUser) return;
        setUsuariosRealizadores((prev) => {
            if (prev.length > 0) return prev;
            return [{
                id: currentUser.id,
                cedula: currentUser.cedula,
                username: currentUser.username,
                nombreCompleto: currentUser.nombreCompleto,
                estado: currentUser.estado,
                moduloAccesos: []
            }];
        });
    }, [currentUser]);

    useEffect(() => {
        const t = Math.floor(1000 + Math.random() * 9000).toString();
        setToken(t);
        setInputToken('');
    }, [dispensacion]);

    useEffect(() => {
        const fetchAreasDestino = async () => {
            if (!ordenProduccionId) {
                setAreasDestinoDisponibles([]);
                return;
            }

            setLoadingAreasDestino(true);
            try {
                const endpoint = endPoints.seguimiento_progreso_orden.replace('{ordenId}', ordenProduccionId.toString());
                const response = await axios.get<SeguimientoOrdenAreaProgressItem[]>(endpoint, {withCredentials: true});

                const uniqueAreas = Array.from(
                    new Map(
                        (response.data ?? [])
                            .filter(item => item.areaId !== -1)
                            .map(item => [item.areaId, {areaId: item.areaId, areaNombre: item.areaNombre}])
                    ).values()
                );

                setAreasDestinoDisponibles(uniqueAreas);

                const selectedAreaIsValid = uniqueAreas.some(area => area.areaId === dispensacion?.areaOperativaDestinoId);
                const nextSelectedAreaId =
                    selectedAreaIsValid
                        ? dispensacion?.areaOperativaDestinoId
                        : uniqueAreas.length === 1
                            ? uniqueAreas[0].areaId
                            : undefined;

                if (nextSelectedAreaId !== dispensacion?.areaOperativaDestinoId) {
                    setDispensacion({
                        ...(dispensacion ?? {ordenProduccionId, items: []}),
                        areaOperativaDestinoId: nextSelectedAreaId,
                    });
                }
            } catch (error) {
                console.error('Error al cargar áreas operativas destino:', error);
                setAreasDestinoDisponibles([]);
            } finally {
                setLoadingAreasDestino(false);
            }
        };

        fetchAreasDestino();
    }, [dispensacion?.areaOperativaDestinoId, endPoints, ordenProduccionId, setDispensacion]);

    const handleSelectUser = (user: User) => {
        // Evitar duplicados
        if (!usuariosRealizadores.find(u => u.id === user.id)) {
            setUsuariosRealizadores([...usuariosRealizadores, user]);
        }
        setIsPickerOpen(false);
    };

    const handleRemoveUser = (userId: number) => {
        setUsuariosRealizadores(usuariosRealizadores.filter(u => u.id !== userId));
    };

    const canGeneratePDF = usuariosRealizadores.length > 0 && 
        ((lotesPorMaterial && lotesPorMaterial.size > 0) || 
         (lotesPorMaterialEmpaque && lotesPorMaterialEmpaque.size > 0) ||
         (lotesPorReposicionAveria && lotesPorReposicionAveria.size > 0));
    const requiereAreaDestino = areasDestinoDisponibles.length > 0;
    const canRegister = usuariosRealizadores.length > 0
        && inputToken === token
        && !isLoading
        && !loadingAreasDestino
        && (!requiereAreaDestino || !!dispensacion?.areaOperativaDestinoId);

    const findInsumoById = (insumos: InsumoDesglosado[] | undefined, insumoId: number): InsumoDesglosado | undefined => {
        if (!insumos) return undefined;
        for (const insumo of insumos) {
            if (insumo.insumoId === insumoId) {
                return insumo;
            }
            if (insumo.subInsumos && insumo.subInsumos.length > 0) {
                const found = findInsumoById(insumo.subInsumos, insumoId);
                if (found) return found;
            }
        }
        return undefined;
    };

    const findInsumoByProductoId = (insumos: InsumoDesglosado[] | undefined, productoId: string): InsumoDesglosado | undefined => {
        if (!insumos) return undefined;
        for (const insumo of insumos) {
            if (insumo.productoId === productoId) {
                return insumo;
            }
            if (insumo.subInsumos && insumo.subInsumos.length > 0) {
                const found = findInsumoByProductoId(insumo.subInsumos, productoId);
                if (found) return found;
            }
        }
        return undefined;
    };

    const findInsumoByKey = (insumoKey: string): InsumoDesglosado | undefined => {
        if (insumoKey.startsWith('insumo-')) {
            const id = Number(insumoKey.replace('insumo-', ''));
            if (!isNaN(id)) {
                return findInsumoById(insumosDesglosados, id);
            }
        }
        if (insumoKey.startsWith('producto-')) {
            const productoId = insumoKey.replace('producto-', '');
            return findInsumoByProductoId(insumosDesglosados, productoId);
        }
        return findInsumoByProductoId(insumosDesglosados, insumoKey);
    };

    // Construir items para el DTO desde lotesPorMaterial e insumosDesglosados
    const buildDispensacionItems = (): Array<{
        productoId: string;
        cantidad: number;
        loteId: number | null;
    }> => {
        const items: Array<{
            productoId: string;
            cantidad: number;
            loteId: number | null;
        }> = [];

        if (!lotesPorMaterial || !insumosDesglosados) {
            return items;
        }

        lotesPorMaterial.forEach((lotes, insumoKey) => {
            const insumo = findInsumoByKey(insumoKey);
            const productoId = insumo?.productoId ?? (insumoKey.startsWith('producto-') ? insumoKey.replace('producto-', '') : insumoKey);

            if (insumo && insumo.inventareable === false) {
                return;
            }

            lotes.forEach(lote => {
                items.push({
                    productoId: productoId,
                    cantidad: lote.cantidad,
                    loteId: lote.loteId,
                });
            });
        });

        if (lotesPorMaterialEmpaque && insumosEmpaque) {
            lotesPorMaterialEmpaque.forEach((lotes, productoId) => {
                const insumo = insumosEmpaque.find(i => i.productoId === productoId);

                if (insumo && insumo.inventareable === false) {
                    return;
                }

                lotes.forEach(lote => {
                    items.push({
                        productoId: productoId,
                        cantidad: lote.cantidad,
                        loteId: lote.loteId,
                    });
                });
            });
        }

        return items;
    };

    const handleGeneratePDF = async () => {
        if (!ordenProduccionId || !lotesPorMaterial || lotesPorMaterial.size === 0 || !insumosDesglosados) {
            toast({
                title: 'Error',
                description: 'No hay información suficiente para generar el PDF',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
            return;
        }

        try {
            // Construir items para el PDF
            const items = Array<{
                productoId: string;
                productoNombre: string;
                loteBatch?: string;
                cantidad: number;
                unidad: string;
                fechaVencimiento?: string;
            }>();

            lotesPorMaterial.forEach((lotes, insumoKey) => {
                const insumo = findInsumoByKey(insumoKey);
                const productoId = insumo?.productoId ?? (insumoKey.startsWith('producto-') ? insumoKey.replace('producto-', '') : insumoKey);
                if (insumo) {
                    // Filtrar productos no inventariables: solo incluir si es inventariable
                    // Si inventareable es undefined o null, asumir true (comportamiento por defecto)
                    if (insumo.inventareable === false) {
                        return; // Saltar productos no inventariables
                    }
                    lotes.forEach(lote => {
                        items.push({
                            productoId: productoId,
                            productoNombre: insumo.productoNombre,
                            loteBatch: lote.batchNumber,
                            cantidad: lote.cantidad,
                            unidad: insumo.tipoUnidades,
                            fechaVencimiento: lote.expirationDate || undefined
                        });
                    });
                }
            });

            // Incluir materiales de empaque en el PDF
            if (lotesPorMaterialEmpaque && insumosEmpaque) {
                lotesPorMaterialEmpaque.forEach((lotes, productoId) => {
                    const insumo = insumosEmpaque.find(i => i.productoId === productoId);
                    if (insumo) {
                        if (insumo.inventareable === false) {
                            return; // Saltar productos no inventariables
                        }
                        lotes.forEach(lote => {
                            items.push({
                                productoId: productoId,
                                productoNombre: insumo.productoNombre,
                                loteBatch: lote.batchNumber,
                                cantidad: lote.cantidad,
                                unidad: insumo.tipoUnidades,
                                fechaVencimiento: lote.expirationDate || undefined
                            });
                        });
                    }
                });
            }

            await DispensacionPDF_Generator.downloadPDF_Dispensacion(
                ordenProduccionId,
                {
                    productoNombre: 'Producto de la orden', // Podrías obtener esto de otro lugar si lo necesitas
                    fechaCreacion: new Date().toISOString()
                },
                items,
                usuariosRealizadores.map(u => ({
                    id: u.id,
                    nombreCompleto: u.nombreCompleto,
                    username: u.username
                })),
                currentUser ? {
                    id: currentUser.id,
                    nombreCompleto: currentUser.nombreCompleto,
                    username: currentUser.username
                } : null,
                dispensacion?.observaciones,
                true // esBorrador = true para el botón azul
            );
        } catch (error) {
            console.error('Error al generar PDF:', error);
            toast({
                title: 'Error',
                description: 'No se pudo generar el PDF',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    };

    const handleRegistrarDispensacion = async () => {
        if (!ordenProduccionId) {
            toast({
                title: 'Error',
                description: 'No se ha seleccionado una orden de producción',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
            return;
        }

        if (usuariosRealizadores.length === 0) {
            toast({
                title: 'Error',
                description: 'Debe seleccionar al menos un usuario realizador',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
            return;
        }

        if (inputToken !== token) {
            toast({
                title: 'Error',
                description: 'El token de verificación no coincide',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
            return;
        }

        if (requiereAreaDestino && !dispensacion?.areaOperativaDestinoId) {
            toast({
                title: 'Error',
                description: 'Debe seleccionar el área operativa destino de la dispensación.',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
            return;
        }

        setIsLoading(true);

        try {
            const items = buildDispensacionItems();
            const tieneItemsNormales = items.length > 0;

            // Construir items de reposición por avería
            const repoItems: Array<{productoId: string; cantidad: number; loteId: number | null}> = [];
            if (lotesPorReposicionAveria) {
                lotesPorReposicionAveria.forEach((lotes, productoId) => {
                    lotes.forEach(lote => {
                        repoItems.push({
                            productoId,
                            cantidad: lote.cantidad,
                            loteId: lote.loteId,
                        });
                    });
                });
            }
            const tieneItemsReposicion = repoItems.length > 0;

            if (!tieneItemsNormales && !tieneItemsReposicion) {
                toast({
                    title: 'Sin items',
                    description: 'No hay materiales seleccionados para dispensar.',
                    status: 'warning',
                    duration: 3000,
                    isClosable: true
                });
                setIsLoading(false);
                return;
            }

            const baseDTO = {
                ordenProduccionId: ordenProduccionId,
                areaOperativaDestinoId: dispensacion?.areaOperativaDestinoId,
                usuarioRealizadorIds: usuariosRealizadores.map(u => u.id),
                usuarioAprobadorId: currentUser?.id,
                usuarioId: usuariosRealizadores[0]?.id || currentUser?.id || 0,
                observaciones: dispensacion?.observaciones || '',
            };

            // 1. Enviar dispensación normal si hay items
            if (tieneItemsNormales) {
                const backendDTO = {
                    ...baseDTO,
                    items: items.map(item => ({
                        productoId: item.productoId,
                        cantidad: item.cantidad,
                        loteId: item.loteId,
                    }))
                };

                await axios.post(
                    endPoints.dispensacion,
                    backendDTO,
                    { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
                );
            }

            // 2. Enviar reposición por avería si hay items
            if (tieneItemsReposicion) {
                const repoDTO = {
                    ...baseDTO,
                    observaciones: (baseDTO.observaciones ? baseDTO.observaciones + ' | ' : '') + 'Reposición por avería',
                    items: repoItems.map(item => ({
                        productoId: item.productoId,
                        cantidad: item.cantidad,
                        loteId: item.loteId,
                    }))
                };

                await axios.post(
                    endPoints.dispensacion_reposicion_averia,
                    repoDTO,
                    { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
                );
            }

            // Generar PDF final (sin borrador) después de registrar exitosamente
            try {
                // Construir items para el PDF (mismo proceso que en handleGeneratePDF)
                const pdfItems = Array<{
                    productoId: string;
                    productoNombre: string;
                    loteBatch?: string;
                    cantidad: number;
                    unidad: string;
                    fechaVencimiento?: string;
                }>();

                if (lotesPorMaterial && insumosDesglosados) {
                    lotesPorMaterial.forEach((lotes, insumoKey) => {
                        const insumo = findInsumoByKey(insumoKey);
                        const productoId = insumo?.productoId ?? (insumoKey.startsWith('producto-') ? insumoKey.replace('producto-', '') : insumoKey);
                        if (insumo) {
                            if (insumo.inventareable === false) {
                                return;
                            }
                            lotes.forEach(lote => {
                                pdfItems.push({
                                    productoId: productoId,
                                    productoNombre: insumo.productoNombre,
                                    loteBatch: lote.batchNumber,
                                    cantidad: lote.cantidad,
                                    unidad: insumo.tipoUnidades,
                                    fechaVencimiento: lote.expirationDate || undefined
                                });
                            });
                        }
                    });
                }

                // Incluir materiales de empaque en el PDF
                if (lotesPorMaterialEmpaque && insumosEmpaque) {
                    lotesPorMaterialEmpaque.forEach((lotes, productoId) => {
                        const insumo = insumosEmpaque.find(i => i.productoId === productoId);
                        if (insumo) {
                            if (insumo.inventareable === false) {
                                return;
                            }
                            lotes.forEach(lote => {
                                pdfItems.push({
                                    productoId: productoId,
                                    productoNombre: insumo.productoNombre,
                                    loteBatch: lote.batchNumber,
                                    cantidad: lote.cantidad,
                                    unidad: insumo.tipoUnidades,
                                    fechaVencimiento: lote.expirationDate || undefined
                                });
                            });
                        }
                    });
                }

                // Generar PDF sin borrador
                await DispensacionPDF_Generator.downloadPDF_Dispensacion(
                    ordenProduccionId,
                    {
                        productoNombre: 'Producto de la orden',
                        fechaCreacion: new Date().toISOString()
                    },
                    pdfItems,
                    usuariosRealizadores.map(u => ({
                        id: u.id,
                        nombreCompleto: u.nombreCompleto,
                        username: u.username
                    })),
                    currentUser ? {
                        id: currentUser.id,
                        nombreCompleto: currentUser.nombreCompleto,
                        username: currentUser.username
                    } : null,
                    dispensacion?.observaciones,
                    false // esBorrador = false para el PDF final
                );
            } catch (pdfError) {
                console.error('Error al generar PDF después de registrar:', pdfError);
                // No bloquear el flujo si falla el PDF, solo loguear el error
            }

            toast({
                title: 'Éxito',
                description: 'Dispensación registrada correctamente',
                status: 'success',
                duration: 3000,
                isClosable: true
            });
            onDispensacionSuccess?.();

            // Reiniciar el componente volviendo al primer paso después de un breve delay
            setTimeout(() => {
                setActiveStep(0);
                setUsuariosRealizadores([]);
                setInputToken('');
            }, 1500);
        } catch (error: any) {
            console.error('Error al registrar dispensación:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'No se pudo registrar la dispensación',
                status: 'error',
                duration: 5000,
                isClosable: true
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Construir tabla de resumen de items/lotes
    const summaryItems = Array<{
        productoId: string;
        productoNombre: string;
        loteBatch: string;
        cantidad: number;
        unidad: string;
        fechaVencimiento?: string;
        esEmpaque?: boolean;
    }>();

    // Agregar materiales de receta al resumen
    if (lotesPorMaterial && insumosDesglosados) {
        lotesPorMaterial.forEach((lotes, insumoKey) => {
            const insumo = findInsumoByKey(insumoKey);
            const productoId = insumo?.productoId ?? (insumoKey.startsWith('producto-') ? insumoKey.replace('producto-', '') : insumoKey);
            if (insumo) {
                lotes.forEach(lote => {
                    summaryItems.push({
                        productoId: productoId,
                        productoNombre: insumo.productoNombre,
                        loteBatch: lote.batchNumber,
                        cantidad: lote.cantidad,
                        unidad: insumo.tipoUnidades,
                        fechaVencimiento: lote.expirationDate || undefined,
                        esEmpaque: false
                    });
                });
            }
        });
    }

    // Agregar materiales de empaque al resumen
    if (lotesPorMaterialEmpaque && insumosEmpaque) {
        lotesPorMaterialEmpaque.forEach((lotes, productoId) => {
            const insumo = insumosEmpaque.find(i => i.productoId === productoId);
            if (insumo) {
                lotes.forEach(lote => {
                    summaryItems.push({
                        productoId: productoId,
                        productoNombre: insumo.productoNombre,
                        loteBatch: lote.batchNumber,
                        cantidad: lote.cantidad,
                        unidad: insumo.tipoUnidades,
                        fechaVencimiento: lote.expirationDate || undefined,
                        esEmpaque: true
                    });
                });
            }
        });
    }

    // Construir resumen de items de reposición por avería
    const reposicionItems = Array<{
        productoId: string;
        productoNombre: string;
        loteBatch: string;
        cantidad: number;
        unidad: string;
        fechaVencimiento?: string;
    }>();

    if (lotesPorReposicionAveria && itemsPendientesReposicion.length > 0) {
        lotesPorReposicionAveria.forEach((lotes, productoId) => {
            const item = itemsPendientesReposicion.find(i => i.productoId === productoId);
            if (item) {
                lotes.forEach(lote => {
                    reposicionItems.push({
                        productoId: productoId,
                        productoNombre: item.productoNombre,
                        loteBatch: lote.batchNumber,
                        cantidad: lote.cantidad,
                        unidad: item.tipoUnidades,
                        fechaVencimiento: lote.expirationDate || undefined,
                    });
                });
            }
        });
    }

    const tieneReposicion = reposicionItems.length > 0;

    return (
        <Box p='1em' bg='blue.50' minH='100vh'>
            <Flex direction='column' gap={6} maxW='container.xl' mx='auto'>
                <Heading fontFamily='Comfortaa Variable' textAlign='center'>
                    Revisar y Registrar Dispensación
                </Heading>

                {/* Sección de Usuarios Realizadores - TEMPORALMENTE OCULTA */}
                {/* TODO: Esta funcionalidad se moverá al backend en el futuro */}
                {/* El código se mantiene intacto pero la UI está oculta para no romper la funcionalidad */}
                <Box 
                    bg='white' 
                    p={4} 
                    borderRadius='md' 
                    boxShadow='sm'
                    display='none' // Ocultar temporalmente la sección
                >
                    <Heading size='md' mb={4} fontFamily='Comfortaa Variable'>
                        Usuarios Responsables de la Dispensación
                    </Heading>
                    <VStack align='stretch' gap={3}>
                        <Button
                            colorScheme='teal'
                            onClick={() => setIsPickerOpen(true)}
                            size='sm'
                            w='fit-content'
                            isDisabled={true} // Deshabilitar también por seguridad
                        >
                            Agregar Usuario
                        </Button>
                        {usuariosRealizadores.length > 0 ? (
                            <Table size='sm' variant='simple'>
                                <Thead>
                                    <Tr>
                                        <Th>Usuario</Th>
                                        <Th>Nombre Completo</Th>
                                        <Th>Acción</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {usuariosRealizadores.map(user => (
                                        <Tr key={user.id}>
                                            <Td>{user.username}</Td>
                                            <Td>{user.nombreCompleto || 'N/A'}</Td>
                                            <Td>
                                                <IconButton
                                                    aria-label='Eliminar usuario'
                                                    icon={<DeleteIcon />}
                                                    size='sm'
                                                    colorScheme='red'
                                                    variant='ghost'
                                                    onClick={() => handleRemoveUser(user.id)}
                                                />
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        ) : (
                            <Text color='gray.500' fontStyle='italic'>
                                No hay usuarios seleccionados. Debe agregar al menos uno.
                            </Text>
                        )}
                    </VStack>
                </Box>

                {/* Usuario Aprobador (No editable) */}
                <Box bg='white' p={4} borderRadius='md' boxShadow='sm'>
                    <Heading size='md' mb={2} fontFamily='Comfortaa Variable'>
                        Usuario Aprobador
                    </Heading>
                    <Text fontSize='md'>
                        <strong>Usuario:</strong> {currentUser?.username || 'N/A'}
                    </Text>
                    <Text fontSize='md'>
                        <strong>Nombre:</strong> {currentUser?.nombreCompleto || 'N/A'}
                    </Text>
                </Box>

                <Box bg='white' p={4} borderRadius='md' boxShadow='sm'>
                    <Heading size='md' mb={4} fontFamily='Comfortaa Variable'>
                        Área Operativa Destino
                    </Heading>
                    {loadingAreasDestino ? (
                        <Text color='gray.600'>Cargando áreas operativas de la orden...</Text>
                    ) : areasDestinoDisponibles.length > 0 ? (
                        <FormControl isRequired>
                            <FormLabel>Área que recibe la dispensación</FormLabel>
                            <Select
                                placeholder='Seleccione un área operativa'
                                value={dispensacion?.areaOperativaDestinoId?.toString() ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setDispensacion({
                                        ...(dispensacion ?? {ordenProduccionId: ordenProduccionId ?? 0, items: []}),
                                        areaOperativaDestinoId: value ? Number(value) : undefined,
                                    });
                                }}
                            >
                                {areasDestinoDisponibles.map(area => (
                                    <option key={area.areaId} value={area.areaId}>
                                        {area.areaNombre} (ID: {area.areaId})
                                    </option>
                                ))}
                            </Select>
                            <Text mt={2} fontSize='sm' color='gray.600'>
                                Esta selección se guardará en la trazabilidad de la dispensación y habilitará automáticamente el avance de Almacén General.
                            </Text>
                        </FormControl>
                    ) : (
                        <Alert status='info' borderRadius='md'>
                            <AlertIcon />
                            Esta orden no tiene áreas operativas destino configuradas en su seguimiento. La dispensación se registrará sin área destino.
                        </Alert>
                    )}
                </Box>

                {/* Resumen de Items y Lotes */}
                <Box bg='white' p={4} borderRadius='md' boxShadow='sm'>
                    <Heading size='md' mb={4} fontFamily='Comfortaa Variable'>
                        Resumen de Materiales a Dispensar
                    </Heading>
                    {summaryItems.length > 0 ? (
                        <Table size='sm' variant='striped'>
                            <Thead>
                                <Tr>
                                    <Th>Material (ID)</Th>
                                    <Th>Nombre</Th>
                                    <Th>Lote (Batch)</Th>
                                    <Th>Cantidad</Th>
                                    <Th>Unidad</Th>
                                    <Th>Fecha Vencimiento</Th>
                                </Tr>
                            </Thead>
                    <Tbody>
                                {summaryItems.map((item, idx) => (
                            <Tr key={idx}>
                                        <Td>{item.productoId}</Td>
                                        <Td>
                                            {item.productoNombre}
                                            {item.esEmpaque && (
                                                <Tag ml={2} size="sm" colorScheme="blue" variant="outline">
                                                    Empaque
                                                </Tag>
                                            )}
                                        </Td>
                                        <Td>{item.loteBatch}</Td>
                                        <Td>{item.cantidad.toFixed(2)}</Td>
                                        <Td>{item.unidad}</Td>
                                        <Td>{item.fechaVencimiento || 'N/A'}</Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
                    ) : (
                        <Text color='gray.500' fontStyle='italic'>
                            No hay items para mostrar
                        </Text>
                    )}
                </Box>

                {/* Resumen de Reposición por Avería */}
                {tieneReposicion && (
                    <Box bg='white' p={4} borderRadius='md' boxShadow='sm' borderLeft='4px solid' borderLeftColor='orange.400'>
                        <Heading size='md' mb={4} fontFamily='Comfortaa Variable' color='orange.700'>
                            Reposición de Material por Averías
                        </Heading>
                        <Table size='sm' variant='striped'>
                            <Thead>
                                <Tr>
                                    <Th>Material (ID)</Th>
                                    <Th>Nombre</Th>
                                    <Th>Lote (Batch)</Th>
                                    <Th>Cantidad</Th>
                                    <Th>Unidad</Th>
                                    <Th>Fecha Vencimiento</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {reposicionItems.map((item, idx) => (
                                    <Tr key={`repo-${idx}`}>
                                        <Td>{item.productoId}</Td>
                                        <Td>
                                            {item.productoNombre}
                                            <Tag ml={2} size="sm" colorScheme="orange" variant="solid">
                                                Reposición Avería
                                            </Tag>
                                        </Td>
                                        <Td>{item.loteBatch}</Td>
                                        <Td>{item.cantidad.toFixed(2)}</Td>
                                        <Td>{item.unidad}</Td>
                                        <Td>{item.fechaVencimiento || 'N/A'}</Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </Box>
                )}

                {/* Token de Verificación */}
                <Box bg='white' p={4} borderRadius='md' boxShadow='sm'>
                    <FormControl isRequired>
                        <FormLabel fontFamily='Comfortaa Variable'>Token de Verificación</FormLabel>
                        <Input
                            value={inputToken}
                            onChange={e => setInputToken(e.target.value)}
                            placeholder='Ingrese el token de 4 dígitos'
                            maxLength={4}
                            type='text'
                            pattern='[0-9]*'
                        />
                        <Text mt={2} fontSize='sm' color='gray.600'>
                            Token generado: <strong>{token}</strong>
                        </Text>
                </FormControl>
                </Box>

                {/* Botones de Acción */}
                <Flex gap={4} justify='flex-end'>
                    <Button onClick={() => setActiveStep(1)}>Atrás</Button>
                    <Button
                        colorScheme='blue'
                        onClick={handleGeneratePDF}
                        isDisabled={!canGeneratePDF}
                    >
                        Generar borrador PDF
                    </Button>
                    <Button
                        colorScheme='teal'
                        onClick={handleRegistrarDispensacion}
                        isDisabled={!canRegister}
                        isLoading={isLoading}
                        loadingText='Registrando...'
                    >
                        Registrar Dispensación
                    </Button>
                </Flex>
            </Flex>

            {/* User Picker Modal */}
            <UserPickerGeneric
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelectUser={handleSelectUser}
            />
        </Box>
    );
}
