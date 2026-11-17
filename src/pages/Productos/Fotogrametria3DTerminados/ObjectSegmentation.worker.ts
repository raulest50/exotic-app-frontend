import ortModuleUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import ortWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import type {
  ObjectBinaryMask, ObjectMask, SegmentationImage, SegmentationProgress,
  SegmentationWorkerMessage, SegmentationWorkerRequest, segmentationModelInfo,
} from "./ObjectSegmentation";
import type { Keypoints as KeypointsType } from "./vendor/websfm/engine.js";

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<SegmentationWorkerRequest>) => void) | null;
  postMessage: (message: SegmentationWorkerMessage, transfer?: Transferable[]) => void;
};
const NETWORK_SIDE = 512;
const FEATURE_SIDE = 768;
const CACHE_NAME = "exotic-object-segmentation-model-v1";
const PENDING_COMPARISON = "Comparación entre vistas pendiente. Revisa que la máscara corresponda al producto.";

function progress(value: SegmentationProgress) { scope.postMessage({ kind: "progress", progress: value }); }
function result(value: ObjectMask) {
  scope.postMessage({ kind: "result", result: value }, [value.mask.data.buffer as ArrayBuffer]);
}
function context(width: number, height: number) {
  const canvas = new OffscreenCanvas(width, height);
  const drawing = canvas.getContext("2d", { willReadFrequently: true });
  if (!drawing) throw new Error("Este navegador no permite preparar imágenes en el motor local.");
  return { canvas, drawing };
}
function sha256(bytes: ArrayBuffer) {
  return crypto.subtle.digest("SHA-256", bytes).then((digest) => [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""));
}

