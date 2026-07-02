import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Container,
    FormControl,
    FormErrorMessage,
    HStack,
    Icon,
    IconButton,
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
    Tooltip,
    Tr,
    useColorModeValue,
    useToast,
} from "@chakra-ui/react";
import { QuestionIcon } from "@chakra-ui/icons";
import { FaCircleExclamation } from "react-icons/fa6";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import MyHeader from "../../components/MyHeader";
import { useAuth } from "../../context/AuthContext";
import { MasterDirective, useMasterDirectives } from "../../context/MasterDirectivesContext";
import {
    AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES_MAX,
    AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES_MIN,
    AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES_MAX,
    AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES_MIN,
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

interface DispensacionRetroactividadDTO {
    directivaActual: boolean;
    ejecutable: boolean;
    ordenesCandidatas: number;
    ordenesAplicadas: number;
    ordenesOmitidas: number;
    ordenIdsAplicadas: number[];
    mensaje: string;
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

const AREA_OPERATIVA_INACTIVITY_DIRECTIVE_NAMES = new Set<string>([
    MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_ALERT_ENABLED,
    MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES,
    MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES,
]);

const AREA_OPERATIVA_PANEL_DIRECTIVE_NAMES = new Set<string>([
    MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_PANEL_HISTORICO_TOGGLE_ENABLED,
]);

const AREA_OPERATIVA_DIRECTIVE_NAMES = new Set<string>([
    ...AREA_OPERATIVA_NOISE_DIRECTIVE_NAMES,
    ...AREA_OPERATIVA_INACTIVITY_DIRECTIVE_NAMES,
    ...AREA_OPERATIVA_PANEL_DIRECTIVE_NAMES,
]);

const PRODUCTION_DIRECTIVE_NAMES = new Set<string>([
    MASTER_DIRECTIVE_KEYS.DISPENSACION_NO_BLOQUEA_INICIO_PRODUCCION,
    MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_DIAS_BLOQUEO_EDICION,
    MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_PERMITIR_AGREGAR_TERMINADOS_APROBADO,
]);

const PRODUCTION_DIRECTIVE_EXTENDED_HELP: Record<string, string> = {
    [MASTER_DIRECTIVE_KEYS.DISPENSACION_NO_BLOQUEA_INICIO_PRODUCCION]:
        "Esta directiva se copia a cada ODP al momento de crearla. Cambiar el switch no modifica ODPs ya existentes; para esas ODPs use la accion retroactiva controlada de esta pantalla.",
    [MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_PERMITIR_AGREGAR_TERMINADOS_APROBADO]:
        "Cuando esta apagada, una MPS aprobada conserva el flujo actual: solo permite mover, aumentar, reducir o cancelar tarjetas existentes. Cuando esta activa, se pueden agregar nuevos terminados a una MPS APROBADA o CERRADA. Si la MPS ya esta cerrada o ya tiene ODPs generadas, el backend genera inmediatamente las ODPs de los nuevos lotes.",
};

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

    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES) {
        return {
            min: AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES_MIN,
            max: AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES_MAX,
            error: `Debe ser un entero entre ${AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES_MIN} y ${AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES_MAX}`,
        };
    }

    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES) {
        return {
            min: AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES_MIN,
            max: AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES_MAX,
            error: `Debe ser un entero entre ${AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES_MIN} y ${AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES_MAX}`,
        };
    }

    return { min: 1, max: undefined, error: "Debe ser un entero mayor o igual a 1" };
}

function isAreaOperativaDirective(directive: MasterDirective) {
    return AREA_OPERATIVA_DIRECTIVE_NAMES.has(directive.nombre);
}

function isProductionDirective(directive: MasterDirective) {
    return PRODUCTION_DIRECTIVE_NAMES.has(directive.nombre);
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

function getAreaOperativaInactivityDirectiveLabel(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_ALERT_ENABLED) {
        return "Habilitar alertas de inactividad";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES) {
        return "Umbral sin terminaciones";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES) {
        return "Intervalo de chequeo";
    }
    return directive.nombre;
}

function getAreaOperativaInactivityDirectiveUnit(directive: MasterDirective) {
    if (
        directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES ||
        directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES
    ) {
        return "min";
    }
    return null;
}

function getAreaOperativaPanelDirectiveLabel(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_PANEL_HISTORICO_TOGGLE_ENABLED) {
        return "Selector semana actual / historico";
    }
    return directive.nombre;
}

function getProductionDirectiveLabel(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.DISPENSACION_NO_BLOQUEA_INICIO_PRODUCCION) {
        return "Dispensacion no bloquea inicio";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_DIAS_BLOQUEO_EDICION) {
        return "Dias bloqueados para edicion MPS";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_PERMITIR_AGREGAR_TERMINADOS_APROBADO) {
        return "Agregar terminados en MPS aprobada";
    }
    return directive.nombre;
}

