import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import EndPointsURL from "../../../api/EndPointsURL.tsx";
import type { AreaOperativaInactivityAlertDTO } from "./areaOperativaInactivityAlerts.types.ts";

const endPoints = new EndPointsURL();
const DEFAULT_CHECK_INTERVAL_MINUTES = 10;

function isDocumentVisible() {
    if (typeof document === "undefined") {
        return true;
    }
    return document.visibilityState === "visible";
}

export function useAreaOperativaInactivityAlerts() {
    const inFlightRef = useRef(false);
    const [alerts, setAlerts] = useState<AreaOperativaInactivityAlertDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(DEFAULT_CHECK_INTERVAL_MINUTES);
    const [isVisible, setIsVisible] = useState(isDocumentVisible);

    const alertsByAreaId = useMemo(() => {
        return new Map(alerts.map((alert) => [alert.areaId, alert]));
    }, [alerts]);

    const refreshAlerts = useCallback(async () => {
        if (inFlightRef.current) {
            return;
        }

        inFlightRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get<AreaOperativaInactivityAlertDTO[]>(
                endPoints.monitoreo_area_alertas_inactividad,
                { withCredentials: true },
            );
            const nextAlerts = response.data ?? [];
            setAlerts(nextAlerts);
            setLastUpdatedAt(new Date());

            const nextInterval = nextAlerts.find((alert) => Number.isFinite(alert.checkIntervalMinutes))
                ?.checkIntervalMinutes;
            if (nextInterval) {
                setCheckIntervalMinutes(nextInterval);
            }
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "No fue posible cargar las alertas de inactividad.",
            );
        } finally {
            inFlightRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isDocumentVisible()) {
            void refreshAlerts();
        }
    }, [refreshAlerts]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            const nextIsVisible = isDocumentVisible();
            setIsVisible(nextIsVisible);
            if (nextIsVisible) {
                void refreshAlerts();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [refreshAlerts]);

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        const intervalMs = checkIntervalMinutes * 60_000;
        const intervalId = window.setInterval(() => {
            void refreshAlerts();
        }, intervalMs);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [checkIntervalMinutes, isVisible, refreshAlerts]);

    return {
        alerts,
        alertsByAreaId,
        checkIntervalMinutes,
        error,
        lastUpdatedAt,
        loading,
        refreshAlerts,
    };
}