async function readModel(model: typeof segmentationModelInfo): Promise<Uint8Array> {
  if (!crypto.subtle) throw new Error("La segmentación automática requiere HTTPS o localhost para comprobar la integridad del modelo.");
  let cache: Cache | undefined;
  try { if (typeof caches !== "undefined") cache = await caches.open(CACHE_NAME); } catch { /* Browser storage is optional. */ }
  const cached = await cache?.match(model.downloadUrl).catch(() => undefined);
  if (cached) {
    progress({ stage: "Verificando el modelo descargado", fraction: 0.03, downloadedBytes: model.downloadBytes, totalBytes: model.downloadBytes });
    const bytes = await cached.arrayBuffer();
    if (bytes.byteLength === model.downloadBytes && await sha256(bytes) === model.sha256) return new Uint8Array(bytes);
    await cache?.delete(model.downloadUrl).catch(() => false);
  }
  progress({ stage: "Descargando el modelo de segmentación", fraction: 0, downloadedBytes: 0, totalBytes: model.downloadBytes });
  const response = await fetch(model.downloadUrl, { credentials: "omit", referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error(`No se pudo descargar el modelo de segmentación (HTTP ${response.status}). Las fotografías siguen disponibles para delimitarlas manualmente.`);
  const bytes = new Uint8Array(model.downloadBytes);
  let received = 0;
  if (response.body) {
    const reader = response.body.getReader();
    let lastUpdate = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        if (received + chunk.value.length > bytes.length) throw new Error("El archivo del modelo supera el tamaño verificado.");
        bytes.set(chunk.value, received);
        received += chunk.value.length;
        const now = performance.now();
        if (now - lastUpdate >= 150 || received === model.downloadBytes) {
          lastUpdate = now;
          progress({ stage: "Descargando el modelo de segmentación", fraction: 0.1 * received / model.downloadBytes, downloadedBytes: received, totalBytes: model.downloadBytes });
        }
      }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  } else {
    const downloaded = new Uint8Array(await response.arrayBuffer());
    if (downloaded.length !== bytes.length) throw new Error("La descarga del modelo no tiene el tamaño verificado.");
    bytes.set(downloaded); received = downloaded.length;
  }
  progress({ stage: "Verificando la integridad del modelo", fraction: 0.11, downloadedBytes: received, totalBytes: model.downloadBytes });
  if (received !== model.downloadBytes || await sha256(bytes.buffer) !== model.sha256) {
    throw new Error("El modelo descargado no coincide con la revisión y la huella verificadas. No se ejecutó el archivo.");
  }
  if (cache) {
    try {
      // Only this immutable checkpoint is cached. No images or masks enter Cache Storage.
      await cache.put(model.downloadUrl, new Response(bytes, { headers: { "Content-Type": "application/octet-stream" } }));
    } catch { /* Quota/private mode must not prevent local processing. */ }
  }
  return bytes;
}

function candidateMask(logits: Float32Array, image: SegmentationImage): { mask: ObjectBinaryMask; warnings: string[] } {
  const scale = Math.min(1, NETWORK_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const data = new Uint8Array(width * height);
  let foreground = 0, uncertain = 0, nonFinite = 0;
  for (let y = 0; y < height; y++) {
    const sy = Math.min(NETWORK_SIDE - 1, Math.floor((y + 0.5) * NETWORK_SIDE / height));
    for (let x = 0; x < width; x++) {
      const sx = Math.min(NETWORK_SIDE - 1, Math.floor((x + 0.5) * NETWORK_SIDE / width));
      const value = logits[sy * NETWORK_SIDE + sx];
      if (!Number.isFinite(value)) { nonFinite++; continue; }
      // sigmoid(logit) >= 0.5 is exactly logit >= 0; retain holes and fragments.
      data[y * width + x] = value >= 0 ? 1 : 0;
      foreground += data[y * width + x];
      if (Math.abs(value) < 0.4) uncertain++;
    }
  }
  if (nonFinite) throw new Error("El modelo produjo valores de máscara no válidos.");
  if (foreground < 16) throw new Error("No se distinguió un objeto con área suficiente. Delimita esta vista manualmente.");
  const warnings = [PENDING_COMPARISON];
  if (foreground / data.length > 0.95) warnings.push("La propuesta incluye casi toda la fotografía; puede conservar parte del fondo.");
  if (foreground / data.length < 0.005) warnings.push("El objeto propuesto es muy pequeño. Revisa que no se hayan perdido partes del producto.");
  if (uncertain / data.length > 0.15) warnings.push("Hay una región amplia con separación ambigua entre objeto y fondo; revisa el contorno.");
  return { mask: { data, width, height }, warnings };
}

async function segment(images: SegmentationImage[], model: typeof segmentationModelInfo) {
  if (typeof OffscreenCanvas === "undefined") throw new Error("Este navegador no permite procesar las fotografías en segundo plano. Puedes delimitar el objeto manualmente.");
  const needsModel = images.some((image) => !image.priorMask);
  // Kept inside this phase: the matching worker must never initialise ONNX/WASM.
  const ort = needsModel ? await import("onnxruntime-web/wasm") : undefined;
  let session: import("onnxruntime-web").InferenceSession | undefined;
  try {
    if (ort) {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = { mjs: ortModuleUrl, wasm: ortWasmUrl };
      const bytes = await readModel(model);
      progress({ stage: "Preparando el modelo local de segmentación", fraction: 0.12 });
      session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all", executionMode: "sequential", enableMemPattern: true });
    }
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      progress({ stage: "Proponiendo contornos de las fotografías", fraction: 0.15 + 0.6 * i / images.length, completed: i, total: images.length });
      if (image.priorMask) {
        result({ imageId: image.id, mask: image.priorMask, matchedImageIds: [], warnings: [PENDING_COMPARISON], reviewRequired: true });
        continue;
      }
      if (!ort || !session) throw new Error("El modelo local no está disponible.");
      try {
        const { canvas, drawing } = context(NETWORK_SIDE, NETWORK_SIDE);
        let bitmap: ImageBitmap | undefined;
        let input: import("onnxruntime-web").Tensor | undefined;
        let outputs: import("onnxruntime-web").InferenceSession.ReturnType | undefined;
        try {
          bitmap = await createImageBitmap(image.file, { imageOrientation: "from-image", resizeWidth: NETWORK_SIDE, resizeHeight: NETWORK_SIDE, resizeQuality: "high" });
          drawing.drawImage(bitmap, 0, 0, NETWORK_SIDE, NETWORK_SIDE);
          const rgba = drawing.getImageData(0, 0, NETWORK_SIDE, NETWORK_SIDE).data;
          const pixels = new Float32Array(3 * NETWORK_SIDE * NETWORK_SIDE);
          const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
          for (let channel = 0; channel < 3; channel++) for (let k = 0; k < NETWORK_SIDE * NETWORK_SIDE; k++) {
            pixels[channel * NETWORK_SIDE * NETWORK_SIDE + k] = (rgba[k * 4 + channel] / 255 - mean[channel]) / std[channel];
          }
          input = new ort.Tensor("float32", pixels, [1, 3, NETWORK_SIDE, NETWORK_SIDE]);
          outputs = await session.run({ input_image: input });
          const output = outputs[session.outputNames[0]];
          if (!output || output.type !== "float32" || output.data.length !== NETWORK_SIDE * NETWORK_SIDE
            || output.dims.length !== 4 || output.dims[0] !== 1 || output.dims[1] !== 1
            || output.dims[2] !== NETWORK_SIDE || output.dims[3] !== NETWORK_SIDE) {
            throw new Error("El modelo devolvió un formato de máscara no compatible.");
          }
          const candidate = candidateMask(output.data as Float32Array, image);
          result({ imageId: image.id, ...candidate, matchedImageIds: [], reviewRequired: true });
        } finally {
          input?.dispose();
          if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose();
          bitmap?.close(); canvas.width = 1; canvas.height = 1;
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "No se pudo obtener el contorno.";
        // A WASM allocation/trap may leave the runtime unusable; preserve earlier
        // proposals and let the caller terminate the worker instead of retrying it.
        if (/memory|alloc|out of bounds|unreachable|abort\(|failed to call|out of memory/i.test(message)) {
          throw Object.assign(new Error(`El equipo no pudo reservar memoria para segmentar ${image.file.name}. Se conservaron las propuestas anteriores; prueba menos fotografías o delimita manualmente.`), { cause });
        }
        scope.postMessage({ kind: "photo-error", imageId: image.id, message: `${image.file.name}: ${message}` });
      }
    }
    progress({ stage: "Contornos propuestos; preparando comparación entre vistas", fraction: 0.75, completed: images.length, total: images.length });
  } finally { await session?.release(); }
}

interface Features {
  id: string;
  keypoints: KeypointsType;
  descriptors: Float32Array;
  width: number;
  height: number;
}

function foregroundAt(mask: ObjectBinaryMask, x: number, y: number, width: number, height: number) {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const mx = Math.min(mask.width - 1, Math.floor(x * mask.width / width));
  const my = Math.min(mask.height - 1, Math.floor(y * mask.height / height));
  return mask.data[my * mask.width + mx] > 0;
}

async function features(image: SegmentationImage, mask: ObjectBinaryMask): Promise<Features> {
  const { detectSift, Keypoints } = await import("./vendor/websfm/engine.js");
  const scale = Math.min(1, FEATURE_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale)), height = Math.max(1, Math.round(image.height * scale));
  const { canvas, drawing } = context(width, height);
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(image.file, { imageOrientation: "from-image", resizeWidth: width, resizeHeight: height, resizeQuality: "high" });
    drawing.drawImage(bitmap, 0, 0, width, height);
    const pixels = drawing.getImageData(0, 0, width, height).data;
    const { flat } = await detectSift(pixels, width, height, { maxKeypoints: 2000, maxOrientations: 2, contrastThreshold: 0.01 });
    const keep: number[] = [], stride = 133;
    for (let k = 0; k < Math.floor((flat.length - 2) / stride); k++) {
      const x = flat[k * stride], y = flat[k * stride + 1];
      if (foregroundAt(mask, x, y, width, height) && foregroundAt(mask, x - 4, y, width, height)
        && foregroundAt(mask, x + 4, y, width, height) && foregroundAt(mask, x, y - 4, width, height)
        && foregroundAt(mask, x, y + 4, width, height)) keep.push(k);
    }
    const data = new Float32Array(keep.length * 6), descriptors = new Float32Array(keep.length * 128);
    keep.forEach((keypoint, i) => {
      const base = keypoint * stride, x = flat[base], y = flat[base + 1];
      data.set([x, y, x / width, y / height, flat[base + 2], flat[base + 3]], i * 6);
      descriptors.set(flat.subarray(base + 5, base + 133), i * 128);
    });
    return { id: image.id, keypoints: new Keypoints(data), descriptors, width, height };
  } finally { bitmap?.close(); canvas.width = 1; canvas.height = 1; }
}

/** Reject duplicate/concentrated inliers; these thresholds are diagnostic only. */
function enoughSpread(feature: Features, indices: number[]) {
  const unique = new Set<string>();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const index of indices) {
    const x = feature.keypoints.x(index), y = feature.keypoints.y(index);
    unique.add(`${Math.round(x)},${Math.round(y)}`);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  // Scale the vendored matching defaults (8px at1200px) to this raster.
  return unique.size >= indices.length * 0.5 && Math.hypot(maxX - minX, maxY - minY) >= 8 * Math.max(feature.width, feature.height) / 1200;
}

async function match(images: SegmentationImage[], masks: ObjectMask[]) {
  const maskMap = new Map(masks.map((mask) => [mask.imageId, mask]));
  const graph = new Map(images.map((image) => [image.id, new Set<string>()]));
  const detected: Features[] = [];
  for (let i = 0; i < images.length; i++) {
    progress({ stage: "Buscando detalle dentro del objeto propuesto", fraction: 0.75 + 0.1 * i / images.length, completed: i, total: images.length });
    const image = images[i], mask = maskMap.get(image.id);
    if (!mask) continue;
    const found = await features(image, mask.mask);
    if (found.keypoints.length < 24) mask.warnings.push("Hay poco detalle reconocible dentro de esta máscara; no se pudo contrastar el solapamiento con suficiente información.");
    detected.push(found);
  }
  const { matchDescriptors, verifyMatches } = await import("./vendor/websfm/engine.js");
  const total = detected.length * (detected.length - 1) / 2;
  let completed = 0;
  for (let a = 0; a < detected.length; a++) for (let b = a + 1; b < detected.length; b++) {
    progress({ stage: "Contrastando correspondencias entre fotografías", fraction: 0.85 + 0.14 * completed / Math.max(1, total), completed, total });
    const first = detected[a], second = detected[b];
    if (first.keypoints.length >= 24 && second.keypoints.length >= 24) {
      const putative = await matchDescriptors(first.descriptors, second.descriptors, { ratioThreshold: 0.8, crossCheck: true });
      if (putative.matches.length >= 20) {
        const verified = await verifyMatches(first.keypoints, second.keypoints, putative.matches, { ransacThreshPx: 2, maxIters: 10000 });
        if (verified && verified.inlierCount >= 20 && verified.inlierCount / putative.matches.length >= 0.15) {
          const inliers = putative.matches.filter((_, i) => verified.inlierMask[i] > 0.5);
          if (enoughSpread(first, inliers.map((item) => item.ia)) && enoughSpread(second, inliers.map((item) => item.ib))) {
            graph.get(first.id)!.add(second.id); graph.get(second.id)!.add(first.id);
            if (verified.hInlierCount / verified.inlierCount > 0.9) {
              for (const id of [first.id, second.id]) {
                const warning = "Algunas correspondencias pueden ser planas o de rotación: el solapamiento no garantiza profundidad recuperable.";
                const target = maskMap.get(id)!;
                if (!target.warnings.includes(warning)) target.warnings.push(warning);
              }
            }
          }
        }
      }
    }
    completed++;
  }
  const component = new Map<string, number>();
  let components = 0;
  for (const image of images) {
    if (component.has(image.id)) continue;
    const pending = [image.id]; component.set(image.id, components);
    while (pending.length) {
      const id = pending.pop()!;
      for (const neighbour of graph.get(id) ?? []) if (!component.has(neighbour)) {
        component.set(neighbour, components); pending.push(neighbour);
      }
    }
    components++;
  }
  for (const image of images) {
    const mask = maskMap.get(image.id);
    if (!mask) continue;
    const warnings = mask.warnings.filter((warning) => warning !== PENDING_COMPARISON);
    const neighbours = [...graph.get(image.id)!];
    if (images.length < 2) warnings.push("Se necesita otra vista solapada para contrastar el objeto entre fotografías.");
    else if (!neighbours.length) warnings.push("No se encontraron correspondencias geométricas suficientes con otras vistas. Puede faltar solapamiento, textura o una máscara correcta.");
    else if (components > 1) warnings.push(`Esta vista pertenece a un grupo separado del resto (${components} grupos). Añade vistas intermedias o revisa las máscaras; no se pudo verificar un recorrido común de solapamiento.`);
    warnings.push("Las correspondencias son un apoyo geométrico; no certifican que todas las máscaras sean el mismo producto. Confirma visualmente cada propuesta.");
    result({ ...mask, matchedImageIds: neighbours, warnings, reviewRequired: true });
  }
  progress({ stage: "Propuestas listas para revisión", fraction: 1, completed: images.length, total: images.length });
}

let started = false;
scope.onmessage = (event) => {
  if (started) return;
  started = true;
  const request = event.data;
  const task = request.kind === "segment" ? segment(request.images, request.model) : match(request.images, request.masks);
  void task.then(() => scope.postMessage({ kind: "done" })).catch((cause: unknown) => {
    scope.postMessage({ kind: "error", message: cause instanceof Error ? cause.message : "El motor local de segmentación no pudo finalizar." });
  });
};