function getProductionDirectiveUnit(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_DIAS_BLOQUEO_EDICION) {
        return "dias";
    }
    return null;
}

function getProductionDirectiveExtendedHelp(directive: MasterDirective) {
    return PRODUCTION_DIRECTIVE_EXTENDED_HELP[directive.nombre];
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
    const normalizedUser = user?.trim().toLowerCase();
    const canManageSuperMasterConfig = normalizedUser === "super_master";
    const canApplyDispensacionRetroactivity = normalizedUser === "master" || normalizedUser === "super_master";
    const [retroactivityPreview, setRetroactivityPreview] = useState<DispensacionRetroactividadDTO | null>(null);
    const [retroactivityLoading, setRetroactivityLoading] = useState<boolean>(false);
    const [retroactivityApplying, setRetroactivityApplying] = useState<boolean>(false);
    const explanatoryWarningColor = useColorModeValue("orange.600", "orange.300");

    const fetchDispensacionRetroactivityPreview = useCallback(async () => {
        if (!canApplyDispensacionRetroactivity) {
            setRetroactivityPreview(null);
            return;
        }

        setRetroactivityLoading(true);
        try {
            const response = await axios.get<DispensacionRetroactividadDTO>(
                endPoints.super_master_dispensacion_retroactividad_preview
            );
            setRetroactivityPreview(response.data);
        } catch (err) {
            console.error("Error fetching dispensacion retroactivity preview", err);
            setRetroactivityPreview(null);
            toast({
                title: "No se pudo consultar retroactividad de dispensacion",
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setRetroactivityLoading(false);
        }
    }, [canApplyDispensacionRetroactivity, endPoints, toast]);

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

    useEffect(() => {
        fetchDispensacionRetroactivityPreview();
    }, [fetchDispensacionRetroactivityPreview]);

    const genericMasterDirectives = useMemo(
        () => masterDirectives.filter(directive => !isAreaOperativaDirective(directive) && !isProductionDirective(directive)),
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

    const inactivityEnabledDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_ALERT_ENABLED),
        [masterDirectives]
    );

    const inactivityThresholdDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_THRESHOLD_MINUTES),
        [masterDirectives]
    );

    const inactivityCheckIntervalDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_INACTIVITY_CHECK_INTERVAL_MINUTES),
        [masterDirectives]
    );

    const panelHistoricoToggleDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_PANEL_HISTORICO_TOGGLE_ENABLED),
        [masterDirectives]
    );

    const mpsDiasBloqueoDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_DIAS_BLOQUEO_EDICION),
        [masterDirectives]
    );

    const dispensacionNoBloqueaDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.DISPENSACION_NO_BLOQUEA_INICIO_PRODUCCION),
        [masterDirectives]
    );

    const mpsAgregarTerminadosAprobadoDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_PERMITIR_AGREGAR_TERMINADOS_APROBADO),
        [masterDirectives]
    );

    const noiseNumericDirectives = useMemo(
        () => [noiseIntervalDirective, noiseSampleDirective].filter(isPresentDirective),
        [noiseIntervalDirective, noiseSampleDirective]
    );

    const inactivityNumericDirectives = useMemo(
        () => [inactivityThresholdDirective, inactivityCheckIntervalDirective].filter(isPresentDirective),
        [inactivityThresholdDirective, inactivityCheckIntervalDirective]
    );

    const productionDirectives = useMemo(
        () => [dispensacionNoBloqueaDirective, mpsDiasBloqueoDirective, mpsAgregarTerminadosAprobadoDirective].filter(isPresentDirective),
        [dispensacionNoBloqueaDirective, mpsDiasBloqueoDirective, mpsAgregarTerminadosAprobadoDirective]
    );

    const hasAllNoiseDirectives = Boolean(noiseEnabledDirective && noiseIntervalDirective && noiseSampleDirective);
    const hasAllInactivityDirectives = Boolean(inactivityEnabledDirective && inactivityThresholdDirective && inactivityCheckIntervalDirective);
    const hasAllPanelDirectives = Boolean(panelHistoricoToggleDirective);
    const hasAllProductionDirectives = Boolean(dispensacionNoBloqueaDirective && mpsDiasBloqueoDirective && mpsAgregarTerminadosAprobadoDirective);

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
            await fetchDispensacionRetroactivityPreview();

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

    const handleApplyDispensacionRetroactivity = async () => {
        if (!canApplyDispensacionRetroactivity || retroactivityApplying || !retroactivityPreview?.ejecutable) {
            return;
        }

        const confirmed = window.confirm(
            `Se aplicara la politica no bloqueante a ${retroactivityPreview.ordenesCandidatas} ODP(s) activas candidatas. Esta accion libera el seguimiento de Almacen General, pero no crea transacciones de almacen ni descuenta inventario. Desea continuar?`
        );
        if (!confirmed) {
            return;
        }

        setRetroactivityApplying(true);
        try {
            const response = await axios.post<DispensacionRetroactividadDTO>(
                endPoints.super_master_dispensacion_retroactividad_apply
            );
            setRetroactivityPreview(response.data);
            toast({
                title: "Retroactividad aplicada",
                description: response.data.mensaje,
                status: "success",
                duration: 6000,
                isClosable: true,
            });
        } catch (err) {
            console.error("Error applying dispensacion retroactivity", err);
            toast({
                title: "Error al aplicar retroactividad",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setRetroactivityApplying(false);
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
                    <Tab>Produccion</Tab>
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
                                Inicio de produccion y MPS semanal
                            </Text>
                            {!hasAllProductionDirectives && (
                                <Text color="app.textSubtle" fontSize="sm" mb={4}>
                                    Las directivas de produccion aun no estan disponibles. Verifica que el backend haya inicializado las directivas maestras.
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
                                    {productionDirectives.map(directive => {
                                        const value = directiveDrafts[directive.id] ?? directive.valor;
                                        const hasRowChange = normalizeDirectiveDraftValue(directive, value) !== normalizeDirectiveDraftValue(directive, directive.valor);
                                        const error = directiveErrors[directive.id];
                                        const bounds = getNumericDirectiveBounds(directive);
                                        const unit = getProductionDirectiveUnit(directive);
                                        const label = getProductionDirectiveLabel(directive);
                                        const extendedHelp = getProductionDirectiveExtendedHelp(directive);
                                        return (
                                            <Tr key={directive.id}>
                                                <Td>
                                                    <HStack spacing={2} align="center">
                                                        <Text fontWeight="bold">{label}</Text>
                                                        {extendedHelp && (
                                                            <Tooltip label={extendedHelp} hasArrow placement="top" maxW="360px" whiteSpace="normal">
                                                                <IconButton
                                                                    aria-label={`Ayuda detallada ${label}`}
                                                                    icon={<QuestionIcon />}
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    colorScheme="teal"
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </HStack>
                                                    <Text fontSize="sm" color="app.textSubtle">
                                                        {directive.resumen}
                                                    </Text>
                                                    {directive.ayuda && (
                                                        <Text fontSize="xs" color="app.textSubtle" mt={1}>
                                                            {directive.ayuda}
                                                        </Text>
                                                    )}
                                                </Td>
                                                <Td>
                                                    {directive.tipoDato === "BOOLEANO" ? (
                                                        <HStack>
                                                            <Switch
                                                                isChecked={isBooleanEnabled(value)}
                                                                onChange={e => updateDirectiveDraft(directive.id, String(e.target.checked))}
                                                            />
                                                            {hasRowChange && (
                                                                <Icon as={FaCircleExclamation} color="orange.400" />
                                                            )}
                                                        </HStack>
                                                    ) : (
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
                                                    )}
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>

                            {dispensacionNoBloqueaDirective && canApplyDispensacionRetroactivity ? (
                                <Box mt={6} borderWidth="1px" borderRadius="md" p={4} bg="app.surfaceSubtle">
                                    <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
                                        <Box flex="1" minW={{ base: "100%", md: "420px" }}>
                                            <Text fontWeight="bold">
                                                Aplicar politica no bloqueante a ODPs existentes
                                            </Text>
                                            <Text fontSize="sm" color="app.textSubtle" mt={1}>
                                                Solo afecta ODPs activas con Almacen General en espera y sin avances en otras areas. No crea transacciones de almacen, no descuenta inventario y no acredita la dispensacion real.
                                            </Text>
                                            {retroactivityLoading ? (
                                                <HStack mt={3}>
                                                    <Spinner size="sm" />
                                                    <Text fontSize="sm" color="app.textMuted">Consultando ODPs candidatas...</Text>
                                                </HStack>
                                            ) : (
                                                <Box mt={3}>
                                                    <Text fontSize="sm">
                                                        Directiva persistida: {retroactivityPreview ? (retroactivityPreview.directivaActual ? "activa" : "apagada") : "sin consultar"}
                                                    </Text>
                                                    <Text fontSize="sm">
                                                        ODPs candidatas: {retroactivityPreview?.ordenesCandidatas ?? 0}
                                                    </Text>
                                                    {retroactivityPreview?.ordenesAplicadas ? (
                                                        <Text fontSize="sm">
                                                            Ultima aplicacion: {retroactivityPreview.ordenesAplicadas} ODP(s)
                                                            {retroactivityPreview.ordenIdsAplicadas.length > 0
                                                                ? ` (${retroactivityPreview.ordenIdsAplicadas.slice(0, 8).join(", ")}${retroactivityPreview.ordenIdsAplicadas.length > 8 ? ", ..." : ""})`
                                                                : ""}
                                                        </Text>
                                                    ) : null}
                                                    {retroactivityPreview?.mensaje ? (
                                                        <Text fontSize="sm" color="app.textMuted" mt={1}>
                                                            {retroactivityPreview.mensaje}
                                                        </Text>
                                                    ) : null}
                                                </Box>
                                            )}
                                        </Box>
                                        <Button
                                            colorScheme="purple"
                                            onClick={handleApplyDispensacionRetroactivity}
                                            isDisabled={!retroactivityPreview?.ejecutable || retroactivityLoading || retroactivityApplying}
                                            isLoading={retroactivityApplying}
                                        >
                                            Aplicar retroactividad
                                        </Button>
                                    </HStack>
                                </Box>
                            ) : null}
                        </Box>
                    </TabPanel>

                    <TabPanel px={0}>
                        <Box>
                            <Text mb={2} fontWeight="bold">
                                Tablero operativo
                            </Text>
                            {!hasAllPanelDirectives && (
                                <Text color="app.textSubtle" fontSize="sm" mb={4}>
                                    Las directivas del tablero operativo aun no estan disponibles. Verifica que el backend haya inicializado las directivas maestras.
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
                                    {panelHistoricoToggleDirective && (() => {
                                        const value = directiveDrafts[panelHistoricoToggleDirective.id] ?? panelHistoricoToggleDirective.valor;
                                        const hasRowChange = normalizeDirectiveDraftValue(panelHistoricoToggleDirective, value) !== normalizeDirectiveDraftValue(panelHistoricoToggleDirective, panelHistoricoToggleDirective.valor);
                                        return (
                                            <Tr key={panelHistoricoToggleDirective.id}>
                                                <Td>
                                                    <Text fontWeight="bold">{getAreaOperativaPanelDirectiveLabel(panelHistoricoToggleDirective)}</Text>
                                                    <Text fontSize="sm" color="app.textSubtle">
                                                        {panelHistoricoToggleDirective.resumen}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <HStack>
                                                        <Switch
                                                            isChecked={isBooleanEnabled(value)}
                                                            onChange={e => updateDirectiveDraft(panelHistoricoToggleDirective.id, String(e.target.checked))}
                                                        />
                                                        {hasRowChange && (
                                                            <Icon as={FaCircleExclamation} color="orange.400" />
                                                        )}
                                                    </HStack>
                                                </Td>
                                            </Tr>
                                        );
                                    })()}
                                </Tbody>
                            </Table>

                            <Box mt={8}>
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

                            <Box mt={8}>
                                <Text mb={2} fontWeight="bold">
                                    Alertas de inactividad
                                </Text>
                                {!hasAllInactivityDirectives && (
                                    <Text color="app.textSubtle" fontSize="sm" mb={4}>
                                        Las directivas de inactividad aun no estan disponibles. Verifica que el backend haya inicializado las directivas maestras.
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
                                        {inactivityEnabledDirective && (() => {
                                            const value = directiveDrafts[inactivityEnabledDirective.id] ?? inactivityEnabledDirective.valor;
                                            const hasRowChange = normalizeDirectiveDraftValue(inactivityEnabledDirective, value) !== normalizeDirectiveDraftValue(inactivityEnabledDirective, inactivityEnabledDirective.valor);
                                            return (
                                                <Tr key={inactivityEnabledDirective.id}>
                                                    <Td>
                                                        <Text fontWeight="bold">{getAreaOperativaInactivityDirectiveLabel(inactivityEnabledDirective)}</Text>
                                                        <Text fontSize="sm" color="app.textSubtle">
                                                            {inactivityEnabledDirective.resumen}
                                                        </Text>
                                                    </Td>
                                                    <Td>
                                                        <HStack>
                                                            <Switch
                                                                isChecked={isBooleanEnabled(value)}
                                                                onChange={e => updateDirectiveDraft(inactivityEnabledDirective.id, String(e.target.checked))}
                                                            />
                                                            {hasRowChange && (
                                                                <Icon as={FaCircleExclamation} color="orange.400" />
                                                            )}
                                                        </HStack>
                                                    </Td>
                                                </Tr>
                                            );
                                        })()}

                                        {inactivityNumericDirectives.map(directive => {
                                            const value = directiveDrafts[directive.id] ?? directive.valor;
                                            const hasRowChange = value.trim() !== directive.valor;
                                            const error = directiveErrors[directive.id];
                                            const bounds = getNumericDirectiveBounds(directive);
                                            const unit = getAreaOperativaInactivityDirectiveUnit(directive);
                                            return (
                                                <Tr key={directive.id}>
                                                    <Td>
                                                        <Text fontWeight="bold">{getAreaOperativaInactivityDirectiveLabel(directive)}</Text>
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
