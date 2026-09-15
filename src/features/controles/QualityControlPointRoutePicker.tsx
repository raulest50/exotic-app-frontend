import {
    Alert,
    Badge,
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    Heading,
    HStack,
    Portal,
    Spinner,
    Text,
    VStack,
} from "@chakra-ui/react";
import {
    Background,
    BackgroundVariant,
    Controls,
    Edge,
    Handle,
    MarkerType,
    MiniMap,
    Node,
    NodeProps,
    Position,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { LuCheck, LuGitBranch } from "react-icons/lu";

import EndPointsURL from "../../api/EndPointsURL";
import type { ProductoManufacturingDTO } from "../../pages/Productos/types";
import type { RutaProcesoCatDTO } from "../../pages/Produccion/ConfParamsCategoria/RutaProcesoCatDesigner/types";
import type { PuntoAplicacionControl, TipoOrdenControl } from "./types";

const endpoints = new EndPointsURL();
const FINAL_NODE_ID = "__quality_control_final__";
const FINAL_EDGE_ID = "__quality_control_final_edge__";

interface RouteNodeData extends Record<string, unknown> {
    label: string;
    detail?: string;
    kind: "CONTEXT" | "OPERATION" | "FINAL";
    areaOperativaId?: number | null;
    areaOperativaNombre?: string | null;
    procesoProduccionId?: number | null;
    procesoProduccionNombre?: string | null;
}

type RouteNode = Node<RouteNodeData>;
type RouteEdge = Edge<{ optionId?: string }>;

export interface QualityControlPointSelection {
    puntoAplicacion: PuntoAplicacionControl;
    tipoOrden: TipoOrdenControl;
    areaOperativaId: number | null;
    areaOperativaNombre: string | null;
    procesoProduccionId: number | null;
    procesoProduccionNombre: string | null;
    frontendNodeId: string | null;
    label: string;
}

interface RoutePointOption extends QualityControlPointSelection {
    id: string;
    edgeId: string;
}

interface RouteGraph {
    label: string;
    nodes: RouteNode[];
    edges: RouteEdge[];
    options: RoutePointOption[];
}

interface Props {
    productoId?: string | null;
    categoriaId?: number | null;
    categoriaNombre?: string | null;
    selectedPoint?: Pick<QualityControlPointSelection,
        "puntoAplicacion" | "areaOperativaId" | "procesoProduccionId" | "frontendNodeId"> | null;
    onConfirm: (selection: QualityControlPointSelection) => void;
}

type RouteTarget = Pick<Props, "productoId" | "categoriaId" | "categoriaNombre">;

function RouteNodeView({ data }: NodeProps<RouteNode>) {
    const palette = data.kind === "FINAL" ? "purple" : data.kind === "OPERATION" ? "teal" : "gray";
    return (
        <Box
            minW="180px"
            maxW="240px"
            borderWidth="2px"
            borderColor={`${palette}.500`}
            borderRadius="lg"
            bg="bg.panel"
            boxShadow="sm"
            px={4}
            py={3}
            textAlign="center"
        >
            <Handle type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0 }} />
            <Text fontWeight="semibold" lineClamp={2}>{data.label}</Text>
            {data.detail ? <Text mt={1} fontSize="xs" color="fg.muted" lineClamp={2}>{data.detail}</Text> : null}
            <Badge mt={2} size="sm" colorPalette={palette}>
                {data.kind === "FINAL" ? "Salida final" : data.kind === "OPERATION" ? "Operación" : "Contexto"}
            </Badge>
            <Handle type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0 }} />
        </Box>
    );
}

const nodeTypes = { routeNode: RouteNodeView };

function edgeStyle(selectable: boolean, selected = false) {
    return {
        stroke: selectable
            ? "var(--chakra-colors-purple-500)"
            : "var(--chakra-colors-gray-300)",
        strokeWidth: selected ? 6 : selectable ? 4 : 2,
        opacity: selectable ? 1 : 0.55,
    };
}

