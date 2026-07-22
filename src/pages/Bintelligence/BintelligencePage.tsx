import { lazy, Suspense } from "react";
import { Box, Center, Container, Spinner, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { my_style_tab } from "../../styles/styles_general.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { moduleAccessRule, tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

const InformesDiariosTab = lazy(() => import("./InformesDiariosTab/InformesDiariosTab.tsx"));
const InformesGlobalesTab = lazy(() => import("./InformesGlobalesTab.tsx"));
const TimeSeriesTab = lazy(() => import("./TimeSeriesTab.tsx"));
const PersonalBiTab = lazy(() => import("./PersonalBiTab/PersonalBiTab.tsx"));
const AprovisionamientoTab = lazy(() => import("./AprovisionamientoTab/AprovisionamientoTab.tsx"));

function TabLoadingFallback() {
    return (
        <Center minH="180px" w="full">
            <Spinner size="md" thickness="3px" color="blue.500" />
        </Center>
    );
}

export default function BintelligencePage() {
    const access = useAccessSnapshot();

    const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
        { key: "informes-diarios", label: "Informes Diarios", render: () => <InformesDiariosTab />, accesoValido: tabAccessRule(Modulo.BINTELLIGENCE, "INFORMES_DIARIOS", 1) },
        { key: "informes-globales", label: "Informes Globales", render: () => <InformesGlobalesTab />, accesoValido: tabAccessRule(Modulo.BINTELLIGENCE, "INFORMES_GLOBALES", 1) },
        { key: "series-tiempo", label: "Series De Tiempo y Proyecciones", render: () => <TimeSeriesTab />, accesoValido: tabAccessRule(Modulo.BINTELLIGENCE, "SERIES_TIEMPO_PROYECCIONES", 1) },
        { key: "personal", label: "Personal", render: () => <PersonalBiTab />, accesoValido: tabAccessRule(Modulo.BINTELLIGENCE, "PERSONAL", 1) },
        {
            key: "aprovisionamiento",
            label: "Aprovisionamiento",
            render: () => <AprovisionamientoTab />,
            accesoValido: moduleAccessRule(Modulo.BINTELLIGENCE, 1),
        },
    ];

    const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));

    return (
        <Container
            w="full"
            maxW={{ base: "100%", xl: "container.xl", "2xl": "container.2xl" }}
            px={{ base: 2, md: 4, xl: 6 }}
            mx="auto"
            h="full"
        >
            <MyHeader title={"BI"} />
            <Tabs isLazy lazyBehavior="keepMounted">
                <Box overflowX="auto" pb={1}>
                    <TabList minW="max-content">
                        {visibleTabs.map((tab) => (
                            <Tab
                                key={tab.key}
                                sx={my_style_tab}
                                flexShrink={0}
                                whiteSpace="nowrap"
                                fontSize={{ base: "sm", md: "md" }}
                                px={{ base: 3, md: 4 }}
                            >
                                {tab.label}
                            </Tab>
                        ))}
                    </TabList>
                </Box>
                <TabPanels>
                    {visibleTabs.map((tab) => (
                        <TabPanel key={tab.key} px={{ base: 0, md: 4 }}>
                            <Suspense fallback={<TabLoadingFallback />}>
                                {tab.render()}
                            </Suspense>
                        </TabPanel>
                    ))}
                </TabPanels>
            </Tabs>
        </Container>
    );
}
