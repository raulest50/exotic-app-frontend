import { useEffect, useRef } from "react";
import axios from "axios";
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import { useMasterDirectives } from "../../../../context/MasterDirectivesContext.tsx";
import {
    AREA_OPERATIVA_NOISE_ENABLED_DEFAULT,
    AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_DEFAULT,
    AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_MAX,
    AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_MIN,
    AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_DEFAULT,
    AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_MAX,
    AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_MIN,
    MASTER_DIRECTIVE_KEYS,
} from "../../../../context/masterDirectiveConstants.ts";
import {
    NOISE_AUDIO_CONSTRAINTS,
    NOISE_PROCESSOR_BUFFER_SIZE,
    NOISE_WORKER_TIMEOUT_MS,
} from "./noiseSampling.config";
import type {
    CapturedNoiseSample,
    NoiseSamplePayload,
    NoiseWorkerRequest,
    NoiseWorkerResponse,
    NoiseWorkerSuccessResponse,
} from "./noiseSampling.types";

const endpoints = new EndPointsURL();

type BrowserAudioContext = typeof AudioContext;

function getAudioContextConstructor(): BrowserAudioContext | null {
    return window.AudioContext || (window as any).webkitAudioContext || null;
}

async function hasGrantedMicrophonePermission(): Promise<boolean> {
    if (!navigator.permissions?.query) {
        return false;
    }

    try {
        const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
        return status.state === "granted";
    } catch {
        return false;
    }
}

function flattenChunks(chunks: Float32Array[], totalLength: number): Float32Array {
    const samples = new Float32Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
        samples.set(chunk, offset);
        offset += chunk.length;
    }

    return samples;
}

function closeAudioContext(audioContext: AudioContext) {
    if (audioContext.state !== "closed") {
        void audioContext.close().catch(() => undefined);
    }
}

function disconnectAudioNode(node: AudioNode) {
    try {
        node.disconnect();
    } catch {
        // El nodo pudo no haber quedado conectado si la captura fallo a mitad de inicializacion.
    }
}

async function captureNoiseSample(sampleDurationMs: number): Promise<CapturedNoiseSample | null> {
    if (document.hidden || !navigator.mediaDevices?.getUserMedia) {
        return null;
    }

    const hasPermission = await hasGrantedMicrophonePermission();
    if (!hasPermission) {
        return null;
    }

    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
        return null;
    }

    const startedAt = new Date().toISOString();
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: NOISE_AUDIO_CONSTRAINTS,
        video: false,
    });
    const audioContext = new AudioContextConstructor();

    try {
        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        const sampleRate = audioContext.sampleRate;
        const targetSamples = Math.round(sampleRate * (sampleDurationMs / 1000));
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(NOISE_PROCESSOR_BUFFER_SIZE, 1, 1);
        const silentGain = audioContext.createGain();
        const chunks: Float32Array[] = [];
        let collectedSamples = 0;

        silentGain.gain.value = 0;

        return await new Promise<CapturedNoiseSample>((resolve, reject) => {
            let settled = false;

            const cleanup = () => {
                processor.onaudioprocess = null;
                disconnectAudioNode(source);
                disconnectAudioNode(processor);
                disconnectAudioNode(silentGain);
                stream.getTracks().forEach((track) => track.stop());
                closeAudioContext(audioContext);
            };

            const settle = () => {
                if (settled) {
                    return;
                }
                settled = true;
                window.clearTimeout(timeoutId);
                cleanup();

                const samples = flattenChunks(chunks, collectedSamples);
                resolve({
                    samples,
                    sampleRate,
                    durationMs: Math.round((collectedSamples / sampleRate) * 1000),
                    startedAt,
                });
            };

            const timeoutId = window.setTimeout(() => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                reject(new Error("Tiempo agotado al capturar la muestra de ruido."));
            }, sampleDurationMs + 2000);

            processor.onaudioprocess = (event) => {
                const input = event.inputBuffer.getChannelData(0);
                const remaining = targetSamples - collectedSamples;
                const copyLength = Math.min(input.length, remaining);

                if (copyLength > 0) {
                    chunks.push(input.slice(0, copyLength));
                    collectedSamples += copyLength;
                }

                if (collectedSamples >= targetSamples) {
                    settle();
                }
            };

            source.connect(processor);
            processor.connect(silentGain);
            silentGain.connect(audioContext.destination);
        });
    } catch (error) {
        stream.getTracks().forEach((track) => track.stop());
        closeAudioContext(audioContext);
        throw error;
    }
}

