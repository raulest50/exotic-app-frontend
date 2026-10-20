import { useState } from "react";
import { Button, Flex, IconButton, Stack, Text } from "@chakra-ui/react";
import { FiChevronLeft, FiChevronRight, FiCopy } from "react-icons/fi";
import LoadTerminadoDialog, { type LoadedDraft } from "./LoadTerminadoDialog.tsx";

export default function PD_Controls({ hasDraft, onClone }: {
    hasDraft: boolean;
    onClone: (draft: LoadedDraft) => void;
}) {
    const [collapsed, setCollapsed] = useState(true);
    const [open, setOpen] = useState(false);

    return <>
        <Stack as="aside" aria-label="Controles del diseñador"
            borderLeftWidth={{ lg: "1px" }} borderTopWidth={{ base: "1px", lg: "0" }}
            w={{ base: "full", lg: collapsed ? "3.5rem" : "13rem" }} flexShrink="0" p="2" gap="3">
            <Flex justify="space-between" align="center">
                {!collapsed && <Text fontWeight="semibold" fontSize="sm">Controles</Text>}
                <IconButton size="sm" variant="ghost"
                    aria-label={collapsed ? "Expandir controles" : "Contraer controles"}
                    aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? <FiChevronLeft /> : <FiChevronRight />}
                </IconButton>
            </Flex>
            {!collapsed && <Button size="sm" onClick={() => setOpen(true)}><FiCopy /> Clonar producto</Button>}
        </Stack>
        {open && <LoadTerminadoDialog hasDraft={hasDraft} onClose={() => setOpen(false)} onLoad={(draft) => {
            onClone(draft);
            setOpen(false);
        }} />}
    </>;
}
