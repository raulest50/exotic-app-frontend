import DesviacionesControlTab from "../../../features/controles/DesviacionesControlTab";
import HistorialControlTab from "../../../features/controles/HistorialControlTab";
import PendientesControlTab from "../../../features/controles/PendientesControlTab";
import PlanesControlTab from "../../../features/controles/PlanesControlTab";
import { qualityControlApi } from "../../../features/controles/api";
import { useMasterLikeExactControlPermission } from "../../../features/controles/useControlPermission";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";
import QualityControlRegistrationForm from "./QualityControlRegistrationForm";

export function PlanesControlCalidadTab() {
    const { nivel } = useMasterLikeExactControlPermission(Modulo.CALIDAD, "PLANES_CONTROL_CALIDAD");
    return <PlanesControlTab api={qualityControlApi} nivel={nivel} />;
}

export function PendientesControlCalidadTab() {
    const { nivel } = useMasterLikeExactControlPermission(Modulo.CALIDAD, "REGISTRAR_CONTROL_CALIDAD");
    return <PendientesControlTab api={qualityControlApi} nivel={nivel} registrationForm={QualityControlRegistrationForm} />;
}

export function DesviacionesControlCalidadTab() {
    const { nivel } = useMasterLikeExactControlPermission(Modulo.CALIDAD, "DESVIACIONES_CONTROL_CALIDAD");
    return <DesviacionesControlTab api={qualityControlApi} nivel={nivel} />;
}

export function HistorialControlesCalidadTab() {
    return <HistorialControlTab api={qualityControlApi} />;
}