function routeNode(
    id: string,
    x: number,
    y: number,
    data: RouteNodeData,
): RouteNode {
    return {
        id,
        type: "routeNode",
        position: { x, y },
        data,
        draggable: false,
        connectable: false,
        selectable: false,
    };
}

function routeEdge(
    id: string,
    source: string,
    target: string,
    optionId?: string,
    label?: string,
): RouteEdge {
    return {
        id,
        source,
        target,
        data: optionId ? { optionId } : undefined,
        selectable: Boolean(optionId),
        focusable: false,
        animated: false,
        label,
        labelStyle: {
            fill: "var(--chakra-colors-purple-700)",
            fontWeight: 700,
        },
        markerEnd: optionId ? { type: MarkerType.ArrowClosed } : undefined,
        style: edgeStyle(Boolean(optionId)),
    };
}

function buildCategoryGraph(ruta: RutaProcesoCatDTO, label: string): RouteGraph {
    const nodes = ruta.nodes.map((node) => routeNode(node.id, node.posicionX, node.posicionY, {
        label: node.label || node.areaOperativaNombre || "Etapa",
        detail: [node.areaOperativaNombre, node.procesoProduccionNombre].filter(Boolean).join(" · "),
        kind: node.procesoProduccionId && node.areaOperativaId ? "OPERATION" : "CONTEXT",
        areaOperativaId: node.areaOperativaId,
        areaOperativaNombre: node.areaOperativaNombre,
        procesoProduccionId: node.procesoProduccionId,
        procesoProduccionNombre: node.procesoProduccionNombre,
    }));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const outgoing = new Set(ruta.edges.map((edge) => edge.sourceNodeId));
    const terminal = nodes.find((node) => !outgoing.has(node.id) && node.data.kind === "OPERATION");
    const options: RoutePointOption[] = [];
    const operationOptions = new Map<string, RoutePointOption>();
    const edges = ruta.edges.map((edge) => {
        const source = nodeById.get(edge.sourceNodeId);
        const target = nodeById.get(edge.targetNodeId);
        if (!source || !target || source.data.kind !== "OPERATION") {
            return routeEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);
        }
        const optionId = `operation:${source.id}`;
        let option = operationOptions.get(optionId);
        if (!option) {
            option = {
                id: optionId,
                edgeId: edge.id,
                puntoAplicacion: "SALIDA_OPERACION",
                tipoOrden: "OP",
                areaOperativaId: source.data.areaOperativaId ?? null,
                areaOperativaNombre: source.data.areaOperativaNombre ?? null,
                procesoProduccionId: source.data.procesoProduccionId ?? null,
                procesoProduccionNombre: source.data.procesoProduccionNombre ?? null,
                frontendNodeId: source.id,
                label: `Salida de ${source.data.label}`,
            };
            operationOptions.set(optionId, option);
            options.push(option);
        }
        return routeEdge(edge.id, edge.sourceNodeId, edge.targetNodeId, option.id, "◇ Calidad");
    });

    if (terminal) {
        const finalNode = routeNode(
            FINAL_NODE_ID,
            terminal.position.x + 340,
            terminal.position.y,
            { label: "Producto / lote final", kind: "FINAL" },
        );
        nodes.push(finalNode);
        const finalOption: RoutePointOption = {
            id: "final",
            edgeId: FINAL_EDGE_ID,
            puntoAplicacion: "LOTE_FINAL",
            tipoOrden: "OP",
            areaOperativaId: null,
            areaOperativaNombre: null,
            procesoProduccionId: null,
            procesoProduccionNombre: null,
            frontendNodeId: null,
            label: `Salida final de ${terminal.data.label}: producto o lote terminado`,
        };
        options.push(finalOption);
        edges.push(routeEdge(FINAL_EDGE_ID, terminal.id, FINAL_NODE_ID, finalOption.id, "◇ Calidad final"));
    }

    return { label, nodes, edges, options };
}

