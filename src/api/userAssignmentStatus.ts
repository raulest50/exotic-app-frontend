import axios from "axios";
import EndPointsURL from "./EndPointsURL.tsx";

export interface AreaResponsableSummary {
    areaId: number;
    nombre: string;
}

export interface UserAssignmentStatus {
    isAreaResponsable: boolean;
    areaResponsableId: number | null;
    areaResponsableNombre: string | null;
    hasModuloAccesos: boolean;
    canReceiveModuloAccesos: boolean;
    canBeAreaResponsable: boolean;
}

export async function fetchUserAssignmentStatus(
    userId: number,
    excludeAreaId?: number
): Promise<UserAssignmentStatus> {
    const endPoints = new EndPointsURL();
    const response = await axios.get<UserAssignmentStatus>(
        endPoints.user_assignment_status.replace("{userId}", String(userId)),
        {
            params: excludeAreaId != null ? { excludeAreaId } : undefined,
        }
    );
    return response.data;
}
