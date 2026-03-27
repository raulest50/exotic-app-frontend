import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Divider,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    HStack,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    Select,
    Switch,
    Text,
    useToast,
    VStack,
} from "@chakra-ui/react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { tabsForModule } from "../../../auth/moduleTabDefinitions.ts";
import { useAuth } from "../../../context/AuthContext.tsx";
import { Modulo, type User } from "./types.tsx";

type TabDraft = { enabled: boolean; nivel: number };
type ModuleDraft = Record<string, TabDraft>;

type Props = {
    user: User;
    onBack: () => void;
    onSaved?: () => void;
};

function isModulo(value: string): value is Modulo {
    return Object.values(Modulo).includes(value as Modulo);
}

function rebuildDraftsFromUser(u: User): Partial<Record<Modulo, ModuleDraft>> {
    const next: Partial<Record<Modulo, ModuleDraft>> = {};
    for (const ma of u.moduloAccesos ?? []) {
        const raw = typeof ma.modulo === "string" ? ma.modulo : String(ma.modulo);
        if (!isModulo(raw)) continue;
        const m = raw;
        const defs = tabsForModule(m);
        const row: ModuleDraft = {};
        for (const d of defs) {
            const ex = ma.tabs?.find((t) => t.tabId === d.tabId);
            row[d.tabId] = { enabled: !!ex, nivel: ex?.nivel ?? 1 };
        }
        next[m] = row;
    }
    return next;
}

