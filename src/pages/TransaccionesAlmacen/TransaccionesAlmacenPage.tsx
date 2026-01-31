import MyHeader from "../../components/MyHeader";
import { Container, Tabs, TabList, TabPanels, Tab, TabPanel, Text, Spinner } from "@chakra-ui/react";
import AsistenteIngresoMercancia from "./AsistenteIngresoOCM/AsistenteIngresoMercancia";
import { AsistenteDispensacion } from "./AsistenteDispensacion/AsistenteDispensacion.tsx";
import AjustesInventarioTab from "./AjustesInventario/AjustesInventarioTab";
import { HistorialDispensaciones } from "./HistorialDispensaciones/HistorialDispensaciones.tsx";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import { useAuth } from "../../context/AuthContext";

interface SuperMasterConfig {
    id: number;
    habilitarEliminacionForzada: boolean;
    habilitarCargaMasiva: boolean;
    habilitarAjustesInventario: boolean;
}

export default function TransaccionesAlmacenPage() {
    const [habilitarAjustesInventario, setHabilitarAjustesInventario] = useState(false);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const endPoints = useMemo(() => new EndPointsURL(), []);

    useEffect(() => {
        if (!user) return;
        const fetchConfig = async () => {
            try {
                const res = await axios.get<SuperMasterConfig>(endPoints.get_super_master_config);
                setHabilitarAjustesInventario(res.data.habilitarAjustesInventario ?? false);
            } catch (err) {
                console.error("Error fetching Super Master config", err);
                setHabilitarAjustesInventario(false);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [user, endPoints]);

    if (loading) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Ingreso a Almacen" />
                <Spinner />
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Ingreso a Almacen" />
            <Tabs>
                <TabList>
                    <Tab> Ingreso OCM </Tab>
                    <Tab> Hacer Dispensacion </Tab>
                    <Tab> Historial Dispensaciones </Tab>
                    <Tab> Ingreso Producto Terminado </Tab>
                    {habilitarAjustesInventario && <Tab> Ajustes de Inventario </Tab>}
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <AsistenteIngresoMercancia />
                    </TabPanel>
                    <TabPanel>
                        <AsistenteDispensacion />
                    </TabPanel>
                    <TabPanel>
                        <HistorialDispensaciones />
                    </TabPanel>
                    <TabPanel>
                        <Text> Pendiente implementacion </Text>
                    </TabPanel>
                    {habilitarAjustesInventario && (
                        <TabPanel>
                            <AjustesInventarioTab />
                        </TabPanel>
                    )}
                </TabPanels>
            </Tabs>
        </Container>
    );
}
