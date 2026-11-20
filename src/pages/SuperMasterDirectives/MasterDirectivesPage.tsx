import { useCallback, useEffect, useMemo, useState } from "react";
import { useColorModeValue } from "../../components/ui/color-mode";
import {
    Box,
    Button,
    Container,
    HStack,
    Icon,
    IconButton,
    Input,
    NativeSelect,
    SimpleGrid,
    Spinner,
    Switch,
    Tabs,
    Table,
    Text,
    Field,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { Tooltip } from '@/components/ui/tooltip';
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
    NEW_FEATURES_NOTIFICATION_DAYS_MIN,
    NEW_FEATURES_NOTIFICATION_DAYS_MAX,
    REORDEN_SEGUIMIENTO_PORCENTAJE_MIN,
    REORDEN_SEGUIMIENTO_PORCENTAJE_MAX,
    REORDEN_SEGUIMIENTO_MINIMO_LEAD_TIME_DIAS_MIN,
    REORDEN_SEGUIMIENTO_MINIMO_LEAD_TIME_DIAS_MAX,
} from "../../context/masterDirectiveConstants";
import OcmCierreDirectivePanel from "./OcmCierreDirectivePanel";
import { LuCircleHelp } from 'react-icons/lu';

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
    ordenesFabricacionCandidatas?: number;
    ordenesFabricacionAplicadas?: number;
    ordenesFabricacionOmitidas?: number;
    ordenFabricacionIdsAplicadas?: number[];
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
    MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_ADMIN_CORRECTION_ENABLED,
]);

const AREA_OPERATIVA_DIRECTIVE_NAMES = new Set<string>([
    ...AREA_OPERATIVA_NOISE_DIRECTIVE_NAMES,
    ...AREA_OPERATIVA_INACTIVITY_DIRECTIVE_NAMES,
    ...AREA_OPERATIVA_PANEL_DIRECTIVE_NAMES,
]);

const PRODUCTION_DIRECTIVE_NAMES = new Set<string>([
    MASTER_DIRECTIVE_KEYS.OF_LOTE_FECHA_FABRICACION,
    MASTER_DIRECTIVE_KEYS.BATCH_RECORD_WORKFLOW_ENABLED,
    MASTER_DIRECTIVE_KEYS.DISPENSACION_NO_BLOQUEA_INICIO_PRODUCCION,
    MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_DIAS_BLOQUEO_EDICION,
    MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_PERMITIR_AGREGAR_TERMINADOS_APROBADO,
]);

const PRODUCTION_DIRECTIVE_EXTENDED_HELP: Record<string, string> = {
    [MASTER_DIRECTIVE_KEYS.OF_LOTE_FECHA_FABRICACION]:
        "Aplica a nuevas OF. Escoge su fecha real de inicio o de terminación para componer el lote automático al completar la salida. Las OF existentes conservan su criterio de fecha. La vista previa de terminación usa la fecha actual y se confirma al guardar.",
    [MASTER_DIRECTIVE_KEYS.BATCH_RECORD_WORKFLOW_ENABLED]:
        "Aplica unicamente a ordenes nuevas. Al activarse crea expedientes documentales y habilita nuevas OF. Puede apagarse con expedientes abiertos: estos siguen disponibles y las proyecciones pendientes continúan procesándose. No crea expedientes retroactivos.",
    [MASTER_DIRECTIVE_KEYS.DISPENSACION_NO_BLOQUEA_INICIO_PRODUCCION]:
        "Aplica a nuevas OP y OF. Cambiar el switch no modifica órdenes existentes; para las OP y OF elegibles use la acción retroactiva controlada de esta pantalla.",
    [MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_PERMITIR_AGREGAR_TERMINADOS_APROBADO]:
        "Cuando esta apagada, una MPS aprobada conserva el flujo actual: solo permite mover, aumentar, reducir o cancelar tarjetas existentes. Cuando esta activa, se pueden agregar nuevos terminados a una MPS APROBADA o CERRADA. Si la MPS ya esta cerrada o ya tiene ODPs generadas, el backend genera inmediatamente las ODPs de los nuevos lotes.",
};