function calculateNoiseInWorker(samples: Float32Array): Promise<NoiseWorkerSuccessResponse> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL("./noiseSampler.worker.ts", import.meta.url), { type: "module" });
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const timeoutId = window.setTimeout(() => {
            worker.terminate();
            reject(new Error("Tiempo agotado al procesar la muestra de ruido."));
        }, NOISE_WORKER_TIMEOUT_MS);

        worker.onmessage = (event: MessageEvent<NoiseWorkerResponse>) => {
            const response = event.data;
            if (response.id !== id) {
                return;
            }

            window.clearTimeout(timeoutId);
            worker.terminate();

            if (response.type === "noise-error") {
                reject(new Error(response.message));
                return;
            }

            resolve(response);
        };

        worker.onerror = (event) => {
            window.clearTimeout(timeoutId);
            worker.terminate();
            reject(new Error(event.message || "No fue posible procesar la muestra de ruido."));
        };

        const request: NoiseWorkerRequest = { id, samples };
        worker.postMessage(request, [samples.buffer as ArrayBuffer]);
    });
}

async function buildNoiseSamplePayload(capturedSample: CapturedNoiseSample): Promise<NoiseSamplePayload> {
    const result = await calculateNoiseInWorker(capturedSample.samples);
    return {
        ruidoDb: result.ruidoDb,
        rms: result.rms,
        fechaMuestra: capturedSample.startedAt,
        duracionMs: capturedSample.durationMs,
        sampleRate: capturedSample.sampleRate,
    };
}

async function sendNoiseSample(payload: NoiseSamplePayload): Promise<void> {
    await axios.post(
        endpoints.area_operativa_panel_ruido_muestras,
        payload,
        { withCredentials: true },
    );
}

export function useAreaOperativaNoiseSampler() {
    const timerRef = useRef<number | null>(null);
    const samplingRef = useRef(false);
    const {
        loading,
        getBooleanDirective,
        getNumberDirective,
    } = useMasterDirectives();
    const noiseEnabled = getBooleanDirective(
        MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_ENABLED,
        AREA_OPERATIVA_NOISE_ENABLED_DEFAULT,
    );
    const intervalMinutes = getNumberDirective(
        MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_INTERVAL_MINUTES,
        AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_DEFAULT,
        {
            min: AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_MIN,
            max: AREA_OPERATIVA_NOISE_INTERVAL_MINUTES_MAX,
        },
    );
    const sampleSeconds = getNumberDirective(
        MASTER_DIRECTIVE_KEYS.AREA_OPERATIVA_NOISE_SAMPLE_SECONDS,
        AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_DEFAULT,
        {
            min: AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_MIN,
            max: AREA_OPERATIVA_NOISE_SAMPLE_SECONDS_MAX,
        },
    );

    useEffect(() => {
        if (loading || !noiseEnabled) {
            return undefined;
        }

        let disposed = false;
        const sampleDurationMs = sampleSeconds * 1000;
        const samplingIntervalMs = intervalMinutes * 60 * 1000;

        const clearTimer = () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const runSample = async () => {
            if (disposed || samplingRef.current || document.hidden) {
                return;
            }

            samplingRef.current = true;
            try {
                const capturedSample = await captureNoiseSample(sampleDurationMs);
                if (capturedSample && !disposed) {
                    const payload = await buildNoiseSamplePayload(capturedSample);
                    if (!disposed) {
                        await sendNoiseSample(payload);
                    }
                }
            } catch {
                // La telemetria de ruido nunca debe interrumpir el panel operativo.
            } finally {
                samplingRef.current = false;
            }
        };

        const scheduleNext = () => {
            clearTimer();
            if (disposed || document.hidden) {
                return;
            }

            timerRef.current = window.setTimeout(() => {
                void runSample().finally(scheduleNext);
            }, samplingIntervalMs);
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                clearTimer();
                return;
            }
            scheduleNext();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        scheduleNext();

        return () => {
            disposed = true;
            clearTimer();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [intervalMinutes, loading, noiseEnabled, sampleSeconds]);
}
