import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Container,
    FormControl,
    FormErrorMessage,
    HStack,
    Icon,
    Input,
    Spinner,
    Switch,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useColorModeValue,
    useToast,
} from "@chakra-ui/react";
import { FaCircleExclamation } from "react-icons/fa6";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import MyHeader from "../../components/MyHeader";
import { useAuth } from "../../context/AuthContext";
import { MasterDirective, useMasterDirectives } from "../../context/MasterDirectivesContext";
import {
    AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_MAX,
    AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_MIN,
    AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_MAX,
    AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_MIN,
    MASTER_DIRECTIVE_KEYS,
} from "../../context/masterDirectiveConstants";

interface SuperMasterConfig {
    id: number;
    habilitarEliminacionForzada: boolean;
    habilitarCargaMasiva: boolean;
    habilitarAjustesInventario: boolean;
}

interface DTOAllMasterDirectives {
    masterDirectives: MasterDirective[];
}

type SuperMasterConfigKey = keyof Pick<
    SuperMasterConfig,
    "habilitarEliminacionForzada" | "habilitarCargaMasiva" | "habilitarAjustesInventario"
>;

const ROWS: { key: SuperMasterConfigKey; label: string; resumen: string }[] = [
    { key: "habilitarEliminacionForzada", label: "Habilitar Eliminacion Forzada", resumen: "Permite acceder a Eliminaciones Forzadas en Operaciones Criticas en BD" },
    { key: "habilitarCargaMasiva", label: "Habilitar Carga Masiva", resumen: "Permite acceder a Carga Masiva en Operaciones Criticas en BD" },
    { key: "habilitarAjustesInventario", label: "Habilitar Ajustes Inventario", resumen: "Permite acceder a Ajustes de Inventario en Transacciones de Almacen" },
];

const AREA_OPERATIVA_NOISE_DIRECTIVE_NAMES = new Set<string>([
    MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_ENABLED,
    MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_INTERVAL_MINUTES,
    MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_SAMPLE_SECONDS,
]);

function isIntegerInRange(value: string, min: number, max: number) {
    if (!/^\d+$/.test(value.trim())) return false;
    const parsed = Number(value.trim());
    return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

function getNumericDirectiveBounds(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_DIAS_BLOQUEO_EDICION) {
        return { min: 0, max: 7, error: "Debe ser un entero entre 0 y 7" };
    }

    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_INTERVAL_MINUTES) {
        return {
            min: AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_MIN,
            max: AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_MAX,
            error: `Debe ser un entero entre ${AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_MIN} y ${AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_MAX}`,
        };
    }

    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_SAMPLE_SECONDS) {
        return {
            min: AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_MIN,
            max: AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_MAX,
            error: `Debe ser un entero entre ${AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_MIN} y ${AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_MAX}`,
        };
    }

    return { min: 1, max: undefined, error: "Debe ser un entero mayor o igual a 1" };
}

function isAreaOperativaNoiseDirective(directive: MasterDirective) {
    return AREA_OPERATIVA_NOISE_DIRECTIVE_NAMES.has(directive.nombre);
}

function findDirectiveByName(directives: MasterDirective[], name: string) {
    return directives.find(directive => directive.nombre === name);
}

function isPresentDirective(directive: MasterDirective | undefined): directive is MasterDirective {
    return Boolean(directive);
}

function getAreaOperativaNoiseDirectiveLabel(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_ENABLED) {
        return "Habilitar medicion de ruido";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_INTERVAL_MINUTES) {
        return "Intervalo de muestreo";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_SAMPLE_SECONDS) {
        return "Tamano de muestra";
    }
    return directive.nombre;
}

function getAreaOperativaNoiseDirectiveUnit(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_INTERVAL_MINUTES) {
        return "min";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_SAMPLE_SECONDS) {
        return "s";
    }
    return null;
}

function isBooleanEnabled(value: string) {
    return value.trim().toLowerCase() === "true";
}

function normalizeDirectiveDraftValue(directive: MasterDirective, value: string) {
    if (directive.tipoDato === "BOOLEANO") {
        return String(isBooleanEnabled(value));
    }

    return value.trim();
}

