import { Container, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";

import MyHeader from "../../components/MyHeader.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import type { AccessRule } from "../../auth/accessModel.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import { my_style_tab } from "../../styles/styles_general.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import ConfParamsCategoria from "./ConfParamsCategoria/ConfParamsCategoria.tsx";
import AprobacionMPSWeekTab from "./AprobacionMPSWeekTab.tsx";
import CrearOrdenesTab from "./CrearOrdenesTab/CrearOrdenesTab.tsx";
import HistorialOrdenesTab from "./HistorialOrdenesTab/HistorialOrdenesTab.tsx";
import MonitorearAreasOperativasTab from "./MonitorearAreasOperativasTab.tsx";
import { PlaneacionProduccionTab } from "./PlaneacionProduccionTab/PlaneacionProduccionTab.tsx";
import SeguimientoAreasOperativasTab from "./SeguimientoAreasOperativasTab.tsx";

export default function ProduccionPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        {
            key: "crear-odp",
            label: "Crear ODP Manualmente",
            render: () => <CrearOrdenesTab />,
            accesoValido: tabAccessRule(Modulo.PRODUCCION, "CREAR_ODP_MANUALMENTE", 1),
        },
        {
            key: "historial",
            label: "Historial",
            render: () => <HistorialOrdenesTab />,
            accesoValido: tabAccessRule(Modulo.PRODUCCION, "HISTORIAL", 1),
        },
        {
            key: "parametros-categoria",
            label: "Parametros por Categoria",
            render: () => <ConfParamsCategoria />,
            accesoValido: tabAccessRule(Modulo.PRODUCCION, "PARAMETROS_POR_CATEGORIA", 3),
        },
        {
            key: "planeacion",
            label: "Planeacion Produccion",
            render: () => <PlaneacionProduccionTab />,
            accesoValido: tabAccessRule(Modulo.PRODUCCION, "PLANEACION_PRODUCCION", 1),
        },
        {
            key: "seguimiento-areas-operativas",
            label: "Seguimiento Areas Operativas",
            render: () => <SeguimientoAreasOperativasTab />,
            accesoValido: tabAccessRule(Modulo.PRODUCCION, "SEGUIMIENTO_AREAS_OPERATIVAS", 1),
        },
        {
            key: "monitorear-areas-operativas",
            label: "Monitorear Areas Operativas",
            render: () => <MonitorearAreasOperativasTab />,
            accesoValido: tabAccessRule(Modulo.PRODUCCION, "MONITOREAR_AREAS_OPERATIVAS", 1),
        },
        {
            key: "aprobacion-mps-week",
            label: "Aprobacion MPS Week",
            render: () => <AprobacionMPSWeekTab />,
            accesoValido: tabAccessRule(Modulo.PRODUCCION, "APROBACION_MPS_WEEK", 1),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Produccion"} />

            <Tabs>
                <TabList>
                    {visibleTabs.map((tab) => (
                        <Tab key={tab.key} sx={my_style_tab}>
                            {tab.label}
                        </Tab>
                    ))}
                </TabList>

                <TabPanels>
                    {visibleTabs.map((tab) => (
                        <TabPanel key={tab.key}>{tab.render()}</TabPanel>
                    ))}
                </TabPanels>
            </Tabs>
        </Container>
    );
}
