import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

/** One means foreground. The mask may be scaled, but must cover the whole photo. */
export interface ReconstructionImage {
  id: string;
  file: File;
  mask: { data: Uint8Array; width: number; height: number };
}

export interface ReconstructionProgress {
  stage: string;
  /** Actual counts within this stage; omitted where the engine has no work counter. */
  completed?: number;
  total?: number;
  /** Weighted phase indicator, not a measured fraction of total execution time. */
  fraction?: number;
  elapsedMs?: number;
}

export interface ReconstructionResult {
  glb: Blob;
  vertexCount: number;
  triangleCount: number;
  registeredImages: number;
  /** Total photographs supplied, including views the engine could not register. */
  usedImages: number;
  warnings: string[];
}

export interface ReconstructionMesh {
  positions: Float32Array;
  indices: Uint32Array;
  uv: Float32Array;
  pages: { width: number; height: number; data: Uint8ClampedArray }[];
  groups: { page: number; start: number; count: number }[];
  registeredImages: number;
  usedImages: number;
  warnings: string[];
}

export type ReconstructionWorkerMessage =
  | { kind: "progress"; progress: ReconstructionProgress }
  | { kind: "result"; mesh: ReconstructionMesh }
  | { kind: "error"; message: string };

export const reconstructionNoticesUrl = new URL(
  "./vendor/websfm/THIRD_PARTY_NOTICES.txt",
  import.meta.url,
).href;

function abortError() {
  return new DOMException("Reconstrucción cancelada", "AbortError");
}

/** No photographs or intermediate models are uploaded or persisted by this engine. */
export async function reconstructModel(
  images: ReconstructionImage[],
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: ReconstructionProgress) => void;
  } = {},
): Promise<ReconstructionResult> {
  if (options.signal?.aborted) throw abortError();
  if (images.length < 3) {
    throw new Error("Añade al menos tres fotografías solapadas desde distintas posiciones. Su número no garantiza una reconstrucción válida.");
  }
  const started = performance.now();
  const worker = new Worker(new URL("./ImageProc.worker.ts", import.meta.url), {
    type: "module",
  });
  const mesh = await new Promise<ReconstructionMesh>((resolve, reject) => {
    const finish = () => {
      worker.terminate();
      options.signal?.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      finish();
      reject(abortError());
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "El motor local no pudo completar la reconstrucción."));
    };
    worker.onmessage = (event: MessageEvent<ReconstructionWorkerMessage>) => {
      const message = event.data;
      if (message.kind === "progress") {
        options.onProgress?.({ ...message.progress, elapsedMs: performance.now() - started });
      } else if (message.kind === "error") {
        finish();
        reject(new Error(message.message));
      } else {
        finish();
        resolve(message.mesh);
      }
    };
    // Structured cloning keeps the UI's File and mask intact for a later retry.
    worker.postMessage({ images });
  });
  if (options.signal?.aborted) throw abortError();
  options.onProgress?.({ stage: "Empaquetando modelo GLB", fraction: 0.98 });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(mesh.uv, 2));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  geometry.computeVertexNormals();
  const textures = mesh.pages.map((page) => {
    const texture = new DataTexture(
      new Uint8Array(page.data.buffer, page.data.byteOffset, page.data.byteLength),
      page.width,
      page.height,
      RGBAFormat,
      UnsignedByteType,
    );
    texture.colorSpace = SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;
    return texture;
  });
  const materials = textures.map((map) => new MeshStandardMaterial({
    map,
    metalness: 0,
    roughness: 0.8,
    side: DoubleSide,
  }));
  for (const group of mesh.groups) geometry.addGroup(group.start * 3, group.count * 3, group.page);
  const object = new Mesh(geometry, materials);
  object.name = "Producto reconstruido";
  object.userData = {
    reconstruction: "WebSfM 0.8.0 / SfM + MVS + Poisson",
    scale: "arbitrary",
    connectedComponents: 1,
  };
  try {
    const binary = await new GLTFExporter().parseAsync(object, { binary: true });
    if (options.signal?.aborted) throw abortError();
    if (!(binary instanceof ArrayBuffer)) throw new Error("El exportador no produjo un GLB válido.");
    options.onProgress?.({ stage: "Modelo preparado", fraction: 1, elapsedMs: performance.now() - started });
    return {
      glb: new Blob([binary], { type: "model/gltf-binary" }),
      vertexCount: mesh.positions.length / 3,
      triangleCount: mesh.indices.length / 3,
      registeredImages: mesh.registeredImages,
      usedImages: images.length,
      warnings: mesh.warnings,
    };
  } finally {
    geometry.dispose();
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
  }
}
