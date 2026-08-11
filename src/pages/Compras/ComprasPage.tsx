import { Container, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader";
import { my_style_tab } from "../../styles/styles_general.tsx";
import CrearOCM from "./CrearOCM.tsx";
import ReporteOrdenesCompras from "./ReporteOrdenesCompras.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

import type { JSX } from "react";

function ComprasPage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "crear-ocm", label: "Crear OC-M", render: () => <CrearOCM />, accesoValido: tabAccessRule(Modulo.COMPRAS, "CREAR_OCM", 1) },
        { key: "reportes-ordenes-compra", label: "Reportes Ordenes de Compra", render: () => <ReporteOrdenesCompras />, accesoValido: tabAccessRule(Modulo.COMPRAS, "REPORTES_ORDENES_COMPRA", 1) },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w={"full"} h={"full"}>
            <MyHeader title={"Modulo de Compras"} />
            <Tabs.Root defaultValue={visibleTabs[0]?.key}>
                <Tabs.List>
                    {visibleTabs.map((tab) => (
                        <Tabs.Trigger key={tab.key} value={tab.key} css={my_style_tab}>
                            {tab.label}
                        </Tabs.Trigger>
                    ))}
                </Tabs.List>
                <Tabs.ContentGroup>
                    {visibleTabs.map((tab) => (
                        <Tabs.Content key={tab.key} value={tab.key}>
                            {tab.render()}
                        </Tabs.Content>
                    ))}
                </Tabs.ContentGroup>
            </Tabs.Root>
        </Container>
    );
}

export default ComprasPage;
