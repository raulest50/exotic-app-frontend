import {
    Alert,
    Badge,
    Box,
    Button,
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
import ExceptionalRequirementDialog from "./ExceptionalRequirementDialog";
import { apiFailureDetail, listControlCategories, listMagnitudes, listUnidades, type ControlDomainApi } from "./api";
import { CONTROL_NOUN, CONTROL_OWNER_LABEL, CONTROL_SCOPE_LABEL, formatEnumLabel } from "./controlUi";
import QualityControlPointRoutePicker from "./QualityControlPointRoutePicker";
import StatusBadge from "./StatusBadge";
import type {
    AplicabilidadPlanControl,
    CaracteristicaPlanControl,
    CatalogoMagnitud,
    CatalogoUnidad,
    CategoriaControlOption,
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
    { title: "Identificación", description: "Alcance y propósito" },
    { title: "Aplicabilidad", description: "Producto y operación" },
    { title: "Política", description: "Momento y exigencia" },
    { title: "Características", description: "Aceptación y muestreo" },
];

const newApplicability = (): AplicabilidadPlanControl => ({
    productosExcluidosIds: [],
    tipoOrden: "AMBAS",
    puntoAplicacion: "LOTE_FINAL",
    momentoEjecucion: "DURANTE_FABRICACION",
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
    proposito: ambito === "PROCESO" ? "AJUSTE_DE_PROCESO" : "ENSAYO_DE_LIBERACION",
    motivoCambio: "",
    aplicabilidades: [newApplicability()],
    caracteristicas: [newCharacteristic(1)],
});

function versionToDraft(plan: PlanControl, version: VersionPlanControl): PlanControlWrite {
    return {
        codigo: plan.codigo,
        nombre: plan.nombre,
        proposito: version.proposito,
        motivoCambio: version.estado === "BORRADOR" ? version.motivoCambio ?? "" : "",
        aplicabilidades: version.aplicabilidades.map((rule) => ({
            ...rule,
            productosExcluidosIds: [...rule.productosExcluidosIds],
            ubicacionGraficaConfirmada: true,
        })),
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

function qualityLocationLabel(rule: AplicabilidadPlanControl): string {
    if (!rule.ubicacionGraficaConfirmada) return "Seleccione una salida en la ruta.";
    if (rule.puntoAplicacion === "LOTE_FINAL") return "Salida final: aceptación del producto o lote.";
    const operation = rule.procesoProduccionNombre || (rule.procesoProduccionId ? `Proceso ${rule.procesoProduccionId}` : "Operación");
    const area = rule.areaOperativaNombre || (rule.areaOperativaId ? `Área ${rule.areaOperativaId}` : "Área sin identificar");
    return `Salida de ${operation} · ${area}`;
}

function validateDraft(draft: PlanControlWrite, ambito: ControlDomainApi["ambito"], changeReasonRequired: boolean): string[] {
    const errors: string[] = [];
    if (!draft.codigo.trim()) errors.push("El código del plan es obligatorio.");
    if (!draft.nombre.trim()) errors.push("El nombre del plan es obligatorio.");
    if (!draft.proposito.trim()) errors.push("El propósito es obligatorio.");
    if (changeReasonRequired && !draft.motivoCambio?.trim()) errors.push("El motivo del cambio es obligatorio para una nueva versión.");
    if (!draft.aplicabilidades.length) errors.push("Debe existir al menos una regla de aplicabilidad.");
    if (!draft.caracteristicas.length) errors.push("Debe existir al menos una característica.");
    draft.aplicabilidades.forEach((rule, index) => {
        const prefix = `Regla ${index + 1}`;
        if (!rule.productoId && !rule.categoriaId) errors.push(`${prefix}: seleccione un producto o una categoría.`);
        if (rule.productoId && rule.categoriaId) errors.push(`${prefix}: producto y categoría son mutuamente excluyentes.`);
        if (rule.puntoAplicacion === "SALIDA_OPERACION" && (!rule.areaOperativaId || !rule.procesoProduccionId)) {
            errors.push(`${prefix}: una salida de operación exige área y proceso maestro.`);
        }
        if (ambito === "CALIDAD" && !rule.ubicacionGraficaConfirmada) {
            errors.push(`${prefix}: seleccione gráficamente la salida donde se realizará el control.`);
        }
        if (rule.puntoExigencia === "CIERRE_ETAPA"
            && (rule.puntoAplicacion !== "SALIDA_OPERACION" || rule.momentoEjecucion !== "DURANTE_FABRICACION")) {
            errors.push(`${prefix}: CIERRE_ETAPA solo es válido durante fabricación y en una salida de operación.`);
        }
        if (ambito === "PROCESO" && rule.momentoEjecucion !== "DURANTE_FABRICACION") {
            errors.push(`${prefix}: los controles de proceso se ejecutan durante fabricación.`);
        }
        if (rule.momentoEjecucion === "REVISION_FINAL" && ["CIERRE_ETAPA", "ENVIO_CALIDAD"].includes(rule.puntoExigencia)) {
            errors.push(`${prefix}: un ensayo de revisión final no puede bloquear la etapa ni su propio envío.`);
        }
    });
    draft.caracteristicas.forEach((characteristic, index) => {
        const prefix = `Característica ${index + 1}`;
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
    const [editingPlanId, setEditingPlanId] = useState<number | undefined>();
    const [changeReasonRequired, setChangeReasonRequired] = useState(false);
    const [draft, setDraft] = useState<PlanControlWrite>(() => defaultsFor(api.ambito));
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

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
                proposito: draft.proposito.trim(),
                motivoCambio: draft.motivoCambio?.trim() || null,
            }, editingPlanId);
            toast({ title: "Borrador guardado", description: "La versión continúa editable hasta su publicación.", status: "success" });
            await load();
            startNew();
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

    const compatibleRequirements = (rule: AplicabilidadPlanControl) => {
        if (rule.momentoEjecucion === "REVISION_FINAL") return ["INFORMATIVO", "LIBERACION"] as const;
        if (rule.puntoAplicacion === "LOTE_FINAL") return ["INFORMATIVO", "ENVIO_CALIDAD", "LIBERACION"] as const;
        return ["INFORMATIVO", "CIERRE_ETAPA", "ENVIO_CALIDAD", "LIBERACION"] as const;
    };

    const activeCatalogsByDimension = useMemo(() => new Map(magnitudes.map((item) => [item.id, item.dimension])), [magnitudes]);

    return (
        <VStack align="stretch" gap={5}>
            <Box>
                <Heading size="md">Planes de {CONTROL_NOUN[api.ambito].plural}</Heading>
                <Text color="fg.muted" mt={1}>El ámbito y el responsable son fijados por el módulo; una magnitud no determina la clasificación.</Text>
            </Box>

            <HStack align="end" gap={3} flexWrap="wrap">
                <Field.Root flex="1" minW={{ base: "full", md: "280px" }}>
                    <Field.Label>Buscar plan</Field.Label>
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} placeholder="Código o nombre" />
                </Field.Root>
                <Button onClick={() => void load()} loading={loading}>Buscar</Button>
                <CatalogosControlDialog magnitudes={magnitudes} unidades={unidades} canManage={nivel >= 3} onRefresh={loadCatalogs} />
                {nivel >= 3 && <ExceptionalRequirementDialog api={api} onCreated={() => void load()} />}
                {nivel >= 2 && <Button colorPalette="teal" onClick={startNew}><LuPlus />Nuevo plan</Button>}
            </HStack>

            <Box borderWidth="1px" borderRadius="lg" overflowX="auto">
                <Table.Root size="sm" minW="780px">
                    <Table.Header><Table.Row><Table.ColumnHeader>Plan</Table.ColumnHeader><Table.ColumnHeader>Ámbito / responsable</Table.ColumnHeader><Table.ColumnHeader>Versiones</Table.ColumnHeader><Table.ColumnHeader>Aplicabilidad vigente</Table.ColumnHeader><Table.ColumnHeader /></Table.Row></Table.Header>
                    <Table.Body>{plans.map((plan) => {
                        const current = plan.versiones.find((version) => version.estado === "VIGENTE");
                        const draftVersion = plan.versiones.find((version) => version.estado === "BORRADOR");
                        return <Table.Row key={plan.id}><Table.Cell><Text fontWeight="semibold">{plan.codigo}</Text><Text color="fg.muted">{plan.nombre}</Text></Table.Cell><Table.Cell><Badge colorPalette={plan.ambito === "PROCESO" ? "blue" : "purple"}>{CONTROL_SCOPE_LABEL[plan.ambito]}</Badge><Text fontSize="sm" mt={1}>{CONTROL_OWNER_LABEL[plan.ambito]}</Text></Table.Cell><Table.Cell><HStack>{current && <StatusBadge status={`VIGENTE · v${current.numero}`} />}{draftVersion && <Badge colorPalette="orange">BORRADOR · v{draftVersion.numero}</Badge>}</HStack></Table.Cell><Table.Cell>{current?.aplicabilidades.length ?? 0} reglas · {current?.caracteristicas.length ?? 0} características</Table.Cell><Table.Cell><HStack justify="flex-end">{nivel >= 2 && <Button size="xs" variant="outline" onClick={() => editPlan(plan)}>{draftVersion ? "Editar borrador" : "Nueva versión"}</Button>}{nivel >= 3 && draftVersion && <Button size="xs" colorPalette="teal" onClick={() => setConfirmAction({ kind: "PUBLICAR", plan, version: draftVersion })}>Publicar</Button>}{nivel >= 3 && current && <Button size="xs" colorPalette="orange" variant="outline" onClick={() => setConfirmAction({ kind: "RETIRAR", plan, version: current })}>Retirar</Button>}</HStack></Table.Cell></Table.Row>;
                    })}</Table.Body>
                </Table.Root>
                {!loading && !plans.length && <Text py={8} textAlign="center" color="fg.muted">No hay planes registrados para este ámbito.</Text>}
                {loading && <HStack justify="center" py={8}><Spinner size="sm" /><Text>Cargando planes…</Text></HStack>}
            </Box>

            {nivel >= 2 && (
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
                        <Field.Root required><Field.Label>Propósito</Field.Label><NativeSelect.Root><NativeSelect.Field value={draft.proposito} onChange={(event) => setDraft((current) => ({ ...current, proposito: event.target.value }))}>{api.ambito === "PROCESO" ? <><option value="AJUSTE_DE_PROCESO">Ajuste de proceso</option><option value="ACEPTACION_DE_ENVASE">Aceptación de envase</option><option value="VERIFICACION_EN_PROCESO">Verificación en proceso</option></> : <><option value="ENSAYO_DE_LIBERACION">Ensayo de liberación</option><option value="VERIFICACION_DURANTE_FABRICACION">Verificación durante fabricación</option><option value="ACEPTACION_PRODUCTO">Aceptación de producto</option></>}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                        <Field.Root required={changeReasonRequired}><Field.Label>Motivo del cambio</Field.Label><Textarea value={draft.motivoCambio ?? ""} onChange={(event) => setDraft((current) => ({ ...current, motivoCambio: event.target.value }))} placeholder={changeReasonRequired ? "Explique por qué se crea esta versión" : "Opcional para la versión inicial"} maxLength={500} />{changeReasonRequired && <Field.HelperText>Obligatorio para publicar una versión v2 o posterior.</Field.HelperText>}</Field.Root>
                        <Field.Root readOnly><Field.Label>Ámbito</Field.Label><Input value={CONTROL_SCOPE_LABEL[api.ambito]} readOnly bg="bg.subtle" /><Field.HelperText>No se envía como valor seleccionable.</Field.HelperText></Field.Root>
                        <Field.Root readOnly><Field.Label>Responsable funcional</Field.Label><Input value={CONTROL_OWNER_LABEL[api.ambito]} readOnly bg="bg.subtle" /></Field.Root>
                    </Grid>}

                    {step === 1 && (
                        <VStack align="stretch" gap={4}>
                            {draft.aplicabilidades.map((rule, index) => (
                                <Box key={index} borderWidth="1px" borderRadius="md" p={4}>
                                    <HStack justify="space-between" mb={3}>
                                        <Text fontWeight="semibold">Regla {index + 1}</Text>
                                        <IconButton
                                            aria-label={`Eliminar regla ${index + 1}`}
                                            size="sm"
                                            variant="ghost"
                                            disabled={draft.aplicabilidades.length === 1}
                                            onClick={() => setDraft((current) => ({
                                                ...current,
                                                aplicabilidades: current.aplicabilidades.filter((_, position) => position !== index),
                                            }))}
                                        ><LuTrash2 /></IconButton>
                                    </HStack>
                                    <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={3}>
                                        <Field.Root required>
                                            <Field.Label>Aplica por</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field
                                                    value={rule.productoId != null ? "PRODUCTO" : "CATEGORIA"}
                                                    onChange={(event) => updateApplicability(index, event.target.value === "PRODUCTO"
                                                        ? {
                                                            productoId: "",
                                                            categoriaId: null,
                                                            categoriaNombre: null,
                                                            productosExcluidosIds: [],
                                                            areaOperativaId: null,
                                                            areaOperativaNombre: null,
                                                            procesoProduccionId: null,
                                                            procesoProduccionNombre: null,
                                                            frontendNodeId: null,
                                                            ubicacionGraficaConfirmada: false,
                                                        }
                                                        : {
                                                            productoId: null,
                                                            productoNombre: null,
                                                            areaOperativaId: null,
                                                            areaOperativaNombre: null,
                                                            procesoProduccionId: null,
                                                            procesoProduccionNombre: null,
                                                            frontendNodeId: null,
                                                            ubicacionGraficaConfirmada: false,
                                                        })}
                                                >
                                                    <option value="PRODUCTO">Producto específico</option>
                                                    <option value="CATEGORIA">Categoría</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>

                                        {rule.productoId != null ? (
                                            <Field.Root required>
                                                <Field.Label>Código del producto</Field.Label>
                                                <Input
                                                    value={rule.productoId}
                                                    onChange={(event) => updateApplicability(index, {
                                                        productoId: event.target.value,
                                                        areaOperativaId: null,
                                                        areaOperativaNombre: null,
                                                        procesoProduccionId: null,
                                                        procesoProduccionNombre: null,
                                                        frontendNodeId: null,
                                                        ubicacionGraficaConfirmada: false,
                                                    })}
                                                />
                                            </Field.Root>
                                        ) : (
                                            <Field.Root required>
                                                <Field.Label>Categoría</Field.Label>
                                                <NativeSelect.Root>
                                                    <NativeSelect.Field
                                                        value={rule.categoriaId ?? ""}
                                                        onChange={(event) => {
                                                            const categoryId = idOrNull(event.target.value);
                                                            const category = categorias.find((item) => item.categoriaId === categoryId);
                                                            updateApplicability(index, {
                                                                categoriaId: categoryId,
                                                                categoriaNombre: category?.categoriaNombre ?? null,
                                                                tipoOrden: categoryId == null ? "AMBAS" : "OP",
                                                                areaOperativaId: null,
                                                                areaOperativaNombre: null,
                                                                procesoProduccionId: null,
                                                                procesoProduccionNombre: null,
                                                                frontendNodeId: null,
                                                                ubicacionGraficaConfirmada: false,
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

                                        <Field.Root>
                                            <Field.Label>Exclusiones de producto</Field.Label>
                                            <Input
                                                disabled={rule.productoId != null}
                                                value={rule.productosExcluidosIds.join(", ")}
                                                onChange={(event) => updateApplicability(index, {
                                                    productosExcluidosIds: event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                                                })}
                                                placeholder="COD-1, COD-2"
                                            />
                                        </Field.Root>

                                        {api.ambito === "CALIDAD" ? (
                                            <Box gridColumn={{ md: "1 / -1" }}>
                                                <VStack align="stretch" gap={3}>
                                                    <HStack justify="space-between" align={{ base: "stretch", md: "center" }} flexDirection={{ base: "column", md: "row" }}>
                                                        <Box>
                                                            <Text fontWeight="semibold">Punto de control de calidad</Text>
                                                            <Text fontSize="sm" color="fg.muted">
                                                                Seleccione la salida que será aceptada, rechazada o autorizada por Calidad.
                                                            </Text>
                                                        </Box>
                                                        <QualityControlPointRoutePicker
                                                            productoId={rule.productoId}
                                                            categoriaId={rule.categoriaId}
                                                            categoriaNombre={rule.categoriaNombre}
                                                            selectedPoint={rule.ubicacionGraficaConfirmada ? {
                                                                puntoAplicacion: rule.puntoAplicacion,
                                                                areaOperativaId: rule.areaOperativaId ?? null,
                                                                procesoProduccionId: rule.procesoProduccionId ?? null,
                                                                frontendNodeId: rule.frontendNodeId ?? null,
                                                            } : null}
                                                            onConfirm={(selection) => updateApplicability(index, {
                                                                puntoAplicacion: selection.puntoAplicacion,
                                                                tipoOrden: selection.tipoOrden,
                                                                areaOperativaId: selection.areaOperativaId,
                                                                areaOperativaNombre: selection.areaOperativaNombre,
                                                                procesoProduccionId: selection.procesoProduccionId,
                                                                procesoProduccionNombre: selection.procesoProduccionNombre,
                                                                frontendNodeId: selection.frontendNodeId,
                                                                ubicacionGraficaConfirmada: true,
                                                                ...(selection.puntoAplicacion === "LOTE_FINAL"
                                                                    && rule.puntoExigencia === "CIERRE_ETAPA"
                                                                    ? { puntoExigencia: "INFORMATIVO" as const }
                                                                    : {}),
                                                            })}
                                                        />
                                                    </HStack>
                                                    <Alert.Root status={rule.ubicacionGraficaConfirmada ? "success" : "warning"}>
                                                        <Alert.Indicator />
                                                        <Alert.Content>
                                                            <Alert.Title>{rule.ubicacionGraficaConfirmada ? "Punto seleccionado" : "Ubicación pendiente"}</Alert.Title>
                                                            <Alert.Description>{qualityLocationLabel(rule)}</Alert.Description>
                                                        </Alert.Content>
                                                    </Alert.Root>
                                                </VStack>
                                            </Box>
                                        ) : (
                                            <>
                                                <Field.Root required>
                                                    <Field.Label>Tipo de orden</Field.Label>
                                                    <NativeSelect.Root>
                                                        <NativeSelect.Field value={rule.tipoOrden} onChange={(event) => updateApplicability(index, { tipoOrden: event.target.value as AplicabilidadPlanControl["tipoOrden"] })}>
                                                            <option value="AMBAS">OP y OF</option><option value="OP">OP</option><option value="OF">OF</option>
                                                        </NativeSelect.Field>
                                                        <NativeSelect.Indicator />
                                                    </NativeSelect.Root>
                                                </Field.Root>
                                                <Field.Root required>
                                                    <Field.Label>Punto de aplicación</Field.Label>
                                                    <NativeSelect.Root>
                                                        <NativeSelect.Field value={rule.puntoAplicacion} onChange={(event) => {
                                                            const point = event.target.value as AplicabilidadPlanControl["puntoAplicacion"];
                                                            updateApplicability(index, {
                                                                puntoAplicacion: point,
                                                                ...(point === "LOTE_FINAL" ? {
                                                                    areaOperativaId: null,
                                                                    procesoProduccionId: null,
                                                                    frontendNodeId: null,
                                                                    puntoExigencia: rule.puntoExigencia === "CIERRE_ETAPA" ? "INFORMATIVO" : rule.puntoExigencia,
                                                                } : {}),
                                                            });
                                                        }}>
                                                            <option value="LOTE_FINAL">Lote final</option><option value="SALIDA_OPERACION">Salida de operación</option>
                                                        </NativeSelect.Field>
                                                        <NativeSelect.Indicator />
                                                    </NativeSelect.Root>
                                                </Field.Root>
                                                {rule.puntoAplicacion === "SALIDA_OPERACION" && (
                                                    <>
                                                        <Field.Root required><Field.Label>ID de área operativa</Field.Label><Input type="number" min={1} value={rule.areaOperativaId ?? ""} onChange={(event) => updateApplicability(index, { areaOperativaId: idOrNull(event.target.value) })} /></Field.Root>
                                                        <Field.Root required><Field.Label>ID del proceso maestro</Field.Label><Input type="number" min={1} value={rule.procesoProduccionId ?? ""} onChange={(event) => updateApplicability(index, { procesoProduccionId: idOrNull(event.target.value) })} /></Field.Root>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </Grid>
                                </Box>
                            ))}
                            <Button alignSelf="start" size="sm" variant="outline" onClick={() => setDraft((current) => ({ ...current, aplicabilidades: [...current.aplicabilidades, newApplicability()] }))}><LuPlus />Agregar regla OR</Button>
                        </VStack>
                    )}

                    {step === 2 && <VStack align="stretch" gap={4}>{draft.aplicabilidades.map((rule, index) => <Box key={index} borderWidth="1px" borderRadius="md" p={4}><Text fontWeight="semibold" mb={3}>Política de la regla {index + 1}</Text><Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3}><Field.Root required readOnly={api.ambito === "PROCESO"}><Field.Label>Momento de ejecución</Field.Label><NativeSelect.Root disabled={api.ambito === "PROCESO"}><NativeSelect.Field value={rule.momentoEjecucion} onChange={(event) => { const moment = event.target.value as AplicabilidadPlanControl["momentoEjecucion"]; updateApplicability(index, { momentoEjecucion: moment, ...(moment === "REVISION_FINAL" && ["CIERRE_ETAPA", "ENVIO_CALIDAD"].includes(rule.puntoExigencia) ? { puntoExigencia: "LIBERACION" } : {}) }); }}><option value="DURANTE_FABRICACION">Durante fabricación</option>{api.ambito === "CALIDAD" && <option value="REVISION_FINAL">Revisión final</option>}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>{api.ambito === "PROCESO" && <Field.HelperText>Valor fijo para control de proceso.</Field.HelperText>}</Field.Root><Field.Root required><Field.Label>Punto de exigencia</Field.Label><NativeSelect.Root><NativeSelect.Field value={rule.puntoExigencia} onChange={(event) => updateApplicability(index, { puntoExigencia: event.target.value as AplicabilidadPlanControl["puntoExigencia"] })}>{compatibleRequirements(rule).map((value) => <option key={value} value={value}>{formatEnumLabel(value)}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root></Grid></Box>)}</VStack>}

                    {step === 3 && <VStack align="stretch" gap={4}>{draft.caracteristicas.map((characteristic, index) => {
                        const dimension = characteristic.magnitudId ? activeCatalogsByDimension.get(characteristic.magnitudId) : undefined;
                        const compatibleUnits = unidades.filter((unit) => unit.activo && (!dimension || unit.dimension === dimension));
                        return <Box key={index} borderWidth="1px" borderRadius="md" p={4}><HStack justify="space-between" mb={3}><Text fontWeight="semibold">Característica {index + 1}</Text><IconButton aria-label={`Eliminar característica ${index + 1}`} size="sm" variant="ghost" disabled={draft.caracteristicas.length === 1} onClick={() => setDraft((current) => ({ ...current, caracteristicas: current.caracteristicas.filter((_, position) => position !== index).map((item, position) => ({ ...item, orden: position + 1 })) }))}><LuTrash2 /></IconButton></HStack><Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3}>
                            <Field.Root required><Field.Label>Nombre</Field.Label><Input value={characteristic.nombre} onChange={(event) => updateCharacteristic(index, { nombre: event.target.value })} maxLength={120} /></Field.Root>
                            <Field.Root required><Field.Label>Tipo</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.tipo} onChange={(event) => { const type = event.target.value as CaracteristicaPlanControl["tipo"]; updateCharacteristic(index, type === "NUMERICA" ? { tipo: type, valorBooleanoEsperado: null } : { tipo: type, unidadId: null, objetivo: null, limiteInferior: null, limiteSuperior: null }); }}><option value="NUMERICA">Numérica</option><option value="BOOLEANA">Booleana</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                            <Field.Root required><Field.Label>Magnitud</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.magnitudId ?? ""} onChange={(event) => updateCharacteristic(index, { magnitudId: idOrNull(event.target.value), unidadId: null })}><option value="">Seleccionar</option>{magnitudes.filter((item) => item.activo).map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.dimension}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                            {characteristic.tipo === "NUMERICA" ? <><Field.Root required><Field.Label>Unidad</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.unidadId ?? ""} onChange={(event) => updateCharacteristic(index, { unidadId: idOrNull(event.target.value) })}><option value="">Seleccionar</option>{compatibleUnits.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.simbolo})</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root><Field.Root><Field.Label>Objetivo</Field.Label><Input inputMode="decimal" value={characteristic.objetivo ?? ""} onChange={(event) => updateCharacteristic(index, { objetivo: decimalOrNull(event.target.value) })} /></Field.Root><Field.Root><Field.Label>Límite inferior</Field.Label><Input inputMode="decimal" value={characteristic.limiteInferior ?? ""} onChange={(event) => updateCharacteristic(index, { limiteInferior: decimalOrNull(event.target.value) })} /></Field.Root><Field.Root><Field.Label>Límite superior</Field.Label><Input inputMode="decimal" value={characteristic.limiteSuperior ?? ""} onChange={(event) => updateCharacteristic(index, { limiteSuperior: decimalOrNull(event.target.value) })} /></Field.Root><Field.Root required><Field.Label>Decimales visibles</Field.Label><Input type="number" min={0} max={8} value={characteristic.escala} onChange={(event) => updateCharacteristic(index, { escala: Number(event.target.value) })} /></Field.Root></> : <Field.Root required><Field.Label>Valor esperado</Field.Label><NativeSelect.Root><NativeSelect.Field value={characteristic.valorBooleanoEsperado == null ? "" : String(characteristic.valorBooleanoEsperado)} onChange={(event) => updateCharacteristic(index, { valorBooleanoEsperado: event.target.value === "" ? null : event.target.value === "true" })}><option value="">Seleccionar</option><option value="true">Sí / verdadero</option><option value="false">No / falso</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>}
                            <Field.Root required><Field.Label>Muestras</Field.Label><Input type="number" min={1} value={characteristic.cantidadMuestras} onChange={(event) => updateCharacteristic(index, { cantidadMuestras: Number(event.target.value) })} /></Field.Root><Field.Root required><Field.Label>Unidades por muestra</Field.Label><Input type="number" min={1} value={characteristic.unidadesPorMuestra} onChange={(event) => updateCharacteristic(index, { unidadesPorMuestra: Number(event.target.value) })} /></Field.Root>
                        </Grid></Box>;
                    })}<Button alignSelf="start" size="sm" variant="outline" onClick={() => setDraft((current) => ({ ...current, caracteristicas: [...current.caracteristicas, newCharacteristic(current.caracteristicas.length + 1)] }))}><LuPlus />Agregar característica</Button></VStack>}

                    <HStack justify="space-between" mt={6} flexWrap="wrap"><Button variant="outline" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>Anterior</Button><HStack>{step < steps.length - 1 ? <Button colorPalette="teal" onClick={() => setStep((current) => current + 1)}>Siguiente</Button> : <Button colorPalette="teal" loading={saving} onClick={() => void save()}>Guardar borrador</Button>}</HStack></HStack>
                </Box>
            )}

            <Dialog.Root open={confirmAction != null} onOpenChange={({ open }) => !open && setConfirmAction(null)}>
                <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content><Dialog.Header><Dialog.Title>{confirmAction?.kind === "PUBLICAR" ? "Publicar versión" : "Retirar versión"}</Dialog.Title></Dialog.Header><Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar confirmación" size="sm" /></Dialog.CloseTrigger><Dialog.Body><Text>{confirmAction?.kind === "PUBLICAR" ? "La versión quedará inmutable y se aplicará únicamente a lotes futuros." : "Los expedientes existentes conservarán esta versión congelada, pero no se asignará a lotes futuros."}</Text><Text mt={2} fontWeight="semibold">{confirmAction?.plan.codigo} · versión {confirmAction?.version.numero}</Text></Dialog.Body><Dialog.Footer><Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancelar</Button><Button colorPalette={confirmAction?.kind === "PUBLICAR" ? "teal" : "orange"} loading={saving} onClick={() => void confirmVersionAction()}>Confirmar</Button></Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal>
            </Dialog.Root>
        </VStack>
    );
}
