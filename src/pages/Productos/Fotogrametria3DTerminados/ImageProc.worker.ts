import type { ReconstructionImage, ReconstructionMesh, ReconstructionWorkerMessage } from "./ImageProc";
import {
  Keypoints, PoissonMesher, depthMapForImage, detectSift, filterDepthMapsGeometric,
  fuseDepthMaps, generateMesh, initMesh, makeSampleMap, matchDescriptors,
  packSparseForDense, reconstruct, resampleMaskLut, resampleRgba, rgbaToGray,
  scaleK, selectSourceViews, textureMesh, verifyMatches,
} from "./vendor/websfm/engine.js";
import type {
  Camera, DenseCloud, DepthMap, DepthRaster, Lens, Log, MeshData, Pair,
  PoissonInput, Raster, SfmImage,
} from "./vendor/websfm/engine.js";

// Each run owns a disposable worker. Cancellation requests its termination;
// the browser can take time to release a running WASM module and its memory.
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ images: ReconstructionImage[] }>) => void) | null;
  postMessage: (message: ReconstructionWorkerMessage, transfer?: Transferable[]) => void;
};
const DETECT_SIDE = 1200;
const DEPTH_SIDE = 480;
const MAX_WORKING_PIXELS = 48_000_000;
const SFM_STAGES: Record<string, string> = {
  initPair: "Seleccionando vistas iniciales",
  register: "Registrando cámaras del objeto",
  bundle: "Ajustando cámaras y geometría",
  retriangulate: "Refinando puntos multivista",
  trackFilter: "Filtrando correspondencias geométricas",
  gcpBundle: "Ajustando restricciones de cámaras",
  finalize: "Finalizando geometría multivista",
};

interface Photo extends Raster {
  id: string;
  name: string;
  foreground: Uint8Array;
  canvas: OffscreenCanvas;
}
interface View {
  camera: Camera;
  photo: Photo;
  lens: Lens | null;
  toPhoto: ((x: number, y: number) => { x: number; y: number }) | null;
}

function progress(stage: string, fraction: number, completed?: number, total?: number) {
  scope.postMessage({ kind: "progress", progress: { stage, fraction, completed, total } });
}

function maskAt(photo: Photo, x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= photo.width || y >= photo.height) return false;
  return photo.foreground[Math.min(photo.height - 1, Math.round(y)) * photo.width + Math.min(photo.width - 1, Math.round(x))] > 0;
}

function resizeMask(mask: ReconstructionImage["mask"], width: number, height: number, inverse = false) {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(mask.height - 1, Math.floor(((y + 0.5) * mask.height) / height));
    for (let x = 0; x < width; x++) {
      const sx = Math.min(mask.width - 1, Math.floor(((x + 0.5) * mask.width) / width));
      const foreground = mask.data[sy * mask.width + sx] > 0;
      out[y * width + x] = (inverse ? !foreground : foreground) ? 1 : 0;
    }
  }
  return out;
}

