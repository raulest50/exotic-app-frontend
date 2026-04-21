import { Container, Flex, Tab, TabList, TabPanel, TabPanels, Tabs, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import MyHeader from "../../components/MyHeader";
import { my_style_tab } from "../../styles/styles_general";
import CargasMasivasTab from "./CargaMasiva/CargasMasivasTab";
import EliminacionForzada from "./EliminacionForzada/EliminacionForzada";
import ExportacionDatosTab from "./ExportacionDatos/ExportacionDatosTab.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

interface SuperMasterConfig {
    id: number;
    habilitarEliminacionForzada: boolean;
    habilitarCargaMasiva: boolean;
    habilitarAjustesInventario: boolean;
}

export default function OperacionesCriticasBDPage() {
    const [config, setConfig] = useState<SuperMasterConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const access = useAccessSnapshot();
    const endPoints = useMemo(() => new EndPointsURL(), []);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await axios.get<SuperMasterConfig>(endPoints.get_super_master_config);
                setConfig(res.data);
            } catch (err) {
                console.error("Error fetching Super Master config", err);
                setConfig(null);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [endPoints]);

    if (loading) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Operaciones Criticas en BD" />
                <Spinner />
            </Container>
        );
    }

    const showCargaMasiva = config?.habilitarCargaMasiva ?? false;
    const showEliminacionForzada = config?.habilitarEliminacionForzada ?? false;

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        {
            key: "cargas-masivas",
            label: "Cargas Masivas",
            render: () => <CargasMasivasTab />,
            accesoValido: (snapshot) => showCargaMasiva && tabAccessRule(Modulo.OPERACIONES_CRITICAS_BD, "CARGAS_MASIVAS", 1)(snapshot),
        },
        {
            key: "eliminaciones-forzadas",
            label: "Eliminaciones Forzadas",
            render: () => <EliminacionForzada />,
            accesoValido: (snapshot) => showEliminacionForzada && tabAccessRule(Modulo.OPERACIONES_CRITICAS_BD, "ELIMINACIONES_FORZADAS", 1)(snapshot),
        },
        {
            key: "exportacion-datos",
            label: "Exportacion Datos",
            render: () => <ExportacionDatosTab />,
            accesoValido: tabAccessRule(Modulo.OPERACIONES_CRITICAS_BD, "EXPORTACION_DATOS", 1),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    if (visibleTabs.length === 0) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Operaciones Criticas en BD" />
                <Text mt={4}>No hay operaciones habilitadas para este modulo con la configuracion actual.</Text>
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Operaciones Criticas en BD" />
            <Flex direction="column" w="full" h="full">
                <Tabs>
                    <TabList>
                        {visibleTabs.map((tab) => (
                            <Tab key={tab.key} sx={my_style_tab}>{tab.label}</Tab>
                        ))}
                    </TabList>
                    <TabPanels>
                        {visibleTabs.map((tab) => (
                            <TabPanel key={tab.key}>{tab.render()}</TabPanel>
                        ))}
                    </TabPanels>
                </Tabs>
            </Flex>
        </Container>
    );
}