function buildManufacturingGraph(producto: ProductoManufacturingDTO): RouteGraph {
    const process = producto.procesoProduccionCompleto;
    if (!process?.nodes?.length) {
        throw new Error("El producto no tiene un flujo de manufactura configurado.");
    }
    const nodes = process.nodes.map((node) => routeNode(
        node.frontendId,
        node.posicionX,
        node.posicionY,
        {
            label: node.label || (node.nodeType === "PROCESO" ? node.procesoNombre : undefined) || producto.nombre,
            detail: node.nodeType === "PROCESO"
                ? [node.areaOperativaNombre, node.procesoNombre].filter(Boolean).join(" · ")
                : undefined,
            kind: node.nodeType === "PROCESO" ? "OPERATION" : node.nodeType === "TARGET" ? "FINAL" : "CONTEXT",
            areaOperativaId: node.nodeType === "PROCESO" ? node.areaOperativaId : null,
            areaOperativaNombre: node.nodeType === "PROCESO" ? node.areaOperativaNombre : null,
            procesoProduccionId: node.nodeType === "PROCESO" ? node.procesoId : null,
            procesoProduccionNombre: node.nodeType === "PROCESO" ? node.procesoNombre : null,
        },
    ));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const options: RoutePointOption[] = [];
    const edges = (process.edges ?? []).map((edge) => {
        const source = nodeById.get(edge.sourceFrontendId);
        const target = nodeById.get(edge.targetFrontendId);
        if (!source || !target || source.data.kind !== "OPERATION") {
            return routeEdge(edge.frontendId, edge.sourceFrontendId, edge.targetFrontendId);
        }
        const isFinal = target.data.kind === "FINAL";
        const option: RoutePointOption = {
            id: isFinal ? "final" : `operation:${source.id}`,
            edgeId: edge.frontendId,
            puntoAplicacion: isFinal ? "LOTE_FINAL" : "SALIDA_OPERACION",
            tipoOrden: "OF",
            areaOperativaId: isFinal ? null : source.data.areaOperativaId ?? null,
            areaOperativaNombre: isFinal ? null : source.data.areaOperativaNombre ?? null,
            procesoProduccionId: isFinal ? null : source.data.procesoProduccionId ?? null,
            procesoProduccionNombre: isFinal ? null : source.data.procesoProduccionNombre ?? null,
            frontendNodeId: isFinal ? null : source.id,
            label: isFinal
                ? `Salida final de ${source.data.label}: lote de ${producto.nombre}`
                : `Salida de ${source.data.label} hacia ${target.data.label}`,
        };
        options.push(option);
        return routeEdge(
            edge.frontendId,
            edge.sourceFrontendId,
            edge.targetFrontendId,
            option.id,
            isFinal ? "◇ Calidad final" : "◇ Calidad",
        );
    });
    return { label: `Flujo de fabricación · ${producto.nombre}`, nodes, edges, options };
}

async function loadCategoryGraph(categoriaId: number, label: string, signal: AbortSignal): Promise<RouteGraph> {
    const response = await axios.get<RutaProcesoCatDTO>(
        endpoints.get_ruta_proceso_cat.replace("{categoriaId}", String(categoriaId)),
        { withCredentials: true, signal },
    );
    if (!response.data?.nodes?.length) {
        throw new Error("La categoría seleccionada no tiene una ruta de proceso vigente.");
    }
    return buildCategoryGraph(response.data, label);
}

