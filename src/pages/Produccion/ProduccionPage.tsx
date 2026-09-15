import { Container } from "@chakra-ui/react";

import MyHeader from "../../components/MyHeader.tsx";
import ModuleGroupedTabs, { type ModuleTabGroup } from "../../components/ModuleGroupedTabs.tsx";
import { effectiveExactTabNivelFromSnapshot, tabAccessRule } from "../../auth/accessHelpers.ts";
import type { AccessRule } from "../../auth/accessModel.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import ConfParamsCategoria from "./ConfParamsCategoria/ConfParamsCategoria.tsx";
import CrearOrdenesProduccionTab from "./CrearOrdenesProduccionTab/CrearOrdenesProduccionTab.tsx";
import HistorialOrdenesTab from "./HistorialOrdenesTab/HistorialOrdenesTab.tsx";
import MonitorearAreasOperativasTab from "./MonitorearAreasOperativasTab.tsx";
import { PlaneacionProduccionTab } from "./ProgProdMensualTab/PlaneacionProduccionTab.tsx";
import AprobacionMPSWeekTab from "./ProgProdSemanalTab/AprobacionMPSWeekTab.tsx";
import ProgramacionProduccionSemanalTab from "./ProgProdSemanalTab/ProgramacionProduccionSemanalTab.tsx";
import BatchRecordsTab from "./BatchRecords/BatchRecordsTab.tsx";
import OrdenesFabricacionTab from "./OrdenesFabricacion/OrdenesFabricacionTab.tsx";
import {
    DesviacionesControlProcesoTab,
    HistorialControlesProcesoTab,
    PendientesControlProcesoTab,
    PlanesControlProcesoTab,
} from "./ControlProcesos/ControlProcesosTabs.tsx";

const exactProductionTabAccessRule = (tabId: string, minLevel = 1): AccessRule => (
    (snapshot) => effectiveExactTabNivelFromSnapshot(
        snapshot,
        Modulo.PRODUCCION,
        tabId,
    ) >= minLevel
);

const PRODUCTION_GROUPS: ModuleTabGroup[] = [
    {
        key: "planificacion-produccion",
        label: "Planificación de producción",
        tabs: [
            {
                key: "planeacion",
                label: "Planificación mensual",
                render: () => <PlaneacionProduccionTab />,
                accessRule: tabAccessRule(Modulo.PRODUCCION, "PLANEACION_PRODUCCION", 1),
                flushContent: true,
            },
            {
                key: "programacion",
                label: "Programación semanal",
                render: () => <ProgramacionProduccionSemanalTab />,
                accessRule: tabAccessRule(Modulo.PRODUCCION, "PROGRAMACION_PRODUCCION", 1),
                flushContent: true,
            },
            {
                key: "aprobacion-mps",
                label: "Aprobación del MPS",
                render: () => <AprobacionMPSWeekTab />,
                accessRule: tabAccessRule(Modulo.PRODUCCION, "APROBACION_MPS_WEEK", 1),
                flushContent: true,
            },
        ],
    },
    {
        key: "gestion-ordenes",
        label: "Gestión de órdenes",
        tabs: [
            {
                key: "crear-odp",
                label: "Nueva ODP",
                render: () => <CrearOrdenesProduccionTab />,
                accessRule: tabAccessRule(Modulo.PRODUCCION, "CREAR_ODP_MANUALMENTE", 1),
            },
            {
                key: "ordenes-fabricacion",
                label: "Órdenes de fabricación",
                render: () => <OrdenesFabricacionTab />,
                accessRule: exactProductionTabAccessRule("CREAR_ORDEN_FABRICACION"),
            },
        ],
    },
    {
        key: "control-procesos",
        label: "Control de procesos",
        tabs: [
            {
                key: "planes-control-proceso",
                label: "Planes de control",
                render: () => <PlanesControlProcesoTab />,
                accessRule: exactProductionTabAccessRule("PLANES_CONTROL_PROCESO"),
            },
            {
                key: "pendientes-control-proceso",
                label: "Controles pendientes",
                render: () => <PendientesControlProcesoTab />,
                accessRule: exactProductionTabAccessRule("REGISTRAR_CONTROL_PROCESO"),
            },
            {
                key: "desviaciones-control-proceso",
                label: "Desviaciones",
                render: () => <DesviacionesControlProcesoTab />,
                accessRule: exactProductionTabAccessRule("DESVIACIONES_CONTROL_PROCESO"),
            },
            {
                key: "historial-control-proceso",
                label: "Historial",
                render: () => <HistorialControlesProcesoTab />,
                accessRule: exactProductionTabAccessRule("HISTORIAL_CONTROL_PROCESO"),
            },
        ],
    },
    {
        key: "seguimiento-trazabilidad",
        label: "Seguimiento y trazabilidad",
        tabs: [
            {
                key: "monitorear-areas-operativas",
                label: "Monitoreo operativo",
                render: () => <MonitorearAreasOperativasTab />,
                accessRule: tabAccessRule(Modulo.PRODUCCION, "MONITOREAR_AREAS_OPERATIVAS", 1),
            },
            {
                key: "historial",
                label: "Historial de ODP",
                render: () => <HistorialOrdenesTab />,
                accessRule: tabAccessRule(Modulo.PRODUCCION, "HISTORIAL", 1),
            },
            {
                key: "batch-records",
                label: "Expedientes digitales",
                render: () => <BatchRecordsTab />,
                accessRule: exactProductionTabAccessRule("CONSULTAR_BATCH_RECORD"),
            },
        ],
    },
    {
        key: "configuracion-produccion",
        label: "Configuración de producción",
        tabs: [
            {
                key: "parametros-categoria",
                label: "Parámetros y rutas",
                render: () => <ConfParamsCategoria />,
                accessRule: tabAccessRule(Modulo.PRODUCCION, "PARAMETROS_POR_CATEGORIA", 3),
            },
        ],
    },
];

export default function ProduccionPage() {
    const access = useAccessSnapshot();

    return (
        <Container
            w="full"
            maxW={{ base: "100%", xl: "container.xl", "2xl": "container.2xl" }}
            px={{ base: 2, md: 4, xl: 6 }}
            mx="auto"
            h="full"
        >
            <MyHeader title="Dirección Técnica y de Planta" />
            <ModuleGroupedTabs groups={PRODUCTION_GROUPS} access={access} ariaLabel="Secciones de Producción" />
        </Container>
    );
}