function isIntegerInRange(value: string, min: number, max: number) {
    if (!/^\d+$/.test(value.trim())) return false;
    const parsed = Number(value.trim());
    return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

function getNumericDirectiveBounds(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.REORDEN_SEGUIMIENTO_PORCENTAJE) {
        return {
            min: REORDEN_SEGUIMIENTO_PORCENTAJE_MIN,
            max: REORDEN_SEGUIMIENTO_PORCENTAJE_MAX,
            error: `Debe ser un porcentaje entero entre ${REORDEN_SEGUIMIENTO_PORCENTAJE_MIN} y ${REORDEN_SEGUIMIENTO_PORCENTAJE_MAX}`,
        };
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.REORDEN_SEGUIMIENTO_MINIMO_LEAD_TIME_DIAS) {
        return {
            min: REORDEN_SEGUIMIENTO_MINIMO_LEAD_TIME_DIAS_MIN,
            max: REORDEN_SEGUIMIENTO_MINIMO_LEAD_TIME_DIAS_MAX,
            error: `Debe ser un entero entre ${REORDEN_SEGUIMIENTO_MINIMO_LEAD_TIME_DIAS_MIN} y ${REORDEN_SEGUIMIENTO_MINIMO_LEAD_TIME_DIAS_MAX} días calendario`,
        };
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.NEW_FEATURES_NOTIFICATION_DAYS) {
        return {
            min: NEW_FEATURES_NOTIFICATION_DAYS_MIN,
            max: NEW_FEATURES_NOTIFICATION_DAYS_MAX,
            error: `Debe ser un entero entre ${NEW_FEATURES_NOTIFICATION_DAYS_MIN} y ${NEW_FEATURES_NOTIFICATION_DAYS_MAX}`,
        };
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_DIAS_BLOQUEO_EDICION
        || directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_FABRICACION_DIAS_BLOQUEO_EDICION) {
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

function getNumericDirectiveLabel(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.NEW_FEATURES_NOTIFICATION_DAYS) {
        return "Duración de la notificación Nuevo";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.REORDEN_SEGUIMIENTO_PORCENTAJE) {
        return "Correo de reorden: inicio del seguimiento (%)";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.REORDEN_SEGUIMIENTO_MINIMO_LEAD_TIME_DIAS) {
        return "Correo de reorden: plazo mínimo del proveedor (días)";
    }
    return directive.nombre;
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
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_ADMIN_CORRECTION_ENABLED) {
        return "Correccion administrativa de estados";
    }
    return directive.nombre;
}

function getProductionDirectiveLabel(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.OF_LOTE_FECHA_FABRICACION) {
        return "Fecha de fabricación del lote OF";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.BATCH_RECORD_WORKFLOW_ENABLED) {
        return "Expediente Batch Record y OF";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.DISPENSACION_NO_BLOQUEA_INICIO_PRODUCCION) {
        return "Dispensacion no bloquea inicio";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_DIAS_BLOQUEO_EDICION) {
        return "Dias bloqueados para edicion MPS";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_PERMITIR_AGREGAR_TERMINADOS_APROBADO) {
        return "Agregar terminados en MPS aprobada";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_FABRICACION_DIAS_BLOQUEO_EDICION) {
        return "Dias bloqueados para edicion MPS OF";
    }
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_FABRICACION_PERMITIR_AGREGAR_SEMITERMINADOS_APROBADO) {
        return "Agregar semiterminados en MPS OF aprobado";
    }
    return directive.nombre;
}

