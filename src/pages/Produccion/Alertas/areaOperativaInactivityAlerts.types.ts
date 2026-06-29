export type AreaOperativaInactivityAlertStatus = "ACTIVA" | "INACTIVA" | "SIN_TERMINACIONES";

export interface AreaOperativaInactivityAlertDTO {
    areaId: number;
    areaNombre: string;
    estado: AreaOperativaInactivityAlertStatus;
    alertaActiva: boolean;
    tieneCargaActiva: boolean;
    ultimaTerminacionAt: string | null;
    minutosDesdeUltimaTerminacion: number | null;
    thresholdMinutes: number;
    checkIntervalMinutes: number;
    alertsEnabled: boolean;
}
