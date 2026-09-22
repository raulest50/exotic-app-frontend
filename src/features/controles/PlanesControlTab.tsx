import {
    Alert,
    Badge,
    Box,
    Button,
    Checkbox,
    CloseButton,
    Dialog,
    Field,
    Grid,
    Heading,
    HStack,
    IconButton,
    Input,
    NativeSelect,
    Portal,
    Spinner,
    Steps,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuCheck, LuPlus, LuTrash2 } from "react-icons/lu";

import { useAppToast } from "../../components/ui/use-app-toast";
import CatalogosControlDialog from "./CatalogosControlDialog";
import ControlProductPickerDialog from "./ControlProductPickerDialog";
import { apiFailureDetail, listControlCategories, listMagnitudes, listUnidades, type ControlDomainApi } from "./api";
import { CONTROL_NOUN, CONTROL_SCOPE_LABEL } from "./controlUi";
import PlanVersionDetailDialog from "./PlanVersionDetailDialog";
import PlanVersionList from "./PlanVersionList";
import PlanValidationField from "./PlanValidationField";
import { PlanCodeAvailabilityCheck } from "./planCodeAvailability";
import { planIssueFromApi, validatePlan, validatePlanStep, type PlanStep, type PlanValidationIssue } from "./planValidation";
import { getPlanVersionActions, PLAN_VERSION_FILTERS, planVersionFilterNotice, type PlanVersionFilter } from "./planVersionView";
import usePlanControlList from "./usePlanControlList";
import ControlPointRoutePicker from "./QualityControlPointRoutePicker";
import type {
    AplicabilidadPlanControl,
    CaracteristicaPlanControl,
    CatalogoMagnitud,
    CatalogoUnidad,
    CategoriaControlOption,
    ControlProductOption,
    PlanControl,
    PlanControlResumen,
    PlanControlWrite,
    PlanVersionDetalle,
    VersionPlanControl,
    VersionPlanReferencia,
} from "./types";

interface PlanesControlTabProps {
    api: ControlDomainApi;
    nivel: number;
}

interface ConfirmAction {
    kind: "PUBLICAR" | "RETIRAR";
    plan: PlanControlResumen;
    version: VersionPlanReferencia;
}

const steps = [
    { title: "Identificación", description: "Código y nombre" },
    { title: "Ubicación", description: "Producto y punto en la ruta" },
    { title: "Mediciones", description: "Aceptación y muestreo" },
];

const newApplicability = (ambito: ControlDomainApi["ambito"]): AplicabilidadPlanControl => ({
    productosExcluidosIds: [],
    productosExcluidos: [],
    tipoOrden: "AMBAS",
    puntoAplicacion: ambito === "PROCESO" ? "SALIDA_OPERACION" : "LOTE_FINAL",
    momentoEjecucion: ambito === "PROCESO" ? "DURANTE_FABRICACION" : "REVISION_FINAL",
    puntoExigencia: "INFORMATIVO",
    frontendNodeId: null,
    ubicacionGraficaConfirmada: false,
});

const newCharacteristic = (order: number): CaracteristicaPlanControl => ({
    nombre: "",
    tipo: "NUMERICA",
    escala: 2,
    objetivo: null,
    limiteInferior: null,
    limiteSuperior: null,
    valorBooleanoEsperado: null,
    cantidadMuestras: 1,
    unidadesPorMuestra: 1,
    orden: order,
});

const defaultsFor = (ambito: ControlDomainApi["ambito"]): PlanControlWrite => ({
    codigo: "",
    nombre: "",
    motivoCambio: "",
    aplicabilidades: [newApplicability(ambito)],
    caracteristicas: [newCharacteristic(1)],
});

function inferredPolicy(
    ambito: ControlDomainApi["ambito"],
    puntoAplicacion: AplicabilidadPlanControl["puntoAplicacion"],
    bloqueante: boolean,
): Pick<AplicabilidadPlanControl, "momentoEjecucion" | "puntoExigencia"> {
    if (ambito === "PROCESO") {
        return { momentoEjecucion: "DURANTE_FABRICACION", puntoExigencia: "INFORMATIVO" };
    }
    return {
        momentoEjecucion: puntoAplicacion === "LOTE_FINAL" ? "REVISION_FINAL" : "DURANTE_FABRICACION",
        puntoExigencia: !bloqueante
            ? "INFORMATIVO"
            : puntoAplicacion === "LOTE_FINAL" ? "LIBERACION" : "CIERRE_ETAPA",
    };
}

function versionToDraft(plan: Omit<PlanControl, "versiones">, version: VersionPlanControl): PlanControlWrite {
    return {
        codigo: plan.codigo,
        nombre: plan.nombre,
        motivoCambio: version.estado === "BORRADOR" ? version.motivoCambio ?? "" : "",
        aplicabilidades: version.aplicabilidades.slice(0, 1).map((rule) => {
            const policy = inferredPolicy(plan.ambito, rule.puntoAplicacion, rule.puntoExigencia !== "INFORMATIVO");
            return {
                ...rule,
                ...policy,
                productosExcluidosIds: [...rule.productosExcluidosIds],
                productosExcluidos: [...(rule.productosExcluidos ?? [])],
                ubicacionGraficaConfirmada: rule.puntoAplicacion === "LOTE_FINAL"
                    ? plan.ambito === "CALIDAD"
                    : Boolean(rule.frontendNodeId),
            };
        }),
        caracteristicas: version.caracteristicas.map((characteristic) => ({ ...characteristic })),
    };
}

function idOrNull(value: string): number | null {
    if (!value.trim()) return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
}

