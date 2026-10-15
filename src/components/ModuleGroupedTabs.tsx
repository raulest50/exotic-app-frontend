import { Box, Tabs, Text } from "@chakra-ui/react";
import { useMemo, useState, type JSX } from "react";

import type { AccessRule, AccessSnapshot } from "../auth/accessModel";

export interface ModuleTabDefinition {
    key: string;
    label: string;
    render: (isActive: boolean) => JSX.Element;
    accessRule: AccessRule;
    flushContent?: boolean;
}

export interface ModuleTabGroup {
    key: string;
    label: string;
    tabs: ModuleTabDefinition[];
}

interface ModuleGroupedTabsProps {
    groups: ModuleTabGroup[];
    access: AccessSnapshot;
    ariaLabel: string;
    emptyMessage?: string;
}

export default function ModuleGroupedTabs({
    groups,
    access,
    ariaLabel,
    emptyMessage = "No tienes acceso a ninguna opción de este módulo.",
}: ModuleGroupedTabsProps) {
    const [selectedGroupKey, setSelectedGroupKey] = useState("");
    const [selectedTabByGroup, setSelectedTabByGroup] = useState<Record<string, string>>({});

    const visibleGroups = useMemo(() => groups
        .map((group) => ({
            ...group,
            tabs: group.tabs.filter((tab) => tab.accessRule(access)),
        }))
        .filter((group) => group.tabs.length > 0), [access, groups]);

    const activeGroup = visibleGroups.find((group) => group.key === selectedGroupKey)
        ?? visibleGroups[0];

    if (!activeGroup) return <Text py={8}>{emptyMessage}</Text>;

    const activeTabKey = (group: (typeof visibleGroups)[number]) => {
        const requested = selectedTabByGroup[group.key];
        return group.tabs.some((tab) => tab.key === requested) ? requested : group.tabs[0].key;
    };

    const renderContents = (group: (typeof visibleGroups)[number]) => (
        <Tabs.ContentGroup>
            {group.tabs.map((tab) => (
                <Tabs.Content
                    key={tab.key}
                    value={tab.key}
                    p={tab.flushContent ? 0 : { base: 2, md: 4 }}
                >
                    {tab.render(activeGroup.key === group.key && activeTabKey(group) === tab.key)}
                </Tabs.Content>
            ))}
        </Tabs.ContentGroup>
    );

    return (
        <Tabs.Root
            value={activeGroup.key}
            onValueChange={({ value }) => {
                if (visibleGroups.some((group) => group.key === value)) setSelectedGroupKey(value);
            }}
            variant="enclosed"
            colorPalette="teal"
            lazyMount
            unmountOnExit={false}
        >
            <Box as="nav" overflowX="auto" pb={2} aria-label={ariaLabel}>
                <Tabs.List minW="max-content">
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
                        {group.tabs.length === 1 ? (
                            <Box p={group.tabs[0].flushContent ? 0 : { base: 2, md: 4 }}>
                                {group.tabs[0].render(activeGroup.key === group.key)}
                            </Box>
                        ) : (
                            <Tabs.Root
                                value={activeTabKey(group)}
                                onValueChange={({ value }) => {
                                    if (group.tabs.some((tab) => tab.key === value)) {
                                        setSelectedTabByGroup((current) => ({ ...current, [group.key]: value }));
                                    }
                                }}
                                variant="line"
                                colorPalette="teal"
                                lazyMount
                                unmountOnExit={false}
                            >
                                <Box as="nav" overflowX="auto" pb={1} aria-label={`Opciones de ${group.label}`}>
                                    <Tabs.List minW="max-content">
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
                                {renderContents(group)}
                            </Tabs.Root>
                        )}
                    </Tabs.Content>
                ))}
            </Tabs.ContentGroup>
        </Tabs.Root>
    );
}