export default function UserAccesosEditor({ user, onBack, onSaved }: Props) {
    const toast = useToast();
    const endPoints = new EndPointsURL();
    const { user: authUsername, refreshAccesos } = useAuth();

    const [localUser, setLocalUser] = useState<User>(user);
    const [drafts, setDrafts] = useState<Partial<Record<Modulo, ModuleDraft>>>(() => rebuildDraftsFromUser(user));
    const [loadingUser, setLoadingUser] = useState(true);
    const [savingModulo, setSavingModulo] = useState<Modulo | null>(null);

    const refreshLocalUser = useCallback(async () => {
        setLoadingUser(true);
        try {
            const { data } = await axios.get<User[]>(`${endPoints.domain}/usuarios`);
            const u = data.find((x) => x.id === user.id);
            if (u) {
                setLocalUser(u);
                setDrafts(rebuildDraftsFromUser(u));
            }
        } catch {
            toast({
                title: "Error",
                description: "No se pudo actualizar el usuario.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setLoadingUser(false);
        }
    }, [endPoints.domain, user.id, toast]);

    useEffect(() => {
        refreshLocalUser();
    }, [refreshLocalUser]);

    const modulesInDraft = useMemo(
        () => Object.keys(drafts).filter((k) => isModulo(k)) as Modulo[],
        [drafts]
    );

    const modulesToAdd = useMemo(
        () => Object.values(Modulo).filter((m) => drafts[m] == null),
        [drafts]
    );

    const updateDraft = (m: Modulo, tabId: string, patch: Partial<TabDraft>) => {
        setDrafts((prev) => {
            const mod = prev[m] ?? {};
            const cur = mod[tabId] ?? { enabled: false, nivel: 1 };
            return {
                ...prev,
                [m]: { ...mod, [tabId]: { ...cur, ...patch } },
            };
        });
    };

    const addModuleFromSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value;
        e.target.value = "";
        if (!v || !isModulo(v)) return;
        setDrafts((prev) => ({
            ...prev,
            [v]: Object.fromEntries(
                tabsForModule(v).map((t) => [t.tabId, { enabled: false, nivel: 1 }])
            ) as ModuleDraft,
        }));
    };

    const saveModule = async (m: Modulo) => {
        const d = drafts[m];
        if (!d) return;
        const tabs = tabsForModule(m)
            .filter((t) => d[t.tabId]?.enabled)
            .map((t) => ({ tabId: t.tabId, nivel: Math.max(1, Math.floor(d[t.tabId]?.nivel ?? 1)) }));

        setSavingModulo(m);
        try {
            const { data } = await axios.post<User>(
                `${endPoints.domain}/usuarios/${localUser.id}/modulo-accesos`,
                { modulo: m, tabs, replaceTabs: true }
            );
            setLocalUser(data);
            setDrafts(rebuildDraftsFromUser(data));
            toast({
                title: "Guardado",
                description: `Permisos del módulo ${m.replace(/_/g, " ")} actualizados.`,
                status: "success",
                duration: 4000,
                isClosable: true,
            });
            onSaved?.();
            if (authUsername && data.username === authUsername) {
                await refreshAccesos();
            }
        } catch {
            toast({
                title: "Error",
                description: "No se pudieron guardar los permisos.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingModulo(null);
        }
    };

    const removeModule = async (m: Modulo) => {
        setSavingModulo(m);
        try {
            const { data } = await axios.post<User>(
                `${endPoints.domain}/usuarios/${localUser.id}/modulo-accesos`,
                { modulo: m, tabs: [], replaceTabs: true }
            );
            setLocalUser(data);
            setDrafts(rebuildDraftsFromUser(data));
            toast({
                title: "Módulo quitado",
                description: `Se eliminó el acceso al módulo ${m.replace(/_/g, " ")}.`,
                status: "success",
                duration: 4000,
                isClosable: true,
            });
            onSaved?.();
            if (authUsername && data.username === authUsername) {
                await refreshAccesos();
            }
        } catch {
            toast({
                title: "Error",
                description: "No se pudo quitar el módulo.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingModulo(null);
        }
    };

    return (
        <Box p={4}>
            <Flex mb={6} align="center" gap={4} wrap="wrap">
                <Button variant="outline" onClick={onBack}>
                    Atrás
                </Button>
                <Heading size="md">Editar permisos y accesos</Heading>
                <Text color="gray.600">
                    {localUser.username}
                    {localUser.nombreCompleto ? ` — ${localUser.nombreCompleto}` : ""}
                </Text>
            </Flex>

            {loadingUser && modulesInDraft.length === 0 ? (
                <Text>Cargando permisos…</Text>
            ) : (
                <VStack align="stretch" spacing={6} maxW="720px">
                    {modulesInDraft.map((m) => {
                        const d = drafts[m];
                        if (!d) return null;
                        const defs = tabsForModule(m);
                        return (
                            <Box key={m} borderWidth="1px" borderRadius="md" p={4}>
                                <Text fontWeight="bold" mb={3}>
                                    {m.replace(/_/g, " ")}
                                </Text>
                                <VStack align="stretch" spacing={3}>
                                    {defs.map((t) => {
                                        const row = d[t.tabId] ?? { enabled: false, nivel: 1 };
                                        return (
                                            <Flex
                                                key={t.tabId}
                                                align="center"
                                                gap={4}
                                                wrap="wrap"
                                                justify="space-between"
                                            >
                                                <HStack flex="1" minW="200px">
                                                    <Switch
                                                        isChecked={row.enabled}
                                                        onChange={(e) =>
                                                            updateDraft(m, t.tabId, { enabled: e.target.checked })
                                                        }
                                                    />
                                                    <Text fontSize="sm">
                                                        {t.label}{" "}
                                                        <Text as="span" color="gray.500" fontSize="xs">
                                                            ({t.tabId})
                                                        </Text>
                                                    </Text>
                                                </HStack>
                                                <FormControl w="140px">
                                                    <FormLabel fontSize="xs" mb={1}>
                                                        Nivel
                                                    </FormLabel>
                                                    <NumberInput
                                                        min={1}
                                                        value={row.nivel}
                                                        isDisabled={!row.enabled}
                                                        onChange={(_, n) =>
                                                            updateDraft(m, t.tabId, {
                                                                nivel: Number.isFinite(n) ? n : 1,
                                                            })
                                                        }
                                                    >
                                                        <NumberInputField />
                                                        <NumberInputStepper>
                                                            <NumberIncrementStepper />
                                                            <NumberDecrementStepper />
                                                        </NumberInputStepper>
                                                    </NumberInput>
                                                </FormControl>
                                            </Flex>
                                        );
                                    })}
                                </VStack>
                                <Divider my={4} />
                                <HStack spacing={3}>
                                    <Button
                                        colorScheme="blue"
                                        size="sm"
                                        isLoading={savingModulo === m}
                                        onClick={() => saveModule(m)}
                                    >
                                        Guardar módulo
                                    </Button>
                                    <Button
                                        colorScheme="red"
                                        variant="outline"
                                        size="sm"
                                        isLoading={savingModulo === m}
                                        onClick={() => removeModule(m)}
                                    >
                                        Quitar módulo
                                    </Button>
                                </HStack>
                            </Box>
                        );
                    })}

                    <FormControl maxW="320px">
                        <FormLabel>Añadir módulo</FormLabel>
                        <Select placeholder="Elegir módulo…" onChange={addModuleFromSelect}>
                            {modulesToAdd.map((m) => (
                                <option key={m} value={m}>
                                    {m.replace(/_/g, " ")}
                                </option>
                            ))}
                        </Select>
                    </FormControl>
                </VStack>
            )}
        </Box>
    );
}
