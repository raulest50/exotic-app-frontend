import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Badge,
    Box,
    Button,
    Flex,
    Grid,
    GridItem,
    HStack,
    IconButton,
    NativeSelect,
    Spinner,
    Switch,
    Table,
    Text,
    useDisclosure,
    VStack,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
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
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';

type Props = {
    user: User;
    onBack: () => void;
    onSaved?: () => void;
};

function tabLabel(modulo: Modulo, tabId: string): string {
    return tabsForModule(modulo).find((tab) => tab.tabId === tabId)?.label ?? tabId;
}

export default function UserAccesosEditor({ user, onBack, onSaved }: Props) {
    const toast = useAppToast();
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
                <Alert.Root status="warning" mb={4} borderRadius="md">
                    <Alert.Indicator />
                    Este usuario ya es responsable del area {assignmentStatus?.areaResponsableNombre ?? "operativa"} y por esa razon no puede recibir permisos de modulos.
                </Alert.Root>
            )}

            <Flex justify="space-between" align="center" gap={4} wrap="wrap" mb={6}>
                <Box>
                    <Text fontSize="2xl" fontWeight="bold">
                        Editor de permisos
                    </Text>
                    <Text color="app.textMuted">
                        {localUser.username}
                        {localUser.nombreCompleto ? ` - ${localUser.nombreCompleto}` : ""}
                    </Text>
                </Box>
                <HStack gap={3}>
                    <Button variant="outline" onClick={handleBack} disabled={saving}>
                        Atras
                    </Button>
                    <Button
                        colorPalette="blue"
                        onClick={handleSave}
                        loading={saving}
                        disabled={!isDirty || loadingUser || saving || permisosBloqueadosPorArea}
                    >
                        Guardar
                    </Button>
                </HStack>
            </Flex>

            <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 1.7fr) minmax(320px, 1fr)" }} gap={6}>
                <GridItem>
                    <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="app.surface">
                        <Box px={4} py={3} borderBottomWidth="1px" bg="app.surfaceSubtle">
                            <Text fontWeight="semibold">Matriz de accesos</Text>
                            <Text fontSize="sm" color="app.textMuted">
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
                                <Table.Root size="sm" variant="line">
                                    <Table.Header bg="app.tableHeader">
                                        <Table.Row>
                                            <Table.ColumnHeader>Modulo / Tab</Table.ColumnHeader>
                                            <Table.ColumnHeader w="140px">Acceso</Table.ColumnHeader>
                                            <Table.ColumnHeader w="140px">Nivel</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {modules.map((modulo) => {
                                            const moduleRow = draft[modulo];
                                            const defs = tabsForModule(modulo);
                                            const activeTabs = defs.filter((tab) => moduleRow.tabs[tab.tabId]?.enabled).length;
                                            const isExpanded = expandedModules[modulo];

                                            return (
                                                <Fragment key={modulo}>
                                                    <Table.Row
                                                        onClick={() => toggleExpanded(modulo)}
                                                        _hover={{ bg: "app.rowHover", cursor: "pointer" }}
                                                        bg={moduleRow.enabled ? "app.rowActiveBlue" : undefined}
                                                    >
                                                        <Table.Cell>
                                                            <HStack gap={3}>
                                                                <IconButton
                                                                    aria-label={isExpanded ? "Contraer modulo" : "Expandir modulo"}
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        toggleExpanded(modulo);
                                                                    }}>{isExpanded ? <LuChevronDown /> : <LuChevronRight />}</IconButton>
                                                                <Box>
                                                                    <Text fontWeight="semibold">{moduleLabel(modulo)}</Text>
                                                                    <HStack gap={2}>
                                                                        <Badge colorPalette={activeTabs > 0 ? "green" : "gray"}>
                                                                            {activeTabs} tabs activas
                                                                        </Badge>
                                                                        <Text fontSize="xs" color="app.textSubtle">
                                                                            {modulo}
                                                                        </Text>
                                                                    </HStack>
                                                                </Box>
                                                            </HStack>
                                                        </Table.Cell>
                                                        <Table.Cell onClick={(event) => event.stopPropagation()}>
                                                            <Switch.Root
                                                                checked={moduleRow.enabled}
                                                                disabled={permisosBloqueadosPorArea}
                                                                onCheckedChange={({ checked }) =>
                                                                    setModuleEnabled(modulo, checked)
                                                                }
                                                            >
                                                                <Switch.HiddenInput />
                                                                <Switch.Control>
                                                                    <Switch.Thumb />
                                                                </Switch.Control>
                                                            </Switch.Root>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <Text fontSize="xs" color="app.textSubtle">
                                                                {moduleRow.enabled ? "Modulo habilitado" : "Modulo deshabilitado"}
                                                            </Text>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                    {isExpanded &&
                                                        defs.map((tab) => {
                                                            const tabRow = moduleRow.tabs[tab.tabId];
                                                            return (
                                                                <Table.Row key={`${modulo}-${tab.tabId}`} bg="app.surface">
                                                                    <Table.Cell pl={14}>
                                                                        <Box>
                                                                            <Text fontSize="sm">{tab.label}</Text>
                                                                            <Text fontSize="xs" color="app.textSubtle">
                                                                                {tab.tabId}
                                                                            </Text>
                                                                        </Box>
                                                                    </Table.Cell>
                                                                    <Table.Cell>
                                                                        <Switch.Root
                                                                            checked={tabRow.enabled}
                                                                            disabled={!moduleRow.enabled || permisosBloqueadosPorArea}
                                                                            onCheckedChange={({ checked }) =>
                                                                                setTabEnabled(
                                                                                    modulo,
                                                                                    tab.tabId,
                                                                                    checked
                                                                                )
                                                                            }
                                                                        >
                                                                            <Switch.HiddenInput />
                                                                            <Switch.Control>
                                                                                <Switch.Thumb />
                                                                            </Switch.Control>
                                                                        </Switch.Root>
                                                                    </Table.Cell>
                                                                    <Table.Cell>
                                                                        <NativeSelect.Root
                                                                            size="sm"
                                                                            disabled={!moduleRow.enabled || !tabRow.enabled || permisosBloqueadosPorArea}
                                                                        >
                                                                            <NativeSelect.Field
                                                                                value={tabRow.nivel}
                                                                                onChange={(event) =>
                                                                                    setTabNivel(
                                                                                        modulo,
                                                                                        tab.tabId,
                                                                                        Number(event.target.value)
                                                                                    )
                                                                                }>
                                                                                {Array.from({ length: tab.maxNivel }, (_, index) => index + 1).map(
                                                                                    (nivel) => (
                                                                                        <option key={nivel} value={nivel}>
                                                                                            Nivel {nivel}
                                                                                        </option>
                                                                                    )
                                                                                )}
                                                                            </NativeSelect.Field>
                                                                            <NativeSelect.Indicator />
                                                                        </NativeSelect.Root>
                                                                    </Table.Cell>
                                                                </Table.Row>
                                                            );
                                                        })}
                                                </Fragment>
                                            );
                                        })}
                                    </Table.Body>
                                </Table.Root>
                            </Box>
                        )}
                    </Box>
                </GridItem>

                <GridItem>
                    <Box borderWidth="1px" borderRadius="lg" bg="app.surface" h="100%">
                        <Box px={4} py={3} borderBottomWidth="1px" bg="app.surfaceSubtle">
                            <Text fontWeight="semibold">Resumen final</Text>
                            <Text fontSize="sm" color="app.textMuted">
                                Vista previa solo lectura de los permisos que se guardaran.
                            </Text>
                        </Box>

                        <Box p={4}>
                            {payload.accesos.length === 0 ? (
                                <Text color="app.textSubtle">Este usuario no quedara con permisos activos.</Text>
                            ) : (
                                <VStack align="stretch" gap={4}>
                                    {payload.accesos.map((acceso) => (
                                        <Box key={acceso.modulo} borderWidth="1px" borderRadius="md" p={3}>
                                            <HStack justify="space-between" mb={2}>
                                                <Text fontWeight="semibold">{moduleLabel(acceso.modulo)}</Text>
                                                <Badge colorPalette="blue">{acceso.tabs.length} tabs</Badge>
                                            </HStack>
                                            <VStack align="stretch" gap={2}>
                                                {acceso.tabs.map((tab) => (
                                                    <Flex
                                                        key={`${acceso.modulo}-${tab.tabId}`}
                                                        justify="space-between"
                                                        align="center"
                                                        p={2}
                                                        bg="app.surfaceSubtle"
                                                        borderRadius="md"
                                                    >
                                                        <Box>
                                                            <Text fontSize="sm">{tabLabel(acceso.modulo, tab.tabId)}</Text>
                                                            <Text fontSize="xs" color="app.textSubtle">
                                                                {tab.tabId}
                                                            </Text>
                                                        </Box>
                                                        <Badge colorPalette="green">Nivel {tab.nivel}</Badge>
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

            <Dialog.Root
                open={discardDialog.open}
                initialFocusEl={() => cancelRef.current}
                role="alertdialog"
                closeOnInteractOutside={false}
                onOpenChange={(event) => {
                    if (!event.open) {
                        discardDialog.onClose();
                    }
                }}
            >
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>Descartar cambios</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                Hay cambios sin guardar. Si sales ahora, se perderan.
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button ref={cancelRef} onClick={discardDialog.onClose}>
                                    Seguir editando
                                </Button>
                                <Button
                                    colorPalette="red"
                                    ml={3}
                                    onClick={() => {
                                        discardDialog.onClose();
                                        onBack();
                                    }}
                                >
                                    Descartar y salir
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </Box>
    );
}
