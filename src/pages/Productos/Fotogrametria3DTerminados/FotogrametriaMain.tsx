import { useEffect, useId, useRef, useState } from "react";
import { Badge, Box, Button, Flex, Link, Progress, Stack, Text } from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import ImageManager, { type ModelPhoto } from "./ImageManager.tsx";
import RenderWindow from "./RenderWindow.tsx";
import { reconstructModel, reconstructionNoticesUrl, type ReconstructionProgress, type ReconstructionResult } from "./ImageProc.tsx";
import { deleteModel, loadModel, saveModel, type ModelMetadata } from "./FotogrametriaApi.ts";

interface Props { isActive: boolean; disabled: boolean; canEdit: boolean; productoId?: string; onPendingChange: (pending: boolean) => void }

// Fast Refresh preserves File/state references; their preview URLs must survive it.
let hotUpdating = false;
if (import.meta.hot) import.meta.hot.dispose(() => { hotUpdating = true; });

function foregroundMask(photo: ModelPhoto) {
    if (photo.automatic?.accepted) return photo.automatic.mask;
    if (photo.polygon.length < 3) throw new Error("Revisa y acepta el contorno de cada fotografía antes de reconstruir.");
    const scale = Math.min(1, 1024 / Math.max(photo.width, photo.height));
    const width = Math.max(1, Math.round(photo.width * scale)), height = Math.max(1, Math.round(photo.height * scale));
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la máscara del objeto.");
    ctx.fillStyle = "white"; ctx.beginPath();
    photo.polygon.forEach((point, index) => index === 0 ? ctx.moveTo(point.x * width, point.y * height) : ctx.lineTo(point.x * width, point.y * height));
    ctx.closePath(); ctx.fill();
    const rgba = ctx.getImageData(0, 0, width, height).data;
    const data = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4 + 3] > 127 ? 1 : 0;
    if (data.reduce((sum, value) => sum + value, 0) < data.length * 0.005) throw new Error("El contorno de una fotografía es demasiado pequeño. Delimita de nuevo el objeto.");
    return { width, height, data };
}

const duration = (seconds: number) => seconds >= 60 ? `${Math.ceil(seconds / 60)} min` : `${Math.max(1, Math.round(seconds))} s`;

