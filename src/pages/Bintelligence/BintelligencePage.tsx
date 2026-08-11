import { lazy, Suspense, useEffect, useState, type JSX } from "react";
import {
    Box,
    Center,
    Container,
    Spinner,
    Tabs,
} from "@chakra-ui/react";
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
            <Spinner size="md" borderWidth="3px" color="blue.500" />
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
    const visibleTabKeys = visibleTabs.map((tab) => tab.key).join("|");
    const [selectedTab, setSelectedTab] = useState(visibleTabs[0]?.key ?? "");

    useEffect(() => {
        setSelectedTab((current) =>
            visibleTabs.some((tab) => tab.key === current)
                ? current
                : (visibleTabs[0]?.key ?? ""),
        );
        // The joined key list changes only when permissions alter visible tabs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleTabKeys]);

    return (
        <Container
            w="full"
            maxW={{ base: "100%", xl: "container.xl", "2xl": "container.2xl" }}
            px={{ base: 2, md: 4, xl: 6 }}
            mx="auto"
            h="full"
        >
            <MyHeader title={"BI"} />
            <Tabs.Root
                lazyMount
                value={selectedTab}
                onValueChange={({ value }) => setSelectedTab(value)}
            >
                <Box overflowX="auto" pb={1}>
                    <Tabs.List minW="max-content">
                        {visibleTabs.map((tab) => (
                            <Tabs.Trigger
                                key={tab.key}
                                value={tab.key}
                                css={my_style_tab}
                                _selected={{ bg: "app.tabSelected" }}
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
                {visibleTabs.map((tab) => (
                    <Tabs.Content key={tab.key} value={tab.key} px={{ base: 0, md: 4 }}>
                        <Suspense fallback={<TabLoadingFallback />}>
                            {tab.render()}
                        </Suspense>
                    </Tabs.Content>
                ))}
            </Tabs.Root>
        </Container>
    );
}