async function loadRouteGraph(target: RouteTarget, signal: AbortSignal): Promise<RouteGraph> {
    if (target.categoriaId != null) {
        return loadCategoryGraph(
            target.categoriaId,
            `Ruta vigente · ${target.categoriaNombre || `Categoría ${target.categoriaId}`}`,
            signal,
        );
    }
    const productoId = target.productoId?.trim();
    if (!productoId) {
        throw new Error("Seleccione una categoría o indique el código de un producto.");
    }
    const response = await axios.get<ProductoManufacturingDTO>(
        endpoints.get_producto_manufacturing.replace("{productoId}", encodeURIComponent(productoId)),
        { withCredentials: true, signal },
    );
    const producto = response.data;
    if (producto.tipoProducto === "T") {
        if (producto.categoriaId == null) {
            throw new Error("El producto terminado no tiene una categoría con ruta de proceso.");
        }
        return loadCategoryGraph(
            producto.categoriaId,
            `Ruta vigente · ${producto.nombre}`,
            signal,
        );
    }
    if (producto.tipoProducto !== "S") {
        throw new Error("Los controles solo pueden configurarse sobre productos terminados o semiterminados.");
    }
    if (!producto.requiereOrdenFabricacion) {
        throw new Error(
            "Este semiterminado es una etapa integrada y no tiene una OF o lote propios. Configure el control sobre la categoría del producto terminado que lo utiliza.",
        );
    }
    return buildManufacturingGraph(producto);
}

function matchesSelection(option: RoutePointOption, selectedPoint: Props["selectedPoint"]): boolean {
    if (!selectedPoint || option.puntoAplicacion !== selectedPoint.puntoAplicacion) return false;
    if (option.puntoAplicacion === "LOTE_FINAL") return true;
    if (selectedPoint.frontendNodeId) return option.frontendNodeId === selectedPoint.frontendNodeId;
    return option.areaOperativaId === selectedPoint.areaOperativaId
        && option.procesoProduccionId === selectedPoint.procesoProduccionId;
}

