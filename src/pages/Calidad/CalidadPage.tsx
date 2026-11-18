import { Container } from "@chakra-ui/react";
import { useMemo } from "react";

import { exactTabAccessRuleWithMasterBypass } from "../../auth/accessHelpers";
import { useAccessSnapshot } from "../../auth/usePermissions";
import ModuleGroupedTabs, { type ModuleTabGroup } from "../../components/ModuleGroupedTabs";
import MyHeader from "../../components/MyHeader";
import {
    BATCH_RECORD_WORKFLOW_ENABLED_DEFAULT,
    MASTER_DIRECTIVE_KEYS,
} from "../../context/masterDirectiveConstants";
import { useMasterDirectives } from "../../context/MasterDirectivesContext";
import { Modulo } from "../Usuarios/GestionUsuarios/types";
import {
    DesviacionesControlCalidadTab,
    HistorialControlesCalidadTab,
    PendientesControlCalidadTab,
    PlanesControlCalidadTab,
} from "./ControlCalidad/ControlCalidadTabs";
import LiberacionLotesTab from "./LiberacionLotesTab";
import CatalogoFormulacionTab from "./CatalogoFormulacionTab";

export default function CalidadPage() {
    const access = useAccessSnapshot();
    const { loading: directivesLoading, getBooleanDirective } = useMasterDirectives();
    const workflowEnabled = !directivesLoading && getBooleanDirective(
        MASTER_DIRECTIVE_KEYS.BATCH_RECORD_WORKFLOW_ENABLED,
        BATCH_RECORD_WORKFLOW_ENABLED_DEFAULT,
    );

    const groups = useMemo<ModuleTabGroup[]>(() => [
        {
            key: "control-calidad",
            label: "Control de calidad",
            tabs: [
                {
                    key: "planes-calidad",
                    label: "Planes de ensayo",
                    render: () => <PlanesControlCalidadTab />,
                    accessRule: exactTabAccessRuleWithMasterBypass(Modulo.CALIDAD, "PLANES_CONTROL_CALIDAD"),
                },
                {
                    key: "pendientes-calidad",
                    label: "Ensayos pendientes",
                    render: () => <PendientesControlCalidadTab />,
                    accessRule: exactTabAccessRuleWithMasterBypass(Modulo.CALIDAD, "REGISTRAR_CONTROL_CALIDAD"),
                },
                {
                    key: "desviaciones-calidad",
                    label: "Desviaciones",
                    render: () => <DesviacionesControlCalidadTab />,
                    accessRule: exactTabAccessRuleWithMasterBypass(Modulo.CALIDAD, "DESVIACIONES_CONTROL_CALIDAD"),
                },
                {
                    key: "historial-calidad",
                    label: "Historial de ensayos",
                    render: () => <HistorialControlesCalidadTab />,
                    accessRule: exactTabAccessRuleWithMasterBypass(Modulo.CALIDAD, "HISTORIAL_CONTROL_CALIDAD"),
                },
            ],
        },
        {
            key: "consulta-productos",
            label: "Consulta de productos",
            showSingleTab: true,
            tabs: [
                {
                    key: "catalogo-formulacion",
                    label: "Catálogo y formulación",
                    render: (isActive) => <CatalogoFormulacionTab isActive={isActive} />,
                    accessRule: exactTabAccessRuleWithMasterBypass(Modulo.CALIDAD, "CATALOGO_FORMULACION"),
                },
            ],
        },
        {
            key: "liberacion-lotes",
            label: "Liberación de lotes",
            tabs: [
                {
                    key: "revision-liberacion",
                    label: "Revisión y liberación",
                    render: () => <LiberacionLotesTab workflowEnabled={workflowEnabled} />,
                    accessRule: exactTabAccessRuleWithMasterBypass(Modulo.CALIDAD, "REVISION_LIBERACION_LOTES"),
                },
            ],
        },
    ], [workflowEnabled]);

    return (
        <Container
            w="full"
            maxW={{ base: "100%", xl: "container.xl", "2xl": "container.2xl" }}
            px={{ base: 2, md: 4, xl: 6 }}
            mx="auto"
            h="full"
        >
            <MyHeader title="Calidad" />
            <ModuleGroupedTabs
                groups={groups}
                access={access}
                ariaLabel="Secciones de Calidad"
                emptyMessage="No tienes opciones de Calidad habilitadas."
            />
        </Container>
    );
}
