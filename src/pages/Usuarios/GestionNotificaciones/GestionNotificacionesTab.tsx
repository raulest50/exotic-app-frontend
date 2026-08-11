import React, { useCallback, useEffect, useState } from 'react';
import { useColorModeValue } from "../../../components/ui/color-mode";
import {
    Box,
    Button,
    Flex,
    Grid,
    GridItem,
    Heading,
    IconButton,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useDisclosure,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { User } from '../GestionUsuarios/types.tsx';
import { LuInfo, LuTrash2 } from 'react-icons/lu';

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
    const toast = useAppToast();
    const selectedNameColor = useColorModeValue('teal.600', 'teal.300');

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
                    <Heading size="sm" mb={3} color="app.textMuted">
                        Tipos de Notificación
                    </Heading>
                    <Box border="1px solid" borderColor="app.border" borderRadius="md" overflow="hidden">
                        <Table.Root variant="simple" size="sm">
                            <Table.Header bg="app.tableHeader">
                                <Table.Row>
                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                    <Table.ColumnHeader w="50px" textAlign="center">Info</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {notificaciones.length === 0 ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={2}>
                                            <Text textAlign="center" color="gray.400" py={4}>
                                                Sin notificaciones
                                            </Text>
                                        </Table.Cell>
                                    </Table.Row>
                                ) : (
                                    notificaciones.map(notif => (
                                        <Table.Row
                                            key={notif.id}
                                            onClick={() => setSelected(notif)}
                                            bg={selected?.id === notif.id ? 'app.rowSelectedTeal' : 'transparent'}
                                            borderLeft={selected?.id === notif.id ? '3px solid' : '3px solid transparent'}
                                            borderColor={selected?.id === notif.id ? 'teal.400' : 'transparent'}
                                            _hover={{ bg: 'app.rowHover', cursor: 'pointer' }}
                                        >
                                            <Table.Cell fontWeight={selected?.id === notif.id ? 'semibold' : 'normal'}>
                                                {notif.nombre}
                                            </Table.Cell>
                                            <Table.Cell textAlign="center">
                                                <IconButton
                                                    aria-label="Ver descripción"
                                                    size="xs"
                                                    variant="ghost"
                                                    colorPalette="blue"
                                                    onClick={(e) => handleOpenInfo(notif, e)}><LuInfo /></IconButton>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))
                                )}
                            </Table.Body>
                        </Table.Root>
                    </Box>
                </GridItem>

                {/* Panel derecho: usuarios del grupo */}
                <GridItem>
                    {selected ? (
                        <>
                            <Flex justify="space-between" align="center" mb={3}>
                                <Heading size="sm" color="app.textMuted">
                                    Usuarios en:{' '}
                                    <Text as="span" color={selectedNameColor}>{selected.nombre}</Text>
                                </Heading>
                                <Button
                                    size="sm"
                                    colorPalette="teal"
                                    onClick={pickerModal.onOpen}
                                    loading={isLoadingAction}
                                >
                                    + Agregar Usuario
                                </Button>
                            </Flex>
                            <Box border="1px solid" borderColor="app.border" borderRadius="md" overflow="hidden">
                                <Table.Root variant="simple" size="sm">
                                    <Table.Header bg="app.tableHeader">
                                        <Table.Row>
                                            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                            <Table.ColumnHeader>Correo</Table.ColumnHeader>
                                            <Table.ColumnHeader w="50px" textAlign="center">Quitar</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {selected.usersGroup.length === 0 ? (
                                            <Table.Row>
                                                <Table.Cell colSpan={3}>
                                                    <Text textAlign="center" color="gray.400" py={4}>
                                                        No hay usuarios en este grupo
                                                    </Text>
                                                </Table.Cell>
                                            </Table.Row>
                                        ) : (
                                            selected.usersGroup.map(user => (
                                                <Table.Row key={user.id} _hover={{ bg: 'app.rowHover' }}>
                                                    <Table.Cell>{user.nombreCompleto || user.username}</Table.Cell>
                                                    <Table.Cell color="app.textSubtle">{user.email ?? '—'}</Table.Cell>
                                                    <Table.Cell textAlign="center">
                                                        <IconButton
                                                            aria-label="Quitar usuario"
                                                            size="xs"
                                                            variant="ghost"
                                                            colorPalette="red"
                                                            loading={isLoadingAction}
                                                            onClick={() => handleRemoveUser(user.id)}><LuTrash2 /></IconButton>
                                                    </Table.Cell>
                                                </Table.Row>
                                            ))
                                        )}
                                    </Table.Body>
                                </Table.Root>
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
            <Dialog.Root open={infoModal.open} placement='center' onOpenChange={e => {
                if (!e.open) {
                    infoModal.onClose();
                }
            }}>
                <Portal>

                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>{infoTarget?.nombre}</Dialog.Header>
                            <Dialog.CloseTrigger />
                            <Dialog.Body>
                                <Text>{infoTarget?.descripcion}</Text>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button onClick={infoModal.onClose}>Cerrar</Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>

                </Portal>
            </Dialog.Root>

            {/* Modal: seleccionar usuario */}
            <UserGenericPicker
                isOpen={pickerModal.open}
                onClose={pickerModal.onClose}
                onSelectUser={handleAddUser}
            />
        </Box>
    );
}
