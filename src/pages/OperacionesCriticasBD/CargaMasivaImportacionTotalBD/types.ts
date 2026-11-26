export interface BackupTotalImportJobResponse {
    jobId: string;
    estado: "PENDIENTE" | "VALIDANDO" | "PURGANDO" | "RESTAURANDO" | "MIGRANDO" | "VERIFICANDO" | "SANEANDO" | "LISTO" | "ERROR" | "EXPIRADO";
    filename: string;
    requestedAt: string;
    startedAt?: string | null;
    finishedAt?: string | null;
    expiresAt?: string | null;
    errorCode?: string | null;
    message?: string | null;
    sourceSchemaVersion?: string | null;
    targetSchemaVersion?: string | null;
    finalSchemaVersion?: string | null;
    migrationsApplied?: number | null;
    requiresRecovery?: boolean;
}
