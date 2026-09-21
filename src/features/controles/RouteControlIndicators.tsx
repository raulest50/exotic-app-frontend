import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { BezierEdge, EdgeLabelRenderer, getBezierPath, type Edge, type EdgeProps } from "@xyflow/react";
import { LuFlaskConical, LuGauge } from "react-icons/lu";
import { useRef, useState } from "react";
import { Tooltip } from "../../components/ui/tooltip";
import RouteControlDetailDialog from "./RouteControlDetailDialog";
import type { AmbitoControl } from "./types";
import type { RouteControlSummary } from "./routeControlSummary";

function describeControl(control: RouteControlSummary) {
    const scope = control.productoId
        ? `Solo producto: ${control.productoNombre || control.productoId} (${control.productoId})`
        : control.legadoGlobal ? "Alcance global heredado" : "Categoría";
    const exclusions = control.productosExcluidosIds.length
        ? ` · Excepto productos: ${control.productosExcluidosIds.join(", ")}` : "";
    return `${scope}${exclusions}${control.puntoAplicacion === "LOTE_FINAL" ? " · Lote final" : ""}`;
}

function ControlDetails({ controls }: { controls: RouteControlSummary[] }) {
    return (
        <VStack align="stretch" gap={2}>
            {controls.map((control) => (
                <Box key={`${control.planId}:${control.version}`}>
                    <Text fontWeight="semibold">{control.codigo} · {control.nombre} · v{control.version}</Text>
                    <Text fontSize="xs">{describeControl(control)}</Text>
                </Box>
            ))}
        </VStack>
    );
}

export function RouteControlBadge({ controls, ambito }: { controls?: RouteControlSummary[]; ambito: AmbitoControl }) {
    const [openedControls, setOpenedControls] = useState<RouteControlSummary[] | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    if (!controls?.length) return null;
    const process = ambito === "PROCESO";
    const label = `${process ? "Proceso" : "Calidad"}: ${controls.length} ${controls.length === 1 ? "plan vigente" : "planes vigentes"}`;
    return (
        <>
            <Tooltip content={<ControlDetails controls={controls} />} contentProps={{ maxW: "380px", zIndex: 10001 }} showArrow disabled={openedControls != null}>
                <Button
                    ref={triggerRef}
                    className="nodrag nopan"
                    size="xs"
                    variant="subtle"
                    colorPalette={process ? "blue" : "purple"}
                    borderWidth="1px"
                    pointerEvents="all"
                    aria-label={`${label}. Ver mediciones y parámetros. ${controls.map((control) => `${control.codigo}: ${describeControl(control)}`).join("; ")}`}
                    aria-haspopup="dialog"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        setOpenedControls([...controls]);
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    {process ? <LuGauge /> : <LuFlaskConical />}
                    {process ? "Proceso" : "Calidad"} · {controls.length}
                </Button>
            </Tooltip>
            {openedControls && (
                <RouteControlDetailDialog
                    controls={openedControls}
                    onClose={() => setOpenedControls(null)}
                    finalFocusEl={() => triggerRef.current}
                />
            )}
        </>
    );
}

/** A terminal output annotation, deliberately outside the editable route topology. */
export function RouteFinalControls({ controls }: { controls?: RouteControlSummary[] }) {
    if (!controls?.length) return null;
    return (
        <Box pt={2}>
            <Flex align="center" justify="center" gap={1}>
                <Box w="20px" borderTopWidth="2px" borderColor="purple.400" />
                <RouteControlBadge controls={controls} ambito="CALIDAD" />
                <Text fontSize="xs" color="purple.700">Salida final</Text>
            </Flex>
        </Box>
    );
}

export function RouteControlEdge(props: EdgeProps<Edge<{ controls?: RouteControlSummary[] }>>) {
    const [, x, y] = getBezierPath(props);
    return (
        <>
            <BezierEdge {...props} />
            {props.data?.controls?.length ? (
                <EdgeLabelRenderer>
                    <div style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${x}px, ${y + (props.label ? 28 : 0)}px)`, pointerEvents: "all" }}>
                        <RouteControlBadge controls={props.data.controls} ambito="CALIDAD" />
                    </div>
                </EdgeLabelRenderer>
            ) : null}
        </>
    );
}

export function RouteControlLegend({ loading, error, unmapped = [], onRefresh }: {
    loading: boolean; error: boolean; unmapped?: RouteControlSummary[]; onRefresh: () => void;
}) {
    return (
        <VStack align="stretch" gap={1} fontSize="xs">
            <HStack gap={4} flexWrap="wrap">
                <HStack color="blue.700"><LuGauge /><Text>Control de proceso</Text></HStack>
                <HStack color="purple.700"><LuFlaskConical /><Text>Control de calidad</Text></HStack>
                <Text color="fg.muted">Solo planes publicados y vigentes; los indicadores no representan resultados. Pulse un indicador para ver sus mediciones y parámetros.</Text>
                <Button size="xs" variant="plain" onClick={onRefresh} disabled={loading}>Actualizar indicadores</Button>
            </HStack>
            {loading ? <Text role="status">Consultando controles vigentes…</Text> : null}
            {error ? <Text role="status" color="orange.700">No se pudieron consultar los controles. La ruta sigue disponible; actualice los indicadores para reintentar.</Text> : null}
            {!loading && !error && unmapped.length > 0 ? (
                <Tooltip content={<ControlDetails controls={unmapped} />} contentProps={{ maxW: "380px" }}>
                    <Button alignSelf="start" variant="plain" size="xs" colorPalette="orange">
                        {unmapped.length} {unmapped.length === 1 ? "plan vigente sin ubicación compatible" : "planes vigentes sin ubicación compatible"} en esta ruta
                    </Button>
                </Tooltip>
            ) : null}
        </VStack>
    );
}
