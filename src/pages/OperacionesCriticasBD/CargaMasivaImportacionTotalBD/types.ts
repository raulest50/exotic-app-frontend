export interface BackupTotalImportJobResponse {
    jobId: string;
    estado: "PENDIENTE" | "VALIDANDO" | "PURGANDO" | "RESTAURANDO" | "LISTO" | "ERROR" | "EXPIRADO";
    filename: string;
    requestedAt: string;
    startedAt?: string | null;
    finishedAt?: string | null;
    expiresAt?: string | null;
    errorCode?: string | null;
    message?: string | null;
}
