import DesviacionesControlTab from "../../../features/controles/DesviacionesControlTab";
import HistorialControlTab from "../../../features/controles/HistorialControlTab";
import PendientesControlTab from "../../../features/controles/PendientesControlTab";
import PlanesControlTab from "../../../features/controles/PlanesControlTab";
import { processControlApi } from "../../../features/controles/api";
import { useMasterLikeExactControlPermission } from "../../../features/controles/useControlPermission";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";
import ProcessControlRegistrationForm from "./ProcessControlRegistrationForm";

export function PlanesControlProcesoTab() {
    const { nivel } = useMasterLikeExactControlPermission(Modulo.PRODUCCION, "PLANES_CONTROL_PROCESO");
    return <PlanesControlTab api={processControlApi} nivel={nivel} />;
}

export function PendientesControlProcesoTab() {
    const { nivel } = useMasterLikeExactControlPermission(Modulo.PRODUCCION, "REGISTRAR_CONTROL_PROCESO");
    return <PendientesControlTab api={processControlApi} nivel={nivel} registrationForm={ProcessControlRegistrationForm} />;
}

export function DesviacionesControlProcesoTab() {
    const { nivel } = useMasterLikeExactControlPermission(Modulo.PRODUCCION, "DESVIACIONES_CONTROL_PROCESO");
    return <DesviacionesControlTab api={processControlApi} nivel={nivel} />;
}

export function HistorialControlesProcesoTab() {
    return <HistorialControlTab api={processControlApi} />;
}