function getProductionDirectiveUnit(directive: MasterDirective) {
    if (directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_SEMANAL_DIAS_BLOQUEO_EDICION
        || directive.nombre === MASTER_DIRECTIVE_KEYS.MPS_FABRICACION_DIAS_BLOQUEO_EDICION) {
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

function getApiErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        if (data && typeof data === "object" && "message" in data) {
            const message = (data as { message?: unknown }).message;
            if (typeof message === "string" && message.trim()) return message;
        }
        return error.message || fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

export default function MasterDirectivesPage() {
    const [config, setConfig] = useState<SuperMasterConfig | null>(null);
    const [draft, setDraft] = useState<SuperMasterConfig | null>(null);
    const [masterDirectives, setMasterDirectives] = useState<MasterDirective[]>([]);
    const [directiveDrafts, setDirectiveDrafts] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [updating, setUpdating] = useState<boolean>(false);
    const endPoints = useMemo(() => new EndPointsURL(), []);
    const toast = useAppToast();
    const { refreshDirectives } = useMasterDirectives();
    const { user } = useAuth();
    const normalizedUser = user?.trim().toLowerCase();
    const canManageSuperMasterConfig = normalizedUser === "super_master";
    const canApplyDispensacionRetroactivity = normalizedUser === "master" || normalizedUser === "super_master";
    const canManageBatchRecordWorkflow = normalizedUser === "master" || normalizedUser === "super_master";
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
        () => masterDirectives.filter(directive => directive.tipoDato === "NUMERO" || directive.tipoDato === "BOOLEANO"
            || directive.nombre === MASTER_DIRECTIVE_KEYS.OF_LOTE_FECHA_FABRICACION),
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

    const panelAdminCorrectionDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_ADMIN_CORRECTION_ENABLED),
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

    const mpsOfDiasBloqueoDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.MPS_FABRICACION_DIAS_BLOQUEO_EDICION),
        [masterDirectives]
    );

    const mpsOfAgregarSemiterminadosDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.MPS_FABRICACION_PERMITIR_AGREGAR_SEMITERMINADOS_APROBADO),
        [masterDirectives]
    );

    const batchRecordWorkflowDirective = useMemo(
        () => findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.BATCH_RECORD_WORKFLOW_ENABLED),
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
        () => [batchRecordWorkflowDirective, dispensacionNoBloqueaDirective, mpsDiasBloqueoDirective, mpsAgregarTerminadosAprobadoDirective, mpsOfDiasBloqueoDirective, mpsOfAgregarSemiterminadosDirective,
            findDirectiveByName(masterDirectives, MASTER_DIRECTIVE_KEYS.OF_LOTE_FECHA_FABRICACION)].filter(isPresentDirective),
        [batchRecordWorkflowDirective, dispensacionNoBloqueaDirective, mpsDiasBloqueoDirective, mpsAgregarTerminadosAprobadoDirective, mpsOfDiasBloqueoDirective, mpsOfAgregarSemiterminadosDirective, masterDirectives]
    );

    const panelDirectives = useMemo(
        () => [panelHistoricoToggleDirective, panelAdminCorrectionDirective].filter(isPresentDirective),
        [panelHistoricoToggleDirective, panelAdminCorrectionDirective]
    );

    const hasAllNoiseDirectives = Boolean(noiseEnabledDirective && noiseIntervalDirective && noiseSampleDirective);
    const hasAllInactivityDirectives = Boolean(inactivityEnabledDirective && inactivityThresholdDirective && inactivityCheckIntervalDirective);
    const hasAllPanelDirectives = Boolean(panelHistoricoToggleDirective && panelAdminCorrectionDirective);
    const hasAllProductionDirectives = Boolean(batchRecordWorkflowDirective && dispensacionNoBloqueaDirective && mpsDiasBloqueoDirective && mpsAgregarTerminadosAprobadoDirective && mpsOfDiasBloqueoDirective && mpsOfAgregarSemiterminadosDirective);

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
        const fechaLote = masterDirectives.find(directive => directive.nombre === MASTER_DIRECTIVE_KEYS.OF_LOTE_FECHA_FABRICACION);
        if (fechaLote && !["INICIO", "TERMINACION"].includes((directiveDrafts[fechaLote.id] ?? fechaLote.valor).trim())) {
            errors[fechaLote.id] = "Seleccione inicio o terminación real de la OF.";
        }
        return errors;
    }, [numericEditableDirectives, directiveDrafts, masterDirectives]);

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

        const changedDirectives = editableMasterDirectives.filter(directive => {
            const value = directiveDrafts[directive.id] ?? directive.valor;
            return normalizeDirectiveDraftValue(directive, value) !== normalizeDirectiveDraftValue(directive, directive.valor);
        });
        const batchRecordChange = changedDirectives.find(
            directive => directive.nombre === MASTER_DIRECTIVE_KEYS.BATCH_RECORD_WORKFLOW_ENABLED
        );
        if (batchRecordChange && !canManageBatchRecordWorkflow) {
            toast({
                title: "No autorizado",
                description: "Solo master o super_master pueden cambiar el flujo de Batch Record.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            return;
        }
        if (batchRecordChange) {
            const targetValue = directiveDrafts[batchRecordChange.id] ?? batchRecordChange.valor;
            const isActivation = !isBooleanEnabled(batchRecordChange.valor)
                && isBooleanEnabled(targetValue);
            if (isActivation) {
                const confirmed = window.confirm(
                    "Al activar Batch Record, las OP nuevas solicitarán un expediente documental y se habilitará la creación de OF. El expediente puede sincronizarse de forma incompleta y no cambia el estado de Calidad ni bloquea el ingreso a almacén. La activación no será retroactiva. ¿Desea continuar?"
                );
                if (!confirmed) return;
            }
        }

        setUpdating(true);
        try {
            const updateDirective = (directive: MasterDirective) => {
                const newDirective = {
                    ...directive,
                    valor: normalizeDirectiveDraftValue(
                        directive,
                        directiveDrafts[directive.id] ?? directive.valor
                    ),
                };
                return axios.put(endPoints.update_super_master_directive, {
                    oldMasterDirective: directive,
                    newMasterDirective: newDirective,
                });
            };

            if (batchRecordChange) {
                await updateDirective(batchRecordChange);
            }

            if (superMasterHasChanges) {
                await axios.put(endPoints.update_super_master_directives_config, draft);
                setConfig({ ...draft });
            }

            await Promise.all(changedDirectives
                .filter(directive => directive !== batchRecordChange)
                .map(updateDirective));

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
                description: getApiErrorMessage(err, "No fue posible guardar las directivas."),
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
            `Se aplicará la política no bloqueante a ${retroactivityPreview.ordenesCandidatas ?? 0} OP y ${retroactivityPreview.ordenesFabricacionCandidatas ?? 0} OF candidatas. En las OP se libera el seguimiento de Almacén General. No inicia operaciones, no genera movimientos de almacén ni modifica inventario; tampoco acredita la dispensación real. ¿Desea continuar?`
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

            <Tabs.Root defaultValue="general" variant="outline" colorPalette="teal">
                <Tabs.List>
                    <Tabs.Trigger value="general">General</Tabs.Trigger>
                    <Tabs.Trigger value="produccion">Produccion</Tabs.Trigger>
                    <Tabs.Trigger value="area-operativa">Area Operativa</Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="general" px={0}>
                        <OcmCierreDirectivePanel />
                        <Table.Root variant="line">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                    <Table.ColumnHeader>Valor</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {ROWS.map(({ key, label, resumen }) => {
                                    const value = draft[key];
                                    const original = config[key];
                                    const hasRowChange = value !== original;
                                    return (
                                        <Table.Row key={key}>
                                            <Table.Cell>
                                                <Text fontWeight="bold">{label}</Text>
                                                <Text fontSize="sm" color="app.textSubtle">
                                                    {resumen}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <HStack>
                                                    <Switch.Root
                                                        checked={value}
                                                        disabled={!canManageSuperMasterConfig}
                                                        onCheckedChange={({ checked }) => updateDraft(key, checked)}
                                                    >
                                                        <Switch.HiddenInput />
                                                        <Switch.Control>
                                                            <Switch.Thumb />
                                                        </Switch.Control>
                                                    </Switch.Root>
                                                    {hasRowChange && (
                                                        <Icon color="orange.400" asChild><FaCircleExclamation /></Icon>
                                                    )}
                                                </HStack>
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                })}
                            </Table.Body>
                        </Table.Root>

                        {numericDirectives.length > 0 && (
                            <Box mt={8}>
                                <Text mb={2} fontWeight="bold">
                                    Directivas numericas
                                </Text>
                                <Table.Root variant="line">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                            <Table.ColumnHeader>Valor</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {numericDirectives.map(directive => {
                                            const value = directiveDrafts[directive.id] ?? directive.valor;
                                            const hasRowChange = value.trim() !== directive.valor;
                                            const error = directiveErrors[directive.id];
                                            const isReordenDirective = directive.nombre === MASTER_DIRECTIVE_KEYS.REORDEN_SEGUIMIENTO_PORCENTAJE
                                                || directive.nombre === MASTER_DIRECTIVE_KEYS.REORDEN_SEGUIMIENTO_MINIMO_LEAD_TIME_DIAS;
                                            return (
                                                <Table.Row key={directive.id}>
                                                    <Table.Cell>
                                                        <Text fontWeight="bold">{getNumericDirectiveLabel(directive)}</Text>
                                                        <Text fontSize="sm" color="app.textSubtle">
                                                            {directive.resumen}
                                                        </Text>
                                                        {isReordenDirective && (
                                                            <Text fontSize="sm" color="app.textSubtle" mt={2} maxW="75ch" whiteSpace="normal" id={`directive-help-${directive.id}`}>
                                                                {directive.ayuda}
                                                            </Text>
                                                        )}
                                                        {directive.nombre === MASTER_DIRECTIVE_KEYS.LIMITE_RECEPCIONES_PARCIALES_OCM && (
                                                            <Text fontSize="xs" color={explanatoryWarningColor} mt={1}>
                                                                Este tope solo valida cambios futuros en proveedores. No modifica limites ya configurados ni valida ingresos OCM directamente.
                                                            </Text>
                                                        )}
                                                        {directive.nombre === MASTER_DIRECTIVE_KEYS.NEW_FEATURES_NOTIFICATION_DAYS && (
                                                            <Text fontSize="sm" color="app.textSubtle" mt={1} maxW="65ch" whiteSpace="normal" id={`directive-help-${directive.id}`}>
                                                                De 0 a 365 días desde la publicación de cada novedad. 0 desactiva los indicadores.
                                                                También desaparecen antes al leer y visitar el módulo. El carrusel sigue disponible.
                                                            </Text>
                                                        )}
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <HStack align="flex-start">
                                                            <Field.Root invalid={Boolean(error)} maxW="180px" ids={{ errorText: `directive-error-${directive.id}` }}>
                                                                <Input
                                                                    type="number"
                                                                    min={getNumericDirectiveBounds(directive).min}
                                                                    max={getNumericDirectiveBounds(directive).max}
                                                                    aria-label={getNumericDirectiveLabel(directive)}
                                                                    aria-describedby={[
                                                                        directive.nombre === MASTER_DIRECTIVE_KEYS.NEW_FEATURES_NOTIFICATION_DAYS || isReordenDirective
                                                                            ? `directive-help-${directive.id}` : undefined,
                                                                        error ? `directive-error-${directive.id}` : undefined,
                                                                    ].filter(Boolean).join(" ") || undefined}
                                                                    step={1}
                                                                    value={value}
                                                                    onChange={e => updateDirectiveDraft(directive.id, e.target.value)}
                                                                />
                                                                {error && <Field.ErrorText>{error}</Field.ErrorText>}
                                                            </Field.Root>
                                                            {hasRowChange && (
                                                                <Icon color="orange.400" mt={2} asChild><FaCircleExclamation /></Icon>
                                                            )}
                                                        </HStack>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        })}
                                    </Table.Body>
                                </Table.Root>
                            </Box>
                        )}

                        {booleanDirectives.length > 0 && (
                            <Box mt={8}>
                                <Text mb={2} fontWeight="bold">
                                    Directivas booleanas
                                </Text>
                                <Table.Root variant="line">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                            <Table.ColumnHeader>Valor</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {booleanDirectives.map(directive => {
                                            const value = directiveDrafts[directive.id] ?? directive.valor;
                                            const hasRowChange = normalizeDirectiveDraftValue(directive, value) !== normalizeDirectiveDraftValue(directive, directive.valor);
                                            return (
                                                <Table.Row key={directive.id}>
                                                    <Table.Cell>
                                                        <Text fontWeight="bold">{directive.nombre}</Text>
                                                        <Text fontSize="sm" color="app.textSubtle">
                                                            {directive.resumen}
                                                        </Text>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <HStack>
                                                            <Switch.Root
                                                                checked={isBooleanEnabled(value)}
                                                                onCheckedChange={({ checked }) => updateDirectiveDraft(directive.id, String(checked))}
                                                            >
                                                                <Switch.HiddenInput />
                                                                <Switch.Control>
                                                                    <Switch.Thumb />
                                                                </Switch.Control>
                                                            </Switch.Root>
                                                            {hasRowChange && (
                                                                <Icon color="orange.400" asChild><FaCircleExclamation /></Icon>
                                                            )}
                                                        </HStack>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        })}
                                    </Table.Body>
                                </Table.Root>
                            </Box>
                        )}
                </Tabs.Content>

                <Tabs.Content value="produccion" px={0}>
                        <Box>
                            <Text mb={2} fontWeight="bold">
                                Inicio de produccion y MPS semanal
                            </Text>
                            {!hasAllProductionDirectives && (
                                <Text color="app.textSubtle" fontSize="sm" mb={4}>
                                    Las directivas de produccion aun no estan disponibles. Verifica que el backend haya inicializado las directivas maestras.
                                </Text>
                            )}
                            <Table.Root variant="line">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Configuracion</Table.ColumnHeader>
                                        <Table.ColumnHeader>Valor</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {productionDirectives.map(directive => {
                                        const value = directiveDrafts[directive.id] ?? directive.valor;
                                        const hasRowChange = normalizeDirectiveDraftValue(directive, value) !== normalizeDirectiveDraftValue(directive, directive.valor);
                                        const error = directiveErrors[directive.id];
                                        const bounds = getNumericDirectiveBounds(directive);
                                        const unit = getProductionDirectiveUnit(directive);
                                        const label = getProductionDirectiveLabel(directive);
                                        const extendedHelp = getProductionDirectiveExtendedHelp(directive);
                                        return (
                                            <Table.Row key={directive.id}>
                                                <Table.Cell>
                                                    <HStack gap={2} align="center">
                                                        <Text fontWeight="bold">{label}</Text>
                                                        {extendedHelp && (
                                                            <Tooltip
                                                                content={extendedHelp}
                                                                showArrow
                                                                contentProps={{ maxW: "360px", whiteSpace: "normal" }}
                                                                positioning={{ placement: "top" }}
                                                            >
                                                                <IconButton
                                                                    aria-label={`Ayuda detallada ${label}`}
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    colorPalette="teal"><LuCircleHelp /></IconButton>
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
                                                    {directive.nombre === MASTER_DIRECTIVE_KEYS.BATCH_RECORD_WORKFLOW_ENABLED && (
                                                        <Text fontSize="xs" color={explanatoryWarningColor} mt={1}>
                                                            Batch Record documenta el lote; Calidad conserva su estado de manera independiente.
                                                        </Text>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {directive.nombre === MASTER_DIRECTIVE_KEYS.OF_LOTE_FECHA_FABRICACION ? (
                                                        <Field.Root invalid={Boolean(error)} maxW="300px">
                                                            <Field.Label>Fecha real que compone el lote</Field.Label>
                                                            <NativeSelect.Root>
                                                                <NativeSelect.Field value={value} onChange={event => updateDirectiveDraft(directive.id, event.target.value)}>
                                                                    <option value="INICIO">Inicio real de la OF</option>
                                                                    <option value="TERMINACION">Terminación real de la OF</option>
                                                                </NativeSelect.Field>
                                                                <NativeSelect.Indicator />
                                                            </NativeSelect.Root>
                                                            {error && <Field.ErrorText>{error}</Field.ErrorText>}
                                                            {hasRowChange && <Field.HelperText>Cambio pendiente de guardar.</Field.HelperText>}
                                                        </Field.Root>
                                                    ) : directive.tipoDato === "BOOLEANO" ? (
                                                        <HStack>
                                                            <Switch.Root
                                                                checked={isBooleanEnabled(value)}
                                                                disabled={directive.nombre === MASTER_DIRECTIVE_KEYS.BATCH_RECORD_WORKFLOW_ENABLED && !canManageBatchRecordWorkflow}
                                                                onCheckedChange={({ checked }) => updateDirectiveDraft(directive.id, String(checked))}
                                                            >
                                                                <Switch.HiddenInput />
                                                                <Switch.Control>
                                                                    <Switch.Thumb />
                                                                </Switch.Control>
                                                            </Switch.Root>
                                                            {hasRowChange && (
                                                                <Icon color="orange.400" asChild><FaCircleExclamation /></Icon>
                                                            )}
                                                        </HStack>
                                                    ) : (
                                                        <HStack align="flex-start">
                                                            <Field.Root invalid={Boolean(error)} maxW="180px">
                                                                <Input
                                                                    type="number"
                                                                    min={bounds.min}
                                                                    max={bounds.max}
                                                                    step={1}
                                                                    value={value}
                                                                    onChange={e => updateDirectiveDraft(directive.id, e.target.value)}
                                                                />
                                                                {error && <Field.ErrorText>{error}</Field.ErrorText>}
                                                            </Field.Root>
                                                            {unit && (
                                                                <Text color="app.textMuted" mt={2}>
                                                                    {unit}
                                                                </Text>
                                                            )}
                                                            {hasRowChange && (
                                                                <Icon color="orange.400" mt={2} asChild><FaCircleExclamation /></Icon>
                                                            )}
                                                        </HStack>
                                                    )}
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table.Root>

                            {dispensacionNoBloqueaDirective && canApplyDispensacionRetroactivity ? (
                                <Box mt={6} borderWidth="1px" borderRadius="md" p={4} bg="app.surfaceSubtle">
                                    <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
                                        <Box flex="1" minW={{ base: "100%", md: "420px" }}>
                                            <Text fontWeight="bold">
                                                Aplicar política no bloqueante a OP y OF existentes
                                            </Text>
                                            <Text fontSize="sm" color="app.textSubtle" mt={1}>
                                                OP activas con Almacén General en espera y sin avances en otras áreas. OF planificadas o liberadas con política bloqueante y fabricación sin iniciar. No inicia operaciones, no genera movimientos de almacén ni modifica inventario; tampoco acredita la dispensación real.
                                            </Text>
                                            {retroactivityLoading ? (
                                                <HStack mt={3}>
                                                    <Spinner size="sm" />
                                                    <Text fontSize="sm" color="app.textMuted">Consultando OP y OF candidatas...</Text>
                                                </HStack>
                                            ) : (
                                                <Box mt={3}>
                                                    <Text fontSize="sm">
                                                        Directiva persistida: {retroactivityPreview ? (retroactivityPreview.directivaActual ? "activa" : "apagada") : "sin consultar"}
                                                    </Text>
                                                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={3}>
                                                        {[
                                                            {
                                                                tipo: "OP",
                                                                candidatas: retroactivityPreview?.ordenesCandidatas ?? 0,
                                                                aplicadas: retroactivityPreview?.ordenesAplicadas ?? 0,
                                                                omitidas: retroactivityPreview?.ordenesOmitidas ?? 0,
                                                                ids: retroactivityPreview?.ordenIdsAplicadas ?? [],
                                                            },
                                                            {
                                                                tipo: "OF",
                                                                candidatas: retroactivityPreview?.ordenesFabricacionCandidatas ?? 0,
                                                                aplicadas: retroactivityPreview?.ordenesFabricacionAplicadas ?? 0,
                                                                omitidas: retroactivityPreview?.ordenesFabricacionOmitidas ?? 0,
                                                                ids: retroactivityPreview?.ordenFabricacionIdsAplicadas ?? [],
                                                            },
                                                        ].map(grupo => (
                                                            <Box key={grupo.tipo} borderWidth="1px" borderColor="app.border" borderRadius="md" p={3}>
                                                                <Text fontWeight="semibold">{grupo.tipo}</Text>
                                                                <Text fontSize="sm">Candidatas: {grupo.candidatas}</Text>
                                                                <Text fontSize="sm">Aplicadas: {grupo.aplicadas}</Text>
                                                                <Text fontSize="sm">Omitidas: {grupo.omitidas}</Text>
                                                                <Text fontSize="sm" overflowWrap="anywhere">
                                                                    IDs aplicadas: {grupo.ids.length > 0
                                                                        ? `${grupo.ids.slice(0, 8).map(id => `${grupo.tipo}-${id}`).join(", ")}${grupo.ids.length > 8 ? ", ..." : ""}`
                                                                        : "—"}
                                                                </Text>
                                                            </Box>
                                                        ))}
                                                    </SimpleGrid>
                                                    {retroactivityPreview?.mensaje ? (
                                                        <Text fontSize="sm" color="app.textMuted" mt={1}>
                                                            {retroactivityPreview.mensaje}
                                                        </Text>
                                                    ) : null}
                                                </Box>
                                            )}
                                        </Box>
                                        <Button
                                            colorPalette="purple"
                                            onClick={handleApplyDispensacionRetroactivity}
                                            disabled={!retroactivityPreview?.ejecutable || retroactivityLoading || retroactivityApplying}
                                            loading={retroactivityApplying}
                                        >
                                            Aplicar retroactividad
                                        </Button>
                                    </HStack>
                                </Box>
                            ) : null}
                        </Box>
                </Tabs.Content>

                <Tabs.Content value="area-operativa" px={0}>
                        <Box>
                            <Text mb={2} fontWeight="bold">
                                Tablero operativo
                            </Text>
                            {!hasAllPanelDirectives && (
                                <Text color="app.textSubtle" fontSize="sm" mb={4}>
                                    Las directivas del tablero operativo aun no estan disponibles. Verifica que el backend haya inicializado las directivas maestras.
                                </Text>
                            )}
                            <Table.Root variant="line">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Configuracion</Table.ColumnHeader>
                                        <Table.ColumnHeader>Valor</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {panelDirectives.map(directive => {
                                        const value = directiveDrafts[directive.id] ?? directive.valor;
                                        const hasRowChange = normalizeDirectiveDraftValue(directive, value) !== normalizeDirectiveDraftValue(directive, directive.valor);
                                        return (
                                            <Table.Row key={directive.id}>
                                                <Table.Cell>
                                                    <Text fontWeight="bold">{getAreaOperativaPanelDirectiveLabel(directive)}</Text>
                                                    <Text fontSize="sm" color="app.textSubtle">
                                                        {directive.resumen}
                                                    </Text>
                                                    {directive.ayuda && (
                                                        <Text fontSize="xs" color="app.textSubtle" mt={1}>
                                                            {directive.ayuda}
                                                        </Text>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <HStack>
                                                        <Switch.Root
                                                            checked={isBooleanEnabled(value)}
                                                            onCheckedChange={({ checked }) => updateDirectiveDraft(directive.id, String(checked))}
                                                        >
                                                            <Switch.HiddenInput />
                                                            <Switch.Control>
                                                                <Switch.Thumb />
                                                            </Switch.Control>
                                                        </Switch.Root>
                                                        {hasRowChange && (
                                                            <Icon color="orange.400" asChild><FaCircleExclamation /></Icon>
                                                        )}
                                                    </HStack>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table.Root>

                            <Box mt={8}>
                                <Text mb={2} fontWeight="bold">
                                    Analitica / Ruido
                                </Text>
                                {!hasAllNoiseDirectives && (
                                    <Text color="app.textSubtle" fontSize="sm" mb={4}>
                                        Las directivas de ruido aun no estan disponibles. Verifica que el backend haya inicializado las directivas maestras.
                                    </Text>
                                )}
                                <Table.Root variant="line">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeader>Configuracion</Table.ColumnHeader>
                                            <Table.ColumnHeader>Valor</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {noiseEnabledDirective && (() => {
                                            const value = directiveDrafts[noiseEnabledDirective.id] ?? noiseEnabledDirective.valor;
                                            const hasRowChange = normalizeDirectiveDraftValue(noiseEnabledDirective, value) !== normalizeDirectiveDraftValue(noiseEnabledDirective, noiseEnabledDirective.valor);
                                            return (
                                                <Table.Row key={noiseEnabledDirective.id}>
                                                    <Table.Cell>
                                                        <Text fontWeight="bold">{getAreaOperativaNoiseDirectiveLabel(noiseEnabledDirective)}</Text>
                                                        <Text fontSize="sm" color="app.textSubtle">
                                                            {noiseEnabledDirective.resumen}
                                                        </Text>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <HStack>
                                                            <Switch.Root
                                                                checked={isBooleanEnabled(value)}
                                                                onCheckedChange={({ checked }) => updateDirectiveDraft(noiseEnabledDirective.id, String(checked))}
                                                            >
                                                                <Switch.HiddenInput />
                                                                <Switch.Control>
                                                                    <Switch.Thumb />
                                                                </Switch.Control>
                                                            </Switch.Root>
                                                            {hasRowChange && (
                                                                <Icon color="orange.400" asChild><FaCircleExclamation /></Icon>
                                                            )}
                                                        </HStack>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        })()}

                                        {noiseNumericDirectives.map(directive => {
                                            const value = directiveDrafts[directive.id] ?? directive.valor;
                                            const hasRowChange = value.trim() !== directive.valor;
                                            const error = directiveErrors[directive.id];
                                            const bounds = getNumericDirectiveBounds(directive);
                                            const unit = getAreaOperativaNoiseDirectiveUnit(directive);
                                            return (
                                                <Table.Row key={directive.id}>
                                                    <Table.Cell>
                                                        <Text fontWeight="bold">{getAreaOperativaNoiseDirectiveLabel(directive)}</Text>
                                                        <Text fontSize="sm" color="app.textSubtle">
                                                            {directive.resumen}
                                                        </Text>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <HStack align="flex-start">
                                                            <Field.Root invalid={Boolean(error)} maxW="180px">
                                                                <Input
                                                                    type="number"
                                                                    min={bounds.min}
                                                                    max={bounds.max}
                                                                    step={1}
                                                                    value={value}
                                                                    onChange={e => updateDirectiveDraft(directive.id, e.target.value)}
                                                                />
                                                                {error && <Field.ErrorText>{error}</Field.ErrorText>}
                                                            </Field.Root>
                                                            {unit && (
                                                                <Text color="app.textMuted" mt={2}>
                                                                    {unit}
                                                                </Text>
                                                            )}
                                                            {hasRowChange && (
                                                                <Icon color="orange.400" mt={2} asChild><FaCircleExclamation /></Icon>
                                                            )}
                                                        </HStack>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        })}
                                    </Table.Body>
                                </Table.Root>
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
                                <Table.Root variant="line">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeader>Configuracion</Table.ColumnHeader>
                                            <Table.ColumnHeader>Valor</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {inactivityEnabledDirective && (() => {
                                            const value = directiveDrafts[inactivityEnabledDirective.id] ?? inactivityEnabledDirective.valor;
                                            const hasRowChange = normalizeDirectiveDraftValue(inactivityEnabledDirective, value) !== normalizeDirectiveDraftValue(inactivityEnabledDirective, inactivityEnabledDirective.valor);
                                            return (
                                                <Table.Row key={inactivityEnabledDirective.id}>
                                                    <Table.Cell>
                                                        <Text fontWeight="bold">{getAreaOperativaInactivityDirectiveLabel(inactivityEnabledDirective)}</Text>
                                                        <Text fontSize="sm" color="app.textSubtle">
                                                            {inactivityEnabledDirective.resumen}
                                                        </Text>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <HStack>
                                                            <Switch.Root
                                                                checked={isBooleanEnabled(value)}
                                                                onCheckedChange={({ checked }) => updateDirectiveDraft(inactivityEnabledDirective.id, String(checked))}
                                                            >
                                                                <Switch.HiddenInput />
                                                                <Switch.Control>
                                                                    <Switch.Thumb />
                                                                </Switch.Control>
                                                            </Switch.Root>
                                                            {hasRowChange && (
                                                                <Icon color="orange.400" asChild><FaCircleExclamation /></Icon>
                                                            )}
                                                        </HStack>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        })()}

                                        {inactivityNumericDirectives.map(directive => {
                                            const value = directiveDrafts[directive.id] ?? directive.valor;
                                            const hasRowChange = value.trim() !== directive.valor;
                                            const error = directiveErrors[directive.id];
                                            const bounds = getNumericDirectiveBounds(directive);
                                            const unit = getAreaOperativaInactivityDirectiveUnit(directive);
                                            return (
                                                <Table.Row key={directive.id}>
                                                    <Table.Cell>
                                                        <Text fontWeight="bold">{getAreaOperativaInactivityDirectiveLabel(directive)}</Text>
                                                        <Text fontSize="sm" color="app.textSubtle">
                                                            {directive.resumen}
                                                        </Text>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <HStack align="flex-start">
                                                            <Field.Root invalid={Boolean(error)} maxW="180px">
                                                                <Input
                                                                    type="number"
                                                                    min={bounds.min}
                                                                    max={bounds.max}
                                                                    step={1}
                                                                    value={value}
                                                                    onChange={e => updateDirectiveDraft(directive.id, e.target.value)}
                                                                />
                                                                {error && <Field.ErrorText>{error}</Field.ErrorText>}
                                                            </Field.Root>
                                                            {unit && (
                                                                <Text color="app.textMuted" mt={2}>
                                                                    {unit}
                                                                </Text>
                                                            )}
                                                            {hasRowChange && (
                                                                <Icon color="orange.400" mt={2} asChild><FaCircleExclamation /></Icon>
                                                            )}
                                                        </HStack>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        })}
                                    </Table.Body>
                                </Table.Root>
                            </Box>
                        </Box>
                </Tabs.Content>
            </Tabs.Root>

            <HStack mt={4}>
                <Button
                    colorPalette="blue"
                    onClick={handleSave}
                    disabled={!hasChanges || hasDirectiveErrors || updating}
                    loading={updating}
                >
                    Guardar cambios
                </Button>
                <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={!hasChanges || updating}
                >
                    Cancelar cambios
                </Button>
            </HStack>
        </Container>
    );
}
