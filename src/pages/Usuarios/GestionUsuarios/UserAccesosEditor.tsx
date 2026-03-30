import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    AlertIcon,
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Badge,
    Box,
    Button,
    Flex,
    Grid,
    GridItem,
    HStack,
    IconButton,
    Select,
    Spinner,
    Switch,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useDisclosure,
    useToast,
    VStack,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { fetchUserAssignmentStatus, type UserAssignmentStatus } from "../../../api/userAssignmentStatus.ts";
import { tabsForModule } from "../../../auth/moduleTabDefinitions.ts";
import { useAuth } from "../../../context/AuthContext.tsx";
import { Modulo, type User } from "./types.tsx";
import {
    buildAccessDraft,
    buildExpandedState,
    clampNivel,
    draftSignature,
    moduleLabel,
    serializeDraft,
    type AccessDraft,
} from "./userAccesosEditorModel.ts";

type Props = {
    user: User;
    onBack: () => void;
    onSaved?: () => void;
};

function tabLabel(modulo: Modulo, tabId: string): string {
    return tabsForModule(modulo).find((tab) => tab.tabId === tabId)?.label ?? tabId;
}

export default function UserAccesosEditor({ user, onBack, onSaved }: Props) {
    const toast = useToast();
    const discardDialog = useDisclosure();
    const cancelRef = useRef<HTMLButtonElement | null>(null);
    const endPoints = useMemo(() => new EndPointsURL(), []);
    const { user: authUsername, refreshAccesos } = useAuth();

    const initialDraft = useMemo(() => buildAccessDraft(user), [user]);

    const [localUser, setLocalUser] = useState<User>(user);
    const [draft, setDraft] = useState<AccessDraft>(initialDraft);
    const [expandedModules, setExpandedModules] = useState<Record<Modulo, boolean>>(
        buildExpandedState(initialDraft)
    );
    const [baselineSignature, setBaselineSignature] = useState(draftSignature(initialDraft));
    const [loadingUser, setLoadingUser] = useState(true);
    const [assignmentStatus, setAssignmentStatus] = useState<UserAssignmentStatus | null>(null);
    const [saving, setSaving] = useState(false);

    const modules = useMemo(() => Object.values(Modulo), []);

    const applyFreshUser = useCallback((nextUser: User) => {
        const nextDraft = buildAccessDraft(nextUser);
        setLocalUser(nextUser);
        setDraft(nextDraft);
        setExpandedModules(buildExpandedState(nextDraft));
        setBaselineSignature(draftSignature(nextDraft));
    }, []);

    const refreshLocalUser = useCallback(async () => {
        setLoadingUser(true);
        try {
            const { data } = await axios.get<User[]>(endPoints.get_all_users);
            const refreshed = data.find((candidate) => candidate.id === user.id);
            if (refreshed) {
                applyFreshUser(refreshed);
                setAssignmentStatus(await fetchUserAssignmentStatus(refreshed.id));
            } else {
                applyFreshUser(user);
                setAssignmentStatus(await fetchUserAssignmentStatus(user.id));
            }
        } catch {
            toast({
                title: "Error",
                description: "No se pudo actualizar la informacion del usuario o su estado operativo.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
            applyFreshUser(user);
            setAssignmentStatus(null);
        } finally {
            setLoadingUser(false);
        }
    }, [applyFreshUser, endPoints.get_all_users, toast, user]);

    useEffect(() => {
        refreshLocalUser();
    }, [refreshLocalUser]);

    const payload = useMemo(() => serializeDraft(draft), [draft]);
    const isDirty = useMemo(() => draftSignature(draft) !== baselineSignature, [baselineSignature, draft]);
    const permisosBloqueadosPorArea = assignmentStatus?.canReceiveModuloAccesos === false;

    const toggleExpanded = (modulo: Modulo) => {
        setExpandedModules((prev) => ({ ...prev, [modulo]: !prev[modulo] }));
    };

    const setModuleEnabled = (modulo: Modulo, enabled: boolean) => {
        setDraft((prev) => {
            const current = prev[modulo];
            const nextTabs = enabled
                ? current.tabs
                : Object.fromEntries(
                      Object.entries(current.tabs).map(([tabId, tab]) => [
                          tabId,
                          { ...tab, enabled: false },
                      ])
                  );

            return {
                ...prev,
                [modulo]: {
                    enabled,
                    tabs: nextTabs,
                },
            };
        });

        if (enabled) {
            setExpandedModules((prev) => ({ ...prev, [modulo]: true }));
        }
    };

    const setTabEnabled = (modulo: Modulo, tabId: string, enabled: boolean) => {
        setDraft((prev) => ({
            ...prev,
            [modulo]: {
                ...prev[modulo],
                enabled: enabled ? true : prev[modulo].enabled,
                tabs: {
                    ...prev[modulo].tabs,
                    [tabId]: {
                        ...prev[modulo].tabs[tabId],
                        enabled,
                    },
                },
            },
        }));
    };

    const setTabNivel = (modulo: Modulo, tabId: string, nivel: number) => {
        setDraft((prev) => ({
            ...prev,
            [modulo]: {
                ...prev[modulo],
                tabs: {
                    ...prev[modulo].tabs,
                    [tabId]: {
                        ...prev[modulo].tabs[tabId],
                        nivel: clampNivel(nivel),
                    },
                },
            },
        }));
    };

    const handleBack = () => {
        if (isDirty) {
            discardDialog.onOpen();
            return;
        }
        onBack();
    };

    const handleSave = async () => {
        if (permisosBloqueadosPorArea) {
            return;
        }
        setSaving(true);
        try {
            const { data } = await axios.put<User>(
                endPoints.update_user_accesos.replace("{userId}", String(localUser.id)),
                payload
            );
            applyFreshUser(data);
            toast({
                title: "Permisos actualizados",
                description: "Los accesos del usuario se guardaron correctamente.",
                status: "success",
                duration: 4000,
                isClosable: true,
            });
            onSaved?.();
            if (authUsername && data.username === authUsername) {
                await refreshAccesos();
            }
            onBack();
        } catch (error) {
            const description =
                axios.isAxiosError(error) && typeof error.response?.data === "string"
                    ? error.response.data
                    : "No se pudieron guardar los permisos del usuario.";
            toast({
                title: "Error",
                description,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box p={4}>
            {permisosBloqueadosPorArea && (
                <Alert status="warning" mb={4} borderRadius="md">
                    <AlertIcon />
                    Este usuario ya es responsable del area {assignmentStatus?.areaResponsableNombre ?? "operativa"} y por esa razon no puede recibir permisos de modulos.
                </Alert>
            )}

            <Flex justify="space-between" align="center" gap={4} wrap="wrap" mb={6}>
                <Box>
                    <Text fontSize="2xl" fontWeight="bold">
                        Editor de permisos
                    </Text>
                    <Text color="gray.600">
                        {localUser.username}
                        {localUser.nombreCompleto ? ` - ${localUser.nombreCompleto}` : ""}
                    </Text>
                </Box>
                <HStack spacing={3}>
                    <Button variant="outline" onClick={handleBack} isDisabled={saving}>
                        Atras
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleSave}
                        isLoading={saving}
                        isDisabled={!isDirty || loadingUser || saving || permisosBloqueadosPorArea}
                    >
                        Guardar
                    </Button>
                </HStack>
            </Flex>

            <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 1.7fr) minmax(320px, 1fr)" }} gap={6}>
                <GridItem>
                    <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
                        <Box px={4} py={3} borderBottomWidth="1px" bg="gray.50">
                            <Text fontWeight="semibold">Matriz de accesos</Text>
                            <Text fontSize="sm" color="gray.600">
                                Activa modulos, despliega sus tabs y asigna el nivel por tab.
                            </Text>
                        </Box>

                        {loadingUser ? (
                            <Flex align="center" justify="center" minH="220px" gap={3}>
                                <Spinner />
                                <Text>Cargando permisos...</Text>
                            </Flex>
                        ) : (
                            <Box overflowX="auto">
                                <Table size="sm" variant="simple">
                                    <Thead bg="gray.50">
                                        <Tr>
                                            <Th>Modulo / Tab</Th>
                                            <Th w="140px">Acceso</Th>
                                            <Th w="140px">Nivel</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {modules.map((modulo) => {
                                            const moduleRow = draft[modulo];
                                            const defs = tabsForModule(modulo);
                                            const activeTabs = defs.filter((tab) => moduleRow.tabs[tab.tabId]?.enabled).length;
                                            const isExpanded = expandedModules[modulo];

                                            return (
                                                <Fragment key={modulo}>
                                                    <Tr
                                                        onClick={() => toggleExpanded(modulo)}
                                                        _hover={{ bg: "gray.50", cursor: "pointer" }}
                                                        bg={moduleRow.enabled ? "blue.50" : undefined}
                                                    >
                                                        <Td>
                                                            <HStack spacing={3}>
                                                                <IconButton
                                                                    aria-label={isExpanded ? "Contraer modulo" : "Expandir modulo"}
                                                                    icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        toggleExpanded(modulo);
                                                                    }}
                                                                />
                                                                <Box>
                                                                    <Text fontWeight="semibold">{moduleLabel(modulo)}</Text>
                                                                    <HStack spacing={2}>
                                                                        <Badge colorScheme={activeTabs > 0 ? "green" : "gray"}>
                                                                            {activeTabs} tabs activas
                                                                        </Badge>
                                                                        <Text fontSize="xs" color="gray.500">
                                                                            {modulo}
                                                                        </Text>
                                                                    </HStack>
                                                                </Box>
                                                            </HStack>
                                                        </Td>
                                                        <Td onClick={(event) => event.stopPropagation()}>
                                                            <Switch
                                                                isChecked={moduleRow.enabled}
                                                                isDisabled={permisosBloqueadosPorArea}
                                                                onChange={(event) =>
                                                                    setModuleEnabled(modulo, event.target.checked)
                                                                }
                                                            />
                                                        </Td>
                                                        <Td>
                                                            <Text fontSize="xs" color="gray.500">
                                                                {moduleRow.enabled ? "Modulo habilitado" : "Modulo deshabilitado"}
                                                            </Text>
                                                        </Td>
                                                    </Tr>
                                                    {isExpanded &&
                                                        defs.map((tab) => {
                                                            const tabRow = moduleRow.tabs[tab.tabId];
                                                            return (
                                                                <Tr key={`${modulo}-${tab.tabId}`} bg="white">
                                                                    <Td pl={14}>
                                                                        <Box>
                                                                            <Text fontSize="sm">{tab.label}</Text>
                                                                            <Text fontSize="xs" color="gray.500">
                                                                                {tab.tabId}
                                                                            </Text>
                                                                        </Box>
                                                                    </Td>
                                                                    <Td>
                                                                        <Switch
                                                                            isChecked={tabRow.enabled}
                                                                            isDisabled={!moduleRow.enabled || permisosBloqueadosPorArea}
                                                                            onChange={(event) =>
                                                                                setTabEnabled(
                                                                                    modulo,
                                                                                    tab.tabId,
                                                                                    event.target.checked
                                                                                )
                                                                            }
                                                                        />
                                                                    </Td>
                                                                    <Td>
                                                                        <Select
                                                                            size="sm"
                                                                            value={tabRow.nivel}
                                                                            isDisabled={!moduleRow.enabled || !tabRow.enabled || permisosBloqueadosPorArea}
                                                                            onChange={(event) =>
                                                                                setTabNivel(
                                                                                    modulo,
                                                                                    tab.tabId,
                                                                                    Number(event.target.value)
                                                                                )
                                                                            }
                                                                        >
                                                                            {Array.from({ length: tab.maxNivel }, (_, index) => index + 1).map(
                                                                                (nivel) => (
                                                                                    <option key={nivel} value={nivel}>
                                                                                        Nivel {nivel}
                                                                                    </option>
                                                                                )
                                                                            )}
                                                                        </Select>
                                                                    </Td>
                                                                </Tr>
                                                            );
                                                        })}
                                                </Fragment>
                                            );
                                        })}
                                    </Tbody>
                                </Table>
                            </Box>
                        )}
                    </Box>
                </GridItem>

                <GridItem>
                    <Box borderWidth="1px" borderRadius="lg" bg="white" h="100%">
                        <Box px={4} py={3} borderBottomWidth="1px" bg="gray.50">
                            <Text fontWeight="semibold">Resumen final</Text>
                            <Text fontSize="sm" color="gray.600">
                                Vista previa solo lectura de los permisos que se guardaran.
                            </Text>
                        </Box>

                        <Box p={4}>
                            {payload.accesos.length === 0 ? (
                                <Text color="gray.500">Este usuario no quedara con permisos activos.</Text>
                            ) : (
                                <VStack align="stretch" spacing={4}>
                                    {payload.accesos.map((acceso) => (
                                        <Box key={acceso.modulo} borderWidth="1px" borderRadius="md" p={3}>
                                            <HStack justify="space-between" mb={2}>
                                                <Text fontWeight="semibold">{moduleLabel(acceso.modulo)}</Text>
                                                <Badge colorScheme="blue">{acceso.tabs.length} tabs</Badge>
                                            </HStack>
                                            <VStack align="stretch" spacing={2}>
                                                {acceso.tabs.map((tab) => (
                                                    <Flex
                                                        key={`${acceso.modulo}-${tab.tabId}`}
                                                        justify="space-between"
                                                        align="center"
                                                        p={2}
                                                        bg="gray.50"
                                                        borderRadius="md"
                                                    >
                                                        <Box>
                                                            <Text fontSize="sm">{tabLabel(acceso.modulo, tab.tabId)}</Text>
                                                            <Text fontSize="xs" color="gray.500">
                                                                {tab.tabId}
                                                            </Text>
                                                        </Box>
                                                        <Badge colorScheme="green">Nivel {tab.nivel}</Badge>
                                                    </Flex>
                                                ))}
                                            </VStack>
                                        </Box>
                                    ))}
                                </VStack>
                            )}
                        </Box>
                    </Box>
                </GridItem>
            </Grid>

            <AlertDialog
                isOpen={discardDialog.isOpen}
                leastDestructiveRef={cancelRef}
                onClose={discardDialog.onClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader>Descartar cambios</AlertDialogHeader>
                        <AlertDialogBody>
                            Hay cambios sin guardar. Si sales ahora, se perderan.
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={discardDialog.onClose}>
                                Seguir editando
                            </Button>
                            <Button
                                colorScheme="red"
                                ml={3}
                                onClick={() => {
                                    discardDialog.onClose();
                                    onBack();
                                }}
                            >
                                Descartar y salir
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
}
