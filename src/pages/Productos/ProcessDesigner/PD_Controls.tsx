import { useState } from "react";
import { Button, Field, Fieldset, Flex, IconButton, NativeSelect, Stack, Switch, Text } from "@chakra-ui/react";
import { FiChevronLeft, FiChevronRight, FiCopy, FiMaximize, FiMinimize } from "react-icons/fi";
import LoadTerminadoDialog, { type LoadedDraft } from "./LoadTerminadoDialog.tsx";

export interface DesignerViewPreferences {
    wheelZoom: "ctrl" | "wheel";
    edgeType: "default" | "straight" | "step" | "smoothstep";
    animatedEdges: boolean;
    edgeWidth: 1 | 2 | 3 | 4;
    showMiniMap: boolean;
}

export default function PD_Controls({ hasDraft, onClone, preferences, onPreferencesChange, onResetPreferences, preferencesSaved,
    isFullscreen, fullscreenSupported, fullscreenBusy, onToggleFullscreen }: {
    hasDraft: boolean;
    onClone: (draft: LoadedDraft) => void;
    preferences: DesignerViewPreferences;
    onPreferencesChange: (preferences: DesignerViewPreferences) => void;
    onResetPreferences: () => void;
    preferencesSaved: boolean;
    isFullscreen: boolean;
    fullscreenSupported: boolean;
    fullscreenBusy: boolean;
    onToggleFullscreen: () => void;
}) {
    const [collapsed, setCollapsed] = useState(true);
    const [open, setOpen] = useState(false);

    return <>
        <Stack as="aside" aria-label="Controles del diseñador"
            borderLeftWidth={{ lg: "1px" }} borderTopWidth={{ base: "1px", lg: "0" }}
            w={{ base: "full", lg: collapsed ? "3.5rem" : "16rem" }} flexShrink="0" minH="0"
            overflowY="auto" overscrollBehavior="contain" p="2" gap="3">
            <Flex justify="space-between" align="center">
                {!collapsed && <Text fontWeight="semibold" fontSize="sm">Controles</Text>}
                <IconButton size="sm" variant="ghost"
                    aria-label={collapsed ? "Expandir controles" : "Contraer controles"}
                    aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? <FiChevronLeft /> : <FiChevronRight />}
                </IconButton>
            </Flex>
            {!collapsed && <Stack gap="4">
                <Button size="sm" onClick={() => setOpen(true)}><FiCopy /> Clonar producto</Button>
                <Fieldset.Root size="sm" gap="0" minW="0" borderTopWidth="1px" pt="2">
                    <Fieldset.Legend fontSize="sm" fontWeight="semibold">Navegación</Fieldset.Legend>
                    <Stack gap="3">
                        <Button size="sm" variant="outline" disabled={!fullscreenSupported || fullscreenBusy}
                            onClick={onToggleFullscreen}>
                            {isFullscreen ? <FiMinimize /> : <FiMaximize />}
                            {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                        </Button>
                        {!fullscreenSupported && <Text fontSize="xs" color="fg.muted">Este navegador no permite pantalla completa.</Text>}
                        <Switch.Root size="sm" colorPalette="teal" checked={preferences.showMiniMap}
                            onCheckedChange={({ checked }) => onPreferencesChange({ ...preferences, showMiniMap: checked })}>
                            <Switch.HiddenInput />
                            <Switch.Control><Switch.Thumb /></Switch.Control>
                            <Switch.Label>Mostrar minimapa</Switch.Label>
                        </Switch.Root>
                        <Field.Root>
                            <Field.Label>Zoom con la rueda</Field.Label>
                            <NativeSelect.Root size="sm">
                                <NativeSelect.Field value={preferences.wheelZoom} onChange={(event) => onPreferencesChange({
                                    ...preferences, wheelZoom: event.target.value as DesignerViewPreferences["wheelZoom"],
                                })}>
                                    <option value="ctrl">Ctrl + rueda</option>
                                    <option value="wheel">Rueda directamente</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                            <Field.HelperText>
                                {preferences.wheelZoom === "ctrl"
                                    ? "Sin Ctrl, la rueda desplaza la página."
                                    : "La rueda hace zoom al estar sobre el lienzo."}
                            </Field.HelperText>
                        </Field.Root>
                    </Stack>
                </Fieldset.Root>
                <Fieldset.Root size="sm" gap="0" minW="0" borderTopWidth="1px" pt="2">
                    <Fieldset.Legend fontSize="sm" fontWeight="semibold">Conexiones</Fieldset.Legend>
                    <Stack gap="3">
                        <Field.Root>
                            <Field.Label>Forma de las conexiones</Field.Label>
                            <NativeSelect.Root size="sm">
                                <NativeSelect.Field value={preferences.edgeType} onChange={(event) => onPreferencesChange({
                                    ...preferences, edgeType: event.target.value as DesignerViewPreferences["edgeType"],
                                })}>
                                    <option value="default">Curvas</option>
                                    <option value="straight">Rectas</option>
                                    <option value="step">Ángulos rectos</option>
                                    <option value="smoothstep">Ángulos redondeados</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>Grosor de las conexiones</Field.Label>
                            <NativeSelect.Root size="sm">
                                <NativeSelect.Field value={preferences.edgeWidth} onChange={(event) => onPreferencesChange({
                                    ...preferences, edgeWidth: Number(event.target.value) as DesignerViewPreferences["edgeWidth"],
                                })}>
                                    <option value={1}>Fino</option>
                                    <option value={2}>Normal</option>
                                    <option value={3}>Grueso</option>
                                    <option value={4}>Muy grueso</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field.Root>
                        <Switch.Root size="sm" colorPalette="teal" checked={preferences.animatedEdges}
                            onCheckedChange={({ checked }) => onPreferencesChange({ ...preferences, animatedEdges: checked })}>
                            <Switch.HiddenInput />
                            <Switch.Control><Switch.Thumb /></Switch.Control>
                            <Switch.Label>Animar conexiones</Switch.Label>
                        </Switch.Root>
                    </Stack>
                </Fieldset.Root>
                <Text fontSize="xs" color="fg.muted" role={preferencesSaved ? undefined : "status"}>
                    {preferencesSaved
                        ? "Estas preferencias se recuerdan en este navegador y no modifican los datos del producto."
                        : "No se pudieron guardar las preferencias en este navegador. Se mantendrán mientras esté abierto el diseñador."}
                </Text>
                <Button size="sm" variant="outline" whiteSpace="normal" h="auto" minH="8" py="2" onClick={onResetPreferences}>
                    Restablecer preferencias
                </Button>
            </Stack>}
        </Stack>
        {open && <LoadTerminadoDialog hasDraft={hasDraft} onClose={() => setOpen(false)} onLoad={(draft) => {
            onClone(draft);
            setOpen(false);
        }} />}
    </>;
}
