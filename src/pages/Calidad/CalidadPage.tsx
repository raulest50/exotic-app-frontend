import { Alert, Container, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader";
import { my_style_tab } from "../../styles/styles_general";
import { useAccessSnapshot } from "../../auth/usePermissions";
import { tabAccessRule } from "../../auth/accessHelpers";
import type { AccessRule } from "../../auth/accessModel";
import { Modulo } from "../Usuarios/GestionUsuarios/types";
import VersionadoControlProcesoTab from "./VersionadoControlProcesoTab";
import DiligenciarControlProcesoTab from "./DiligenciarControlProcesoTab";
import HistorialControlProcesoTab from "./HistorialControlProcesoTab";

import type { JSX } from "react";

export default function CalidadPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        {
            key: "versionado-control-proceso",
            label: "Versionado Control de Proceso",
            render: () => <VersionadoControlProcesoTab />,
            accesoValido: tabAccessRule(Modulo.CALIDAD, "VERSIONADO_CONTROL_PROCESO", 1),
        },
        {
            key: "diligenciar-control-proceso",
            label: "Diligenciar Control de Proceso",
            render: () => <DiligenciarControlProcesoTab />,
            accesoValido: tabAccessRule(Modulo.CALIDAD, "DILIGENCIAR_CONTROL_PROCESO", 1),
        },
        {
            key: "historial-control-proceso",
            label: "Historial Control de Proceso",
            render: () => <HistorialControlProcesoTab />,
            accesoValido: tabAccessRule(Modulo.CALIDAD, "HISTORIAL_CONTROL_PROCESO", 1),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Calidad" />
            {visibleTabs.length === 0 ? (
                <Alert.Root status="warning">
                    <Alert.Indicator />
                    No tiene tabs habilitados para este modulo.
                </Alert.Root>
            ) : (
                <Tabs.Root defaultValue={visibleTabs[0]?.key}>
                    <Tabs.List>
                        {visibleTabs.map((tab) => (
                            <Tabs.Trigger key={tab.key} value={tab.key} css={my_style_tab}>{tab.label}</Tabs.Trigger>
                        ))}
                    </Tabs.List>
                    {visibleTabs.map((tab) => (
                        <Tabs.Content key={tab.key} value={tab.key}>{tab.render()}</Tabs.Content>
                    ))}
                </Tabs.Root>
            )}
        </Container>
    );
}
