import { useEffect, useId, useRef, useState } from "react";
import { Box, Button, chakra, Flex, Image as ChakraImage, Input, Link, NativeSelect, Progress, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { segmentObjectAcrossImages, segmentationLicenseNotice, segmentationModelInfo, type ObjectMask, type SegmentationProgress } from "./ObjectSegmentation.ts";

export interface PhotoPoint { x: number; y: number }
type BinaryMask = { data: Uint8Array; width: number; height: number };
export interface ModelPhoto {
    id: string; file: File; url: string; width: number; height: number; polygon: PhotoPoint[];
    automatic?: ObjectMask & { accepted: boolean };
    diagnostics?: Pick<ObjectMask, "matchedImageIds" | "warnings">;
}
type PhotoDraft = { points: PhotoPoint[]; mask: BinaryMask | null; maskEdited: boolean; source?: BinaryMask; tool: "polygon" | "paint" | "erase" };

const hasMask = (photo: ModelPhoto) => photo.polygon.length >= 3 || !!photo.automatic?.accepted;
function polygonMask(photo: ModelPhoto): BinaryMask {
    const scale = Math.min(1, 512 / Math.max(photo.width, photo.height));
    const target = document.createElement("canvas");
    target.width = Math.max(1, Math.round(photo.width * scale)); target.height = Math.max(1, Math.round(photo.height * scale));
    const ctx = target.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar el contorno de referencia.");
    ctx.fillStyle = "white"; ctx.beginPath();
    photo.polygon.forEach((p, i) => i ? ctx.lineTo(p.x * target.width, p.y * target.height) : ctx.moveTo(p.x * target.width, p.y * target.height));
    ctx.closePath(); ctx.fill();
    const rgba = ctx.getImageData(0, 0, target.width, target.height).data;
    return { width: target.width, height: target.height, data: Uint8Array.from({ length: target.width * target.height }, (_, i) => rgba[i * 4 + 3] > 127 ? 1 : 0) };
}

export default function ImageManager({ photos, onChange, active, disabled, onBusyChange }: {
    photos: ModelPhoto[]; onChange: (photos: ModelPhoto[]) => void; active: boolean; disabled: boolean;
    onBusyChange: (busy: boolean) => void;
}) {
    const input = useRef<HTMLInputElement>(null), video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null);
    const generation = useRef(0), importingRef = useRef(false), segmentRun = useRef<AbortController | null>(null);
    const photosRef = useRef(photos); photosRef.current = photos;
    const onChangeRef = useRef(onChange); onChangeRef.current = onChange;
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraPending, setCameraPending] = useState(false), [importing, setImporting] = useState(false);
    const [segmenting, setSegmenting] = useState(false), [progress, setProgress] = useState<SegmentationProgress | null>(null);
    const [elapsed, setElapsed] = useState(0), [eta, setEta] = useState<number | null>(null);
    const [error, setError] = useState(""), [message, setMessage] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null), [points, setPoints] = useState<PhotoPoint[]>([]);
    const [maskDraft, setMaskDraft] = useState<BinaryMask | null>(null), [maskEdited, setMaskEdited] = useState(false);
    const [tool, setTool] = useState<"polygon" | "paint" | "erase">("polygon"), [brushSize, setBrushSize] = useState(8);
    const [cursor, setCursor] = useState<PhotoPoint>({ x: 0.5, y: 0.5 });
    const stroke = useRef<PhotoPoint | null>(null);
    const drafts = useRef(new Map<string, PhotoDraft>());
    const loadedDraft = useRef<{ id: string | null; source?: BinaryMask } | null>(null);
    const stageSample = useRef({ stage: "", at: 0, completed: 0 });
    const instructionsId = useId();
    const selected = photos.find(photo => photo.id === selectedId);
    const locked = disabled || importing || segmenting;

    function commit(next: ModelPhoto[]) { photosRef.current = next; onChangeRef.current(next); }
    function rememberSelected() {
        if (selected) drafts.current.set(selected.id, { points, mask: maskDraft, maskEdited, source: selected.automatic?.mask, tool });
    }
    function selectPhoto(photo: ModelPhoto) { rememberSelected(); setSelectedId(photo.id); }
    useEffect(() => { onBusyChange(segmenting || importing); }, [segmenting, importing, onBusyChange]);
    useEffect(() => () => { generation.current++; segmentRun.current?.abort(); onBusyChange(false); }, [onBusyChange]);
    useEffect(() => {
        const kept = new Set(photos.map(photo => photo.id));
        for (const id of drafts.current.keys()) if (!kept.has(id)) drafts.current.delete(id);
    }, [photos]);
    useEffect(() => {
        if (!active || disabled) {
            generation.current++; segmentRun.current?.abort(); setStream(null); setCameraPending(false);
            setImporting(false); importingRef.current = false;
        }
    }, [active, disabled]);
    useEffect(() => {
        if (stream && video.current) { video.current.srcObject = stream; void video.current.play().catch(() => setError("No se pudo iniciar la vista de la cámara.")); }
        return () => stream?.getTracks().forEach(track => track.stop());
    }, [stream]);
    useEffect(() => {
        const photo = photosRef.current.find(item => item.id === selectedId);
        const mask = photo?.automatic?.mask;
        // Fast Refresh reruns effects even when the selection/source did not change.
        if (loadedDraft.current?.id === selectedId && loadedDraft.current.source === mask) return;
        loadedDraft.current = { id: selectedId, source: mask };
        const saved = photo ? drafts.current.get(photo.id) : undefined;
        const reusable = saved && saved.source === mask;
        setMaskDraft(reusable ? saved.mask : mask ? { ...mask, data: mask.data.slice() } : null);
        setMaskEdited(reusable ? saved.maskEdited : false); setPoints(saved?.points ?? photo?.polygon ?? []);
        setTool(reusable ? saved.tool : mask ? "paint" : "polygon"); stroke.current = null;
    }, [selectedId, selected?.automatic?.mask]);
    useEffect(() => {
        if (!segmenting) return;
        const started = performance.now();
        const timer = window.setInterval(() => setElapsed(Math.floor((performance.now() - started) / 1000)), 1000);
        return () => clearInterval(timer);
    }, [segmenting]);
    useEffect(() => {
        if (!selected || !canvas.current) return;
        const target = canvas.current, ctx = target.getContext("2d");
        if (!ctx) return;
        let cancelled = false;
        const image = new Image();
        image.onload = () => {
            if (cancelled) return;
            const scale = Math.min(1, 900 / Math.max(selected.width, selected.height));
            target.width = Math.max(1, Math.round(selected.width * scale)); target.height = Math.max(1, Math.round(selected.height * scale));
            ctx.drawImage(image, 0, 0, target.width, target.height);
            if (maskDraft && tool !== "polygon") {
                const overlay = document.createElement("canvas"); overlay.width = maskDraft.width; overlay.height = maskDraft.height;
                const pixels = new ImageData(maskDraft.width, maskDraft.height);
                for (let y = 0; y < maskDraft.height; y++) for (let x = 0; x < maskDraft.width; x++) {
                    const i = y * maskDraft.width + x, value = maskDraft.data[i];
                    const edge = value && (x === 0 || y === 0 || x === maskDraft.width - 1 || y === maskDraft.height - 1 ||
                        !maskDraft.data[i - 1] || !maskDraft.data[i + 1] || !maskDraft.data[i - maskDraft.width] || !maskDraft.data[i + maskDraft.width]);
                    pixels.data.set(edge ? [45, 212, 191, 255] : value ? [0, 0, 0, 0] : [0, 0, 0, 175], i * 4);
                }
                overlay.getContext("2d")?.putImageData(pixels, 0, 0); ctx.imageSmoothingEnabled = false;
                ctx.drawImage(overlay, 0, 0, target.width, target.height);
            } else if (points.length >= 3) {
                ctx.beginPath(); ctx.rect(0, 0, target.width, target.height);
                points.forEach((p, i) => i ? ctx.lineTo(p.x * target.width, p.y * target.height) : ctx.moveTo(p.x * target.width, p.y * target.height));
                ctx.closePath(); ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fill("evenodd");
            }
            if (tool === "polygon" && points.length) {
                ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x * target.width, p.y * target.height) : ctx.moveTo(p.x * target.width, p.y * target.height));
                if (points.length >= 3) ctx.closePath(); ctx.strokeStyle = "#2dd4bf"; ctx.lineWidth = 3; ctx.stroke();
                for (const p of points) { ctx.beginPath(); ctx.arc(p.x * target.width, p.y * target.height, 4, 0, Math.PI * 2); ctx.fillStyle = "white"; ctx.fill(); }
            }
            ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1; ctx.beginPath();
            ctx.arc(cursor.x * target.width, cursor.y * target.height, tool === "polygon" ? 4 : brushSize / (maskDraft?.width ?? 512) * target.width, 0, Math.PI * 2); ctx.stroke();
        };
        image.src = selected.url;
        return () => { cancelled = true; };
    }, [selected, points, maskDraft, tool, cursor, brushSize]);

    async function addFiles(files: File[]) {
        if (disabled || importingRef.current || segmentRun.current || !active) return;
        importingRef.current = true; const revision = generation.current;
        setImporting(true); setError(""); setMessage("");
        const additions: ModelPhoto[] = [], failures: string[] = [];
        for (const file of files) {
            try {
                if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("usa JPG, PNG o WebP");
                if (file.size > 20 * 1024 * 1024) throw new Error("supera los 20 MiB por foto");
                const bitmap = await createImageBitmap(file);
                try {
                    const { width, height } = bitmap;
                    if (!width || !height || width * height > 60_000_000) throw new Error("resolución no admitida (máximo 60 megapíxeles)");
                    // Keep original files for reconstruction, but decode only bounded previews when editing.
                    const ratio = Math.min(1, 1024 / Math.max(width, height)), preview = document.createElement("canvas");
                    preview.width = Math.max(1, Math.round(width * ratio)); preview.height = Math.max(1, Math.round(height * ratio));
                    const ctx = preview.getContext("2d"); if (!ctx) throw new Error("no se pudo preparar la vista previa");
                    ctx.drawImage(bitmap, 0, 0, preview.width, preview.height);
                    const blob = await new Promise<Blob | null>(resolve => preview.toBlob(resolve, "image/png"));
                    if (!blob) throw new Error("no se pudo preparar la vista previa");
                    additions.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(blob), width, height, polygon: [] });
                } finally { bitmap.close(); }
            } catch (cause) { failures.push(`${file.name}: ${cause instanceof Error ? cause.message : "no se pudo leer"}`); }
            if (generation.current !== revision) break;
        }
        if (generation.current !== revision) { additions.forEach(photo => URL.revokeObjectURL(photo.url)); return; }
        commit([...photosRef.current, ...additions]);
        if (!selected && additions.length) { setSelectedId(additions[0].id); setPoints([]); }
        setError(failures.join(". ")); setImporting(false); importingRef.current = false;
    }

    async function startCamera() {
        if (!navigator.mediaDevices?.getUserMedia) { setError("La cámara requiere HTTPS o localhost y un navegador compatible."); return; }
        const revision = generation.current; setError(""); setCameraPending(true);
        try {
            const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } } });
            if (generation.current !== revision) next.getTracks().forEach(track => track.stop()); else setStream(next);
        } catch { if (generation.current === revision) setError("No se pudo abrir la cámara. Revisa el permiso o selecciona archivos."); }
        finally { if (generation.current === revision) setCameraPending(false); }
    }
    function takePhoto() {
        const source = video.current; if (!source?.videoWidth) return;
        const target = document.createElement("canvas"); target.width = source.videoWidth; target.height = source.videoHeight;
        target.getContext("2d")?.drawImage(source, 0, 0); const revision = generation.current;
        target.toBlob(blob => { if (blob && generation.current === revision) void addFiles([new File([blob], `captura-${Date.now()}.jpg`, { type: "image/jpeg" })]); }, "image/jpeg", 0.94);
    }
    async function generateMasks() {
        if (locked || !active || segmentRun.current || !photos.length) return;
        const controller = new AbortController(); segmentRun.current = controller;
        const revision = ++generation.current;
        const replaceable = new Set(photos.filter(photo => !hasMask(photo)).map(photo => photo.id));
        rememberSelected();
        setStream(null); setSegmenting(true); setProgress(null); setElapsed(0); setEta(null); setError(""); setMessage("");
        stageSample.current = { stage: "", at: 0, completed: 0 };
        try {
            await segmentObjectAcrossImages(photos.map(photo => ({ id: photo.id, file: photo.file, width: photo.width, height: photo.height,
                priorMask: photo.automatic?.accepted ? photo.automatic.mask : photo.polygon.length >= 3 ? polygonMask(photo) : undefined })), {
                signal: controller.signal,
                onProgress: next => {
                    if (generation.current !== revision || controller.signal.aborted) return;
                    const now = performance.now();
                    if (stageSample.current.stage !== next.stage) { stageSample.current = { stage: next.stage, at: now, completed: next.completed ?? 0 }; setEta(null); }
                    else if (next.total && next.completed != null && next.completed > stageSample.current.completed && now - stageSample.current.at >= 1000) {
                        setEta((now - stageSample.current.at) / (next.completed - stageSample.current.completed) * (next.total - next.completed) / 1000);
                    }
                    setProgress(next);
                },
                onResult: result => {
                    if (generation.current !== revision || controller.signal.aborted) return;
                    const saved = drafts.current.get(result.imageId);
                    if (saved && replaceable.has(result.imageId)) {
                        if (saved.maskEdited || saved.points.length) drafts.current.set(result.imageId, {
                            ...saved, source: result.mask, mask: saved.maskEdited ? saved.mask : { ...result.mask, data: result.mask.data.slice() },
                        });
                        else drafts.current.delete(result.imageId);
                    }
                    commit(photosRef.current.map(photo => {
                        if (photo.id !== result.imageId) return photo;
                        if (replaceable.has(result.imageId)) return { ...photo, polygon: [], diagnostics: undefined, automatic: { ...result, accepted: false } };
                        const diagnostics = { warnings: result.warnings, matchedImageIds: result.matchedImageIds };
                        return { ...photo, diagnostics, automatic: photo.automatic ? { ...photo.automatic, ...diagnostics } : undefined };
                    }));
                },
            });
            if (!controller.signal.aborted && generation.current === revision) setMessage("Contornos propuestos. Revisa que cada máscara corresponda al producto y acepta las que estén correctas.");
        } catch (cause) {
            if (controller.signal.aborted) setMessage("Segmentación cancelada. Las fotos y las propuestas recibidas se conservan para revisión.");
            else setError(cause instanceof Error ? cause.message : "No se pudo completar la segmentación. Puedes conservar las propuestas recibidas o delimitar manualmente.");
        } finally { if (segmentRun.current === controller) { segmentRun.current = null; setSegmenting(false); } }
    }
    function savePolygon(polygon: PhotoPoint[]) {
        if (!selected) return;
        drafts.current.delete(selected.id);
        commit(photosRef.current.map(photo => photo.id === selected.id ? { ...photo, polygon, automatic: undefined, diagnostics: undefined } : photo));
        const next = photosRef.current.find(photo => photo.id !== selected.id && !hasMask(photo));
        if (next) { setSelectedId(next.id); setPoints(next.polygon); }
    }
    function acceptMask() {
        if (!selected?.automatic || !maskDraft || locked || selected.automatic.accepted && !maskEdited) return;
        if (!maskDraft.data.some(value => value > 0)) { setError("La máscara no contiene objeto. Corrígela antes de aceptarla."); return; }
        drafts.current.delete(selected.id);
        commit(photosRef.current.map(photo => photo.id === selected.id && photo.automatic ? { ...photo, diagnostics: undefined, automatic: {
            ...photo.automatic, mask: maskDraft, accepted: true,
            matchedImageIds: maskEdited ? [] : photo.automatic.matchedImageIds,
            warnings: maskEdited ? ["Máscara corregida manualmente: revisa su consistencia con las otras vistas."] : photo.automatic.warnings,
        } } : photo));
        setMaskEdited(false); setError("");
        const next = photosRef.current.find(photo => photo.id !== selected.id && !hasMask(photo));
        if (next) { setSelectedId(next.id); setPoints(next.polygon); }
    }
    function invalidateContour() {
        if (selected && hasMask(selected)) commit(photosRef.current.map(photo => photo.id === selected.id ? {
            ...photo, polygon: [], automatic: photo.automatic ? { ...photo.automatic, accepted: false } : undefined,
        } : photo));
    }
    function mark(point: PhotoPoint, from?: PhotoPoint) {
        setCursor(point);
        invalidateContour();
        if (tool === "polygon") { setPoints(current => [...current, point]); return; }
        setMaskDraft(current => {
            if (!current) return current;
            const data = current.data.slice(), a = from ?? point;
            const steps = Math.max(1, Math.ceil(Math.hypot((point.x - a.x) * current.width, (point.y - a.y) * current.height) / Math.max(1, brushSize / 2)));
            for (let step = 0; step <= steps; step++) {
                const cx = (a.x + (point.x - a.x) * step / steps) * current.width, cy = (a.y + (point.y - a.y) * step / steps) * current.height;
                for (let y = Math.max(0, Math.floor(cy - brushSize)); y <= Math.min(current.height - 1, Math.ceil(cy + brushSize)); y++)
                    for (let x = Math.max(0, Math.floor(cx - brushSize)); x <= Math.min(current.width - 1, Math.ceil(cx + brushSize)); x++)
                        if ((x - cx) ** 2 + (y - cy) ** 2 <= brushSize ** 2) data[y * current.width + x] = tool === "paint" ? 1 : 0;
            }
            return { ...current, data };
        });
        setMaskEdited(true);
    }
    const atPointer = (event: React.PointerEvent<HTMLCanvasElement>): PhotoPoint => {
        const bounds = event.currentTarget.getBoundingClientRect();
        return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
    };

    return <Stack gap="3">
        <Text fontSize="sm" color="fg.muted">Fotografía el mismo objeto desde distintos ángulos, con luz estable y vistas solapadas. Genera sus contornos automáticamente o delimítalo manualmente. Las fotografías se procesan en este dispositivo.</Text>
        <Flex gap="2" wrap="wrap">
            <Input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={locked} aria-label="Seleccionar fotografías del terminado" onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void addFiles(files); }} />
            <Button size="sm" variant="outline" disabled={locked} loading={importing} onClick={() => input.current?.click()}>Seleccionar fotografías</Button>
            <Button size="sm" variant="outline" disabled={locked || !!stream || cameraPending} loading={cameraPending} onClick={() => void startCamera()}>Abrir cámara</Button>
            <Button size="sm" colorPalette="teal" disabled={locked || cameraPending || !photos.some(photo => !hasMask(photo))} onClick={() => void generateMasks()}>Generar contornos automáticos</Button>
            {segmenting && <Button size="sm" variant="outline" onClick={() => segmentRun.current?.abort()}>Cancelar segmentación</Button>}
            <Text fontSize="sm" alignSelf="center">{photos.length} fotografías · {photos.filter(hasMask).length} contornos aceptados</Text>
        </Flex>
        {!!photos.length && <Text fontSize="xs" color="fg.muted">El modo automático descarga el modelo la primera vez (aprox. {Math.round(segmentationModelInfo.downloadBytes / 1_000_000)} MB). Las propuestas requieren tu revisión. <Link href={segmentationModelInfo.url} target="_blank" rel="noopener noreferrer">Modelo y licencia</Link></Text>}
        {!!photos.length && <chakra.details fontSize="xs" color="fg.muted"><chakra.summary cursor="pointer">Licencias de segmentación automática</chakra.summary><Text as="pre" whiteSpace="pre-wrap" mt="2">{segmentationLicenseNotice}</Text></chakra.details>}
        {segmenting && <Box role="status" aria-live="polite">
            <Text fontSize="sm">{progress?.stage ?? "Preparando la segmentación…"}</Text>
            <Progress.Root aria-label="Progreso de segmentación" value={progress?.fraction == null ? null : Math.round(progress.fraction * 100)} mt="2" colorPalette="teal"><Progress.Track><Progress.Range /></Progress.Track></Progress.Root>
            <Text fontSize="xs" mt="1">{progress?.total ? `${progress.completed ?? 0}/${progress.total} · ` : ""}{progress?.downloadedBytes != null ? `${(progress.downloadedBytes / 1_000_000).toFixed(1)}${progress.totalBytes ? `/${(progress.totalBytes / 1_000_000).toFixed(1)}` : ""} MB · ` : ""}{elapsed} s transcurridos · {eta != null && eta > 0 ? `aprox. ${Math.ceil(eta)} s restantes en esta etapa` : "estimación pendiente de datos de esta etapa"}</Text>
        </Box>}
        {stream && <Box borderWidth="1px" rounded="md" p="3"><chakra.video ref={video} autoPlay playsInline muted w="full" maxH="340px" aria-label="Vista de la cámara" /><Flex gap="2" mt="2"><Button size="sm" disabled={locked} onClick={takePhoto}>Tomar fotografía</Button><Button size="sm" variant="outline" onClick={() => { generation.current++; setStream(null); }}>Cerrar cámara</Button></Flex></Box>}
        {error && <Text role="alert" color="red.fg" fontSize="sm">{error}</Text>}
        {message && <Text role="status" fontSize="sm">{message}</Text>}
        {!!photos.length && <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
            <Stack maxH="360px" overflowY="auto" gap="2" aria-label="Fotografías de la sesión">
                {photos.map((photo, index) => <Flex key={photo.id} gap="2" align="center" borderWidth="1px" rounded="md" p="2" bg={selectedId === photo.id ? "bg.muted" : "bg.panel"}>
                    <ChakraImage src={photo.url} alt={`Fotografía ${index + 1} del objeto`} w="52px" h="52px" objectFit="cover" rounded="sm" />
                    <Button size="sm" variant="ghost" flex="1" minW="0" justifyContent="start" disabled={locked} onClick={() => selectPhoto(photo)}><Text truncate>{index + 1}. {hasMask(photo) ? "Contorno aceptado" : photo.automatic ? "Revisar propuesta" : "Delimitar objeto"}</Text></Button>
                    <Button size="xs" variant="ghost" disabled={locked} aria-label={`Quitar fotografía ${index + 1}`} onClick={() => { drafts.current.delete(photo.id); commit(photosRef.current.filter(item => item.id !== photo.id)); if (selectedId === photo.id) { setSelectedId(null); setPoints([]); } }}>Quitar</Button>
                </Flex>)}
            </Stack>
            {selected && <Stack gap="2">
                <Text id={instructionsId} fontSize="sm">{selected.automatic ? "Revisa la silueta: la zona oscura queda excluida. Añade o quita zonas con el pincel y acepta la máscara cuando represente el producto. Se conservan sus huecos." : "Marca puntos alrededor del objeto y pulsa «Aplicar contorno». La zona oscura queda excluida."}</Text>
                {(selected.automatic?.warnings ?? selected.diagnostics?.warnings)?.map((warning, index) => <Text key={index} fontSize="xs" color="orange.fg">{warning}</Text>)}
                <Flex gap="2" wrap="wrap">
                    {maskDraft && <><Button size="xs" variant={tool === "paint" ? "solid" : "outline"} disabled={locked} onClick={() => setTool("paint")}>Añadir objeto</Button><Button size="xs" variant={tool === "erase" ? "solid" : "outline"} disabled={locked} onClick={() => setTool("erase")}>Quitar fondo</Button><NativeSelect.Root size="xs" w="auto" disabled={locked}><NativeSelect.Field aria-label="Tamaño del pincel" value={brushSize} onChange={event => setBrushSize(Number(event.target.value))}><option value={3}>Pincel fino</option><option value={8}>Pincel medio</option><option value={18}>Pincel grueso</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></>}
                    <Button size="xs" variant={tool === "polygon" ? "solid" : "outline"} disabled={locked} onClick={() => setTool("polygon")}>Trazar polígono manual</Button>
                </Flex>
                <Box maxH="500px" overflowY="auto"><chakra.canvas ref={canvas} w="full" h="auto" cursor={locked ? "default" : "crosshair"} touchAction="none" tabIndex={locked ? -1 : 0} role="img" aria-label="Editor del contorno del objeto" aria-describedby={instructionsId}
                    onPointerDown={event => { if (locked || event.button !== 0) return; event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); const p = atPointer(event); mark(p); stroke.current = p; }}
                    onPointerMove={event => { if (locked || !stroke.current || tool === "polygon") return; const p = atPointer(event); mark(p, stroke.current); stroke.current = p; }}
                    onPointerUp={() => { stroke.current = null; }} onPointerCancel={() => { stroke.current = null; }}
                    onKeyDown={event => {
                        if (locked) return;
                        const dx = event.key === "ArrowRight" ? 0.01 : event.key === "ArrowLeft" ? -0.01 : 0, dy = event.key === "ArrowDown" ? 0.01 : event.key === "ArrowUp" ? -0.01 : 0;
                        if (dx || dy) { event.preventDefault(); setCursor(p => ({ x: Math.max(0, Math.min(1, p.x + dx)), y: Math.max(0, Math.min(1, p.y + dy)) })); }
                        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); mark(cursor); }
                    }} /></Box>
                <Flex gap="2" wrap="wrap">
                    {selected.automatic && tool !== "polygon" && <><Button size="xs" colorPalette="teal" disabled={locked || !maskDraft || selected.automatic.accepted && !maskEdited} onClick={acceptMask}>{selected.automatic.accepted && !maskEdited ? "Máscara aceptada" : "Aceptar máscara"}</Button><Button size="xs" variant="outline" disabled={locked || !maskEdited} onClick={() => { const mask = selected.automatic!.mask; setMaskDraft({ ...mask, data: mask.data.slice() }); setMaskEdited(false); }}>Deshacer ajustes del pincel</Button></>}
                    {tool === "polygon" && <><Button size="xs" disabled={locked || points.length < 3} onClick={() => savePolygon(points)}>Aplicar contorno</Button><Button size="xs" variant="outline" disabled={locked || !points.length} onClick={() => { invalidateContour(); setPoints(current => current.slice(0, -1)); }}>Deshacer punto</Button><Button size="xs" variant="outline" disabled={locked} onClick={() => { invalidateContour(); setPoints([]); }}>Rehacer contorno</Button></>}
                    <Button size="xs" variant="outline" disabled={locked} onClick={() => { const full = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]; setPoints(full); savePolygon(full); }}>Foto ya aislada</Button>
                </Flex>
                <Text fontSize="xs" color="fg.muted">Teclado: flechas para mover el cursor; Enter para marcar un punto o aplicar el pincel. {maskEdited ? "Hay ajustes del pincel pendientes de aceptar." : ""}</Text>
            </Stack>}
        </SimpleGrid>}
    </Stack>;
}
