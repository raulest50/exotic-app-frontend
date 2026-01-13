import MyHeader from "../../components/MyHeader";
import {Container, Tabs, TabList, TabPanels, Tab, TabPanel, Text} from "@chakra-ui/react";
import AsistenteIngresoMercancia from "./AsistenteIngresoOCM/AsistenteIngresoMercancia";
import {AsistenteDispensacion} from "./AsistenteDispensacion/AsistenteDispensacion.tsx";
import {AsistenteDispensacionDirecta} from "./Deprecated/AsistenteDispensacionDirecta/AsistenteDispensacionDirecta.tsx";
import {AsistenteBackflushDirecto} from "./Deprecated/AsistenteBackflushDirecto/AsistenteBackflushDirecto.tsx";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import { useAuth } from "../../context/AuthContext";
import { getAccessLevel } from "../../api/UserApi";
import AjustesInventarioTab from "./AjustesInventario/AjustesInventarioTab";
import {HistorialDispensaciones} from "./HistorialDispensaciones/HistorialDispensaciones.tsx";


export default function TransaccionesAlmacenPage(){
    const [showDispensacionDirecta, setShowDispensacionDirecta] = useState(false);
    const [showBackflushDirecto, setShowBackflushDirecto] = useState(false);
    const [almacenAccessLevel, setAlmacenAccessLevel] = useState<number>(0);
    const { user } = useAuth();
    const endPoints = useMemo(() => new EndPointsURL(), []);

    // Obtener el nivel de acceso del usuario para el módulo ALMACEN
    useEffect(() => {
        const fetchUserAccessLevel = async () => {
            try {
                const nivel = await getAccessLevel('ALMACEN');
                setAlmacenAccessLevel(nivel || 0);
            } catch (error) {
                console.error("Error al obtener el nivel de acceso:", error);
                setAlmacenAccessLevel(0);
            }
        };

        fetchUserAccessLevel();
    }, []);

    useEffect(() => {
        if (!user) return;

        const fetchDirective = async (nombre: string) => {
            try {
                const res = await axios.get<{ valor: string }>(endPoints.get_master_directive(nombre));
                return res.data.valor;
            } catch (error) {
                console.error(`Error fetching directive ${nombre}`, error);
                return null;
            }
        };

        const loadDirectives = async () => {
            const disp = await fetchDirective("Permitir Consumo No Planificado");
            const back = await fetchDirective("Permitir Backflush No Planificado");
            setShowDispensacionDirecta(disp === "true");
            setShowBackflushDirecto(back === "true");
        };

        loadDirectives();
    }, [user, endPoints]);

    return(
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Ingreso a Almacen'}/>
            <Tabs>
                <TabList>
                    <Tab> Ingreso OCM </Tab>
                    <Tab> Hacer Dispensacion </Tab>
                    {(user === 'master' || almacenAccessLevel >= 2) && (
                        <Tab> Historial Dispensaciones </Tab>
                    )}
                    <Tab> Ingreso Producto Terminado </Tab>
                    {showDispensacionDirecta && <Tab> Dispensacion Directa </Tab>}
                    {showBackflushDirecto && <Tab> Backflush Directo </Tab>}
                    <Tab> Ajustes de Inventario </Tab>
                </TabList>
                <TabPanels>

                    <TabPanel>
                        <AsistenteIngresoMercancia/>
                    </TabPanel>

                    <TabPanel>
                        <AsistenteDispensacion />
                    </TabPanel>

                    {(user === 'master' || almacenAccessLevel >= 2) && (
                        <TabPanel>
                            <HistorialDispensaciones />
                        </TabPanel>
                    )}

                    <TabPanel>
                        <Text> Pendiente implementacion </Text>
                    </TabPanel>

                    {showDispensacionDirecta && (
                        <TabPanel>
                            <AsistenteDispensacionDirecta />
                        </TabPanel>
                    )}

                    {showBackflushDirecto && (
                        <TabPanel>
                            <AsistenteBackflushDirecto />
                        </TabPanel>
                    )}

                    <TabPanel>
                        <AjustesInventarioTab />
                    </TabPanel>

                </TabPanels>
            </Tabs>
        </Container>
    )
}
