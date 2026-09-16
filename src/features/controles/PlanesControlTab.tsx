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
    Table,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { LuCheck, LuPlus, LuTrash2 } from "react-icons/lu";

import { useAppToast } from "../../components/ui/use-app-toast";
import CatalogosControlDialog from "./CatalogosControlDialog";
import ControlProductPickerDialog from "./ControlProductPickerDialog";
import { apiFailureDetail, listControlCategories, listMagnitudes, listUnidades, type ControlDomainApi } from "./api";
import { CONTROL_NOUN, CONTROL_SCOPE_LABEL } from "./controlUi";
import ControlPointRoutePicker from "./QualityControlPointRoutePicker";
import StatusBadge from "./StatusBadge";
import type {
    AplicabilidadPlanControl,
    CaracteristicaPlanControl,
    CatalogoMagnitud,
    CatalogoUnidad,
    CategoriaControlOption,
    ControlProductOption,
    PlanControl,
    PlanControlWrite,
    VersionPlanControl,
} from "./types";

interface PlanesControlTabProps {
    api: ControlDomainApi;
    nivel: number;
}

interface ConfirmAction {
    kind: "PUBLICAR" | "RETIRAR";
    plan: PlanControl;
    version: VersionPlanControl;
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

function versionToDraft(plan: PlanControl, version: VersionPlanControl): PlanControlWrite {
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

function validDecimal(value: string) {
    if (!/^-?\d+(?:\.\d+)?$/.test(value)) return false;
    const unsigned = value.startsWith("-") ? value.slice(1) : value;
    const [integer, fraction = ""] = unsigned.split(".");
    return integer.length <= 12 && fraction.length <= 8;
}

function compareDecimal(left: string, right: string) {
    const scaled = (value: string) => {
        const negative = value.startsWith("-");
        const unsigned = negative ? value.slice(1) : value;
        const [integer, fraction = ""] = unsigned.split(".");
        const absolute = BigInt(`${integer}${fraction.padEnd(8, "0")}`);
        return negative ? -absolute : absolute;
    };
    const difference = scaled(left) - scaled(right);
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
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

function validateDraft(draft: PlanControlWrite, ambito: ControlDomainApi["ambito"], changeReasonRequired: boolean): string[] {
    const errors: string[] = [];
    if (!draft.codigo.trim()) errors.push("El código del plan es obligatorio.");
    if (!draft.nombre.trim()) errors.push("El nombre del plan es obligatorio.");
    if (changeReasonRequired && !draft.motivoCambio?.trim()) errors.push("El motivo del cambio es obligatorio para una nueva versión.");
    if (draft.aplicabilidades.length !== 1) errors.push("El plan debe tener exactamente una aplicación y una ubicación.");
    if (!draft.caracteristicas.length) errors.push("Debe existir al menos una medición.");
    draft.aplicabilidades.forEach((rule, index) => {
        const prefix = draft.aplicabilidades.length === 1 ? "Aplicación" : `Aplicación ${index + 1}`;
        if (!rule.productoId && !rule.categoriaId) errors.push(`${prefix}: seleccione un producto o una categoría.`);
        if (rule.productoId && rule.categoriaId) errors.push(`${prefix}: producto y categoría son mutuamente excluyentes.`);
        if (rule.puntoAplicacion === "SALIDA_OPERACION" && (!rule.areaOperativaId || !rule.procesoProduccionId)) {
            errors.push(`${prefix}: una salida de operación exige área y proceso maestro.`);
        }
        if (!rule.ubicacionGraficaConfirmada) {
            errors.push(`${prefix}: seleccione gráficamente ${ambito === "PROCESO" ? "la operación" : "la salida"} donde se realizará el control.`);
        }
        if (ambito === "PROCESO" && (rule.puntoAplicacion !== "SALIDA_OPERACION"
            || rule.momentoEjecucion !== "DURANTE_FABRICACION"
            || rule.puntoExigencia !== "INFORMATIVO")) {
            errors.push(`${prefix}: un control de proceso debe ubicarse en una operación y siempre es informativo.`);
        }
    });
    draft.caracteristicas.forEach((characteristic, index) => {
        const prefix = `Medición ${index + 1}`;
        if (!characteristic.nombre.trim()) errors.push(`${prefix}: el nombre es obligatorio.`);
        if (!characteristic.magnitudId) errors.push(`${prefix}: la magnitud es obligatoria.`);
        if (characteristic.cantidadMuestras < 1 || characteristic.unidadesPorMuestra < 1) errors.push(`${prefix}: el muestreo debe ser mayor que cero.`);
        if (characteristic.tipo === "NUMERICA") {
            if (!characteristic.unidadId) errors.push(`${prefix}: la unidad es obligatoria.`);
            if (characteristic.escala < 0 || characteristic.escala > 8) errors.push(`${prefix}: la escala debe estar entre 0 y 8.`);
            if (characteristic.limiteInferior == null && characteristic.limiteSuperior == null) errors.push(`${prefix}: configure al menos un límite.`);
            const decimals = [characteristic.objetivo, characteristic.limiteInferior, characteristic.limiteSuperior].filter((value): value is string => value != null);
            if (decimals.some((value) => !validDecimal(value))) errors.push(`${prefix}: objetivo y límites admiten hasta 12 dígitos enteros y 8 decimales.`);
            if (decimals.every(validDecimal)) {
                if (characteristic.limiteInferior != null && characteristic.limiteSuperior != null
                    && compareDecimal(characteristic.limiteInferior, characteristic.limiteSuperior) > 0) errors.push(`${prefix}: el límite inferior no puede superar al superior.`);
                if (characteristic.objetivo != null && characteristic.limiteInferior != null
                    && compareDecimal(characteristic.objetivo, characteristic.limiteInferior) < 0) errors.push(`${prefix}: el objetivo está bajo el límite inferior.`);
                if (characteristic.objetivo != null && characteristic.limiteSuperior != null
                    && compareDecimal(characteristic.objetivo, characteristic.limiteSuperior) > 0) errors.push(`${prefix}: el objetivo supera el límite superior.`);
            }
        } else if (characteristic.valorBooleanoEsperado == null) {
            errors.push(`${prefix}: indique el valor booleano esperado.`);
        }
    });
    return errors;
}

export default function PlanesControlTab({ api, nivel }: PlanesControlTabProps) {
    const toast = useAppToast();
    const [plans, setPlans] = useState<PlanControl[]>([]);
    const [magnitudes, setMagnitudes] = useState<CatalogoMagnitud[]>([]);
    const [unidades, setUnidades] = useState<CatalogoUnidad[]>([]);
    const [categorias, setCategorias] = useState<CategoriaControlOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [step, setStep] = useState(0);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<number | undefined>();
    const [changeReasonRequired, setChangeReasonRequired] = useState(false);
    const [draft, setDraft] = useState<PlanControlWrite>(() => defaultsFor(api.ambito));
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
    const [productPickerMode, setProductPickerMode] = useState<"SINGLE" | "MULTIPLE" | null>(null);

    const loadCatalogs = async () => {
        const [nextMagnitudes, nextUnits] = await Promise.all([listMagnitudes(true), listUnidades(true)]);
        setMagnitudes(nextMagnitudes);
        setUnidades(nextUnits);
    };

    const load = async () => {
        setLoading(true);
        try {
            const [nextPlans] = await Promise.all([api.listPlanes({ search: search.trim() || undefined }), loadCatalogs()]);
            setPlans(nextPlans);
        } catch (error) {
            toast({ title: "No fue posible cargar los planes", description: apiFailureDetail(error, "Error de consulta.").message, status: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        Promise.all([api.listPlanes(), listMagnitudes(true), listUnidades(true), listControlCategories()])
            .then(([nextPlans, nextMagnitudes, nextUnits, nextCategories]) => {
                if (!mounted) return;
                setPlans(nextPlans);
                setMagnitudes(nextMagnitudes);
                setUnidades(nextUnits);
                setCategorias(nextCategories);
            })
            .catch((error) => {
                if (!mounted) return;
                toast({ title: "No fue posible cargar los planes", description: apiFailureDetail(error, "Error de consulta.").message, status: "error" });
            })
            .finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [api, toast]);

    const startNew = () => {
        setEditingPlanId(undefined);
        setChangeReasonRequired(false);
        setDraft(defaultsFor(api.ambito));
        setValidationErrors([]);
        setStep(0);
        setEditorOpen(true);
    };

    const editPlan = (plan: PlanControl) => {
        const source = plan.versiones.find((version) => version.estado === "BORRADOR")
            ?? plan.versiones.find((version) => version.estado === "VIGENTE")
            ?? plan.versiones[0];
        if (!source) return;
        setEditingPlanId(plan.id);
        setChangeReasonRequired(source.numero > 1 || source.estado !== "BORRADOR");
        setDraft(versionToDraft(plan, source));
        setValidationErrors([]);
        setStep(0);
        setEditorOpen(true);
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

    const save = async () => {
        const errors = validateDraft(draft, api.ambito, changeReasonRequired);
        setValidationErrors(errors);
        if (errors.length) return;
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
            toast({ title: "Borrador guardado", description: "La versión continúa editable hasta su publicación.", status: "success" });
            await load();
            setEditorOpen(false);
        } catch (error) {
            const detail = apiFailureDetail(error, "No fue posible guardar el borrador.");
            setValidationErrors([detail.message, ...detail.bloqueos]);
        } finally {
            setSaving(false);
        }
    };

    const confirmVersionAction = async () => {
        if (!confirmAction) return;
        setSaving(true);
        try {
            if (confirmAction.kind === "PUBLICAR") {
                await api.publishVersion(confirmAction.plan.id, confirmAction.version.id);
                toast({ title: "Versión publicada", description: "Solo los lotes futuros resolverán esta versión.", status: "success" });
            } else {
                await api.retireVersion(confirmAction.plan.id, confirmAction.version.id);
                toast({ title: "Versión retirada", description: "Los expedientes existentes conservan su versión congelada.", status: "success" });
            }
            setConfirmAction(null);
            await load();
        } catch (error) {
            toast({ title: "No fue posible cambiar la versión", description: apiFailureDetail(error, "Error de operación.").message, status: "error" });
        } finally {
            setSaving(false);
        }
    };

    const activeCatalogsByDimension = useMemo(() => new Map(magnitudes.map((item) => [item.id, item.dimension])), [magnitudes]);
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
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} placeholder="Código o nombre" />
                </Field.Root>
                <Button onClick={() => void load()} loading={loading}>Buscar</Button>
                {nivel >= 3 && <CatalogosControlDialog magnitudes={magnitudes} unidades={unidades} canManage onRefresh={loadCatalogs} />}
                {nivel >= 2 && <Button colorPalette="teal" onClick={startNew}><LuPlus />Nuevo plan</Button>}
            </HStack>

            <Box borderWidth="1px" borderRadius="lg" overflowX="auto">
                <Table.Root size="sm" minW="680px">
                    <Table.Header><Table.Row><Table.ColumnHeader>Plan</Table.ColumnHeader><Table.ColumnHeader>Versiones</Table.ColumnHeader><Table.ColumnHeader>Configuración vigente</Table.ColumnHeader><Table.ColumnHeader /></Table.Row></Table.Header>
                    <Table.Body>{plans.map((plan) => {
                        const current = plan.versiones.find((version) => version.estado === "VIGENTE");
                        const draftVersion = plan.versiones.find((version) => version.estado === "BORRADOR");
                        return <Table.Row key={plan.id}><Table.Cell><VStack align="start" gap={1}><Text fontWeight="semibold">{plan.codigo}</Text><Text fontSize="sm" color="fg.muted"><Text as="span" fontWeight="semibold" color="fg">Nombre del plan: </Text>{plan.nombre}</Text><Badge size="sm" colorPalette={plan.ambito === "CALIDAD" ? "purple" : "blue"}>Ámbito: {CONTROL_SCOPE_LABEL[plan.ambito]}</Badge></VStack></Table.Cell><Table.Cell><HStack>{current && <StatusBadge status={`VIGENTE · v${current.numero}`} />}{draftVersion && <Badge colorPalette="orange">BORRADOR · v{draftVersion.numero}</Badge>}</HStack></Table.Cell><Table.Cell>{current ? `1 ubicación · ${current.caracteristicas.length} mediciones` : "Sin versión vigente"}</Table.Cell><Table.Cell><HStack justify="flex-end">{nivel >= 2 && <Button size="xs" variant="outline" onClick={() => editPlan(plan)}>{draftVersion ? "Editar borrador" : "Nueva versión"}</Button>}{nivel >= 3 && draftVersion && <Button size="xs" colorPalette="teal" onClick={() => setConfirmAction({ kind: "PUBLICAR", plan, version: draftVersion })}>Publicar</Button>}{nivel >= 3 && current && <Button size="xs" colorPalette="orange" variant="outline" onClick={() => setConfirmAction({ kind: "RETIRAR", plan, version: current })}>Retirar</Button>}</HStack></Table.Cell></Table.Row>;
                    })}</Table.Body>
                </Table.Root>
                {!loading && !plans.length && <Text py={8} textAlign="center" color="fg.muted">No hay planes registrados para este ámbito.</Text>}
                {loading && <HStack justify="center" py={8}><Spinner size="sm" /><Text>Cargando planes…</Text></HStack>}
            </Box>

            {nivel >= 2 && editorOpen && (
                <Box borderWidth="1px" borderRadius="lg" p={{ base: 3, md: 5 }}>
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
                        <Field.Root required readOnly={editingPlanId != null} invalid={!draft.codigo.trim() && validationErrors.length > 0}><Field.Label>Código</Field.Label><Input value={draft.codigo} readOnly={editingPlanId != null} bg={editingPlanId != null ? "bg.subtle" : undefined} onChange={(event) => setDraft((current) => ({ ...current, codigo: event.target.value }))} placeholder="CP-PESO-ENVASE" maxLength={60} />{editingPlanId != null && <Field.HelperText>La identidad del plan es inmutable.</Field.HelperText>}</Field.Root>
                        <Field.Root required readOnly={editingPlanId != null} invalid={!draft.nombre.trim() && validationErrors.length > 0}><Field.Label>Nombre</Field.Label><Input value={draft.nombre} readOnly={editingPlanId != null} bg={editingPlanId != null ? "bg.subtle" : undefined} onChange={(event) => setDraft((current) => ({ ...current, nombre: event.target.value }))} maxLength={160} /></Field.Root>
                        <Field.Root required={changeReasonRequired} gridColumn={{ md: "1 / -1" }}><Field.Label>Motivo del cambio</Field.Label><Textarea value={draft.motivoCambio ?? ""} onChange={(event) => setDraft((current) => ({ ...current, motivoCambio: event.target.value }))} placeholder={changeReasonRequired ? "Explique por qué se crea esta versión" : "Opcional para la versión inicial"} maxLength={500} />{changeReasonRequired && <Field.HelperText>Obligatorio para publicar una versión v2 o posterior.</Field.HelperText>}</Field.Root>
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
                                            <Field.Root required>
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
                                            </Field.Root>
                                        ) : (
                                            <Field.Root required>
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
                                            </Field.Root>
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

                                        <Box gridColumn={{ md: "1 / -1" }}>
                                            <VStack align="stretch" gap={3}>
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

                    {step === 2 && <VStack align="stretch" gap={4}>{draft.caracteristicas.map((characteristic, index) => {
                        const dimension = characteristic.magnitudId ? activeCatalogsByDimension.get(characteristic.magnitudId) : undefined;
                        const compatibleUnits = unidades.filter((unit) => unit.activo && (!dimension || unit.dimension === dimension));
                        return <Box key={index} borderWidth="1px" borderRadius="md" p={4}><HStack justify="space-between" mb={3}><Text fontWeight="semibold">Medición {index + 1}</Text><IconButton aria-label={`Eliminar medición ${index + 1}`} size="sm" variant="ghost" disabled={draft.caracteristicas.length === 1} onClick={() => setDraft((current) => ({ ...current, caracteristicas: current.caracteristicas.filter((_, position) => position !== index).map((item, position) => ({ ...item, orden: position + 1 })) }))}><LuTrash2 /></IconButton></HStack><Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3}>
                            <Field.Root required><Field.Label>Nombre de la medición</Field.Label><Input value={characteristic.nombre} onChange={(event) => updateCharacteristic(index, { nombre: event.target.value })} maxLength={120} /></Field.Root>
                            <Field.Root required><Field.Label>Tipo</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.tipo} onChange={(event) => { const type = event.target.value as CaracteristicaPlanControl["tipo"]; updateCharacteristic(index, type === "NUMERICA" ? { tipo: type, valorBooleanoEsperado: null } : { tipo: type, unidadId: null, objetivo: null, limiteInferior: null, limiteSuperior: null }); }}><option value="NUMERICA">Numérica</option><option value="BOOLEANA">Booleana</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                            <Field.Root required><Field.Label>Magnitud</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.magnitudId ?? ""} onChange={(event) => updateCharacteristic(index, { magnitudId: idOrNull(event.target.value), unidadId: null })}><option value="">Seleccionar</option>{magnitudes.filter((item) => item.activo).map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.dimension}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                            {characteristic.tipo === "NUMERICA" ? <><Field.Root required><Field.Label>Unidad</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.unidadId ?? ""} onChange={(event) => updateCharacteristic(index, { unidadId: idOrNull(event.target.value) })}><option value="">Seleccionar</option>{compatibleUnits.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.simbolo})</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root><Field.Root><Field.Label>Objetivo</Field.Label><Input inputMode="decimal" value={characteristic.objetivo ?? ""} onChange={(event) => updateCharacteristic(index, { objetivo: decimalOrNull(event.target.value) })} /></Field.Root><Field.Root><Field.Label>Límite inferior</Field.Label><Input inputMode="decimal" value={characteristic.limiteInferior ?? ""} onChange={(event) => updateCharacteristic(index, { limiteInferior: decimalOrNull(event.target.value) })} /></Field.Root><Field.Root><Field.Label>Límite superior</Field.Label><Input inputMode="decimal" value={characteristic.limiteSuperior ?? ""} onChange={(event) => updateCharacteristic(index, { limiteSuperior: decimalOrNull(event.target.value) })} /></Field.Root><Field.Root required><Field.Label>Decimales visibles</Field.Label><Input type="number" min={0} max={8} value={characteristic.escala} onChange={(event) => updateCharacteristic(index, { escala: Number(event.target.value) })} /></Field.Root></> : <Field.Root required><Field.Label>Valor esperado</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.valorBooleanoEsperado == null ? "" : String(characteristic.valorBooleanoEsperado)} onChange={(event) => updateCharacteristic(index, { valorBooleanoEsperado: event.target.value === "" ? null : event.target.value === "true" })}><option value="">Seleccionar</option><option value="true">Sí / verdadero</option><option value="false">No / falso</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>}
                            <Field.Root required><Field.Label>Muestras</Field.Label><Input type="number" min={1} value={characteristic.cantidadMuestras} onChange={(event) => updateCharacteristic(index, { cantidadMuestras: Number(event.target.value) })} /></Field.Root><Field.Root required><Field.Label>Unidades por muestra</Field.Label><Input type="number" min={1} value={characteristic.unidadesPorMuestra} onChange={(event) => updateCharacteristic(index, { unidadesPorMuestra: Number(event.target.value) })} /></Field.Root>
                        </Grid></Box>;
                    })}<Button alignSelf="start" size="sm" variant="outline" onClick={() => setDraft((current) => ({ ...current, caracteristicas: [...current.caracteristicas, newCharacteristic(current.caracteristicas.length + 1)] }))}><LuPlus />Agregar medición</Button></VStack>}

                    <HStack justify="space-between" mt={6} flexWrap="wrap"><Button variant="outline" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>Anterior</Button><HStack><Button variant="ghost" onClick={() => setEditorOpen(false)}>Cancelar</Button>{step < steps.length - 1 ? <Button colorPalette="teal" onClick={() => setStep((current) => current + 1)}>Siguiente</Button> : <Button colorPalette="teal" loading={saving} onClick={() => void save()}>Guardar borrador</Button>}</HStack></HStack>
                </Box>
            )}

            <Dialog.Root open={confirmAction != null} onOpenChange={({ open }) => !open && setConfirmAction(null)}>
                <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content><Dialog.Header><Dialog.Title>{confirmAction?.kind === "PUBLICAR" ? "Publicar versión" : "Retirar versión"}</Dialog.Title></Dialog.Header><Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar confirmación" size="sm" /></Dialog.CloseTrigger><Dialog.Body><Text>{confirmAction?.kind === "PUBLICAR" ? "La versión quedará inmutable y se aplicará únicamente a lotes futuros." : "Los expedientes existentes conservarán esta versión congelada, pero no se asignará a lotes futuros."}</Text><Text mt={2} fontWeight="semibold">{confirmAction?.plan.codigo} · versión {confirmAction?.version.numero}</Text></Dialog.Body><Dialog.Footer><Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancelar</Button><Button colorPalette={confirmAction?.kind === "PUBLICAR" ? "teal" : "orange"} loading={saving} onClick={() => void confirmVersionAction()}>Confirmar</Button></Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal>
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
