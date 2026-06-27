export interface CapturedNoiseSample {
    samples: Float32Array;
    sampleRate: number;
    durationMs: number;
    startedAt: string;
}

export interface NoiseWorkerRequest {
    id: string;
    samples: Float32Array;
}

export interface NoiseWorkerSuccessResponse {
    id: string;
    type: "noise-result";
    rms: number;
    ruidoDb: number;
}

export interface NoiseWorkerErrorResponse {
    id: string;
    type: "noise-error";
    message: string;
}

export type NoiseWorkerResponse = NoiseWorkerSuccessResponse | NoiseWorkerErrorResponse;

export interface NoiseSamplePayload {
    ruidoDb: number;
    rms: number;
    fechaMuestra: string;
    duracionMs: number;
    sampleRate: number;
}
