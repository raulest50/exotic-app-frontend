import { useMemo, useState, type JSX } from "react";
import { Box, Container, Tabs, Text } from "@chakra-ui/react";

import MyHeader from "../../components/MyHeader.tsx";
import { getExactTabNivel, tabAccessRule } from "../../auth/accessHelpers.ts";
import type { AccessRule } from "../../auth/accessModel.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import ConfParamsCategoria from "./ConfParamsCategoria/ConfParamsCategoria.tsx";
import CrearOrdenesProduccionTab from "./CrearOrdenesProduccionTab/CrearOrdenesProduccionTab.tsx";
import HistorialOrdenesTab from "./HistorialOrdenesTab/HistorialOrdenesTab.tsx";
import MonitorearAreasOperativasTab from "./MonitorearAreasOperativasTab.tsx";
import { PlaneacionProduccionTab } from "./ProgProdMensualTab/PlaneacionProduccionTab.tsx";
import AprobacionMPSWeekTab from "./ProgProdSemanalTab/AprobacionMPSWeekTab.tsx";
import ProgramacionProduccionSemanalTab from "./ProgProdSemanalTab/ProgramacionProduccionSemanalTab.tsx";
import BatchRecordsTab from "./BatchRecords/BatchRecordsTab.tsx";
import OrdenesFabricacionTab from "./OrdenesFabricacion/OrdenesFabricacionTab.tsx";

type ProductionTab = {
    key: string;
    label: string;
    render: () => JSX.Element;
    accesoValido: AccessRule;
    flushContent?: boolean;
};

type ProductionGroup = {
    key: string;
    label: string;
    tabs: ProductionTab[];
};

type VisibleProductionGroup = Omit<ProductionGroup, "tabs"> & {
    tabs: ProductionTab[];
};

const exactProductionTabAccessRule = (tabId: string, minLevel = 1): AccessRule => (
    (snapshot) => snapshot.isMasterLike || (getExactTabNivel(
        snapshot.moduloAccesos,
        Modulo.PRODUCCION,
        tabId,
    ) ?? 0) >= minLevel
);

const PRODUCTION_GROUPS: ProductionGroup[] = [
    {
        key: "planificacion-produccion",
        label: "Planificación de producción",
        tabs: [
            {
                key: "planeacion",
                label: "Planificación mensual",
                render: () => <PlaneacionProduccionTab />,
                accesoValido: tabAccessRule(Modulo.PRODUCCION, "PLANEACION_PRODUCCION", 1),
                flushContent: true,
            },
            {
                key: "programacion",
                label: "Programación semanal",
                render: () => <ProgramacionProduccionSemanalTab />,
                accesoValido: tabAccessRule(Modulo.PRODUCCION, "PROGRAMACION_PRODUCCION", 1),
                flushContent: true,
            },
            {
                key: "aprobacion-mps",
                label: "Aprobación del MPS",
                render: () => <AprobacionMPSWeekTab />,
                accesoValido: tabAccessRule(Modulo.PRODUCCION, "APROBACION_MPS_WEEK", 1),
                flushContent: true,
            },
        ],
    },
    {
        key: "gestion-ordenes",
        label: "Gestión de órdenes",
        tabs: [
            {
                key: "crear-odp",
                label: "Nueva ODP",
                render: () => <CrearOrdenesProduccionTab />,
                accesoValido: tabAccessRule(Modulo.PRODUCCION, "CREAR_ODP_MANUALMENTE", 1),
            },
            {
                key: "ordenes-fabricacion",
                label: "Órdenes de fabricación",
                render: () => <OrdenesFabricacionTab />,
                accesoValido: exactProductionTabAccessRule("CREAR_ORDEN_FABRICACION"),
            },
        ],
    },
    {
        key: "seguimiento-trazabilidad",
        label: "Seguimiento y trazabilidad",
        tabs: [
            {
                key: "monitorear-areas-operativas",
                label: "Monitoreo operativo",
                render: () => <MonitorearAreasOperativasTab />,
                accesoValido: tabAccessRule(Modulo.PRODUCCION, "MONITOREAR_AREAS_OPERATIVAS", 1),
            },
            {
                key: "historial",
                label: "Historial de ODP",
                render: () => <HistorialOrdenesTab />,
                accesoValido: tabAccessRule(Modulo.PRODUCCION, "HISTORIAL", 1),
            },
            {
                key: "batch-records",
                label: "Expedientes digitales",
                render: () => <BatchRecordsTab />,
                accesoValido: exactProductionTabAccessRule("CONSULTAR_BATCH_RECORD"),
            },
        ],
    },
    {
        key: "configuracion-produccion",
        label: "Configuración de producción",
        tabs: [
            {
                key: "parametros-categoria",
                label: "Parámetros y rutas",
                render: () => <ConfParamsCategoria />,
                accesoValido: tabAccessRule(Modulo.PRODUCCION, "PARAMETROS_POR_CATEGORIA", 3),
            },
        ],
    },
];

