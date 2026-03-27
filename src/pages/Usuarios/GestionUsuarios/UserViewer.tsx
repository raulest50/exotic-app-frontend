// src/components/UserViewer.tsx
import { useEffect, useState } from 'react';
import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Box,
    Button,
    Flex,
    IconButton,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Spacer,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
} from '@chakra-ui/react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import axios from 'axios';
import { tabsForModule } from '../../../auth/moduleTabDefinitions.ts';
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { User, type ModuloAccesoFE } from './types.tsx';
import { Modulo } from './types.tsx';

type Props = {
    setViewMode: (viewMode: number) => void;
    usersRefreshKey: number;
    onEditUser: (user: User) => void;
    onEditPermissions: (user: User) => void;
};

function isModulo(value: string): value is Modulo {
    return Object.values(Modulo).includes(value as Modulo);
}

function tabDisplayLabel(moduloRaw: string | undefined, tabId: string): string {
    if (!moduloRaw || !isModulo(moduloRaw)) return tabId;
    const def = tabsForModule(moduloRaw).find((t) => t.tabId === tabId);
    return def?.label ?? tabId;
}

export default function UserViewer({
    setViewMode,
    usersRefreshKey,
    onEditUser,
    onEditPermissions,
}: Props) {

    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [isActivatingUser, setIsActivatingUser] = useState(false);
    const [isDeactivatingUser, setIsDeactivatingUser] = useState(false);

    const isLoading = isCreatingUser || isDeletingUser || isActivatingUser || isDeactivatingUser;

    const toast = useToast();
    const endPoints = new EndPointsURL();

    const fetchUsers = async () => {
        try {
            const response = await axios.get<User[]>(`${endPoints.domain}/usuarios`);
            const list = response.data;
            setUsers(list);
            setSelectedUser((prev) => {
                if (!prev) return null;
                return list.find((u) => u.id === prev.id) ?? prev;
            });
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los usuarios.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (usersRefreshKey > 0) {
            fetchUsers();
        }
    }, [usersRefreshKey]);

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        if (selectedUser.username.toLowerCase() === 'master') {
            toast({
                title: 'Acción no permitida',
                description: 'El usuario master no se puede eliminar.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        setIsDeletingUser(true);
        try {
            await axios.delete(`${endPoints.domain}/usuarios/${selectedUser.id}`);
            toast({
                title: 'Usuario eliminado',
                description: 'El usuario ha sido eliminado exitosamente.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            setSelectedUser(null);
            fetchUsers();
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudo eliminar el usuario.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsDeletingUser(false);
        }
    };

    const handleDeactivateUser = async () => {
        if (!selectedUser) return;
        if (selectedUser.username.toLowerCase() === 'master') {
            toast({
                title: 'Acción no permitida',
                description: 'El usuario master no se puede desactivar.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        if (selectedUser.estado !== 1) {
            toast({
                title: 'Acción no permitida',
                description: 'El usuario ya está desactivado.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        setIsDeactivatingUser(true);
        try {
            const response = await axios.put(
                endPoints.deactivate_user.replace('{userId}', selectedUser.id.toString())
            );
            toast({
                title: 'Usuario desactivado',
                description: 'El usuario ha sido desactivado exitosamente.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            setSelectedUser(response.data);
            fetchUsers();
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudo desactivar el usuario.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsDeactivatingUser(false);
        }
    };

    const handleActivateUser = async () => {
        if (!selectedUser) return;

        if (selectedUser.username.toLowerCase() === 'master') {
            toast({
                title: 'Acción no permitida',
                description: 'El usuario master siempre está activo.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        if (selectedUser.estado !== 2) {
            toast({
                title: 'Acción no permitida',
                description: 'El usuario ya está activo.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        setIsActivatingUser(true);
        try {
            const response = await axios.put(
                endPoints.activate_user.replace('{userId}', selectedUser.id.toString())
            );
            toast({
                title: 'Usuario activado',
                description: 'El usuario ha sido activado exitosamente.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            setSelectedUser(response.data);
            fetchUsers();
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudo activar el usuario.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsActivatingUser(false);
        }
    };

    const handleCreateUser = () => {
        setIsCreatingUser(true);
        setViewMode(1);
        setTimeout(() => setIsCreatingUser(false), 500);
    };

    const modulosDelUsuario: ModuloAccesoFE[] = selectedUser?.moduloAccesos ?? [];

    return (
        <Box p={4}>

            <Text fontSize="2xl" mb={4}>
                Creación de Usuarios y Asignación de Accesos
            </Text>
            <Flex mb={4}>
                <Button
                    colorScheme="blue"
                    mr={4}
                    onClick={handleCreateUser}
                    isLoading={isCreatingUser}
                    isDisabled={isLoading}
                >
                    Crear Nuevo Usuario
                </Button>
                <Button
                    colorScheme="red"
                    onClick={handleDeleteUser}
                    isLoading={isDeletingUser}
                    isDisabled={
                        isLoading ||
                        !selectedUser ||
                        selectedUser.username.toLowerCase() === 'master'
                    }
                    mr={4}
                >
                    Eliminar Usuario
                </Button>
                <Button
                    colorScheme="orange"
                    onClick={handleDeactivateUser}
                    isLoading={isDeactivatingUser}
                    isDisabled={
                        isLoading ||
                        !selectedUser ||
                        selectedUser.username.toLowerCase() === 'master' ||
                        selectedUser.estado !== 1
                    }
                    mr={4}
                >
                    Desactivar Usuario
                </Button>
                <Button
                    colorScheme="green"
                    onClick={handleActivateUser}
                    isLoading={isActivatingUser}
                    isDisabled={
                        isLoading ||
                        !selectedUser ||
                        selectedUser.username.toLowerCase() === 'master' ||
                        selectedUser.estado !== 2
                    }
                >
                    Activar Usuario
                </Button>
            </Flex>
            <Flex>
                <Box flex="2">
                    <Table variant="simple">
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Username</Th>
                                <Th>Nombre Completo</Th>
                                <Th>Estado</Th>
                                <Th>Acciones</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {users.map((user) => (
                                <Tr
                                    key={user.id}
                                    onClick={() => handleUserSelect(user)}
                                    _hover={{ bg: 'blue.50', cursor: 'pointer' }}
                                    bg={
                                        selectedUser?.id === user.id
                                            ? 'blue.100'
                                            : user.username.toLowerCase() === 'master'
                                                ? 'green.200'
                                                : user.estado === 1
                                                    ? 'green.50'
                                                    : 'orange.50'
                                    }
                                >
                                    <Td>{user.id}</Td>
                                    <Td>{user.username}</Td>
                                    <Td>{user.nombreCompleto}</Td>
                                    <Td>{user.username.toLowerCase() === 'master' ? 'Activo' : user.estado === 1 ? 'Activo' : 'Inactivo'}</Td>
                                    <Td onClick={(e) => e.stopPropagation()}>
                                        <Menu>
                                            <MenuButton
                                                as={IconButton}
                                                icon={<BsThreeDotsVertical />}
                                                variant="ghost"
                                                size="sm"
                                                aria-label="Acciones"
                                                isDisabled={
                                                    isLoading ||
                                                    ['master', 'super_master'].includes(user.username.toLowerCase())
                                                }
                                            />
                                            <MenuList>
                                                <MenuItem onClick={() => onEditUser(user)}>
                                                    Editar campos
                                                </MenuItem>
                                                <MenuItem onClick={() => onEditPermissions(user)}>
                                                    Editar permisos y accesos
                                                </MenuItem>
                                            </MenuList>
                                        </Menu>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
                <Spacer />
                <Box flex="1" borderWidth="1px" borderRadius="md" p={4} maxW="420px">
                    <Text fontSize="lg" mb={2}>
                        Accesos por módulo
                    </Text>
                    {selectedUser ? (
                        modulosDelUsuario.length > 0 ? (
                            <Accordion allowToggle reduceMotion>
                                {modulosDelUsuario.map((ma) => {
                                    const modStr =
                                        typeof ma.modulo === 'string' ? ma.modulo : String(ma.modulo ?? '');
                                    const title = modStr ? modStr.replace(/_/g, ' ') : 'Desconocido';
                                    return (
                                        <AccordionItem key={ma.id}>
                                            <AccordionButton px={2}>
                                                <Box flex="1" textAlign="left">
                                                    <Text fontWeight="medium" fontSize="sm">
                                                        {title}
                                                    </Text>
                                                    <Text fontSize="xs" color="gray.500">
                                                        ID {ma.id}
                                                    </Text>
                                                </Box>
                                                <AccordionIcon />
                                            </AccordionButton>
                                            <AccordionPanel pb={3} pt={0} px={2}>
                                                {ma.tabs?.length ? (
                                                    <Box as="ul" pl={4} fontSize="sm">
                                                        {ma.tabs.map((t) => (
                                                            <Text as="li" key={t.id ?? `${t.tabId}-${t.nivel}`}>
                                                                {tabDisplayLabel(modStr, t.tabId)}{' '}
                                                                <Text as="span" color="gray.500" fontSize="xs">
                                                                    ({t.tabId}) — nivel {t.nivel}
                                                                </Text>
                                                            </Text>
                                                        ))}
                                                    </Box>
                                                ) : (
                                                    <Text fontSize="sm" color="gray.500">
                                                        —
                                                    </Text>
                                                )}
                                            </AccordionPanel>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        ) : (
                            <Text fontSize="sm">No hay accesos asignados</Text>
                        )
                    ) : (
                        <Text>No hay usuario seleccionado.</Text>
                    )}
                </Box>
            </Flex>
        </Box>
    );
}