/** Optional assistant: all acquisition and reconstruction state stays in the browser. */
export default function FotogrametriaMain({ isActive, disabled, canEdit, productoId, onPendingChange }: Props) {
    const [open, setOpen] = useState(false);
    const [photos, setPhotos] = useState<ModelPhoto[]>([]);
    const photosRef = useRef(photos); photosRef.current = photos;
    const [draft, setDraft] = useState<ReconstructionResult | null>(null);
    const [storedModel, setStoredModel] = useState<Blob | null>(null);
    const [metadata, setMetadata] = useState<ModelMetadata | null | undefined>(undefined);
    const [accepted, setAccepted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [imageProcessing, setImageProcessing] = useState(false);
    const [persisting, setPersisting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [progress, setProgress] = useState<ReconstructionProgress | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [eta, setEta] = useState<number | null>(null);
    const [revision, setRevision] = useState(0);
    const [resultRevision, setResultRevision] = useState(-1);
    const [reload, setReload] = useState(0);
    const run = useRef<AbortController | null>(null);
    const persistence = useRef<AbortController | null>(null);
    const sequence = useRef(0);
    const started = useRef(0);
    const sample = useRef({ stage: "", time: 0, done: 0 });
    const identity = useRef(productoId); identity.current = productoId;
    const contentId = useId();
    const pending = photos.length > 0 || draft !== null;

    useEffect(() => { onPendingChange(pending); }, [pending, onPendingChange]);
    useEffect(() => {
        // A development refresh retains state after cleanup aborted the old jobs.
        if (run.current?.signal.aborted) { run.current = null; setBusy(false); }
        if (persistence.current?.signal.aborted) { persistence.current = null; setPersisting(false); }
        const lifecycle = sequence;
        return () => {
            lifecycle.current++; run.current?.abort(); persistence.current?.abort();
            // A real unmount releases previews; development refresh retains them with state.
            if (!hotUpdating) photosRef.current.forEach(photo => URL.revokeObjectURL(photo.url));
        };
    }, []);
    useEffect(() => {
        if (!isActive && busy) { sequence.current++; run.current?.abort(); setBusy(false); setMessage("El cálculo se detuvo al cambiar de pestaña. Las fotos y la última vista previa se conservan."); }
    }, [isActive, busy]);
    useEffect(() => {
        if (!busy) return;
        const timer = window.setInterval(() => setElapsed((performance.now() - started.current) / 1000), 1000);
        return () => clearInterval(timer);
    }, [busy]);
    useEffect(() => {
        if (!productoId || !open || !isActive) return;
        const controller = new AbortController();
        setLoading(true); setError("");
        loadModel(productoId, controller.signal).then(saved => {
            if (controller.signal.aborted) return;
            setMetadata(saved?.metadata ?? null); setStoredModel(saved?.glb ?? null);
        }).catch(cause => {
            if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo recuperar el modelo guardado.");
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [productoId, open, isActive, reload]);

    function updatePhotos(next: ModelPhoto[]) {
        const kept = new Set(next.map(photo => photo.id));
        photos.forEach(photo => { if (!kept.has(photo.id)) URL.revokeObjectURL(photo.url); });
        photosRef.current = next;
        setPhotos(next); setRevision(value => value + 1); setAccepted(false); setError(""); setMessage("");
    }

    function discardDraft() {
        sequence.current++; run.current?.abort();
        photos.forEach(photo => URL.revokeObjectURL(photo.url));
        setPhotos([]); setDraft(null); setAccepted(false); setProgress(null); setBusy(false); setError(""); setMessage("");
        setRevision(value => value + 1);
    }

    async function reconstruct() {
        if (busy || imageProcessing || !canEdit || disabled || !isActive) return;
        const controller = new AbortController(); run.current = controller;
        const currentSequence = ++sequence.current;
        const inputRevision = revision;
        started.current = performance.now(); sample.current = { stage: "", time: 0, done: 0 };
        setBusy(true); setAccepted(false); setError(""); setMessage(""); setProgress(null); setEta(null); setElapsed(0);
        try {
            const inputs = photos.map(photo => ({ id: photo.id, file: photo.file, mask: foregroundMask(photo) }));
            const result = await reconstructModel(inputs, { signal: controller.signal, onProgress: next => {
                if (currentSequence !== sequence.current) return;
                const now = performance.now();
                if (sample.current.stage !== next.stage) { sample.current = { stage: next.stage, time: now, done: next.completed ?? 0 }; setEta(null); }
                else if (next.total && next.completed != null && next.completed - sample.current.done >= 2 && now - sample.current.time >= 1500) {
                    setEta((now - sample.current.time) / (next.completed - sample.current.done) * (next.total - next.completed) / 1000);
                }
                setProgress(next);
            } });
            if (currentSequence !== sequence.current) return;
            setDraft(result); setResultRevision(inputRevision); setMessage("Revisa la superficie completa antes de aceptar el modelo. Su escala es orientativa.");
        } catch (cause) {
            if (currentSequence !== sequence.current) return;
            if (controller.signal.aborted) setMessage("Reconstrucción cancelada. Puedes corregir las fotos y volver a intentarlo.");
            else setError(cause instanceof Error ? cause.message : "No se pudo reconstruir el objeto. Añade vistas o corrige sus contornos.");
        } finally { if (currentSequence === sequence.current) setBusy(false); }
    }

    async function persist() {
        if (!productoId || !draft || !accepted || resultRevision !== revision || busy || imageProcessing || metadata === undefined || loading || persisting || disabled || !canEdit) return;
        const controller = new AbortController(); persistence.current = controller;
        const currentId = productoId;
        setPersisting(true); setError(""); setMessage("");
        try {
            const saved = await saveModel(currentId, draft.glb, metadata?.etag ?? null, controller.signal);
            if (controller.signal.aborted || identity.current !== currentId) return;
            setMetadata(saved); setStoredModel(draft.glb); setDraft(null); setAccepted(false);
            photos.forEach(photo => URL.revokeObjectURL(photo.url)); setPhotos([]); setProgress(null);
            setMessage("Modelo guardado. Se liberaron las fotografías y los datos temporales de esta sesión.");
        } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "El producto está guardado; el modelo sigue pendiente."); }
        finally { if (!controller.signal.aborted) setPersisting(false); }
    }

    async function removeStoredModel() {
        if (!productoId || !metadata || !canEdit || disabled || persisting || imageProcessing) return;
        if (!window.confirm("¿Quitar el modelo 3D guardado de este terminado? El producto se conserva.")) return;
        const controller = new AbortController(); persistence.current = controller;
        setPersisting(true); setError("");
        try {
            await deleteModel(productoId, metadata.etag, controller.signal);
            if (!controller.signal.aborted) { setMetadata(null); setStoredModel(null); setMessage("Se quitó el modelo guardado. El terminado se conserva."); }
        } catch { if (!controller.signal.aborted) setError("No se pudo quitar el modelo. Recarga la versión guardada antes de reintentar."); }
        finally { if (!controller.signal.aborted) setPersisting(false); }
    }

    const ready = !!draft && resultRevision === revision;
    const model = draft?.glb ?? storedModel;
    const locked = disabled || !canEdit || persisting;
    return <Box mt="3" borderWidth="1px" rounded="md" bg="bg.panel">
        <Button variant="ghost" onClick={() => setOpen(value => !value)} aria-expanded={open} w="full" h="auto" py="3" px="4" justifyContent="space-between" whiteSpace="normal" aria-controls={contentId}>
            <Flex align="center" gap="2" wrap="wrap"><Text>Modelo 3D del terminado</Text><Badge>Opcional</Badge><Badge colorPalette={pending ? "orange" : metadata ? "green" : "gray"}>{busy ? "Reconstruyendo…" : imageProcessing ? "Preparando imágenes…" : pending ? "Borrador local" : metadata ? "Guardado" : "Sin modelo"}</Badge></Flex>
            {open ? <FiChevronUp /> : <FiChevronDown />}
        </Button>
        <Box id={contentId} hidden={!open}>
            <Stack gap="4" p="4" borderTopWidth="1px">
                <Text fontSize="sm">Puedes crear el terminado sin completar este asistente. Aceptar o guardar el modelo es una operación independiente de la receta.</Text>
                {canEdit && <ImageManager photos={photos} onChange={updatePhotos} active={isActive && open} disabled={locked || busy} onBusyChange={setImageProcessing} />}
                <Flex gap="2" wrap="wrap">
                    {canEdit && <Button size="sm" colorPalette="teal" disabled={locked || busy || imageProcessing || photos.length < 3 || photos.some(photo => photo.polygon.length < 3 && !photo.automatic?.accepted)} onClick={() => void reconstruct()}>Reconstruir modelo</Button>}
                    {busy && <Button size="sm" variant="outline" onClick={() => run.current?.abort()}>Cancelar cálculo</Button>}
                    {pending && <Button size="sm" variant="outline" disabled={persisting || disabled || imageProcessing} onClick={() => { if (window.confirm("¿Descartar las fotos y el borrador 3D local? El modelo guardado se conserva.")) discardDraft(); }}>Descartar borrador 3D</Button>}
                </Flex>
                {busy && <Box role="status" aria-live="polite" aria-atomic="true">
                    <Text fontWeight="semibold">{progress?.stage ?? "Preparando las fotografías…"}</Text>
                    <Progress.Root aria-label="Avance orientativo de la reconstrucción" value={progress?.fraction == null ? null : Math.round(progress.fraction * 100)} mt="2" colorPalette="teal">
                        <Progress.Track><Progress.Range /></Progress.Track>
                    </Progress.Root>
                    <Text fontSize="sm" mt="1">{progress?.total ? `${progress.completed ?? 0} / ${progress.total} · ` : ""}{Math.floor(elapsed)} s transcurridos · {eta != null && eta > 0 ? `esta etapa: aproximadamente ${duration(eta)} restantes` : "calculando estimación de esta etapa…"}</Text>
                    <Text fontSize="xs" color="fg.muted">La barra indica un avance orientativo. Las etapas tienen distinta duración; el tiempo restante se estima solo para la etapa actual.</Text>
                </Box>}
                <RenderWindow model={model} active={isActive && open} />
                {draft && <Stack gap="1">
                    <Text fontSize="sm">{draft.vertexCount.toLocaleString()} vértices · {draft.triangleCount.toLocaleString()} triángulos · {draft.registeredImages}/{draft.usedImages} vistas incorporadas · un cuerpo conectado.</Text>
                    {draft.warnings.map((warning, index) => <Text key={index} fontSize="sm" color="orange.fg">{warning}</Text>)}
                    {!ready && <Text fontSize="sm" color="orange.fg">Las fotos cambiaron. Reconstruye para revisar la actualización.</Text>}
                </Stack>}
                {error && <Text role="alert" color="red.fg">{error}</Text>}
                {message && <Text role="status" fontSize="sm">{message}</Text>}
                <Flex gap="2" wrap="wrap" align="center">
                    {draft && <Button size="sm" variant="outline" disabled={locked || busy || imageProcessing || !ready} onClick={() => { setAccepted(true); setMessage("Modelo aceptado para guardar."); }}>{accepted ? "Modelo aceptado" : "Aceptar este modelo"}</Button>}
                    {draft && <Button size="sm" colorPalette="teal" disabled={locked || busy || imageProcessing || !ready || !accepted || !productoId || loading || metadata === undefined} loading={persisting} onClick={() => void persist()}>Guardar modelo 3D</Button>}
                    {productoId && <Button size="sm" variant="ghost" disabled={persisting || loading || disabled || imageProcessing} onClick={() => setReload(value => value + 1)} loading={loading}>Recargar modelo guardado</Button>}
                    {metadata && canEdit && <Button size="sm" variant="ghost" disabled={locked || busy || loading || imageProcessing} onClick={() => void removeStoredModel()}>Quitar modelo guardado</Button>}
                </Flex>
                {!productoId && <Text fontSize="sm" color="fg.muted">Primero crea el terminado. Tu modelo local se conservará para guardarlo después.</Text>}
                {metadata && <Text fontSize="xs" color="fg.muted">Modelo asociado a {metadata.productoId} · {(metadata.contentLength / 1024 / 1024).toFixed(2)} MiB · {new Date(metadata.updatedAt).toLocaleString()}</Text>}
                <Text fontSize="xs" color="fg.muted">Mantén esta página abierta durante el cálculo. Salir de Productos o recargar descarta el trabajo local. El servidor recibe solo el GLB final, con sus texturas derivadas. <Link href={reconstructionNoticesUrl} target="_blank" rel="noopener noreferrer">Licencias del motor</Link></Text>
            </Stack>
        </Box>
    </Box>;
}
