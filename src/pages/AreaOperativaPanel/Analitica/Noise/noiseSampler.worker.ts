import { NOISE_DB_FLOOR } from "./noiseSampling.config";
import type {
    NoiseWorkerRequest,
    NoiseWorkerResponse,
} from "./noiseSampling.types";

function calculateNoiseLevel(samples: Float32Array): { rms: number; ruidoDb: number } {
    if (samples.length === 0) {
        return { rms: 0, ruidoDb: NOISE_DB_FLOOR };
    }

    let sumSquares = 0;
    for (let i = 0; i < samples.length; i += 1) {
        const value = samples[i];
        sumSquares += value * value;
    }

    const rawRms = Math.sqrt(sumSquares / samples.length);
    const rms = Math.min(Math.max(rawRms, 0), 1);
    const ruidoDb = rms > 0
        ? Math.max(NOISE_DB_FLOOR, 20 * Math.log10(rms))
        : NOISE_DB_FLOOR;

    return { rms, ruidoDb };
}

self.onmessage = (event: MessageEvent<NoiseWorkerRequest>) => {
    const { id, samples } = event.data;

    try {
        const result = calculateNoiseLevel(samples);
        const response: NoiseWorkerResponse = {
            id,
            type: "noise-result",
            rms: result.rms,
            ruidoDb: result.ruidoDb,
        };
        self.postMessage(response);
    } catch (error: any) {
        const response: NoiseWorkerResponse = {
            id,
            type: "noise-error",
            message: error?.message || "No fue posible calcular el nivel de ruido.",
        };
        self.postMessage(response);
    }
};

export {};