export default function ProduccionPage() {
    const access = useAccessSnapshot();
    const [selectedGroupKey, setSelectedGroupKey] = useState("");
    const [selectedTabByGroup, setSelectedTabByGroup] = useState<Record<string, string>>({});

    const visibleGroups = useMemo<VisibleProductionGroup[]>(() => (
        PRODUCTION_GROUPS
            .map((group) => ({
                ...group,
                tabs: group.tabs.filter((tab) => tab.accesoValido(access)),
            }))
            .filter((group) => group.tabs.length > 0)
    ), [access]);

    const activeGroup = visibleGroups.find((group) => group.key === selectedGroupKey)
        ?? visibleGroups[0];

    const activeTabKeyFor = (group: VisibleProductionGroup): string => {
        const requestedTabKey = selectedTabByGroup[group.key];
        return group.tabs.some((tab) => tab.key === requestedTabKey)
            ? requestedTabKey
            : group.tabs[0].key;
    };

    const handleGroupChange = ({ value }: { value: string }) => {
        if (visibleGroups.some((group) => group.key === value)) {
            setSelectedGroupKey(value);
        }
    };

    const handleTabChange = (group: VisibleProductionGroup, value: string) => {
        if (!group.tabs.some((tab) => tab.key === value)) return;
        setSelectedTabByGroup((current) => ({ ...current, [group.key]: value }));
    };

    return (
        <Container
            w="full"
            maxW={{ base: "100%", xl: "container.xl", "2xl": "container.2xl" }}
            px={{ base: 2, md: 4, xl: 6 }}
            mx="auto"
            h="full"
        >
            <MyHeader title="Dirección Técnica y de Planta" />

            {!activeGroup ? (
                <Text py={8}>No tienes acceso a ninguna opción de este módulo.</Text>
            ) : (
                <Tabs.Root
                    value={activeGroup.key}
                    onValueChange={handleGroupChange}
                    variant="enclosed"
                    colorPalette="teal"
                    lazyMount={false}
                    unmountOnExit={false}
                >
                    <Box overflowX="auto" pb={2}>
                        <Tabs.List minW="max-content" aria-label="Secciones de Producción">
                            {visibleGroups.map((group) => (
                                <Tabs.Trigger
                                    key={group.key}
                                    value={group.key}
                                    flexShrink={0}
                                    whiteSpace="nowrap"
                                    fontWeight="semibold"
                                    fontSize={{ base: "sm", md: "md" }}
                                    px={{ base: 3, md: 5 }}
                                >
                                    {group.label}
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>
                    </Box>

                    <Tabs.ContentGroup>
                        {visibleGroups.map((group) => (
                            <Tabs.Content key={group.key} value={group.key} px={0} pb={0}>
                                <Tabs.Root
                                    value={activeTabKeyFor(group)}
                                    onValueChange={({ value }) => handleTabChange(group, value)}
                                    variant="line"
                                    colorPalette="teal"
                                    lazyMount={false}
                                    unmountOnExit={false}
                                >
                                    <Box overflowX="auto" pb={1}>
                                        <Tabs.List
                                            minW="max-content"
                                            aria-label={`Opciones de ${group.label}`}
                                        >
                                            {group.tabs.map((tab) => (
                                                <Tabs.Trigger
                                                    key={tab.key}
                                                    value={tab.key}
                                                    flexShrink={0}
                                                    whiteSpace="nowrap"
                                                    fontSize={{ base: "sm", md: "md" }}
                                                    px={{ base: 3, md: 4 }}
                                                >
                                                    {tab.label}
                                                </Tabs.Trigger>
                                            ))}
                                        </Tabs.List>
                                    </Box>

                                    <Tabs.ContentGroup>
                                        {group.tabs.map((tab) => (
                                            <Tabs.Content
                                                key={tab.key}
                                                value={tab.key}
                                                p={tab.flushContent ? 0 : { base: 2, md: 4 }}
                                            >
                                                {tab.flushContent ? (
                                                    <Box w="full" minW={0}>
                                                        {tab.render()}
                                                    </Box>
                                                ) : (
                                                    tab.render()
                                                )}
                                            </Tabs.Content>
                                        ))}
                                    </Tabs.ContentGroup>
                                </Tabs.Root>
                            </Tabs.Content>
                        ))}
                    </Tabs.ContentGroup>
                </Tabs.Root>
            )}
        </Container>
    );
}
