/** A mask covers the complete, EXIF-oriented photograph; 1 = object, 0 = background. */
export interface ObjectBinaryMask {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface SegmentationImage {
  id: string;
  file: File;
  width: number;
  height: number;
  /** Accepted/manual masks are reused, and still participate in multiview checks. */
  priorMask?: ObjectBinaryMask;
}

export interface ObjectMask {
  imageId: string;
  mask: ObjectBinaryMask;
  /** Direct, geometrically verified neighbours, not an object-identity certificate. */
  matchedImageIds: string[];
  warnings: string[];
  reviewRequired: true;
}

export interface SegmentationProgress {
  stage: string;
  completed?: number;
  total?: number;
  /** Weighted phase indicator; not a measured fraction of execution time. */
  fraction?: number;
  downloadedBytes?: number;
  totalBytes?: number;
}

/** The checkpoint is fetched only when automatic segmentation is requested. */
export const segmentationModelInfo = Object.freeze({
  name: "BiRefNet Lite 512 (convoluciones por bloques, FP32)",
  url: "https://huggingface.co/h143N/birefnet-lite-512-chunked/tree/d0b0c299a1d10b0a57b04d0f1f6088d5c0d6ebf2",
  downloadUrl: "https://huggingface.co/h143N/birefnet-lite-512-chunked/resolve/d0b0c299a1d10b0a57b04d0f1f6088d5c0d6ebf2/onnx/model.onnx",
  downloadBytes: 193268476,
  license: "MIT",
  revision: "d0b0c299a1d10b0a57b04d0f1f6088d5c0d6ebf2",
  sha256: "16f6a4f726ff851eb6b50b56daf54c426c836a7372f44df21b2065af2d915d23",
  licenseUrl: "https://huggingface.co/h143N/birefnet-lite-512-chunked/blob/d0b0c299a1d10b0a57b04d0f1f6088d5c0d6ebf2/LICENSE",
});

// Both components use the same MIT terms; retain each component's copyright.
export const segmentationLicenseNotice = `BiRefNet Lite: pesos y conversión ONNX. ONNX Runtime Web 1.31.1: runtime.
El siguiente aviso MIT cubre ambos componentes.

MIT License

Copyright (c) 2024 ZhengPeng
Copyright (c) 2026 Studio Ludens V.O.F.
Copyright (c) Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Runtime: ONNX Runtime Web 1.31.1, MIT, Microsoft Corporation.
https://github.com/microsoft/onnxruntime/blob/v1.31.1/LICENSE
Multiview diagnostics: the vendored WebSfM SIFT/RANSAC engine; see its notices.
`;

export type SegmentationWorkerRequest =
  | { kind: "segment"; images: SegmentationImage[]; model: typeof segmentationModelInfo }
  | { kind: "match"; images: SegmentationImage[]; masks: ObjectMask[] };

export type SegmentationWorkerMessage =
  | { kind: "progress"; progress: SegmentationProgress }
  | { kind: "result"; result: ObjectMask }
  | { kind: "photo-error"; imageId: string; message: string }
  | { kind: "error"; message: string }
  | { kind: "done" };

export class ObjectSegmentationError extends Error {
  readonly partialResults: ObjectMask[];

