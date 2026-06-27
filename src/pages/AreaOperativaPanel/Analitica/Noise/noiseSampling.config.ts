export const NOISE_WORKER_TIMEOUT_MS = 5000;
export const NOISE_PROCESSOR_BUFFER_SIZE = 2048;
export const NOISE_DB_FLOOR = -160;

export const NOISE_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
};
