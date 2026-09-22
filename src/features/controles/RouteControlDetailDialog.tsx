import {
    Alert, Button, CloseButton, Dialog, Field, Heading, HStack,
    NativeSelect, Portal, Spinner, Text, VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

import { apiFailureDetail, getRouteControlPlan } from "./api";
import PlanVersionDetailContent from "./PlanVersionDetailContent";
import type { RouteControlSummary } from "./routeControlSummary";
import type { PlanControl, VersionPlanControl } from "./types";

type DetailState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; plan: PlanControl; version: VersionPlanControl };

function RoutePlanDetails({ control }: { control: RouteControlSummary }) {
    const { planId, version: numero, ambito } = control;
    const [state, setState] = useState<DetailState>({ status: "loading" });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setState({ status: "loading" });
        void getRouteControlPlan(planId, numero, controller.signal).then((plan) => {
            if (controller.signal.aborted) return;
            const version = plan.versiones.find((item) => item.numero === numero && item.estado === "VIGENTE");
            if (plan.id !== planId || plan.ambito !== ambito || !version) {
                setState({ status: "error", message: "El plan ha cambiado. Cierre el detalle y actualice los indicadores de la ruta." });
                return;
            }
            setState({ status: "ready", plan, version });
        }).catch((error: unknown) => {
            if (!controller.signal.aborted) {
                setState({
                    status: "error",
                    message: apiFailureDetail(error, "No fue posible consultar las mediciones del plan.").message,
                });
            }
        });
        return () => controller.abort();
    }, [ambito, attempt, numero, planId]);

    if (state.status === "loading") {
        return <HStack role="status" justify="center" py={8}><Spinner size="sm" /><Text>Cargando mediciones y parámetros…</Text></HStack>;
    }
    if (state.status === "error") {
        return (
            <VStack align="stretch" gap={3}>
                <Alert.Root status="error"><Alert.Indicator /><Text>{state.message}</Text></Alert.Root>
                <Button alignSelf="start" variant="outline" onClick={() => setAttempt((current) => current + 1)}>Reintentar</Button>
            </VStack>
        );
    }
    return <PlanVersionDetailContent plan={state.plan} version={state.version} />;
}

function controlKey(control: RouteControlSummary) {
    return `${control.planId}:${control.version}`;
}

export default function RouteControlDetailDialog({ controls, onClose, finalFocusEl }: {
    controls: RouteControlSummary[];
    onClose: () => void;
    finalFocusEl: () => HTMLElement | null;
}) {
    const [selectedKey, setSelectedKey] = useState(() => controls[0] ? controlKey(controls[0]) : "");
    const selected = controls.find((control) => controlKey(control) === selectedKey) ?? controls[0];
    // Los portales deben quedar dentro del elemento en pantalla completa para ser visibles.
    const [fullscreenElement, setFullscreenElement] = useState(() => document.fullscreenElement as HTMLElement | null);
    useEffect(() => {
        const syncFullscreen = () => setFullscreenElement(document.fullscreenElement as HTMLElement | null);
        document.addEventListener("fullscreenchange", syncFullscreen);
        return () => document.removeEventListener("fullscreenchange", syncFullscreen);
    }, []);

    return (
        <Dialog.Root open onOpenChange={({ open }) => !open && onClose()} size="xl" scrollBehavior="inside" finalFocusEl={finalFocusEl}>
            <Portal container={fullscreenElement ? { current: fullscreenElement } : undefined}>
                {/* El diseñador usa z-index 9999 en pantalla completa. */}
                <Dialog.Backdrop zIndex={10002} onPointerDown={(event) => event.stopPropagation()} />
                <Dialog.Positioner
                    zIndex={10003}
                    className="nodrag nopan nowheel"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => { if (event.key !== "Escape") event.stopPropagation(); }}
                >
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Detalle de controles de {selected?.ambito === "PROCESO" ? "proceso" : "calidad"}</Dialog.Title>
                            <Dialog.Description>Planes configurados en este punto de la ruta · solo lectura</Dialog.Description>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild><CloseButton size="sm" aria-label="Cerrar detalle de controles" /></Dialog.CloseTrigger>
                        <Dialog.Body>
                            <VStack align="stretch" gap={5}>
                                {controls.length > 1 && (
                                    <Field.Root>
                                        <Field.Label>Plan a consultar ({controls.length})</Field.Label>
                                        <NativeSelect.Root>
                                            <NativeSelect.Field value={selected ? controlKey(selected) : ""} onChange={(event) => setSelectedKey(event.target.value)}>
                                                {controls.map((control) => (
                                                    <option key={controlKey(control)} value={controlKey(control)}>
                                                        {control.codigo} · {control.nombre} · v{control.version}
                                                    </option>
                                                ))}
                                            </NativeSelect.Field>
                                            <NativeSelect.Indicator />
                                        </NativeSelect.Root>
                                    </Field.Root>
                                )}
                                {selected && (
                                    <>
                                        <Heading size="sm">{selected.codigo} · {selected.nombre} · v{selected.version}</Heading>
                                        <RoutePlanDetails key={controlKey(selected)} control={selected} />
                                    </>
                                )}
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button type="button" variant="outline" minW="24" px={5} onClick={onClose}>
                                Cerrar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
