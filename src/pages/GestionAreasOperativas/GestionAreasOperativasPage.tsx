import { Container, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import CrearAreaProduccionTab from "./CrearAreaProduccion/CrearAreaProduccionTab.tsx";
import ConsultaAreasOperativasTab from "./ConsultaAreasOperativas/ConsultaAreasOperativasTab.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

import type { JSX } from "react";

export default function GestionAreasOperativasPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "crear-area-produccion", label: "Crear Area de Produccion", render: () => <CrearAreaProduccionTab />, accesoValido: tabAccessRule(Modulo.SEGUIMIENTO_PRODUCCION, "CREAR_AREA_PRODUCCION", 1) },
        { key: "consulta-areas-operativas", label: "Consulta Areas Operativas", render: () => <ConsultaAreasOperativasTab />, accesoValido: tabAccessRule(Modulo.SEGUIMIENTO_PRODUCCION, "CONSULTA_AREAS_OPERATIVAS", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Gestion Areas Operativas"} />
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
        </Container>
    );
}
