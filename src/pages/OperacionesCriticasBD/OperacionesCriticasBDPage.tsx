import { Container, Flex, Tab, TabList, TabPanel, TabPanels, Tabs, Text, Spinner } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import MyHeader from "../../components/MyHeader";
import { my_style_tab } from "../../styles/styles_general";
import CargaMasivaAlmacenTab from "./CargaMasiva/CargaMasivaAlmacenTab.tsx";
import CargaMasivaMaterialesTab from "./CargaMasivaMateriales/CargaMasivaMaterialesTab";
import CargaMasivaTerminadosTab from "./CargaMasivaTerminados/CargaMasivaTerminadosTab";
import EliminacionForzada from "./EliminacionForzada/EliminacionForzada";

interface SuperMasterConfig {
    id: number;
    habilitarEliminacionForzada: boolean;
    habilitarCargaMasiva: boolean;
    habilitarAjustesInventario: boolean;
}

export default function OperacionesCriticasBDPage() {
    const [config, setConfig] = useState<SuperMasterConfig | null>(null);
    const [loading, setLoading] = useState(true);
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
                <MyHeader title="Operaciones Críticas en BD" />
                <Spinner />
            </Container>
        );
    }

    const showCargaMasiva = config?.habilitarCargaMasiva ?? false;
    const showEliminacionForzada = config?.habilitarEliminacionForzada ?? false;

    if (!showCargaMasiva && !showEliminacionForzada) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Operaciones Críticas en BD" />
                <Text mt={4}>Ninguna operación habilitada por Directivas Super Master.</Text>
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Operaciones Críticas en BD" />
            <Flex direction="column" w="full" h="full">
                <Tabs>
                    <TabList>
                        {showCargaMasiva && <Tab sx={my_style_tab}>Carga Masiva Almacén</Tab>}
                        {showCargaMasiva && <Tab sx={my_style_tab}>Carga Masiva Materiales</Tab>}
                        {showCargaMasiva && <Tab sx={my_style_tab}>Carga Masiva Terminados</Tab>}
                        {showEliminacionForzada && <Tab sx={my_style_tab}>Eliminaciones Forzadas</Tab>}
                    </TabList>
                    <TabPanels>
                        {showCargaMasiva && (
                            <TabPanel>
                                <CargaMasivaAlmacenTab />
                            </TabPanel>
                        )}
                        {showCargaMasiva && (
                            <TabPanel>
                                <CargaMasivaMaterialesTab />
                            </TabPanel>
                        )}
                        {showCargaMasiva && (
                            <TabPanel>
                                <CargaMasivaTerminadosTab />
                            </TabPanel>
                        )}
                        {showEliminacionForzada && (
                            <TabPanel>
                                <EliminacionForzada />
                            </TabPanel>
                        )}
                    </TabPanels>
                </Tabs>
            </Flex>
        </Container>
    );
}
