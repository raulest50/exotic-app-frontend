import { useMemo, useState } from "react";
import { Box, Container, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";

import MyHeader from "../../components/MyHeader.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import type { AccessRule } from "../../auth/accessModel.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import { my_style_tab } from "../../styles/styles_general.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import ConfParamsCategoria from "./ConfParamsCategoria/ConfParamsCategoria.tsx";
import CrearOrdenesProduccionTab from "./CrearOrdenesProduccionTab/CrearOrdenesProduccionTab.tsx";
import HistorialOrdenesTab from "./HistorialOrdenesTab/HistorialOrdenesTab.tsx";
import MonitorearAreasOperativasTab from "./MonitorearAreasOperativasTab.tsx";
import { PlaneacionProduccionTab } from "./PlaneacionProduccionTab/PlaneacionProduccionTab.tsx";
import ProgramacionProduccionSemanalTab from "./ProgramacionProduccionSemanalTab/ProgramacionProduccionSemanalTab.tsx";

export default function ProduccionPage() {
    const access = useAccessSnapshot();
    const [tabIndex, setTabIndex] = useState(0);

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        {
            key: "crear-odp",
            label: "Crear ODP Manualmente",
            render: () => <CrearOrdenesProduccionTab />,
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
            label: "Planeacion Produccion (Mensual)",
            render: () => <PlaneacionProduccionTab />,
            accesoValido: tabAccessRule(Modulo.PRODUCCION, "PLANEACION_PRODUCCION", 1),
        },
        {
            key: "programacion",
            label: "Programacion Produccion (Semanal)",
            render: () => <ProgramacionProduccionSemanalTab />,
            accesoValido: (snapshot) => (
                tabAccessRule(Modulo.PRODUCCION, "PROGRAMACION_PRODUCCION", 1)(snapshot)
                || tabAccessRule(Modulo.PRODUCCION, "APROBACION_MPS_WEEK", 1)(snapshot)
            ),
        },
        {
            key: "monitorear-areas-operativas",
            label: "Monitorear Areas Operativas",
            render: () => <MonitorearAreasOperativasTab />,
            accesoValido: tabAccessRule(Modulo.PRODUCCION, "MONITOREAR_AREAS_OPERATIVAS", 1),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));
    const safeTabIndex = useMemo(() => (
        tabIndex >= 0 && tabIndex < visibleTabs.length ? tabIndex : 0
    ), [tabIndex, visibleTabs.length]);

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Produccion"} />

            <Tabs index={safeTabIndex} onChange={setTabIndex}>
                <TabList>
                    {visibleTabs.map((tab) => (
                        <Tab key={tab.key} sx={my_style_tab}>
                            {tab.label}
                        </Tab>
                    ))}
                </TabList>

                <TabPanels>
                    {visibleTabs.map((tab) => (
                        <TabPanel
                            key={tab.key}
                            p={tab.key === "planeacion" || tab.key === "programacion" ? 0 : 4}
                        >
                            {tab.key === "planeacion" || tab.key === "programacion" ? (
                                <Box w="full" minW={0}>
                                    {tab.render()}
                                </Box>
                            ) : (
                                tab.render()
                            )}
                        </TabPanel>
                    ))}
                </TabPanels>
            </Tabs>
        </Container>
    );
}
