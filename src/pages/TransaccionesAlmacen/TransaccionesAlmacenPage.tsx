import MyHeader from "../../components/MyHeader";
import { Container, Tabs, TabList, TabPanels, Tab, TabPanel, Spinner, Text } from "@chakra-ui/react";
import AsistenteIngresoMercancia from "./AsistenteIngresoOCM/AsistenteIngresoMercancia";
import { AsistenteDispensacion } from "./AsistenteDispensacion/AsistenteDispensacion.tsx";
import AjustesInventarioTab from "./AjustesInventario/AjustesInventarioTab";
import { HistorialDispensaciones } from "./HistorialDispensaciones/HistorialDispensaciones.tsx";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import { useAuth } from "../../context/AuthContext";
import GestionAveriasTab from "./GestionAverias/GestionAveriasTab.tsx";
import { AsistenteIngresoTerminados } from "./AsistenteIngresoTerminados/AsistenteIngresoTerminados";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";
import { my_style_tab } from "../../styles/styles_general.tsx";

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
    const access = useAccessSnapshot();
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

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "ingreso-ocm", label: "Ingreso OCM", render: () => <AsistenteIngresoMercancia />, accesoValido: tabAccessRule(Modulo.TRANSACCIONES_ALMACEN, "INGRESO_OCM", 1) },
        { key: "hacer-dispensacion", label: "Hacer Dispensacion", render: () => <AsistenteDispensacion />, accesoValido: tabAccessRule(Modulo.TRANSACCIONES_ALMACEN, "HACER_DISPENSACION", 1) },
        { key: "historial-dispensaciones", label: "Historial Dispensaciones", render: () => <HistorialDispensaciones />, accesoValido: tabAccessRule(Modulo.TRANSACCIONES_ALMACEN, "HISTORIAL_DISPENSACIONES", 1) },
        { key: "ingreso-pt", label: "Ingreso Producto Terminado", render: () => <AsistenteIngresoTerminados />, accesoValido: tabAccessRule(Modulo.TRANSACCIONES_ALMACEN, "INGRESO_PRODUCTO_TERMINADO", 1) },
        { key: "gestion-averias", label: "Gestion Averias", render: () => <GestionAveriasTab />, accesoValido: tabAccessRule(Modulo.TRANSACCIONES_ALMACEN, "GESTION_AVERIAS", 1) },
        {
            key: "ajustes-inventario",
            label: "Ajustes de Inventario",
            render: () => <AjustesInventarioTab />,
            accesoValido: (snapshot) => habilitarAjustesInventario && tabAccessRule(Modulo.TRANSACCIONES_ALMACEN, "AJUSTES_INVENTARIO", 1)(snapshot),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    if (visibleTabs.length === 0) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Transacciones De Almacen" />
                <Text mt={4}>No hay tabs habilitadas para este modulo con la configuracion actual.</Text>
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Transacciones De Almacen" />
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
        </Container>
    );
}
