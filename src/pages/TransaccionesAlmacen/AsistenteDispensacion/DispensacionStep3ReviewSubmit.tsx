import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    HStack,
    IconButton,
    Input,
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
import {useEffect, useState} from 'react';
import {DispensacionDTO, InsumoDesglosado, LoteSeleccionado} from '../types';
import UserPickerGeneric from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric';
import {User} from '../../../pages/Usuarios/GestionUsuarios/types';
import EndPointsURL from '../../../api/EndPointsURL';
import axios from 'axios';
import {DeleteIcon} from '@chakra-ui/icons';
import DispensacionPDF_Generator_Class from './AsistenteDispensacionComponents/DispensacionPDF_Generator';
import { getCurrentUser, User as CurrentUser } from '../../../api/UserApi';

const DispensacionPDF_Generator = new DispensacionPDF_Generator_Class();

interface Props {
    setActiveStep: (step: number) => void;
    dispensacion: DispensacionDTO | null;
    insumosDesglosados?: InsumoDesglosado[];
    ordenProduccionId?: number | null;
    lotesPorMaterial?: Map<string, LoteSeleccionado[]>;
    insumosEmpaque?: InsumoDesglosado[];
    lotesPorMaterialEmpaque?: Map<string, LoteSeleccionado[]>;
    onDispensacionSuccess?: () => void;
}

export default function DispensacionStep3ReviewSubmit({
    setActiveStep,
    dispensacion,
    insumosDesglosados,
    ordenProduccionId,
    lotesPorMaterial,
    insumosEmpaque = [],
    lotesPorMaterialEmpaque,
    onDispensacionSuccess
}: Props) {
    const [token, setToken] = useState('');
    const [inputToken, setInputToken] = useState('');
    const [usuariosRealizadores, setUsuariosRealizadores] = useState<User[]>([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const endPoints = new EndPointsURL();

    // Obtener el usuario actual usando la API centralizada
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const user = await getCurrentUser();
                setCurrentUser(user);
                // TEMPORAL: Automáticamente usar el usuario actual como único realizador
                // TODO: Esta funcionalidad se moverá al backend en el futuro
                // Por ahora, el selector de usuarios está oculto pero la lógica se mantiene
                if (user) {
                    // Convertir CurrentUser a User para compatibilidad con el resto del código
                    // Solo establecer si no hay usuarios realizadores ya seleccionados
                    setUsuariosRealizadores(prev => {
                        if (prev.length === 0) {
                            return [{
                                id: user.id,
                                cedula: user.cedula,
                                username: user.username,
                                nombreCompleto: user.nombreCompleto,
                                estado: user.estado,
                                accesos: []
                            }];
                        }
                        return prev;
                    });
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
                toast({
                    title: 'Error',
                    description: 'No se pudo obtener la información del usuario actual.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        };

        fetchCurrentUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Solo ejecutar una vez al montar el componente

    useEffect(() => {
        const t = Math.floor(1000 + Math.random() * 9000).toString();
        setToken(t);
        setInputToken('');
    }, [dispensacion]);

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
         (lotesPorMaterialEmpaque && lotesPorMaterialEmpaque.size > 0));
    const canRegister = usuariosRealizadores.length > 0 && inputToken === token && !isLoading;

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
        seguimientoId: number;
        cantidad: number;
        loteId: number | null;
        completarSeguimiento: boolean;
    }> => {
        const items: Array<{
            seguimientoId: number;
            productoId?: string;
            cantidad: number;
            loteId: number | null;
            completarSeguimiento: boolean;
        }> = [];

        if (!lotesPorMaterial || !insumosDesglosados) {
            return items;
        }

        // Iterar sobre cada material que tiene lotes seleccionados (receta)
        lotesPorMaterial.forEach((lotes, insumoKey) => {
            const insumo = findInsumoByKey(insumoKey);
            const productoId = insumo?.productoId ?? (insumoKey.startsWith('producto-') ? insumoKey.replace('producto-', '') : insumoKey);

            // Filtrar productos no inventariables: solo incluir si es inventariable
            // Si inventareable es undefined o null, asumir true (comportamiento por defecto)
            if (insumo && insumo.inventareable === false) {
                return; // Saltar productos no inventariables
            }

            // Por cada lote seleccionado, crear un item
            lotes.forEach(lote => {
                const seguimientoId = insumo?.seguimientoId || 0;
                items.push({
                    seguimientoId: seguimientoId,
                    productoId: seguimientoId === 0 ? productoId : undefined, // Solo incluir productoId si no hay seguimientoId
                    cantidad: lote.cantidad,
                    loteId: lote.loteId,
                    completarSeguimiento: false // Por defecto, no completar seguimiento
                });
            });
        });

        // Iterar sobre cada material de empaque que tiene lotes seleccionados
        if (lotesPorMaterialEmpaque && insumosEmpaque) {
            lotesPorMaterialEmpaque.forEach((lotes, productoId) => {
                const insumo = insumosEmpaque.find(i => i.productoId === productoId);

                // Filtrar productos no inventariables
                if (insumo && insumo.inventareable === false) {
                    return; // Saltar productos no inventariables
                }

                // Por cada lote seleccionado, crear un item (sin seguimientoId para materiales de empaque)
                lotes.forEach(lote => {
                    items.push({
                        seguimientoId: 0, // Materiales de empaque no tienen seguimientoId
                        productoId: productoId, // Siempre incluir productoId para materiales de empaque
                        cantidad: lote.cantidad,
                        loteId: lote.loteId,
                        completarSeguimiento: false
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
                dispensacion?.observaciones
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

        setIsLoading(true);

        try {
            const items = buildDispensacionItems();

            const dispensacionDTO: DispensacionDTO = {
                ordenProduccionId: ordenProduccionId,
                usuarioRealizadorIds: usuariosRealizadores.map(u => u.id),
                usuarioAprobadorId: currentUser?.id,
                usuarioId: usuariosRealizadores[0]?.id || currentUser?.id || 0, // Para compatibilidad
                observaciones: dispensacion?.observaciones || '',
                items: items.map(item => ({
                    seguimientoId: item.seguimientoId,
                    producto: {} as any, // No necesario en el DTO del backend
                    lote: {} as any, // No necesario en el DTO del backend
                    cantidadSugerida: item.cantidad,
                    cantidad: item.cantidad
                }))
            };

            // Convertir a formato del backend (DispensacionItemDTO[])
            const backendDTO = {
                ordenProduccionId: dispensacionDTO.ordenProduccionId,
                usuarioRealizadorIds: dispensacionDTO.usuarioRealizadorIds,
                usuarioAprobadorId: dispensacionDTO.usuarioAprobadorId,
                usuarioId: dispensacionDTO.usuarioId,
                observaciones: dispensacionDTO.observaciones,
                items: items.map(item => ({
                    seguimientoId: item.seguimientoId,
                    productoId: item.productoId || undefined, // Incluir productoId si existe
                    cantidad: item.cantidad,
                    loteId: item.loteId,
                    completarSeguimiento: item.completarSeguimiento
                }))
            };

            const response = await axios.post(
                endPoints.dispensacion,
                backendDTO,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

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
                        Generar PDF
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