function RouteGraphView({ graph, selectedId, onSelect }: {
    graph: RouteGraph;
    selectedId: string | null;
    onSelect: (option: RoutePointOption) => void;
}) {
    const optionById = useMemo(() => new Map(graph.options.map((option) => [option.id, option])), [graph.options]);
    const edges = useMemo(() => graph.edges.map((edge) => {
        const optionId = edge.data?.optionId;
        return {
            ...edge,
            animated: optionId === selectedId,
            style: edgeStyle(Boolean(optionId), optionId === selectedId),
        };
    }), [graph.edges, selectedId]);

    return (
        <Flex direction={{ base: "column", lg: "row" }} gap={4} minH={{ base: "600px", lg: "470px" }}>
            <Box
                flex="1"
                minH={{ base: "380px", lg: "470px" }}
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
                bg="bg.subtle"
            >
                <ReactFlow
                    nodes={graph.nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    deleteKeyCode={null}
                    fitView
                    fitViewOptions={{ padding: 0.25 }}
                    minZoom={0.25}
                    onEdgeClick={(_, edge) => {
                        const optionId = edge.data?.optionId;
                        const option = optionId ? optionById.get(optionId) : undefined;
                        if (option) onSelect(option);
                    }}
                >
                    <Controls showInteractive={false} />
                    <MiniMap pannable zoomable />
                    <Background variant={BackgroundVariant.Dots} gap={14} size={1} />
                </ReactFlow>
            </Box>
            <VStack align="stretch" gap={2} w={{ base: "full", lg: "330px" }}>
                <Heading size="sm">Salidas disponibles</Heading>
                <Text fontSize="sm" color="fg.muted">
                    Seleccione una arista. Esta lista ofrece la misma acción mediante teclado.
                </Text>
                {graph.options.map((option) => (
                    <Button
                        key={option.id}
                        variant={selectedId === option.id ? "solid" : "outline"}
                        colorPalette="purple"
                        justifyContent="flex-start"
                        h="auto"
                        minH="44px"
                        whiteSpace="normal"
                        textAlign="left"
                        onClick={() => onSelect(option)}
                    >
                        {selectedId === option.id ? <LuCheck /> : <LuGitBranch />}
                        {option.label}
                    </Button>
                ))}
            </VStack>
        </Flex>
    );
}

export default function QualityControlPointRoutePicker(props: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [graph, setGraph] = useState<RouteGraph | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { productoId, categoriaId, categoriaNombre, onConfirm } = props;
    const selectedPointType = props.selectedPoint?.puntoAplicacion;
    const selectedAreaId = props.selectedPoint?.areaOperativaId;
    const selectedProcessId = props.selectedPoint?.procesoProduccionId;
    const selectedFrontendNodeId = props.selectedPoint?.frontendNodeId;

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        setGraph(null);
        setSelectedId(null);
        void loadRouteGraph({ productoId, categoriaId, categoriaNombre }, controller.signal)
            .then((nextGraph) => {
                setGraph(nextGraph);
                const previousPoint = selectedPointType ? {
                    puntoAplicacion: selectedPointType,
                    areaOperativaId: selectedAreaId ?? null,
                    procesoProduccionId: selectedProcessId ?? null,
                    frontendNodeId: selectedFrontendNodeId ?? null,
                } : null;
                setSelectedId(nextGraph.options.find((option) => matchesSelection(option, previousPoint))?.id ?? null);
            })
            .catch((loadError: unknown) => {
                if (axios.isCancel(loadError)) return;
                const responseMessage = axios.isAxiosError(loadError)
                    ? (loadError.response?.data as { error?: string; message?: string } | undefined)?.error
                        || (loadError.response?.data as { error?: string; message?: string } | undefined)?.message
                    : null;
                setError(responseMessage || (loadError instanceof Error ? loadError.message : "No fue posible cargar la ruta."));
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [
        categoriaId,
        categoriaNombre,
        open,
        productoId,
        selectedAreaId,
        selectedFrontendNodeId,
        selectedPointType,
        selectedProcessId,
    ]);

    const selected = graph?.options.find((option) => option.id === selectedId) ?? null;
    const hasTarget = categoriaId != null || Boolean(productoId?.trim());

    return (
        <Dialog.Root open={open} onOpenChange={({ open: nextOpen }) => setOpen(nextOpen)} size="cover">
            <Dialog.Trigger asChild>
                <Button variant="outline" colorPalette="purple" disabled={!hasTarget}>
                    <LuGitBranch /> Seleccionar salida en la ruta
                </Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content m={{ base: 2, md: 6 }} maxW="7xl">
                        <Dialog.Header>
                            <Dialog.Title>Punto gráfico del control de calidad</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar selector de ruta" size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
                            <Alert.Root status="info" mb={4}>
                                <Alert.Indicator />
                                <Alert.Content>
                                    <Alert.Title>La ruta está en modo de solo lectura</Alert.Title>
                                    <Alert.Description>
                                        La arista representa la salida que Calidad evaluará. Ningún nodo ni conexión puede modificarse desde aquí.
                                    </Alert.Description>
                                </Alert.Content>
                            </Alert.Root>
                            {loading ? (
                                <HStack justify="center" py={16}><Spinner /><Text>Cargando ruta vigente…</Text></HStack>
                            ) : error ? (
                                <Alert.Root status="warning"><Alert.Indicator /><Alert.Content><Alert.Title>No se puede seleccionar el punto</Alert.Title><Alert.Description>{error}</Alert.Description></Alert.Content></Alert.Root>
                            ) : graph ? (
                                <VStack align="stretch" gap={3}>
                                    <Text fontWeight="semibold">{graph.label}</Text>
                                    <ReactFlowProvider>
                                        <RouteGraphView graph={graph} selectedId={selectedId} onSelect={(option) => setSelectedId(option.id)} />
                                    </ReactFlowProvider>
                                </VStack>
                            ) : null}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button
                                colorPalette="purple"
                                disabled={!selected}
                                onClick={() => {
                                    if (!selected) return;
                                    onConfirm(selected);
                                    setOpen(false);
                                }}
                            >
                                Confirmar punto
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
