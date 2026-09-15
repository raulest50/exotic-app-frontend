import {
    Alert,
    Box,
    Button,
    CloseButton,
    Dialog,
    Field,
    HStack,
    Input,
    NativeSelect,
    Portal,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";

import { useAppToast } from "../../components/ui/use-app-toast";
import { apiFailureDetail, type ControlDomainApi } from "./api";
import { formatEnumLabel } from "./controlUi";
import type {
    ExceptionalRequirementOption,
    ExceptionalStageOption,
    LoteControlOption,
    PuntoAplicacionControl,
} from "./types";

interface ExceptionalRequirementDialogProps {
    api: ControlDomainApi;
    onCreated: () => void;
}

export default function ExceptionalRequirementDialog({ api, onCreated }: ExceptionalRequirementDialogProps) {
    const toast = useAppToast();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [lots, setLots] = useState<LoteControlOption[]>([]);
    const [batchRecordId, setBatchRecordId] = useState("");
    const [applicationPoint, setApplicationPoint] = useState<PuntoAplicacionControl>("LOTE_FINAL");
    const [stages, setStages] = useState<ExceptionalStageOption[]>([]);
    const [stageId, setStageId] = useState("");
    const [options, setOptions] = useState<ExceptionalRequirementOption[]>([]);
    const [optionsResolved, setOptionsResolved] = useState(false);
    const [planId, setPlanId] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const records = useMemo(() => {
        const unique = new Map<number, LoteControlOption>();
        for (const lot of lots) {
            if (lot.batchRecordId != null && !unique.has(lot.batchRecordId)) unique.set(lot.batchRecordId, lot);
        }
        return [...unique.values()];
    }, [lots]);
    const selectedOption = options.find((option) => String(option.planId) === planId);

    const resetOptions = () => {
        setOptions([]);
        setOptionsResolved(false);
        setPlanId("");
    };

    const findRecords = async (term = search) => {
        setLoading(true);
        try {
            setLots(await api.searchLotes(term));
        } catch (error) {
            toast({ title: "No fue posible buscar expedientes", description: apiFailureDetail(error, "Error de consulta.").message, status: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        let mounted = true;
        setLoading(true);
        api.searchLotes()
            .then((items) => mounted && setLots(items))
            .catch((error) => mounted && toast({ title: "No fue posible buscar expedientes", description: apiFailureDetail(error, "Error de consulta.").message, status: "error" }))
            .finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [api, open, toast]);

    const loadOptions = async (recordId: number, selectedStageId?: number | null) => {
        const result = await api.listExceptionalOptions(recordId, selectedStageId);
        setOptions(result);
        setOptionsResolved(true);
        setPlanId("");
    };

    const selectRecord = async (value: string) => {
        setBatchRecordId(value);
        setApplicationPoint("LOTE_FINAL");
        setStageId("");
        setStages([]);
        resetOptions();
        const recordId = Number(value);
        if (!Number.isInteger(recordId)) return;
        setLoading(true);
        try {
            const [nextStages] = await Promise.all([
                api.listExceptionalStages(recordId),
                loadOptions(recordId, null),
            ]);
            setStages(nextStages);
        } catch (error) {
            const failure = apiFailureDetail(error, "No fue posible resolver el contexto del expediente.");
            toast({ title: "Expediente no elegible", description: [failure.message, ...failure.bloqueos].join(" · "), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    const selectPoint = async (value: PuntoAplicacionControl) => {
        setApplicationPoint(value);
        setStageId("");
        resetOptions();
        if (value !== "LOTE_FINAL" || !batchRecordId) return;
        setLoading(true);
        try {
            await loadOptions(Number(batchRecordId), null);
        } catch (error) {
            toast({ title: "No fue posible resolver planes", description: apiFailureDetail(error, "Error de aplicabilidad.").message, status: "error" });
        } finally {
            setLoading(false);
        }
    };

    const selectStage = async (value: string) => {
        setStageId(value);
        resetOptions();
        const parsedStage = Number(value);
        if (!batchRecordId || !Number.isInteger(parsedStage)) return;
        setLoading(true);
        try {
            await loadOptions(Number(batchRecordId), parsedStage);
        } catch (error) {
            toast({ title: "No fue posible resolver planes", description: apiFailureDetail(error, "La etapa no es elegible.").message, status: "error" });
        } finally {
            setLoading(false);
        }
    };

    const create = async () => {
        const parsedRecord = Number(batchRecordId);
        const parsedPlan = Number(planId);
        const parsedStage = applicationPoint === "SALIDA_OPERACION" ? Number(stageId) : null;
        if (!Number.isInteger(parsedRecord) || !Number.isInteger(parsedPlan) || !selectedOption || !reason.trim()) return;
        setLoading(true);
        try {
            const requirement = await api.addExceptionalRequirement({
                batchRecordId: parsedRecord,
                planId: parsedPlan,
                batchRecordEtapaId: Number.isInteger(parsedStage) ? parsedStage : null,
                motivo: reason.trim(),
            });
            toast({
                title: "Requisito excepcional agregado",
                description: `${requirement.planCodigo} quedó congelado en el expediente con revisión y firma de auditoría.`,
                status: "success",
            });
            setOpen(false);
            setBatchRecordId("");
            setApplicationPoint("LOTE_FINAL");
            setStages([]);
            setStageId("");
            resetOptions();
            setReason("");
            onCreated();
        } catch (error) {
            const failure = apiFailureDetail(error, "No fue posible agregar el requisito.");
            toast({ title: "Adición excepcional rechazada", description: [failure.message, ...failure.bloqueos].join(" · "), status: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={({ open: next }) => setOpen(next)} size="lg" scrollBehavior="inside">
            <Dialog.Trigger asChild><Button variant="outline" colorPalette="orange">Adición excepcional</Button></Dialog.Trigger>
            <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content><Dialog.Header><Dialog.Title>Agregar requisito a un expediente activo</Dialog.Title></Dialog.Header><Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar adición excepcional" size="sm" /></Dialog.CloseTrigger><Dialog.Body><VStack align="stretch" gap={4}>
                <Alert.Root status="warning"><Alert.Indicator /><VStack align="start" gap={1}><Text fontWeight="semibold">Acción excepcional firmada</Text><Text fontSize="sm">Agrega una versión vigente resuelta por el backend y crea evidencia de auditoría. No elimina ni sustituye requisitos previos.</Text></VStack></Alert.Root>
                <HStack align="end" flexWrap="wrap"><Field.Root flex="1" minW="240px"><Field.Label>Buscar Batch Record</Field.Label><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void findRecords()} placeholder="Lote o producto" /></Field.Root><Button loading={loading} onClick={() => void findRecords()}>Buscar</Button></HStack>
                <Field.Root required><Field.Label>Batch Record</Field.Label><NativeSelect.Root><NativeSelect.Field value={batchRecordId} onChange={(event) => void selectRecord(event.target.value)}><option value="">Seleccionar expediente</option>{records.map((lot) => <option key={lot.batchRecordId} value={lot.batchRecordId ?? ""}>{lot.batchRecordCodigo ?? `Expediente ${lot.batchRecordId}`} · lote {lot.lote} · {lot.productoNombre}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                <Field.Root required><Field.Label>Punto donde se agregará</Field.Label><NativeSelect.Root><NativeSelect.Field value={applicationPoint} onChange={(event) => void selectPoint(event.target.value as PuntoAplicacionControl)}><option value="LOTE_FINAL">Lote final</option><option value="SALIDA_OPERACION">Salida de operación</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
                {applicationPoint === "SALIDA_OPERACION" && <Field.Root required><Field.Label>Etapa del Batch Record</Field.Label><NativeSelect.Root><NativeSelect.Field value={stageId} onChange={(event) => void selectStage(event.target.value)}><option value="">Seleccionar etapa</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.secuencia + 1}. {stage.nombre} · {stage.areaNombre}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Field.HelperText>El servidor verificará la relación entre etapa, área, proceso y plan.</Field.HelperText></Field.Root>}
                {optionsResolved && options.length === 0 && <Alert.Root status="info"><Alert.Indicator />No hay planes vigentes aplicables que puedan añadirse en este punto.</Alert.Root>}
                {options.length > 0 && <Field.Root required><Field.Label>Plan vigente aplicable</Field.Label><NativeSelect.Root><NativeSelect.Field value={planId} onChange={(event) => setPlanId(event.target.value)}><option value="">Seleccionar plan</option>{options.map((option) => <option key={option.planId} value={option.planId}>{option.planCodigo} · {option.planNombre} · v{option.versionNumero}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>{selectedOption && <Field.HelperText>{formatEnumLabel(selectedOption.momento)} · exigencia {formatEnumLabel(selectedOption.puntoExigencia)}</Field.HelperText>}</Field.Root>}
                <Field.Root required><Field.Label>Motivo de la adición</Field.Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /><Field.HelperText>Este texto formará parte de la revisión y firma inmutables.</Field.HelperText></Field.Root>
                {selectedOption && <Box bg="bg.subtle" borderRadius="md" p={3}><Text fontSize="sm">Se enviarán únicamente los identificadores del expediente, plan y etapa, además del motivo. El servidor volverá a resolver la versión vigente y la regla.</Text></Box>}
            </VStack></Dialog.Body><Dialog.Footer><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button colorPalette="orange" loading={loading} disabled={!batchRecordId || !selectedOption || !reason.trim()} onClick={() => void create()}>Agregar y firmar</Button></Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal>
        </Dialog.Root>
    );
}