async function readPhoto(input: ReconstructionImage): Promise<Photo> {
  const { mask } = input;
  if (!Number.isInteger(mask.width) || !Number.isInteger(mask.height)
    || !(mask.width > 0 && mask.height > 0) || mask.data.length !== mask.width * mask.height) {
    throw new Error(`La máscara de ${input.file.name} no tiene dimensiones válidas.`);
  }
  const bitmap = await createImageBitmap(input.file, { imageOrientation: "from-image" });
  try {
    const ratio = Math.min(1, DETECT_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("No se pudo preparar la imagen en este navegador.");
    context.drawImage(bitmap, 0, 0, width, height);
    const foreground = resizeMask(mask, width, height);
    if (!foreground.some((pixel) => pixel > 0)) throw new Error(`La máscara de ${input.file.name} no contiene objeto.`);
    return { id: input.id, name: input.file.name, canvas, width, height, foreground, data: context.getImageData(0, 0, width, height).data };
  } finally {
    bitmap.close();
  }
}

async function features(photo: Photo) {
  const { flat } = await detectSift(photo.data, photo.width, photo.height, {
    maxKeypoints: 4000,
    maxOrientations: 2,
    contrastThreshold: 0.01,
  });
  // WebSfM's wire layout: 133 floats/keypoint, then raw/suppressed sentinels.
  const keep: number[] = [];
  const stride = 133;
  for (let k = 0; k < Math.floor((flat.length - 2) / stride); k++) {
    const x = flat[k * stride], y = flat[k * stride + 1];
    if (maskAt(photo, x, y) && maskAt(photo, x - 4, y) && maskAt(photo, x + 4, y)
      && maskAt(photo, x, y - 4) && maskAt(photo, x, y + 4)) keep.push(k);
  }
  const data = new Float32Array(keep.length * 6);
  const rgb = new Uint8Array(keep.length * 3);
  const descriptors = new Float32Array(keep.length * 128);
  keep.forEach((k, i) => {
    const base = k * stride;
    const x = flat[base], y = flat[base + 1];
    data.set([x, y, x / photo.width, y / photo.height, flat[base + 2], flat[base + 3]], i * 6);
    descriptors.set(flat.subarray(base + 5, base + 133), i * 128);
    const pixel = (Math.min(photo.height - 1, Math.round(y)) * photo.width + Math.min(photo.width - 1, Math.round(x))) * 4;
    rgb.set(photo.data.subarray(pixel, pixel + 3), i * 3);
  });
  return { keypoints: new Keypoints(data, rgb), descriptors };
}

function denseRaster(view: View): DepthRaster & { rgb: Uint8Array } {
  const { photo, camera, lens } = view;
  const ratio = Math.min(1, DEPTH_SIDE / Math.max(photo.width, photo.height));
  const width = Math.max(1, Math.round(photo.width * ratio));
  const height = Math.max(1, Math.round(photo.height * ratio));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No se pudo preparar la profundidad.");
  context.drawImage(photo.canvas, 0, 0, width, height);
  const scale = [width / photo.width, height / photo.height];
  const map = makeSampleMap({ K: camera.K, selfCal: lens, outScale: scale, srcScale: scale });
  const data = resampleRgba({ data: context.getImageData(0, 0, width, height).data, width, height }, map, width, height);
  const excluded = resizeMask({ data: photo.foreground, width: photo.width, height: photo.height }, width, height, true);
  const mask = resampleMaskLut(excluded, width, height, map, width, height);
  const rgb = new Uint8Array(width * height * 3);
  for (let k = 0; k < width * height; k++) rgb.set(data.subarray(k * 4, k * 4 + 3), k * 3);
  return { uuid: camera.uuid, width, height, w: width, h: height, gray: rgbaToGray(data, width, height), K: scaleK(camera.K, scale), cam: camera, mask, rgb };
}

/** A point must project inside at least two foreground silhouettes and no known background. */
function belongsToObject(x: number, y: number, z: number, views: View[]) {
  let support = 0;
  for (const { camera: { R, t, K }, photo, toPhoto } of views) {
    const depth = R[2][0] * x + R[2][1] * y + R[2][2] * z + t[2];
    if (!(depth > 0)) continue;
    const u = K.fx * (R[0][0] * x + R[0][1] * y + R[0][2] * z + t[0]) / depth + K.cx;
    const v = K.fy * (R[1][0] * x + R[1][1] * y + R[1][2] * z + t[1]) / depth + K.cy;
    const point = toPhoto ? toPhoto(u, v) : { x: u, y: v };
    if (point.x < 0 || point.y < 0 || point.x >= photo.width || point.y >= photo.height) continue;
    if (!maskAt(photo, point.x, point.y)) return false;
    support++;
  }
  return support >= 2;
}

function foregroundCloud(flat: Float32Array & { count: number; nrm: Float32Array | null }, views: View[]): DenseCloud {
  if (!flat.nrm) throw new Error("La reconstrucción densa no contiene normales de superficie.");
  const selected: number[] = [];
  for (let k = 0; k < flat.count; k++) {
    if (belongsToObject(flat[k * 6], flat[k * 6 + 1], flat[k * 6 + 2], views)) selected.push(k);
  }
  const pos = new Float32Array(selected.length * 3);
  const col = new Uint8Array(selected.length * 3);
  const nrm = new Float32Array(selected.length * 3);
  selected.forEach((k, i) => {
    pos.set(flat.subarray(k * 6, k * 6 + 3), i * 3);
    col.set(flat.subarray(k * 6 + 3, k * 6 + 6), i * 3);
    nrm.set(flat.nrm!.subarray(k * 3, k * 3 + 3), i * 3);
  });
  return { count: selected.length, pos, col, nrm };
}

function objectComponent(mesh: MeshData, views: View[]) {
  const { pos, idx, col } = mesh;
  const n = pos.length / 3;
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (vertex: number): number => {
    let root = vertex;
    while (parent[root] !== root) root = parent[root];
    while (parent[vertex] !== vertex) { const next = parent[vertex]; parent[vertex] = root; vertex = next; }
    return root;
  };
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };
  const good = new Uint8Array(n);
  for (let i = 0; i < n; i++) good[i] = belongsToObject(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2], views) ? 1 : 0;
  let extent = 0;
  for (const value of pos) extent = Math.max(extent, Math.abs(value));
  const tolerance = Math.max(1e-10, extent * 1e-7);
  const welded = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(pos[i * 3] / tolerance)},${Math.round(pos[i * 3 + 1] / tolerance)},${Math.round(pos[i * 3 + 2] / tolerance)}`;
    const prior = welded.get(key);
    if (prior === undefined) welded.set(key, i); else union(i, prior);
  }
  const faces: number[] = [];
  for (let k = 0; k < idx.length; k += 3) {
    const a = idx[k], b = idx[k + 1], c = idx[k + 2];
    if (!good[a] || !good[b] || !good[c]) continue;
    faces.push(k);
    union(a, b); union(b, c);
  }
  const sizes = new Map<number, number>();
  for (const k of faces) { const root = find(idx[k]); sizes.set(root, (sizes.get(root) ?? 0) + 1); }
  let biggest = -1, count = 0;
  for (const [root, size] of sizes) if (size > count) { count = size; biggest = root; }
  if (count < 20) throw new Error("No se obtuvo un cuerpo continuo con soporte suficiente. Revisa las máscaras y añade vistas solapadas.");
  const chosen = faces.filter((k) => find(idx[k]) === biggest);
  const remap = new Int32Array(n).fill(-1);
  const vertices: number[] = [];
  const indices = new Uint32Array(chosen.length * 3);
  for (let j = 0; j < chosen.length; j++) {
    for (let c = 0; c < 3; c++) {
      const old = idx[chosen[j] + c];
      if (remap[old] < 0) { remap[old] = vertices.length; vertices.push(old); }
      indices[j * 3 + c] = remap[old];
    }
  }
  const positions = new Float32Array(vertices.length * 3);
  const colors = col ? new Uint8Array(vertices.length * 3) : null;
  vertices.forEach((old, i) => { positions.set(pos.subarray(old * 3, old * 3 + 3), i * 3); colors?.set(col!.subarray(old * 3, old * 3 + 3), i * 3); });
  return {
    mesh: { pos: positions, idx: indices, col: colors, nVerts: vertices.length, count: chosen.length },
    removedFaces: idx.length / 3 - chosen.length,
    removedComponents: Math.max(0, sizes.size - 1),
  };
}

async function run(inputs: ReconstructionImage[]): Promise<ReconstructionMesh> {
  const warnings = new Set<string>();
  const log: Log = (message, level) => {
    if (level === "warn" || level === "error") warnings.add(message);
  };
  const photos: Photo[] = [];
  const images: SfmImage[] = [];
  const detections: Awaited<ReturnType<typeof features>>[] = [];
  let workingPixels = 0;
  for (let i = 0; i < inputs.length; i++) {
    progress("Preparando fotografías y características del objeto", 0.02 + 0.18 * i / inputs.length, i, inputs.length);
    const photo = await readPhoto(inputs[i]);
    workingPixels += photo.width * photo.height;
    if (workingPixels > MAX_WORKING_PIXELS) throw new Error("Las fotografías exceden el presupuesto de memoria de esta reconstrucción local. Reduce la cantidad de vistas redundantes y conserva la cobertura del objeto.");
    const detected = await features(photo);
    if (detected.keypoints.length < 24) {
      warnings.add(`${photo.name}: solo ${detected.keypoints.length} puntos útiles dentro de la máscara; se omitió.`);
      continue;
    }
    photos.push(photo); detections.push(detected);
    images.push({ uuid: photo.id, name: photo.name, keypoints: detected.keypoints, kpStatus: "done", meta: { width: photo.width, height: photo.height }, detectScale: 1 });
  }
  progress("Preparando fotografías y características del objeto", 0.2, inputs.length, inputs.length);
  if (photos.length < 3) throw new Error("Faltan fotografías con detalle reconocible dentro del objeto. Añade distintas vistas nítidas con textura y solapamiento.");
  const pairs: Pair[] = [];
  const nPairs = photos.length * (photos.length - 1) / 2;
  let pairNumber = 0;
  for (let a = 0; a < photos.length; a++) for (let b = a + 1; b < photos.length; b++) {
    progress("Buscando correspondencias entre vistas", 0.2 + 0.2 * pairNumber / nPairs, pairNumber, nPairs);
    const matched = await matchDescriptors(detections[a].descriptors, detections[b].descriptors, { ratioThreshold: 0.8, crossCheck: true });
    if (matched.matches.length >= 20) {
      const verified = await verifyMatches(detections[a].keypoints, detections[b].keypoints, matched.matches, { ransacThreshPx: 2, maxIters: 10000 });
      if (verified && verified.inlierCount >= 20) pairs.push({
        idA: photos[a].id, idB: photos[b].id, F: verified.F,
        matches: matched.matches.filter((_, i) => verified.inlierMask[i] > 0).map((m) => [m.ia, m.ib]),
        inlierCount: verified.inlierCount, hInlierCount: verified.hInlierCount, status: "done",
      });
    }
    pairNumber++;
  }
  progress("Buscando correspondencias entre vistas", 0.4, pairNumber, nPairs);
  if (pairs.length < 2) throw new Error("No se encontraron correspondencias multivista suficientes. Rodea el mismo objeto inmóvil y conserva zonas comunes entre fotos.");
  progress("Estimando cámaras y geometría multivista", 0.4);
  const result = await reconstruct({ images, pairs, sceneType: "object", settings: { secondaryModels: false, cameraRig: "off", rollingShutter: "off" } }, {
    onLog: log,
    onProgress: (done, total, _label, fraction, phase) => progress(
      SFM_STAGES[phase ?? ""] ?? "Estimando cámaras y geometría multivista",
      0.4 + 0.18 * Math.min(1, Math.max(0, fraction ?? done / Math.max(1, total))),
      phase === "register" ? done : undefined,
      phase === "register" ? total : undefined,
    ),
  });
  if (result.status !== "done" || result.cameras.length < 3 || result.points.length < 30) {
    throw new Error("No se pudo reconstruir una geometría multivista estable. Añade más ángulos y revisa enfoque, reflejos y máscaras.");
  }
  if (result.cameras.length < photos.length) warnings.add(`${photos.length - result.cameras.length} fotografías no pudieron registrarse en el mismo modelo.`);
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));
  const lenses = result.summary?.selfCalDistortion ?? [];
  const views: View[] = result.cameras.map((camera) => {
    const photo = photoById.get(camera.uuid)!;
    const lens = lenses.find((entry) => entry.imageUuid === camera.uuid) ?? null;
    return { camera, photo, lens, toPhoto: makeSampleMap({ K: camera.K, selfCal: lens }) };
  });
  const rasters = new Map(views.map((view) => [view.camera.uuid, denseRaster(view)]));
  const cameras = new Map(result.cameras.map((camera) => [camera.uuid, camera]));
  const sparse = packSparseForDense(result.points);
  const maps: DepthMap[] = [];
  for (let i = 0; i < views.length; i++) {
    const view = views[i];
    const ref = rasters.get(view.camera.uuid)!;
    const sources = selectSourceViews(cameras, sparse, view.camera.uuid, { maxSources: 6 }).map((id) => rasters.get(id)!).filter(Boolean);
    if (!sources.length) continue;
    progress("Calculando profundidad multivista en el equipo", 0.58 + 0.2 * i / views.length, i, views.length);
    const depth = await depthMapForImage(ref, sources, sparse.pos, { window: 3, iterations: 5, bestK: Math.min(3, sources.length), planarPrior: false }, undefined, {
      onLog: log,
      onProgress: (fraction) => progress("Calculando profundidad multivista en el equipo", 0.58 + 0.2 * (i + fraction) / views.length, i, views.length),
    });
    progress("Calculando profundidad multivista en el equipo", 0.58 + 0.2 * (i + 1) / views.length, i + 1, views.length);
    if (!depth) continue;
    for (let k = 0; k < depth.depth.length; k++) if (ref.mask[k] || !Number.isFinite(depth.depth[k]) || depth.cost[k] >= 1.99) depth.depth[k] = 0;
    maps.push({ ...depth, uuid: view.camera.uuid, K: ref.K, R: view.camera.R, t: view.camera.t, rgb: ref.rgb });
  }
  if (maps.length < 3) throw new Error("La profundidad no tiene soporte en suficientes vistas. Añade fotografías desde otras posiciones.");
  progress("Validando profundidad entre fotografías", 0.78);
  filterDepthMapsGeometric(maps, { sceneType: "object", minConsistent: 1 }, log, {
    onProgress: (done, total) => progress("Validando profundidad entre fotografías", 0.78 + 0.035 * done / Math.max(1, total), done, total),
  });
  progress("Fusionando superficies y retirando el fondo", 0.815);
  const flat = fuseDepthMaps(maps, { sceneType: "object", minViews: 1, maxCost: 0.8, memBudgetBytes: 512 * 1024 ** 2 }, log, {
    onProgress: (done, total) => progress("Fusionando superficies y retirando el fondo", 0.815 + 0.025 * done / Math.max(1, total), done, total),
  });
  if (flat.refused) throw new Error(`El navegador no dispone de memoria suficiente para fusionar estas vistas: ${flat.refused}`);
  const cloud = foregroundCloud(flat, views);
  if (cloud.count < 100) throw new Error("La profundidad consistente del objeto es insuficiente para formar una superficie. Revisa las máscaras y añade cobertura.");
  await initMesh();
  const solve = (input: PoissonInput) => {
    const mesher = PoissonMesher.build(input.pos, input.nrm, input.wgt ?? new Float32Array(), input.depth, input.screening);
    try {
      const layers = mesher.num_layers();
      for (let i = 0; i < layers; i++) {
        progress("Reconstruyendo la superficie 3D", 0.84 + 0.065 * i / Math.max(1, layers), i, layers);
        mesher.solve_step();
      }
      progress("Reconstruyendo la superficie 3D", 0.905, layers, layers);
      return { bytes: mesher.finish(input.trimDist, input.densityRatio, input.holeAreaRatio, input.minComponentShare, input.medianSupport ?? 0), stats: mesher.stats() };
    } finally { mesher.free(); }
  };
  const rawMesh = generateMesh(cloud, solve, { depth: 7, maxTriangles: 200000, tiles: "off", oneSolveBytes: 1024 ** 3 }, log);
  const component = objectComponent(rawMesh, views);
  if (component.removedFaces) warnings.add(`Se retiraron ${component.removedFaces} triángulos fuera del objeto o desconectados; ${component.removedComponents} componentes secundarias descartadas.`);
  const textured = await textureMesh(component.mesh, views.map(({ camera, photo }) => ({ ...camera, width: photo.width, height: photo.height })), {
    pageSize: 2048, maxPages: 2, maxScale: 1, levelColours: true, useMasks: true,
  }, {
    onLog: log,
    onProgress: (fraction) => progress("Proyectando fotografías sobre la superficie", 0.91 + 0.06 * fraction),
    validLut: async (vi, grid) => {
      const view = views[vi];
      const valid = new Uint8Array(grid.width * grid.height);
      for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) {
        const u = grid.x0 + (x + 0.5) / grid.scale - 0.5;
        const v = grid.y0 + (y + 0.5) / grid.scale - 0.5;
        const p = view.toPhoto ? view.toPhoto(u, v) : { x: u, y: v };
        valid[y * grid.width + x] = maskAt(view.photo, p.x, p.y) ? 1 : 0;
      }
      return valid;
    },
    loadPhoto: async (vi, scale) => ({ ...views[vi].photo, map: makeSampleMap({ K: views[vi].camera.K, selfCal: views[vi].lens, outScale: scale, srcScale: 1 }) }),
  });
  const unseen = Number(textured.summary.unseenFaces ?? 0);
  if (unseen) warnings.add(`${unseen} caras sin fotografía utilizable tienen color de respaldo; revisa el resultado y añade cobertura si hace falta.`);
  warnings.add("Escala relativa: el modelo no acredita dimensiones físicas ni reconstruye zonas que las fotografías no permiten observar.");
  warnings.add("Los parámetros de cámara se estiman a partir de las imágenes y pueden requerir calibración. Esta versión recalcula el conjunto al añadir fotos y procesa con CPU/WASM.");
  return { positions: Float32Array.from(textured.pos), indices: textured.idx, uv: textured.uv, pages: textured.pages, groups: textured.groups, registeredImages: result.cameras.length, usedImages: maps.length, warnings: [...warnings] };
}

scope.onmessage = (event) => {
  void run(event.data.images).then((mesh) => {
    const transfer = [mesh.positions.buffer, mesh.indices.buffer, mesh.uv.buffer, ...mesh.pages.map((page) => page.data.buffer)] as ArrayBuffer[];
    scope.postMessage({ kind: "result", mesh }, transfer);
  }).catch((error: unknown) => {
    scope.postMessage({ kind: "error", message: error instanceof Error ? error.message : "La reconstrucción local falló." });
  });
};