  constructor(message: string, partialResults: ObjectMask[]) {
    super(message);
    this.name = "ObjectSegmentationError";
    this.partialResults = partialResults;
  }
}

let running = false;

function cancelled() {
  return new DOMException("Segmentación cancelada", "AbortError");
}

/**
 * All pixel processing stays in disposable workers. Only model weights use Cache
 * Storage. Results are proposals: the user must review the same object in every
 * view. Treat onResult values as immutable. It fires once before matching and
 * again after matching, with the same imageId.
 */
export async function segmentObjectAcrossImages(
  images: SegmentationImage[],
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: SegmentationProgress) => void;
    onResult?: (result: ObjectMask) => void;
  } = {},
): Promise<ObjectMask[]> {
  if (options.signal?.aborted) throw cancelled();
  if (running) throw new Error("Ya hay una segmentación automática en curso. Cancélala antes de iniciar otra.");
  if (!images.length) return [];
  const ids = new Set<string>();
  for (const image of images) {
    if (!image.id || ids.has(image.id)) throw new Error("Las fotografías deben tener identificadores diferentes.");
    ids.add(image.id);
    if (!(image.file instanceof Blob) || !Number.isInteger(image.width) || !Number.isInteger(image.height)
      || image.width < 1 || image.height < 1 || image.width * image.height > 60_000_000) {
      throw new Error("Una fotografía no tiene dimensiones válidas para la segmentación local.");
    }
    if (image.priorMask) {
      const mask = image.priorMask;
      if (!(mask.data instanceof Uint8Array) || !Number.isInteger(mask.width) || !Number.isInteger(mask.height)
        || mask.width < 1 || mask.height < 1 || mask.width > 1024 || mask.height > 1024
        || mask.data.length !== mask.width * mask.height || mask.data.some((value) => value > 1)) {
        throw new Error(`La máscara existente de ${image.file.name} no es una máscara binaria válida.`);
      }
    }
  }
  running = true;
  const results = new Map<string, ObjectMask>();
  const failures: string[] = [];
  async function phase(request: SegmentationWorkerRequest) {
    if (options.signal?.aborted) throw cancelled();
    await new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL("./ObjectSegmentation.worker.ts", import.meta.url), { type: "module" });
      let settled = false;
      function finish(error?: Error) {
        if (settled) return;
        settled = true;
        // Do not retain the grown ONNX WASM heap for the SIFT phase.
        worker.terminate();
        options.signal?.removeEventListener("abort", abort);
        if (error) reject(error); else resolve();
      }
      function abort() { finish(cancelled()); }
      options.signal?.addEventListener("abort", abort, { once: true });
      if (options.signal?.aborted) { abort(); return; }
      worker.onerror = (event) => {
        event.preventDefault();
        finish(new Error(event.message || "El motor local de segmentación dejó de responder."));
      };
      worker.onmessageerror = () => finish(new Error("No se pudo leer un resultado del motor local de segmentación."));
      worker.onmessage = (event: MessageEvent<SegmentationWorkerMessage>) => {
        if (settled) return;
        const message = event.data;
        try {
          if (message.kind === "progress") options.onProgress?.(message.progress);
          else if (message.kind === "result") {
            results.set(message.result.imageId, message.result);
            options.onResult?.(message.result);
          } else if (message.kind === "photo-error") failures.push(message.message);
          else if (message.kind === "error") finish(new Error(message.message));
          else if (message.kind === "done") finish();
        } catch (cause) { finish(cause instanceof Error ? cause : new Error("No se pudo aplicar la propuesta de segmentación.")); }
      };
      // Files and prior masks remain usable by the UI if this phase fails.
      try { worker.postMessage(request); }
      catch (cause) { finish(cause instanceof Error ? cause : new Error("No se pudieron enviar las fotografías al motor local.")); }
    });
  }

  try {
    await phase({ kind: "segment", images, model: segmentationModelInfo });
    if (!results.size) throw new Error(failures.join(" ") || "No se obtuvo ninguna máscara de objeto. Puedes delimitarlo manualmente.");
    // A fresh worker performs matching, after the ONNX worker has terminated.
    await phase({ kind: "match", images: images.filter((image) => results.has(image.id)), masks: [...results.values()] });
    if (failures.length) throw new Error(`Se conservaron las propuestas obtenidas, pero algunas fotografías requieren delimitación manual. ${failures.join(" ")}`);
    return images.flatMap((image) => { const result = results.get(image.id); return result ? [result] : []; });
  } catch (cause) {
    if (options.signal?.aborted || (cause instanceof Error && cause.name === "AbortError")) throw cancelled();
    throw new ObjectSegmentationError(cause instanceof Error ? cause.message : "La segmentación no pudo finalizar.", [...results.values()]);
  } finally { running = false; }
}