function decimalOrNull(value: string): string | null {
    return value.trim() ? value.replace(",", ".") : null;
}

function locationLabel(rule: AplicabilidadPlanControl, ambito: ControlDomainApi["ambito"]): string {
    if (!rule.ubicacionGraficaConfirmada) {
        return ambito === "PROCESO" ? "Seleccione una operación en la ruta." : "Seleccione una salida en la ruta.";
    }
    if (rule.puntoAplicacion === "LOTE_FINAL") return "Salida final: aceptación del producto o lote.";
    const operation = rule.procesoProduccionNombre || (rule.procesoProduccionId ? `Proceso ${rule.procesoProduccionId}` : "Operación");
    const area = rule.areaOperativaNombre || (rule.areaOperativaId ? `Área ${rule.areaOperativaId}` : "Área sin identificar");
    return ambito === "PROCESO" ? `Dentro de ${operation} · ${area}` : `Salida de ${operation} · ${area}`;
}

export default function PlanesControlTab({ api, nivel }: PlanesControlTabProps) {
    const toast = useAppToast();
    const { query, result, loading, error: listError, load: loadPage } = usePlanControlList(api);
    const plans = result?.content ?? [];
    const appliedSearch = query.search;
    const versionFilter = query.filter;
    const [magnitudes, setMagnitudes] = useState<CatalogoMagnitud[]>([]);
    const [unidades, setUnidades] = useState<CatalogoUnidad[]>([]);
    const [categorias, setCategorias] = useState<CategoriaControlOption[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [fetchingVersion, setFetchingVersion] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const loadError = listError ?? catalogError;
    const [detailSelection, setDetailSelection] = useState<PlanVersionDetalle | null>(null);
    const versionRequestId = useRef(0);
    const detailTriggerRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<PlanStep>(0);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<number | undefined>();
    const [changeReasonRequired, setChangeReasonRequired] = useState(false);
    const [draft, setDraft] = useState<PlanControlWrite>(() => defaultsFor(api.ambito));
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
    const [productPickerMode, setProductPickerMode] = useState<"SINGLE" | "MULTIPLE" | null>(null);
    const [attemptedSteps, setAttemptedSteps] = useState<PlanStep[]>([]);
    const [serverValidation, setServerValidation] = useState<{
        draft: PlanControlWrite; issues: PlanValidationIssue[]; messages: string[];
    } | null>(null);
    const [checkingCode, setCheckingCode] = useState(false);
    const codeCheck = useRef(new PlanCodeAvailabilityCheck());
    const editorRef = useRef<HTMLDivElement>(null);
    const [focusIssue, setFocusIssue] = useState<PlanValidationIssue | null>(null);
    const visibleServerValidation = serverValidation?.draft === draft ? serverValidation : null;
    const validationIssues = [
        ...validatePlan(draft, api.ambito, changeReasonRequired).filter((issue) => attemptedSteps.includes(issue.step)),
        ...(visibleServerValidation?.issues ?? []),
    ];
    const validationErrors = [...new Set([
        ...validationIssues.map((issue) => issue.message), ...(visibleServerValidation?.messages ?? []),
    ])];

    useEffect(() => {
        const check = codeCheck.current;
        check.cancel();
        setCheckingCode(false);
        return () => check.cancel();
    }, [api, draft.codigo, editorOpen]);

    useEffect(() => {
        if (!focusIssue || !editorRef.current) return;
        const fields = Array.from(editorRef.current.querySelectorAll<HTMLElement>("[data-plan-field]"));
        const field = fields.find((item) => item.dataset.planField === focusIssue.field)
            ?? fields.find((item) => item.dataset.planField === focusIssue.field.split(".")[0])
            ?? editorRef.current;
        const input = focusIssue.field === "ubicacion" ? field : field.querySelector<HTMLElement>(
            "input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly]):not([disabled]), button:not([disabled])",
        ) ?? field;
        input.focus();
        field.scrollIntoView({ block: "nearest" });
        setFocusIssue(null);
    }, [focusIssue, step]);

    const focusError = (issue: PlanValidationIssue) => {
        setStep(issue.step);
        setFocusIssue({ ...issue });
    };

    const resetValidation = () => {
        codeCheck.current.cancel();
        setCheckingCode(false);
        setAttemptedSteps([]);
        setServerValidation(null);
        setFocusIssue(null);
    };

    const closeEditor = () => {
        resetValidation();
        setEditorOpen(false);
    };

    const loadCatalogs = async () => {
        setCatalogLoading(true);
        setCatalogError(null);
        try {
            const [nextMagnitudes, nextUnits, nextCategories] = await Promise.all([
                listMagnitudes(true), listUnidades(true), listControlCategories(),
            ]);
            setMagnitudes(nextMagnitudes);
            setUnidades(nextUnits);
            setCategorias(nextCategories);
        } catch (error) {
            setCatalogError(apiFailureDetail(error, "No fue posible cargar los catálogos.").message);
        } finally {
            setCatalogLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        setCatalogLoading(true);
        setCatalogError(null);
        Promise.all([listMagnitudes(true), listUnidades(true), listControlCategories()])
            .then(([nextMagnitudes, nextUnits, nextCategories]) => {
                if (!mounted) return;
                setMagnitudes(nextMagnitudes);
                setUnidades(nextUnits);
                setCategorias(nextCategories);
            })
            .catch((error) => {
                if (!mounted) return;
                setCatalogError(apiFailureDetail(error, "No fue posible cargar los catálogos.").message);
            })
            .finally(() => mounted && setCatalogLoading(false));
        return () => { mounted = false; versionRequestId.current += 1; };
    }, [api]);

    const searchPlans = () => {
        void loadPage({ ...query, search: search.trim(), page: 0 });
        if (catalogError) void loadCatalogs();
    };

    const changeFilter = (filter: PlanVersionFilter) => {
        void loadPage({ ...query, filter, page: 0 });
    };

    const startNew = () => {
        setEditingPlanId(undefined);
        setChangeReasonRequired(false);
        setDraft(defaultsFor(api.ambito));
        resetValidation();
        setStep(0);
        setEditorOpen(true);
    };

    const openVersion = async (plan: PlanControlResumen, source: VersionPlanReferencia, edit = false) => {
        if (loading || saving || fetchingVersion || nivel < 1) return;
        if (edit && nivel < 2) return;
        const request = ++versionRequestId.current;
        setFetchingVersion(true);
        try {
            const detail = await api.getVersionPlan(plan.id, source.id);
            if (request !== versionRequestId.current) return;
            if (!edit) {
                setDetailSelection(detail);
                return;
            }
            const actions = getPlanVersionActions(detail.plan, detail.version.id, nivel);
            const allowed = source.estado === "BORRADOR" ? actions.edit : actions.create;
            if (!allowed) {
                toast({ title: "El estado del plan cambió", description: "Revise el listado actualizado antes de editar o crear una versión.", status: "warning" });
                await loadPage(query);
                return;
            }
            setEditingPlanId(detail.plan.id);
            setChangeReasonRequired(detail.version.numero > 1 || detail.version.estado !== "BORRADOR");
            setDraft(versionToDraft(detail.plan, detail.version));
            resetValidation();
            setStep(0);
            setEditorOpen(true);
        } catch (error) {
            if (request === versionRequestId.current) {
                toast({ title: "No fue posible consultar la versión", description: apiFailureDetail(error, "Error de consulta.").message, status: "error" });
            }
        } finally {
            if (request === versionRequestId.current) setFetchingVersion(false);
        }
    };

    const updateApplicability = (index: number, patch: Partial<AplicabilidadPlanControl>) => {
        setDraft((current) => ({
            ...current,
            aplicabilidades: current.aplicabilidades.map((item, position) => position === index ? { ...item, ...patch } : item),
        }));
    };

    const updateCharacteristic = (index: number, patch: Partial<CaracteristicaPlanControl>) => {
        setDraft((current) => ({
            ...current,
            caracteristicas: current.caracteristicas.map((item, position) => position === index ? { ...item, ...patch } : item),
        }));
    };

    const nextStep = async () => {
        if (saving || loading || fetchingVersion || catalogLoading || loadError || nivel < 2 || codeCheck.current.pending) return;
        const errors = validatePlanStep(draft, api.ambito, changeReasonRequired, step);
        setAttemptedSteps((current) => [...new Set([...current, step])]);
        setServerValidation(null);
        if (errors.length) { focusError(errors[0]); return; }
        if (step === 1) { setStep(2); return; }
        if (step !== 0) return;
        if (editingPlanId != null) { setStep(1); return; }
        setCheckingCode(true);
        try {
            const result = await codeCheck.current.check(api.checkPlanCode, draft.codigo);
            if (!result) return;
            if (!result.disponible) {
                const issue: PlanValidationIssue = { step: 0, field: "codigo", message: "Ya existe un plan con ese código. Utilice un código diferente." };
                setServerValidation({ draft, issues: [issue], messages: [] });
                focusError(issue);
                return;
            }
            setDraft((current) => ({ ...current, codigo: result.codigoNormalizado }));
            setStep(1);
        } catch (error) {
            const detail = apiFailureDetail(error, "No fue posible comprobar la disponibilidad del código. Vuelva a pulsar Siguiente.");
            const issue: PlanValidationIssue | null = detail.status === 400
                ? { step: 0, field: "codigo", message: detail.message } : null;
            setServerValidation({ draft, issues: issue ? [issue] : [], messages: issue ? [] : [detail.message] });
            if (issue) focusError(issue);
        } finally {
            if (!codeCheck.current.pending) setCheckingCode(false);
        }
    };

    const save = async () => {
        if (saving || loading || fetchingVersion || loadError || nivel < 2) return;
        const errors = validatePlan(draft, api.ambito, changeReasonRequired);
        setAttemptedSteps([0, 1, 2]);
        setServerValidation(null);
        if (errors.length) { focusError(errors[0]); return; }
        setSaving(true);
        try {
            await api.savePlan({
                ...draft,
                codigo: draft.codigo.trim().toUpperCase(),
                nombre: draft.nombre.trim(),
                motivoCambio: draft.motivoCambio?.trim() || null,
                aplicabilidades: draft.aplicabilidades.map((rule) => ({
                    ...rule,
                    ...inferredPolicy(api.ambito, rule.puntoAplicacion, rule.puntoExigencia !== "INFORMATIVO"),
                })),
            }, editingPlanId);
            toast({ title: "Borrador guardado", description: "La versión continúa editable hasta su publicación." + planVersionFilterNotice(versionFilter, "BORRADOR"), status: "success" });
            await loadPage(query);
            setEditorOpen(false);
        } catch (error) {
            const detail = apiFailureDetail(error, "No fue posible guardar el borrador.");
            const issue = planIssueFromApi(detail);
            setServerValidation({ draft, issues: issue ? [issue] : [], messages: issue ? detail.bloqueos : [detail.message, ...detail.bloqueos] });
            if (issue) focusError(issue);
        } finally {
            setSaving(false);
        }
    };

    const confirmVersionAction = async () => {
        if (!confirmAction || saving || loading || loadError) return;
        const plan = plans.find((item) => item.id === confirmAction.plan.id);
        if (!plan) return;
        const actions = getPlanVersionActions(plan, confirmAction.version.id, nivel);
        if (confirmAction.kind === "PUBLICAR" ? !actions.publish : !actions.retire) return;
        setSaving(true);
        try {
            if (confirmAction.kind === "PUBLICAR") {
                await api.publishVersion(confirmAction.plan.id, confirmAction.version.id);
                toast({ title: "Versión publicada", description: "Solo los lotes futuros resolverán esta versión." + planVersionFilterNotice(versionFilter, "VIGENTE"), status: "success" });
            } else {
                await api.retireVersion(confirmAction.plan.id, confirmAction.version.id);
                toast({ title: "Versión retirada", description: "Los expedientes existentes conservan su versión congelada." + planVersionFilterNotice(versionFilter, "RETIRADA"), status: "success" });
            }
            setConfirmAction(null);
            await loadPage(query);
        } catch (error) {
            toast({ title: "No fue posible cambiar la versión", description: apiFailureDetail(error, "Error de operación.").message, status: "error" });
        } finally {
            setSaving(false);
        }
    };

    const activeCatalogsByDimension = useMemo(() => new Map(magnitudes.map((item) => [item.id, item.dimension])), [magnitudes]);
    const busy = loading || saving || catalogLoading || fetchingVersion || checkingCode;
    const listBusy = busy || Boolean(loadError);
    const applicability = draft.aplicabilidades[0];

    const clearLocation = (): Partial<AplicabilidadPlanControl> => ({
        areaOperativaId: null,
        areaOperativaNombre: null,
        procesoProduccionId: null,
        procesoProduccionNombre: null,
        frontendNodeId: null,
        ubicacionGraficaConfirmada: false,
    });

    const selectedTargetProducts = useMemo<ControlProductOption[]>(() => applicability?.productoId ? [{
        productoId: applicability.productoId,
        nombre: applicability.productoNombre || applicability.productoId,
        tipoProducto: applicability.tipoOrden === "OF" ? "S" : "T",
        categoriaId: applicability.categoriaId,
        categoriaNombre: applicability.categoriaNombre,
    }] : [], [
        applicability?.categoriaId,
        applicability?.categoriaNombre,
        applicability?.productoId,
        applicability?.productoNombre,
        applicability?.tipoOrden,
    ]);

    return (
        <VStack align="stretch" gap={5}>
            <Box>
                <Heading size="md">Planes de {CONTROL_NOUN[api.ambito].plural}</Heading>
                <Text color="fg.muted" mt={1}>
                    {api.ambito === "PROCESO"
                        ? "Ubique cada medición dentro de la operación que necesita observar o ajustar."
                        : "Ubique cada ensayo en la salida que Calidad debe evaluar."}
                </Text>
            </Box>

            <HStack align="end" gap={3} flexWrap="wrap">
                <Field.Root flex="1" minW={{ base: "full", md: "280px" }}>
                    <Field.Label>Buscar plan</Field.Label>
                    <Input ref={searchRef} value={search} disabled={busy} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && searchPlans()} placeholder="Código o nombre" />
                </Field.Root>
                <Button onClick={searchPlans} loading={loading} disabled={busy}>Buscar</Button>
                <Field.Root w={{ base: "full", md: "190px" }}>
                    <Field.Label>Estado de la versión</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field value={versionFilter} disabled={busy} onChange={(event) => changeFilter(event.target.value as PlanVersionFilter)}>
                            {PLAN_VERSION_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>
                <Field.Root w={{ base: "full", md: "140px" }}>
                    <Field.Label>Planes por página</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field value={query.size} disabled={busy} onChange={(event) => void loadPage({ ...query, size: Number(event.target.value), page: 0 })}>
                            {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>
                {nivel >= 3 && <CatalogosControlDialog magnitudes={magnitudes} unidades={unidades} canManage onRefresh={loadCatalogs} />}
                {nivel >= 2 && <Button colorPalette="teal" disabled={listBusy} onClick={startNew}><LuPlus />Nuevo plan</Button>}
            </HStack>

            {loadError && (
                <Alert.Root status="error">
                    <Alert.Indicator />
                    <Box>
                        <Text fontWeight="semibold">No fue posible actualizar el listado</Text>
                        <Text fontSize="sm">{loadError}</Text>
                        <Text fontSize="sm">Pulse Buscar para reintentar la consulta.</Text>
                    </Box>
                </Alert.Root>
            )}

            <Box borderWidth="1px" borderRadius="lg" overflowX="auto">
                <PlanVersionList
                    plans={plans}
                    nivel={nivel}
                    busy={listBusy}
                    onDetail={(plan, version, trigger) => {
                        detailTriggerRef.current = trigger;
                        void openVersion(plan, version);
                    }}
                    onEdit={(plan, version) => void openVersion(plan, version, true)}
                    onPublish={(plan, version) => setConfirmAction({ kind: "PUBLICAR", plan, version })}
                    onRetire={(plan, version) => setConfirmAction({ kind: "RETIRAR", plan, version })}
                    onShowDraft={(plan, trigger) => {
                        if (!plan.borrador) return;
                        detailTriggerRef.current = trigger;
                        void openVersion(plan, plan.borrador);
                    }}
                />
                {!loading && !loadError && !plans.length && (
                    <Text py={8} textAlign="center" color="fg.muted">
                        {appliedSearch || versionFilter !== "TODAS"
                            ? "No hay versiones que coincidan con la búsqueda y el estado seleccionados."
                            : "No hay planes registrados para este ámbito."}
                    </Text>
                )}
                {loading && <HStack justify="center" py={8}><Spinner size="sm" /><Text>Cargando planes…</Text></HStack>}
            </Box>

            {result && (
                <HStack justify="space-between" flexWrap="wrap" gap={3}>
                    <Text fontSize="sm" color="fg.muted" aria-live="polite">
                        {result.totalElements} {result.totalElements === 1 ? "plan encontrado" : "planes encontrados"}
                    </Text>
                    <HStack>
                        <Button size="sm" variant="outline" disabled={listBusy || result.number === 0} onClick={() => void loadPage({ ...query, page: result.number - 1 })}>Anterior</Button>
                        <Text fontSize="sm">Página {result.number + 1} de {Math.max(1, result.totalPages)}</Text>
                        <Button size="sm" variant="outline" disabled={listBusy || result.number + 1 >= result.totalPages} onClick={() => void loadPage({ ...query, page: result.number + 1 })}>Siguiente</Button>
                    </HStack>
                </HStack>
            )}
            {fetchingVersion && <HStack role="status"><Spinner size="sm" /><Text>Cargando configuración de la versión…</Text></HStack>}

            <PlanVersionDetailDialog
                plan={detailSelection?.plan}
                version={detailSelection?.version}
                onClose={() => setDetailSelection(null)}
                finalFocusEl={() => detailTriggerRef.current?.isConnected ? detailTriggerRef.current : searchRef.current}
            />

            {nivel >= 2 && editorOpen && (
                <Box ref={editorRef} tabIndex={-1} borderWidth="1px" borderRadius="lg" p={{ base: 3, md: 5 }}>
                    <HStack justify="space-between" align="start" mb={5} flexWrap="wrap">
                        <Box><Heading size="sm">{editingPlanId ? "Borrador de nueva versión" : "Nuevo plan"}</Heading><Text fontSize="sm" color="fg.muted">La versión publicada será inmutable.</Text></Box>
                        <Badge colorPalette={api.ambito === "PROCESO" ? "blue" : "purple"}>{CONTROL_SCOPE_LABEL[api.ambito]}</Badge>
                    </HStack>
                    <Box overflowX="auto" pb={3}>
                        <Steps.Root step={step} count={steps.length} colorPalette="teal" size="sm" minW="720px">
                            <Steps.List>{steps.map((item, index) => <Steps.Item key={item.title} index={index}><Steps.Indicator><Steps.Status complete={<LuCheck />} incomplete={<Steps.Number />} current={<Steps.Number />} /></Steps.Indicator><Box flexShrink={0}><Steps.Title>{item.title}</Steps.Title><Steps.Description>{item.description}</Steps.Description></Box><Steps.Separator /></Steps.Item>)}</Steps.List>
                        </Steps.Root>
                    </Box>

                    {validationErrors.length > 0 && <Alert.Root status="error" mb={4}><Alert.Indicator /><Box><Text fontWeight="semibold">Revise el borrador</Text>{validationErrors.map((error) => <Text key={error} fontSize="sm">• {error}</Text>)}</Box></Alert.Root>}

                    {step === 0 && <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                        <PlanValidationField field="codigo" issues={validationIssues} disabled={checkingCode || saving} required readOnly={editingPlanId != null}><Field.Label>Código</Field.Label><Input value={draft.codigo} readOnly={editingPlanId != null} bg={editingPlanId != null ? "bg.subtle" : undefined} onChange={(event) => setDraft((current) => ({ ...current, codigo: event.target.value }))} placeholder="CP-PESO-ENVASE" maxLength={60} />{editingPlanId != null && <Field.HelperText>La identidad del plan es inmutable.</Field.HelperText>}</PlanValidationField>
                        <PlanValidationField field="nombre" issues={validationIssues} disabled={checkingCode || saving} required readOnly={editingPlanId != null}><Field.Label>Nombre</Field.Label><Input value={draft.nombre} readOnly={editingPlanId != null} bg={editingPlanId != null ? "bg.subtle" : undefined} onChange={(event) => setDraft((current) => ({ ...current, nombre: event.target.value }))} maxLength={160} /></PlanValidationField>
                        <PlanValidationField field="motivoCambio" issues={validationIssues} disabled={checkingCode || saving} required={changeReasonRequired} gridColumn={{ md: "1 / -1" }}><Field.Label>Motivo del cambio</Field.Label><Textarea value={draft.motivoCambio ?? ""} onChange={(event) => setDraft((current) => ({ ...current, motivoCambio: event.target.value }))} placeholder={changeReasonRequired ? "Explique por qué se crea esta versión" : "Opcional para la versión inicial"} maxLength={500} />{changeReasonRequired && <Field.HelperText>Obligatorio para publicar una versión v2 o posterior.</Field.HelperText>}</PlanValidationField>
                    </Grid>}

                    {step === 1 && (
                        <VStack align="stretch" gap={4}>
                            {applicability && (
                                <Box borderWidth="1px" borderRadius="md" p={4}>
                                    <Box mb={4}>
                                        <Text fontWeight="semibold">Aplicación y ubicación</Text>
                                        <Text fontSize="sm" color="fg.muted">
                                            Cada plan corresponde a una sola ubicación de la ruta.
                                        </Text>
                                    </Box>
                                    <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={3}>
                                        <Field.Root required>
                                            <Field.Label>Aplica por</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field
                                                    value={applicability.productoId != null ? "PRODUCTO" : "CATEGORIA"}
                                                    onChange={(event) => updateApplicability(0, event.target.value === "PRODUCTO"
                                                        ? {
                                                            productoId: "",
                                                            productoNombre: null,
                                                            categoriaId: null,
                                                            categoriaNombre: null,
                                                            productosExcluidosIds: [],
                                                            productosExcluidos: [],
                                                            ...clearLocation(),
                                                        }
                                                        : {
                                                            productoId: null,
                                                            productoNombre: null,
                                                            categoriaId: null,
                                                            categoriaNombre: null,
                                                            productosExcluidosIds: [],
                                                            productosExcluidos: [],
                                                            ...clearLocation(),
                                                        })}
                                                >
                                                    <option value="PRODUCTO">Producto específico</option>
                                                    <option value="CATEGORIA">Categoría</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>

                                        {applicability.productoId != null ? (
                                            <PlanValidationField field="destino" issues={validationIssues} required>
                                                <Field.Label>Producto</Field.Label>
                                                <VStack align="stretch" gap={2}>
                                                    <Box borderWidth="1px" borderRadius="md" px={3} py={2} minH="40px">
                                                        {applicability.productoId ? (
                                                            <Box>
                                                                <Text fontWeight="semibold">{applicability.productoNombre || applicability.productoId}</Text>
                                                                <Text fontSize="sm" color="fg.muted">{applicability.productoId}</Text>
                                                            </Box>
                                                        ) : <Text color="fg.muted">Ningún producto seleccionado</Text>}
                                                    </Box>
                                                    <Button size="sm" variant="outline" onClick={() => setProductPickerMode("SINGLE")}>
                                                        {applicability.productoId ? "Cambiar producto" : "Seleccionar producto"}
                                                    </Button>
                                                </VStack>
                                            </PlanValidationField>
                                        ) : (
                                            <PlanValidationField field="destino" issues={validationIssues} required>
                                                <Field.Label>Categoría</Field.Label>
                                                <NativeSelect.Root>
                                                    <NativeSelect.Field
                                                        value={applicability.categoriaId ?? ""}
                                                        onChange={(event) => {
                                                            const categoryId = idOrNull(event.target.value);
                                                            const category = categorias.find((item) => item.categoriaId === categoryId);
                                                            updateApplicability(0, {
                                                                categoriaId: categoryId,
                                                                categoriaNombre: category?.categoriaNombre ?? null,
                                                                tipoOrden: categoryId == null ? "AMBAS" : "OP",
                                                                productosExcluidosIds: [],
                                                                productosExcluidos: [],
                                                                ...clearLocation(),
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Seleccionar</option>
                                                        {categorias.map((category) => (
                                                            <option key={category.categoriaId} value={category.categoriaId}>
                                                                {category.categoriaNombre}
                                                            </option>
                                                        ))}
                                                    </NativeSelect.Field>
                                                    <NativeSelect.Indicator />
                                                </NativeSelect.Root>
                                            </PlanValidationField>
                                        )}

                                        {applicability.productoId == null && (
                                            <Field.Root disabled={applicability.categoriaId == null}>
                                                <Field.Label>Productos excluidos (opcional)</Field.Label>
                                                <VStack align="stretch" gap={2}>
                                                    <Box borderWidth="1px" borderRadius="md" px={3} py={2} minH="40px">
                                                        {(applicability.productosExcluidos ?? []).length ? (
                                                            <VStack align="stretch" gap={2}>
                                                                {(applicability.productosExcluidos ?? []).map((product) => (
                                                                    <HStack key={product.productoId} justify="space-between" gap={2}>
                                                                        <Text fontSize="sm">
                                                                            <Text as="span" fontWeight="semibold">{product.nombre}</Text>
                                                                            <Text as="span" color="fg.muted"> · {product.productoId}</Text>
                                                                        </Text>
                                                                        <IconButton
                                                                            aria-label={`Quitar ${product.nombre} de las exclusiones`}
                                                                            size="xs"
                                                                            variant="ghost"
                                                                            onClick={() => {
                                                                                const products = (applicability.productosExcluidos ?? [])
                                                                                    .filter((item) => item.productoId !== product.productoId);
                                                                                updateApplicability(0, {
                                                                                    productosExcluidos: products,
                                                                                    productosExcluidosIds: products.map((item) => item.productoId),
                                                                                });
                                                                            }}
                                                                        ><LuTrash2 /></IconButton>
                                                                    </HStack>
                                                                ))}
                                                            </VStack>
                                                        ) : <Text color="fg.muted">Sin exclusiones</Text>}
                                                    </Box>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={applicability.categoriaId == null}
                                                        onClick={() => setProductPickerMode("MULTIPLE")}
                                                    >Seleccionar exclusiones</Button>
                                                    <Field.HelperText>
                                                        Este plan no se asignará a esos productos de la categoría.
                                                    </Field.HelperText>
                                                </VStack>
                                            </Field.Root>
                                        )}

                                        <Box gridColumn={{ md: "1 / -1" }} data-plan-field="ubicacion" tabIndex={-1}>
                                            <VStack align="stretch" gap={3}>
                                                {validationIssues.filter((issue) => issue.step === 1 && issue.field === "ubicacion").map((issue) => (
                                                    <Text key={issue.message} color="fg.error" fontSize="sm">{issue.message}</Text>
                                                ))}
                                                <ControlPointRoutePicker
                                                    ambito={api.ambito}
                                                    productoId={applicability.productoId}
                                                    categoriaId={applicability.categoriaId}
                                                    categoriaNombre={applicability.categoriaNombre}
                                                    selectedPoint={applicability.ubicacionGraficaConfirmada ? {
                                                        puntoAplicacion: applicability.puntoAplicacion,
                                                        areaOperativaId: applicability.areaOperativaId ?? null,
                                                        procesoProduccionId: applicability.procesoProduccionId ?? null,
                                                        frontendNodeId: applicability.frontendNodeId ?? null,
                                                    } : null}
                                                    onConfirm={(selection) => updateApplicability(0, {
                                                        puntoAplicacion: selection.puntoAplicacion,
                                                        tipoOrden: selection.tipoOrden,
                                                        areaOperativaId: selection.areaOperativaId,
                                                        areaOperativaNombre: selection.areaOperativaNombre,
                                                        procesoProduccionId: selection.procesoProduccionId,
                                                        procesoProduccionNombre: selection.procesoProduccionNombre,
                                                        frontendNodeId: selection.frontendNodeId,
                                                        ubicacionGraficaConfirmada: true,
                                                        ...inferredPolicy(
                                                            api.ambito,
                                                            selection.puntoAplicacion,
                                                            applicability.puntoExigencia !== "INFORMATIVO",
                                                        ),
                                                    })}
                                                />
                                                <Alert.Root status={applicability.ubicacionGraficaConfirmada ? "success" : "warning"}>
                                                    <Alert.Indicator />
                                                    <Alert.Content>
                                                        <Alert.Title>{applicability.ubicacionGraficaConfirmada ? "Ubicación seleccionada" : "Ubicación pendiente"}</Alert.Title>
                                                        <Alert.Description>{locationLabel(applicability, api.ambito)}</Alert.Description>
                                                    </Alert.Content>
                                                </Alert.Root>
                                                {api.ambito === "CALIDAD" ? (
                                                    <Checkbox.Root
                                                        checked={applicability.puntoExigencia !== "INFORMATIVO"}
                                                        disabled={!applicability.ubicacionGraficaConfirmada}
                                                        onCheckedChange={({ checked }) => updateApplicability(0, {
                                                            ...inferredPolicy(api.ambito, applicability.puntoAplicacion, checked === true),
                                                        })}
                                                    >
                                                        <Checkbox.HiddenInput />
                                                        <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                                        <Checkbox.Label>
                                                            {applicability.puntoAplicacion === "LOTE_FINAL"
                                                                ? "Impedir la liberación mientras el ensayo esté pendiente o no cumpla"
                                                                : "Impedir continuar a la siguiente operación mientras el ensayo esté pendiente o no cumpla"}
                                                        </Checkbox.Label>
                                                    </Checkbox.Root>
                                                ) : (
                                                    <Text fontSize="sm" color="fg.muted">
                                                        Este control es informativo: registra resultados para ajustar el proceso y no detiene la ruta.
                                                    </Text>
                                                )}
                                            </VStack>
                                        </Box>
                                    </Grid>
                                </Box>
                            )}
                        </VStack>
                    )}

                    {step === 2 && <VStack align="stretch" gap={4} data-plan-field="caracteristicas" tabIndex={-1}>{draft.caracteristicas.map((characteristic, index) => {
                        const dimension = characteristic.magnitudId ? activeCatalogsByDimension.get(characteristic.magnitudId) : undefined;
                        const compatibleUnits = unidades.filter((unit) => unit.activo && (!dimension || unit.dimension === dimension));
                        return <Box key={index} borderWidth="1px" borderRadius="md" p={4}><HStack justify="space-between" mb={3}><Text fontWeight="semibold">Medición {index + 1}</Text><IconButton aria-label={`Eliminar medición ${index + 1}`} size="sm" variant="ghost" disabled={draft.caracteristicas.length === 1} onClick={() => setDraft((current) => ({ ...current, caracteristicas: current.caracteristicas.filter((_, position) => position !== index).map((item, position) => ({ ...item, orden: position + 1 })) }))}><LuTrash2 /></IconButton></HStack><Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3}>
                            <PlanValidationField field={`caracteristicas.${index}.nombre`} issues={validationIssues} required><Field.Label>Nombre de la medición</Field.Label><Input value={characteristic.nombre} onChange={(event) => updateCharacteristic(index, { nombre: event.target.value })} maxLength={120} /></PlanValidationField>
                            <PlanValidationField field={`caracteristicas.${index}.tipo`} issues={validationIssues} required><Field.Label>Tipo</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.tipo} onChange={(event) => { const type = event.target.value as CaracteristicaPlanControl["tipo"]; updateCharacteristic(index, type === "NUMERICA" ? { tipo: type, valorBooleanoEsperado: null } : { tipo: type, escala: 0, unidadId: null, objetivo: null, limiteInferior: null, limiteSuperior: null }); }}><option value="NUMERICA">Numérica</option><option value="BOOLEANA">Booleana</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></PlanValidationField>
                            <PlanValidationField field={`caracteristicas.${index}.magnitudId`} issues={validationIssues} required><Field.Label>Magnitud</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.magnitudId ?? ""} onChange={(event) => updateCharacteristic(index, { magnitudId: idOrNull(event.target.value), unidadId: null })}><option value="">Seleccionar</option>{magnitudes.filter((item) => item.activo).map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.dimension}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></PlanValidationField>
                            {characteristic.tipo === "NUMERICA" ? <><PlanValidationField field={`caracteristicas.${index}.unidadId`} issues={validationIssues} required><Field.Label>Unidad</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.unidadId ?? ""} onChange={(event) => updateCharacteristic(index, { unidadId: idOrNull(event.target.value) })}><option value="">Seleccionar</option>{compatibleUnits.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.simbolo})</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></PlanValidationField><PlanValidationField field={`caracteristicas.${index}.objetivo`} issues={validationIssues}><Field.Label>Objetivo</Field.Label><Input inputMode="decimal" value={characteristic.objetivo ?? ""} onChange={(event) => updateCharacteristic(index, { objetivo: decimalOrNull(event.target.value) })} /></PlanValidationField><PlanValidationField field={`caracteristicas.${index}.limiteInferior`} issues={validationIssues}><Field.Label>Límite inferior</Field.Label><Input inputMode="decimal" value={characteristic.limiteInferior ?? ""} onChange={(event) => updateCharacteristic(index, { limiteInferior: decimalOrNull(event.target.value) })} /></PlanValidationField><PlanValidationField field={`caracteristicas.${index}.limiteSuperior`} issues={validationIssues}><Field.Label>Límite superior</Field.Label><Input inputMode="decimal" value={characteristic.limiteSuperior ?? ""} onChange={(event) => updateCharacteristic(index, { limiteSuperior: decimalOrNull(event.target.value) })} /></PlanValidationField><PlanValidationField field={`caracteristicas.${index}.escala`} issues={validationIssues} required><Field.Label>Decimales visibles</Field.Label><Input type="number" min={0} max={8} value={Number.isFinite(characteristic.escala) ? characteristic.escala : ""} onChange={(event) => updateCharacteristic(index, { escala: event.target.value === "" ? Number.NaN : Number(event.target.value) })} /></PlanValidationField></> : <PlanValidationField field={`caracteristicas.${index}.valorBooleanoEsperado`} issues={validationIssues} required><Field.Label>Valor esperado</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.valorBooleanoEsperado == null ? "" : String(characteristic.valorBooleanoEsperado)} onChange={(event) => updateCharacteristic(index, { valorBooleanoEsperado: event.target.value === "" ? null : event.target.value === "true" })}><option value="">Seleccionar</option><option value="true">Sí / verdadero</option><option value="false">No / falso</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></PlanValidationField>}
                            <PlanValidationField field={`caracteristicas.${index}.cantidadMuestras`} issues={validationIssues} required><Field.Label>Muestras</Field.Label><Input type="number" min={1} value={characteristic.cantidadMuestras} onChange={(event) => updateCharacteristic(index, { cantidadMuestras: Number(event.target.value) })} /></PlanValidationField><PlanValidationField field={`caracteristicas.${index}.unidadesPorMuestra`} issues={validationIssues} required><Field.Label>Unidades por muestra</Field.Label><Input type="number" min={1} value={characteristic.unidadesPorMuestra} onChange={(event) => updateCharacteristic(index, { unidadesPorMuestra: Number(event.target.value) })} /></PlanValidationField>
                        </Grid></Box>;
                    })}<Button alignSelf="start" size="sm" variant="outline" onClick={() => setDraft((current) => ({ ...current, caracteristicas: [...current.caracteristicas, newCharacteristic(current.caracteristicas.length + 1)] }))}><LuPlus />Agregar medición</Button></VStack>}

                    <HStack justify="space-between" mt={6} flexWrap="wrap">
                        <Button variant="outline" disabled={step === 0 || saving} onClick={() => setStep(step === 2 ? 1 : 0)}>Anterior</Button>
                        <HStack>
                            <Button variant="ghost" disabled={saving} onClick={closeEditor}>Cancelar</Button>
                            {step < steps.length - 1
                                ? <Button colorPalette="teal" disabled={listBusy} loading={checkingCode} onClick={() => void nextStep()}>Siguiente</Button>
                                : <Button colorPalette="teal" disabled={listBusy} loading={saving} onClick={() => void save()}>Guardar borrador</Button>}
                        </HStack>
                    </HStack>
                </Box>
            )}

            <Dialog.Root open={confirmAction != null} onOpenChange={({ open }) => !open && !saving && setConfirmAction(null)}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header><Dialog.Title>{confirmAction?.kind === "PUBLICAR" ? "Publicar versión" : "Retirar versión"}</Dialog.Title></Dialog.Header>
                            <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar confirmación" size="sm" disabled={saving} /></Dialog.CloseTrigger>
                            <Dialog.Body>
                                <Text>{confirmAction?.kind === "PUBLICAR" ? "La versión quedará inmutable y se aplicará únicamente a lotes futuros." : "Los expedientes existentes conservarán esta versión congelada, pero no se asignará a lotes futuros."}</Text>
                                <Text mt={2} fontWeight="semibold">{confirmAction?.plan.codigo} · versión {confirmAction?.version.numero}</Text>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button variant="ghost" disabled={saving} onClick={() => setConfirmAction(null)}>Cancelar</Button>
                                <Button colorPalette={confirmAction?.kind === "PUBLICAR" ? "teal" : "orange"} disabled={listBusy} loading={saving} onClick={() => void confirmVersionAction()}>Confirmar</Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {applicability && productPickerMode && (
                <ControlProductPickerDialog
                    open
                    mode={productPickerMode}
                    categoriaId={productPickerMode === "MULTIPLE" ? applicability.categoriaId : undefined}
                    selectedProducts={productPickerMode === "SINGLE"
                        ? selectedTargetProducts
                        : applicability.productosExcluidos ?? []}
                    onClose={() => setProductPickerMode(null)}
                    onConfirm={(products) => {
                        if (productPickerMode === "SINGLE") {
                            const product = products[0];
                            if (!product) return;
                            updateApplicability(0, {
                                productoId: product.productoId,
                                productoNombre: product.nombre,
                                tipoOrden: product.tipoProducto === "S" ? "OF" : "OP",
                                ...clearLocation(),
                            });
                            return;
                        }
                        updateApplicability(0, {
                            productosExcluidos: products,
                            productosExcluidosIds: products.map((product) => product.productoId),
                        });
                    }}
                />
            )}
        </VStack>
    );
}
