import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Grid,
    GridItem,
    Heading,
    IconButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useDisclosure,
    useToast,
} from '@chakra-ui/react';
import { DeleteIcon, InfoIcon } from '@chakra-ui/icons';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { User } from '../GestionUsuarios/types.tsx';

const endPoints = new EndPointsURL();

interface MaestraNotificacion {
    id: number;
    nombre: string;
    descripcion: string;
    usersGroup: User[];
}

export default function GestionNotificacionesTab() {
    const [notificaciones, setNotificaciones] = useState<MaestraNotificacion[]>([]);
    const [selected, setSelected] = useState<MaestraNotificacion | null>(null);
    const [infoTarget, setInfoTarget] = useState<MaestraNotificacion | null>(null);
    const [isLoadingAction, setIsLoadingAction] = useState(false);

    const infoModal = useDisclosure();
    const pickerModal = useDisclosure();
    const toast = useToast();

    const fetchNotificaciones = useCallback(async () => {
        try {
            const res = await axios.get<MaestraNotificacion[]>(endPoints.get_maestra_notificaciones);
            setNotificaciones(res.data);
            if (selected) {
                const refreshed = res.data.find(n => n.id === selected.id);
                setSelected(refreshed ?? null);
            }
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudieron cargar las notificaciones.',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
        }
    }, [selected, toast]);

    useEffect(() => {
        fetchNotificaciones();
    }, []);

    const handleOpenInfo = (notif: MaestraNotificacion, e: React.MouseEvent) => {
        e.stopPropagation();
        setInfoTarget(notif);
        infoModal.onOpen();
    };

    const handleAddUser = async (user: User) => {
        if (!selected) return;
        setIsLoadingAction(true);
        const url = endPoints.add_user_to_notificacion
            .replace('{notificacionId}', String(selected.id))
            .replace('{userId}', String(user.id));
        try {
            await axios.post(url);
            await fetchNotificaciones();
            toast({ title: 'Usuario agregado', status: 'success', duration: 3000, isClosable: true });
        } catch {
            toast({ title: 'Error', description: 'No se pudo agregar el usuario.', status: 'error', duration: 4000, isClosable: true });
        } finally {
            setIsLoadingAction(false);
        }
    };

    const handleRemoveUser = async (userId: number) => {
        if (!selected) return;
        setIsLoadingAction(true);
        const url = endPoints.remove_user_from_notificacion
            .replace('{notificacionId}', String(selected.id))
            .replace('{userId}', String(userId));
        try {
            await axios.delete(url);
            await fetchNotificaciones();
            toast({ title: 'Usuario removido', status: 'info', duration: 3000, isClosable: true });
        } catch {
            toast({ title: 'Error', description: 'No se pudo remover el usuario.', status: 'error', duration: 4000, isClosable: true });
        } finally {
            setIsLoadingAction(false);
        }
    };

    return (
        <Box pt={4}>
            <Grid templateColumns="30% 1fr" gap={6} minH="400px">

                {/* Panel izquierdo: lista de notificaciones */}
                <GridItem>
                    <Heading size="sm" mb={3} color="gray.600">
                        Tipos de Notificación
                    </Heading>
                    <Box border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden">
                        <Table variant="simple" size="sm">
                            <Thead bg="gray.50">
                                <Tr>
                                    <Th>Nombre</Th>
                                    <Th w="50px" textAlign="center">Info</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {notificaciones.length === 0 ? (
                                    <Tr>
                                        <Td colSpan={2}>
                                            <Text textAlign="center" color="gray.400" py={4}>
                                                Sin notificaciones
                                            </Text>
                                        </Td>
                                    </Tr>
                                ) : (
                                    notificaciones.map(notif => (
                                        <Tr
                                            key={notif.id}
                                            onClick={() => setSelected(notif)}
                                            bg={selected?.id === notif.id ? 'teal.50' : 'transparent'}
                                            borderLeft={selected?.id === notif.id ? '3px solid' : '3px solid transparent'}
                                            borderColor={selected?.id === notif.id ? 'teal.400' : 'transparent'}
                                            _hover={{ bg: 'gray.50', cursor: 'pointer' }}
                                        >
                                            <Td fontWeight={selected?.id === notif.id ? 'semibold' : 'normal'}>
                                                {notif.nombre}
                                            </Td>
                                            <Td textAlign="center">
                                                <IconButton
                                                    aria-label="Ver descripción"
                                                    icon={<InfoIcon />}
                                                    size="xs"
                                                    variant="ghost"
                                                    colorScheme="blue"
                                                    onClick={(e) => handleOpenInfo(notif, e)}
                                                />
                                            </Td>
                                        </Tr>
                                    ))
                                )}
                            </Tbody>
                        </Table>
                    </Box>
                </GridItem>

                {/* Panel derecho: usuarios del grupo */}
                <GridItem>
                    {selected ? (
                        <>
                            <Flex justify="space-between" align="center" mb={3}>
                                <Heading size="sm" color="gray.600">
                                    Usuarios en:{' '}
                                    <Text as="span" color="teal.600">{selected.nombre}</Text>
                                </Heading>
                                <Button
                                    size="sm"
                                    colorScheme="teal"
                                    onClick={pickerModal.onOpen}
                                    isLoading={isLoadingAction}
                                >
                                    + Agregar Usuario
                                </Button>
                            </Flex>
                            <Box border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden">
                                <Table variant="simple" size="sm">
                                    <Thead bg="gray.50">
                                        <Tr>
                                            <Th>Nombre</Th>
                                            <Th>Correo</Th>
                                            <Th w="50px" textAlign="center">Quitar</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {selected.usersGroup.length === 0 ? (
                                            <Tr>
                                                <Td colSpan={3}>
                                                    <Text textAlign="center" color="gray.400" py={4}>
                                                        No hay usuarios en este grupo
                                                    </Text>
                                                </Td>
                                            </Tr>
                                        ) : (
                                            selected.usersGroup.map(user => (
                                                <Tr key={user.id} _hover={{ bg: 'gray.50' }}>
                                                    <Td>{user.nombreCompleto || user.username}</Td>
                                                    <Td color="gray.500">{user.email ?? '—'}</Td>
                                                    <Td textAlign="center">
                                                        <IconButton
                                                            aria-label="Quitar usuario"
                                                            icon={<DeleteIcon />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="red"
                                                            isLoading={isLoadingAction}
                                                            onClick={() => handleRemoveUser(user.id)}
                                                        />
                                                    </Td>
                                                </Tr>
                                            ))
                                        )}
                                    </Tbody>
                                </Table>
                            </Box>
                        </>
                    ) : (
                        <Flex h="full" align="center" justify="center" minH="200px">
                            <Text color="gray.400" fontStyle="italic">
                                Selecciona una notificación para gestionar sus usuarios
                            </Text>
                        </Flex>
                    )}
                </GridItem>
            </Grid>

            {/* Modal: descripción de la notificación */}
            <Modal isOpen={infoModal.isOpen} onClose={infoModal.onClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{infoTarget?.nombre}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text>{infoTarget?.descripcion}</Text>
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={infoModal.onClose}>Cerrar</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Modal: seleccionar usuario */}
            <UserGenericPicker
                isOpen={pickerModal.isOpen}
                onClose={pickerModal.onClose}
                onSelectUser={handleAddUser}
            />
        </Box>
    );
}
