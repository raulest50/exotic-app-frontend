export interface Intrinsics { fx: number; fy: number; cx: number; cy: number }
export interface Camera { uuid: string; R: number[][]; t: number[]; K: Intrinsics }
export interface Lens extends Record<string, unknown> { imageUuid?: string; sensorId?: string; k1?: number; k2?: number }
export type Log = (message: string, level?: string, category?: string) => void;
export interface SparseInput {
  n: number; pos: Float64Array; vstart: Uint32Array; vcam: Uint32Array; viewUuids: string[];
}
export interface SparsePoints {
  length: number; pos: Float64Array; vstart: Uint32Array; vcam: Uint32Array; viewUuids: string[]; viewTotal: number;
}
export interface SfmImage {
  uuid: string; name: string; keypoints: Keypoints; kpStatus: string;
  meta: { width: number; height: number }; sensorId?: string; detectScale: number;
}
export interface Pair {
  idA: string; idB: string; F: number[][]; matches: number[][]; inlierCount: number; hInlierCount: number; status: string;
}
export interface Raster { data: Uint8ClampedArray; width: number; height: number }
export interface DepthRaster {
  uuid: string; width: number; height: number; w: number; h: number;
  gray: Uint8Array; K: Intrinsics; cam: Camera; mask: Uint8Array;
}
export interface DepthMap {
  uuid: string; width: number; height: number; K: Intrinsics; R: number[][]; t: number[];
  depth: Float32Array; cost: Float32Array; normals: Float32Array; rgb: Uint8Array;
}
export interface DepthResult { depth: Float32Array; cost: Float32Array; normals: Float32Array; width: number; height: number }
export interface DenseCloud { count: number; pos: Float32Array; nrm: Float32Array; col: Uint8Array }
export interface MeshData { pos: Float32Array; idx: Uint32Array; col?: Uint8Array | null; nVerts: number; count: number }
export interface TexturedMesh extends MeshData {
  uv: Float32Array; groups: { page: number; start: number; count: number }[];
  pages: { width: number; height: number; data: Uint8ClampedArray }[];
  summary: Record<string, unknown>;
}
export interface Grid { width: number; height: number; scale: number; x0: number; y0: number }
export class Keypoints {
  constructor(data?: Float32Array, rgb?: Uint8Array | null);
  data: Float32Array; rgb: Uint8Array | null; length: number;
  x(index: number): number; y(index: number): number;
}
export function detectSift(data: Uint8ClampedArray, width: number, height: number, options?: Record<string, unknown>): Promise<{ flat: Float32Array }>;
export function matchDescriptors(a: Float32Array, b: Float32Array, options?: Record<string, unknown>): Promise<{ matches: { ia: number; ib: number; dist: number }[] }>;
export function verifyMatches(a: Keypoints, b: Keypoints, matches: { ia: number; ib: number; dist: number }[], options?: Record<string, unknown>): Promise<{ F: number[][]; inlierMask: Float32Array; inlierCount: number; hInlierCount: number } | null>;
export function reconstruct(input: { images: SfmImage[]; pairs: Pair[]; settings: Record<string, unknown>; sceneType: string }, hooks: { onLog: Log; onProgress: (done: number, total: number, label: string, fraction: number, phase?: string) => void }): Promise<{ status: string; cameras: Camera[]; points: SparsePoints; summary: { selfCalDistortion?: Lens[] } | null }>;
export function packSparseForDense(points: SparsePoints): SparseInput;
export function selectSourceViews(cameras: Map<string, Camera>, sparse: SparseInput, uuid: string, options?: Record<string, unknown>): string[];
export function scaleK(k: Intrinsics, scale: number | number[]): Intrinsics;
export function rgbaToGray(data: Uint8ClampedArray, width: number, height: number): Uint8Array;
export function depthMapForImage(ref: DepthRaster, sources: DepthRaster[], positions: Float64Array, settings: Record<string, unknown>, backend: undefined, hooks: { onLog: Log; onProgress: (fraction: number) => void }): Promise<DepthResult | null>;
export function filterDepthMapsGeometric(maps: DepthMap[], settings: Record<string, unknown>, log: Log, hooks: { onProgress: (done: number, total: number, label: string) => void }): void;
export function fuseDepthMaps(maps: DepthMap[], settings: Record<string, unknown>, log: Log, hooks: { onProgress: (done: number, total: number, label: string) => void }): Float32Array & { count: number; nrm: Float32Array | null; refused?: string };
export interface PoissonInput {
  pos: Float32Array; nrm: Float32Array; wgt?: Float32Array;
  depth: number; screening: number; trimDist: number; densityRatio: number;
  holeAreaRatio: number; minComponentShare: number; medianSupport?: number;
}
export function generateMesh(dense: DenseCloud, solve: (input: PoissonInput) => { bytes: Uint8Array; stats: Float64Array }, settings: Record<string, unknown>, log: Log): MeshData;
export function textureMesh(mesh: MeshData, views: (Camera & { width: number; height: number })[], settings: Record<string, unknown>, hooks: {
  onLog: Log; onProgress: (fraction: number, stage: string) => void;
  validLut: (viewIndex: number, grid: Grid) => Promise<Uint8Array>;
  loadPhoto: (viewIndex: number, scale: number) => Promise<Raster & { map: ((x: number, y: number) => { x: number; y: number }) | null }>;
}): Promise<TexturedMesh>;
export function makeSampleMap(input: { K: Intrinsics; selfCal?: Lens | null; outScale?: number | number[]; srcScale?: number | number[] }): ((x: number, y: number) => { x: number; y: number }) | null;
export function resampleRgba(source: Raster, map: ((x: number, y: number) => { x: number; y: number }) | null, width: number, height: number): Uint8ClampedArray;
export function resampleMaskLut(source: Uint8Array, width: number, height: number, map: ((x: number, y: number) => { x: number; y: number }) | null, outWidth: number, outHeight: number): Uint8Array;
export function initMesh(): Promise<unknown>;
export class PoissonMesher {
  static build(pos: Float32Array, nrm: Float32Array, wgt: Float32Array, depth: number, screening: number): PoissonMesher;
  num_layers(): number; solve_step(): boolean;
  finish(trimDist: number, densityRatio: number, holeAreaRatio: number, minComponentShare: number, medianSupport: number): Uint8Array;
  stats(): Float64Array; free(): void;
}