export default function MasterDirectivesPage() {
    const [config, setConfig] = useState<SuperMasterConfig | null>(null);
    const [draft, setDraft] = useState<SuperMasterConfig | null>(null);
    const [masterDirectives, setMasterDirectives] = useState<MasterDirective[]>([]);
    const [directiveDrafts, setDirectiveDrafts] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [updating, setUpdating] = useState<boolean>(false);
    const endPoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();
    const { refreshDirectives } = useMasterDirectives();
    const { user } = useAuth();
    const canManageSuperMasterConfig = user === "super_master";
    const explanatoryWarningColor = useColorModeValue("orange.600", "orange.300");

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        try {
            const superRes = await axios.get<SuperMasterConfig>(endPoints.get_super_master_directives_config);
            const superData = superRes.data;
            setConfig(superData);
            setDraft({ ...superData });

            try {
                const directivesRes = await axios.get<DTOAllMasterDirectives>(endPoints.get_super_master_directives);
                const directives = directivesRes.data.masterDirectives ?? [];
                setMasterDirectives(directives);
                setDirectiveDrafts(Object.fromEntries(directives.map(directive => [directive.id, directive.valor])));
            } catch (err) {
                console.error("Error fetching Master Directives", err);
                setMasterDirectives([]);
                setDirectiveDrafts({});
                toast({
                    title: "Error al cargar directivas maestras",
                    status: "warning",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (err) {
            console.error("Error fetching Super Master config", err);
            toast({
                title: "Error al cargar Directivas Super Master",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [endPoints, toast]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const genericMasterDirectives = useMemo(
        () => masterDirectives.filter(directive => !isAreaOperativaNoiseDirective(directive)),
        [masterDirectives]
    );

    const numericDirectives = useMemo(
        () => genericMasterDirectives.filter(directive => directive.tipoDato === "NUMERO"),
        [genericMasterDirectives]
    );

    const booleanDirectives = useMemo(
        () => genericMasterDirectives.filter(directive => directive.tipoDato === "BOOLEANO"),
        [genericMasterDirectives]
    );

    const numericEditableDirectives = useMemo(
        () => masterDirectives.filter(directive => directive.tipoDato === "NUMERO"),
        [masterDirectives]
    );

    const editableMasterDirectives = useMemo(
        () => masterDirectives.filter(directive => directive.tipoDato === "NUMERO" || directive.tipoDato === "BOOLEANO"),
        [masterDirectives]
    );

    const noiseEnabledDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_ENABLED),
        [masterDirectives]
    );

    const noiseIntervalDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_INTERVAL_MINUTES),
        [masterDirectives]
    );

    const noiseSampleDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_SAMPLE_SECONDS),
        [masterDirectives]
    );

    const noiseNumericDirectives = useMemo(
        () => [noiseIntervalDirective, noiseSampleDirective].filter(isPresentDirective),
        [noiseIntervalDirective, noiseSampleDirective]
    );

    const hasAllNoiseDirectives = Boolean(noiseEnabledDirective && noiseIntervalDirective && noiseSampleDirective);

    const superMasterHasChanges =
        canManageSuperMasterConfig &&
        draft != null &&
        config != null &&
        (draft.habilitarEliminacionForzada !== config.habilitarEliminacionForzada ||
            draft.habilitarCargaMasiva !== config.habilitarCargaMasiva ||
            draft.habilitarAjustesInventario !== config.habilitarAjustesInventario);

    const directiveErrors = useMemo(() => {
        const errors: Record<number, string> = {};
        numericEditableDirectives.forEach(directive => {
            const value = directiveDrafts[directive.id] ?? directive.valor;
            const bounds = getNumericDirectiveBounds(directive);
            if (!isIntegerInRange(value, bounds.min, bounds.max ?? Number.POSITIVE_INFINITY)) {
                errors[directive.id] = bounds.error;
            }
        });
        return errors;
    }, [numericEditableDirectives, directiveDrafts]);

    const masterDirectivesHaveChanges = editableMasterDirectives.some(directive => {
        const value = directiveDrafts[directive.id] ?? directive.valor;
        return normalizeDirectiveDraftValue(directive, value) !== normalizeDirectiveDraftValue(directive, directive.valor);
    });

    const hasDirectiveErrors = Object.keys(directiveErrors).length > 0;
    const hasChanges = superMasterHasChanges || masterDirectivesHaveChanges;

    const updateDraft = (key: SuperMasterConfigKey, value: boolean) => {
        if (!canManageSuperMasterConfig) return;
        if (draft) setDraft({ ...draft, [key]: value });
    };

    const updateDirectiveDraft = (directiveId: number, value: string) => {
        setDirectiveDrafts(prev => ({
            ...prev,
            [directiveId]: value,
        }));
    };

    const handleCancel = () => {
        if (config) setDraft({ ...config });
        setDirectiveDrafts(Object.fromEntries(masterDirectives.map(directive => [directive.id, directive.valor])));
    };

    const handleSave = async () => {
        if (!draft || !hasChanges || hasDirectiveErrors || updating) return;
        setUpdating(true);
        try {
            if (superMasterHasChanges) {
                await axios.put(endPoints.update_super_master_directives_config, draft);
                setConfig({ ...draft });
            }

            const changedDirectives = editableMasterDirectives.filter(directive => {
                const value = directiveDrafts[directive.id] ?? directive.valor;
                return normalizeDirectiveDraftValue(directive, value) !== normalizeDirectiveDraftValue(directive, directive.valor);
            });

            await Promise.all(changedDirectives.map(directive => {
                const newDirective = {
                    ...directive,
                    valor: normalizeDirectiveDraftValue(directive, directiveDrafts[directive.id] ?? directive.valor),
                };
                return axios.put(endPoints.update_super_master_directive, {
                    oldMasterDirective: directive,
                    newMasterDirective: newDirective,
                });
            }));

            if (changedDirectives.length > 0) {
                await refreshDirectives();
            }
            await fetchConfig();

            toast({
                title: "Directivas actualizadas",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (err) {
            console.error("Error updating directives", err);
            toast({
                title: "Error al actualizar directivas",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setUpdating(false);
        }
    };

    if (loading || !draft || !config) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Directivas Maestras" />
                <Spinner />
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Directivas Maestras" />

            <Tabs variant="enclosed" colorScheme="teal">
                <TabList>
                    <Tab>General</Tab>
                    <Tab>Area Operativa</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel px={0}>
                        <Table variant="simple">
                            <Thead>
                                <Tr>
                                    <Th>Nombre</Th>
                                    <Th>Valor</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {ROWS.map(({ key, label, resumen }) => {
                                    const value = draft[key];
                                    const original = config[key];
                                    const hasRowChange = value !== original;
                                    return (
                                        <Tr key={key}>
                                            <Td>
                                                <Text fontWeight="bold">{label}</Text>
                                                <Text fontSize="sm" color="app.textSubtle">
                                                    {resumen}
                                                </Text>
                                            </Td>
                                            <Td>
                                                <HStack>
                                                    <Switch
                                                        isChecked={value}
                                                        isDisabled={!canManageSuperMasterConfig}
                                                        onChange={e => updateDraft(key, e.target.checked)}
                                                    />
                                                    {hasRowChange && (
                                                        <Icon as={FaCircleExclamation} color="orange.400" />
                                                    )}
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </Tbody>
                        </Table>

                        {numericDirectives.length > 0 && (
                            <Box mt={8}>
                                <Text mb={2} fontWeight="bold">
                                    Directivas numericas
                                </Text>
                                <Table variant="simple">
                                    <Thead>
                                        <Tr>
                                            <Th>Nombre</Th>
                                            <Th>Valor</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {numericDirectives.map(directive => {
                                            const value = directiveDrafts[directive.id] ?? directive.valor;
                                            const hasRowChange = value.trim() !== directive.valor;
                                            const error = directiveErrors[directive.id];
                                            return (
                                                <Tr key={directive.id}>
                                                    <Td>
                                                        <Text fontWeight="bold">{directive.nombre}</Text>
                                                        <Text fontSize="sm" color="app.textSubtle">
                                                            {directive.resumen}
                                                        </Text>
                                                        {directive.nombre === MASTER_DIRECTIVE_KEYS.LIMITE_RECEPCIONES_PARCIALES_OCM && (
                                                            <Text fontSize="xs" color={explanatoryWarningColor} mt={1}>
                                                                Este tope solo valida cambios futuros en proveedores. No modifica limites ya configurados ni valida ingresos OCM directamente.
                                                            </Text>
                                                        )}
                                                    </Td>
                                                    <Td>
                                                        <HStack align="flex-start">
                                                            <FormControl isInvalid={Boolean(error)} maxW="180px">
                                                                <Input
                                                                    type="number"
                                                                    min={getNumericDirectiveBounds(directive).min}
                                                                    max={getNumericDirectiveBounds(directive).max}
                                                                    step={1}
                                                                    value={value}
                                                                    onChange={e => updateDirectiveDraft(directive.id, e.target.value)}
                                                                />
                                                                {error && <FormErrorMessage>{error}</FormErrorMessage>}
                                                            </FormControl>
                                                            {hasRowChange && (
                                                                <Icon as={FaCircleExclamation} color="orange.400" mt={2} />
                                                            )}
                                                        </HStack>
                                                    </Td>
                                                </Tr>
                                            );
                                        })}
                                    </Tbody>
                                </Table>
                            </Box>
                        )}

                        {booleanDirectives.length > 0 && (
                            <Box mt={8}>
                                <Text mb={2} fontWeight="bold">
                                    Directivas booleanas
                                </Text>
                                <Table variant="simple">
                                    <Thead>
                                        <Tr>
                                            <Th>Nombre</Th>
                                            <Th>Valor</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {booleanDirectives.map(directive => {
                                            const value = directiveDrafts[directive.id] ?? directive.valor;
                                            const hasRowChange = normalizeDirectiveDraftValue(directive, value) !== normalizeDirectiveDraftValue(directive, directive.valor);
                                            return (
                                                <Tr key={directive.id}>
                                                    <Td>
                                                        <Text fontWeight="bold">{directive.nombre}</Text>
                                                        <Text fontSize="sm" color="app.textSubtle">
                                                            {directive.resumen}
                                                        </Text>
                                                    </Td>
                                                    <Td>
                                                        <HStack>
                                                            <Switch
                                                                isChecked={isBooleanEnabled(value)}
                                                                onChange={e => updateDirectiveDraft(directive.id, String(e.target.checked))}
                                                            />
                                                            {hasRowChange && (
                                                                <Icon as={FaCircleExclamation} color="orange.400" />
                                                            )}
                                                        </HStack>
                                                    </Td>
                                                </Tr>
                                            );
                                        })}
                                    </Tbody>
                                </Table>
                            </Box>
                        )}
                    </TabPanel>

                    <TabPanel px={0}>
                        <Box>
                            <Text mb={2} fontWeight="bold">
                                Analitica / Ruido
                            </Text>
                            {!hasAllNoiseDirectives && (
                                <Text color="app.textSubtle" fontSize="sm" mb={4}>
                                    Las directivas de ruido aun no estan disponibles. Verifica que el backend haya inicializado las directivas maestras.
                                </Text>
                            )}
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Configuracion</Th>
                                        <Th>Valor</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {noiseEnabledDirective && (() => {
                                        const value = directiveDrafts[noiseEnabledDirective.id] ?? noiseEnabledDirective.valor;
                                        const hasRowChange = normalizeDirectiveDraftValue(noiseEnabledDirective, value) !== normalizeDirectiveDraftValue(noiseEnabledDirective, noiseEnabledDirective.valor);
                                        return (
                                            <Tr key={noiseEnabledDirective.id}>
                                                <Td>
                                                    <Text fontWeight="bold">{getAreaOperativaNoiseDirectiveLabel(noiseEnabledDirective)}</Text>
                                                    <Text fontSize="sm" color="app.textSubtle">
                                                        {noiseEnabledDirective.resumen}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <HStack>
                                                        <Switch
                                                            isChecked={isBooleanEnabled(value)}
                                                            onChange={e => updateDirectiveDraft(noiseEnabledDirective.id, String(e.target.checked))}
                                                        />
                                                        {hasRowChange && (
                                                            <Icon as={FaCircleExclamation} color="orange.400" />
                                                        )}
                                                    </HStack>
                                                </Td>
                                            </Tr>
                                        );
                                    })()}

                                    {noiseNumericDirectives.map(directive => {
                                        const value = directiveDrafts[directive.id] ?? directive.valor;
                                        const hasRowChange = value.trim() !== directive.valor;
                                        const error = directiveErrors[directive.id];
                                        const bounds = getNumericDirectiveBounds(directive);
                                        const unit = getAreaOperativaNoiseDirectiveUnit(directive);
                                        return (
                                            <Tr key={directive.id}>
                                                <Td>
                                                    <Text fontWeight="bold">{getAreaOperativaNoiseDirectiveLabel(directive)}</Text>
                                                    <Text fontSize="sm" color="app.textSubtle">
                                                        {directive.resumen}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <HStack align="flex-start">
                                                        <FormControl isInvalid={Boolean(error)} maxW="180px">
                                                            <Input
                                                                type="number"
                                                                min={bounds.min}
                                                                max={bounds.max}
                                                                step={1}
                                                                value={value}
                                                                onChange={e => updateDirectiveDraft(directive.id, e.target.value)}
                                                            />
                                                            {error && <FormErrorMessage>{error}</FormErrorMessage>}
                                                        </FormControl>
                                                        {unit && (
                                                            <Text color="app.textMuted" mt={2}>
                                                                {unit}
                                                            </Text>
                                                        )}
                                                        {hasRowChange && (
                                                            <Icon as={FaCircleExclamation} color="orange.400" mt={2} />
                                                        )}
                                                    </HStack>
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </Box>
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <HStack mt={4}>
                <Button
                    colorScheme="blue"
                    onClick={handleSave}
                    isDisabled={!hasChanges || hasDirectiveErrors || updating}
                    isLoading={updating}
                >
                    Guardar cambios
                </Button>
                <Button
                    variant="outline"
                    onClick={handleCancel}
                    isDisabled={!hasChanges || updating}
                >
                    Cancelar cambios
                </Button>
            </HStack>
        </Container>
    );
}
