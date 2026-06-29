import { Icon, Tooltip } from "@chakra-ui/react";
import { FiBell } from "react-icons/fi";

import type { AreaOperativaInactivityAlertDTO } from "./areaOperativaInactivityAlerts.types.ts";

interface AreaOperativaInactivityBellProps {
    alert?: AreaOperativaInactivityAlertDTO;
}

function formatAlertDateTime(value: string | null | undefined): string {
    if (!value) {
        return "sin registro";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function resolveBellVisual(alert?: AreaOperativaInactivityAlertDTO) {
    if (!alert) {
        return {
            color: "gray.400",
            label: "Alertas de inactividad pendientes de cargar",
        };
    }

    if (!alert.alertsEnabled) {
        return {
            color: "gray.400",
            label: "Alertas de inactividad deshabilitadas por directiva",
        };
    }

    if (alert.alertaActiva) {
        return {
            color: "red.500",
            label: `Área inactiva: ${alert.minutosDesdeUltimaTerminacion ?? 0} min sin terminaciones reportadas. Última terminación: ${formatAlertDateTime(alert.ultimaTerminacionAt)}.`,
        };
    }

    if (alert.estado === "SIN_TERMINACIONES" && alert.tieneCargaActiva) {
        return {
            color: "orange.400",
            label: "Área con carga activa y sin terminaciones registradas por el líder.",
        };
    }

    if (!alert.tieneCargaActiva) {
        return {
            color: "gray.400",
            label: "Área sin carga activa para evaluar inactividad.",
        };
    }

    return {
        color: "green.500",
        label: `Actividad normal. Última terminación: ${formatAlertDateTime(alert.ultimaTerminacionAt)}.`,
    };
}

export default function AreaOperativaInactivityBell({ alert }: AreaOperativaInactivityBellProps) {
    const visual = resolveBellVisual(alert);

    return (
        <Tooltip label={visual.label} hasArrow>
            <span>
                <Icon
                    as={FiBell}
                    color={visual.color}
                    boxSize={4}
                    aria-label={visual.label}
                    verticalAlign="middle"
                />
            </span>
        </Tooltip>
    );
}
