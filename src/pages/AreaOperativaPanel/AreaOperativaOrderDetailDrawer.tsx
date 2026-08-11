import { Accordion, Badge, Box, Drawer, Flex, HStack, SimpleGrid, Spinner, Stack, Table, Text, VStack, Tabs, Separator, Portal } from "@chakra-ui/react";
import { useColorModeValue } from "../../components/ui/color-mode";
import { Background, BackgroundVariant, Edge, Handle, MiniMap, Node, NodeProps, NodeTypes, Position, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    AreaOperativaOrdenDetalleDTO,
    BomRecetaNodeDTO,
    RutaProcesoVisualNodeDTO,
} from "./areaOperativaPanel.types.ts";
import {
    formatDateTime,
    getEstadoDispensacionMaterialesColor,
    getEstadoDispensacionMaterialesLabel,
    getPoliticaDispensacionInicioColor,
    getPoliticaDispensacionInicioLabel,
} from "../Produccion/components/SeguimientoBoardUI.tsx";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    detail: AreaOperativaOrdenDetalleDTO | null;
    loading: boolean;
    currentAreaId?: number | null;
}

type RouteNodeData = {
    [key: string]: unknown;
    label: string;
    areaNombre: string;
    estadoDescripcion: string;
    estadoActual: number | null;
    currentLeaderArea: boolean;
    duracionEstimadaMinutos: number;
    requiereJornadaLaboral: boolean;
    currentAreaId?: number | null;
};

type RouteFlowNode = Node<RouteNodeData, "routeNode">;

function getEstadoColor(estado: number | null | undefined): string {
    switch (estado) {
        case 0:
            return "#DD6B20";
        case 1:
            return "#D69E2E";
        case 2:
            return "#2F855A";
        case 4:
            return "#2B6CB0";
        default:
            return "#718096";
    }
}

function getEstadoBadgeScheme(estado: number | null | undefined): string {
    switch (estado) {
        case 0:
            return "orange";
        case 1:
            return "yellow";
        case 2:
            return "green";
        case 4:
            return "blue";
        default:
            return "gray";
    }
}

function formatCantidad(value: number | null | undefined): string {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "-";
    }

    if (Number.isInteger(value)) {
        return value.toLocaleString("es-CO");
    }

    return value.toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function formatDurationMinutes(value: number | null | undefined): string {
    if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
        return "0 min";
    }

    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    if (hours <= 0) {
        return `${minutes} min`;
    }
    if (minutes === 0) {
        return `${hours} h`;
    }
    return `${hours} h ${minutes} min`;
}

function RouteNode({ data }: NodeProps<RouteFlowNode>) {
    const isCurrentAreaNode = data.currentAreaId != null && data.currentLeaderArea;
    const accentColor = getEstadoColor(data.estadoActual);
    const nodeBorderColor = useColorModeValue("gray.200", "gray.600");
    const nodeAreaColor = useColorModeValue("gray.700", "gray.200");

    return (
        <Box
            minW="220px"
            bg="app.surface"
            borderRadius="lg"
            border="2px solid"
            borderColor={isCurrentAreaNode ? "teal.500" : nodeBorderColor}
            boxShadow={isCurrentAreaNode ? "0 0 0 3px rgba(49,151,149,0.15)" : "sm"}
            overflow="hidden"
        >
            <Box bg={accentColor} px={3} py={2}>
                <Text fontWeight="bold" color="white" fontSize="sm" lineClamp={2}>
                    {data.label}
                </Text>
            </Box>
            <VStack align="stretch" gap={2} px={3} py={3}>
                <Text fontSize="sm" color={nodeAreaColor} fontWeight="semibold">
                    {data.areaNombre}
                </Text>
                <Badge alignSelf="start" colorPalette={getEstadoBadgeScheme(data.estadoActual)}>
                    {data.estadoDescripcion}
                </Badge>
                <HStack gap={2} flexWrap="wrap">
                    <Badge colorPalette="purple">{formatDurationMinutes(data.duracionEstimadaMinutos)}</Badge>
                    <Badge colorPalette={data.requiereJornadaLaboral ? "green" : "orange"}>
                        {data.requiereJornadaLaboral ? "Jornada" : "Continuo"}
                    </Badge>
                </HStack>
                {isCurrentAreaNode ? (
                    <Badge alignSelf="start" colorPalette="teal">
                        Tu área
                    </Badge>
                ) : null}
            </VStack>

            <Handle type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0 }} />
        </Box>
    );
}

const nodeTypes = {
    routeNode: RouteNode,
} satisfies NodeTypes;

function buildRouteNodes(detail: AreaOperativaOrdenDetalleDTO | null, currentAreaId?: number | null): RouteFlowNode[] {
    if (!detail) {
        return [];
    }

    return detail.rutaProceso.nodes.map((node: RutaProcesoVisualNodeDTO) => ({
        id: node.frontendId || String(node.nodeId),
        type: "routeNode",
        position: { x: node.posicionX, y: node.posicionY },
        draggable: false,
        selectable: false,
        data: {
            label: node.label || node.areaNombre || "Nodo sin nombre",
            areaNombre: node.areaNombre || "Área sin asignar",
            estadoDescripcion: node.estadoDescripcion || "Sin estado",
            estadoActual: node.estadoActual,
            currentLeaderArea: node.currentLeaderArea,
            duracionEstimadaMinutos: node.duracionEstimadaMinutos ?? 0,
            requiereJornadaLaboral: node.requiereJornadaLaboral !== false,
            currentAreaId,
        },
    }));
}

function buildRouteEdges(detail: AreaOperativaOrdenDetalleDTO | null): Edge[] {
    if (!detail) {
        return [];
    }

    return detail.rutaProceso.edges.map((edge) => ({
        id: edge.frontendId || String(edge.edgeId),
        source: edge.sourceFrontendId || String(edge.sourceNodeId),
        target: edge.targetFrontendId || String(edge.targetNodeId),
        animated: false,
        selectable: false,
        style: {
            strokeWidth: 3,
            stroke: "#4A5568",
        },
    }));
}

function BomTreeNode({ node, depth = 0 }: { node: BomRecetaNodeDTO; depth?: number }) {
    const hasChildren = node.subInsumos.length > 0;
    const content = (
        <Box
            borderWidth="1px"
            borderRadius="md"
            bg="app.surface"
            p={3}
            ml={depth > 0 ? depth * 4 : 0}
        >
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={2}>
                <Box>
                    <Text fontWeight="bold">{node.productoNombre}</Text>
                    <Text fontSize="sm" color="app.textMuted">
                        {node.productoId} · {node.tipoProducto}
                    </Text>
                </Box>
                <VStack align="end" gap={1}>
                    <Badge colorPalette={node.inventareable ? "blue" : "gray"}>
                        {node.inventareable ? "Inventariable" : "No inventariable"}
                    </Badge>
                    <Text fontWeight="semibold">
                        {formatCantidad(node.cantidadTotalRequerida)} {node.tipoUnidades || ""}
                    </Text>
                </VStack>
            </HStack>
        </Box>
    );

    if (!hasChildren) {
        return content;
    }

    return (
        <Accordion.Root collapsible defaultValue={['item-0']}>
            <Accordion.Item border="none" value='item-0'>
                <Accordion.ItemTrigger px={0} py={0} _hover={{ bg: "transparent" }}>
                    <Box flex="1" textAlign="left">
                        {content}
                    </Box>
                    <Accordion.ItemIndicator />
                </Accordion.ItemTrigger>
                <Accordion.ItemContent px={0} pt={3}><Accordion.ItemBody>
                        <VStack align="stretch" gap={3}>
                            {node.subInsumos.map((subNode) => (
                                <BomTreeNode
                                    key={`${node.productoId}-${subNode.productoId}-${subNode.insumoId ?? "sub"}`}
                                    node={subNode}
                                    depth={depth + 1}
                                />
                            ))}
                        </VStack>
                    </Accordion.ItemBody></Accordion.ItemContent>
            </Accordion.Item>
        </Accordion.Root>
    );
}

export default function AreaOperativaOrderDetailDrawer({
    isOpen,
    onClose,
    detail,
    loading,
    currentAreaId,
}: Props) {
    const routeNodes = buildRouteNodes(detail, currentAreaId);
    const routeEdges = buildRouteEdges(detail);

    return (
        <Drawer.Root open={isOpen} placement='end' size='xl' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content maxW={{ base: "100vw", md: "36rem" }}>
                        <Drawer.CloseTrigger />
                        <Drawer.Header><Drawer.Title>Detalle operativo de la orden</Drawer.Title></Drawer.Header>

                        <Drawer.Body>
                            {loading ? (
                                <Flex align="center" justify="center" py={10}>
                                    <Spinner />
                                </Flex>
                            ) : null}

                            {!loading && detail ? (
                                <Tabs.Root defaultValue="resumen" variant='enclosed' colorPalette="teal" lazyMount>
                                    <Tabs.List>
                                        <Tabs.Trigger value="resumen" minH={12}>Resumen</Tabs.Trigger>
                                        <Tabs.Trigger value="ruta" minH={12}>Ruta</Tabs.Trigger>
                                        <Tabs.Trigger value="bom" minH={12}>BOM</Tabs.Trigger>
                                    </Tabs.List>
                                        <Tabs.Content value="resumen" px={0} py={5}>
                                            <VStack align="stretch" gap={5}>
                                                <Box>
                                                    <Text fontWeight="bold">{detail.orden.loteAsignado || `OP-${detail.orden.ordenId}`}</Text>
                                                    <Text color="app.textMuted">
                                                        {detail.orden.productoNombre} · {detail.orden.productoId}
                                                    </Text>
                                                    <Text color="app.textMuted">
                                                        Categoría: {detail.orden.categoriaNombre || "Sin categoría"} · Cantidad: {formatCantidad(detail.orden.cantidadProducir)}
                                                    </Text>
                                                    <HStack mt={2} gap={2} flexWrap="wrap">
                                                        <Badge colorPalette={getEstadoDispensacionMaterialesColor(detail.orden.estadoDispensacionMateriales)}>
                                                            {getEstadoDispensacionMaterialesLabel(detail.orden.estadoDispensacionMateriales)}
                                                        </Badge>
                                                        <Badge colorPalette={getPoliticaDispensacionInicioColor(detail.orden.politicaDispensacionInicio)}>
                                                            {getPoliticaDispensacionInicioLabel(detail.orden.politicaDispensacionInicio)}
                                                        </Badge>
                                                    </HStack>
                                                </Box>

                                                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                                    <Box borderWidth="1px" borderRadius="md" p={3}>
                                                        <Text fontSize="sm" color="app.textSubtle">Politica dispensacion</Text>
                                                        <Text>{getPoliticaDispensacionInicioLabel(detail.orden.politicaDispensacionInicio)}</Text>
                                                        <Text fontSize="xs" color="app.textMuted">
                                                            {formatDateTime(detail.orden.fechaAplicacionPoliticaDispensacion)}
                                                        </Text>
                                                    </Box>
                                                    <Box borderWidth="1px" borderRadius="md" p={3}>
                                                        <Text fontSize="sm" color="app.textSubtle">Estado materiales</Text>
                                                        <Text>{getEstadoDispensacionMaterialesLabel(detail.orden.estadoDispensacionMateriales)}</Text>
                                                    </Box>
                                                    <Box borderWidth="1px" borderRadius="md" p={3}>
                                                        <Text fontSize="sm" color="app.textSubtle">Creación</Text>
                                                        <Text>{formatDateTime(detail.orden.fechaCreacion)}</Text>
                                                    </Box>
                                                    <Box borderWidth="1px" borderRadius="md" p={3}>
                                                        <Text fontSize="sm" color="app.textSubtle">Fin planificada</Text>
                                                        <Text>{formatDateTime(detail.orden.fechaFinalPlanificada)}</Text>
                                                    </Box>
                                                    <Box borderWidth="1px" borderRadius="md" p={3}>
                                                        <Text fontSize="sm" color="app.textSubtle">Inicio estimado</Text>
                                                        <Text>{formatDateTime(detail.orden.fechaInicioEstimacion)}</Text>
                                                    </Box>
                                                    <Box borderWidth="1px" borderRadius="md" p={3}>
                                                        <Text fontSize="sm" color="app.textSubtle">Fin estimado</Text>
                                                        <Text>{formatDateTime(detail.orden.fechaFinalEstimada)}</Text>
                                                    </Box>
                                                    <Box borderWidth="1px" borderRadius="md" p={3}>
                                                        <Text fontSize="sm" color="app.textSubtle">Duración estimada</Text>
                                                        <Text>{formatDurationMinutes(detail.orden.duracionCalendarioRutaCriticaMinutos)}</Text>
                                                    </Box>
                                                    <Box borderWidth="1px" borderRadius="md" p={3}>
                                                        <Text fontSize="sm" color="app.textSubtle">Inicio real</Text>
                                                        <Text>{formatDateTime(detail.orden.fechaInicio)}</Text>
                                                    </Box>
                                                    <Box borderWidth="1px" borderRadius="md" p={3}>
                                                        <Text fontSize="sm" color="app.textSubtle">Fin real</Text>
                                                        <Text>{formatDateTime(detail.orden.fechaFinal)}</Text>
                                                    </Box>
                                                </SimpleGrid>

                                                <Box>
                                                    <Text fontWeight="semibold" mb={2}>Observaciones de la orden</Text>
                                                    <Box borderWidth="1px" borderRadius="md" p={3} bg="app.surfaceSubtle">
                                                        <Text whiteSpace="pre-wrap">
                                                            {detail.orden.ordenObservaciones?.trim() || "Sin observaciones registradas."}
                                                        </Text>
                                                    </Box>
                                                </Box>

                                                <Box>
                                                    <Text fontWeight="semibold" mb={3}>Seguimiento actual</Text>
                                                    <VStack align="stretch" gap={3}>
                                                        {detail.seguimiento.map((item, index) => (
                                                            <Box key={item.seguimientoId} borderWidth="1px" borderRadius="md" p={3}>
                                                                <HStack justify="space-between" align="start" mb={2}>
                                                                    <Box>
                                                                        <Text fontWeight="bold">
                                                                            {index + 1}. {item.nodeLabel}
                                                                        </Text>
                                                                        <Text fontSize="sm" color="app.textMuted">
                                                                            {item.areaNombre}
                                                                        </Text>
                                                                    </Box>
                                                                    <Badge colorPalette={getEstadoBadgeScheme(item.estado)}>
                                                                        {item.estadoDescripcion}
                                                                    </Badge>
                                                                </HStack>

                                                                <Stack gap={1} fontSize="sm" color="app.textMuted">
                                                                    <Text>
                                                                        Estimado: {formatDurationMinutes(item.duracionEstimadaMinutos)} · {item.requiereJornadaLaboral ? "Jornada laboral" : "Tiempo continuo"}
                                                                    </Text>
                                                                    <Text>Visible desde: {formatDateTime(item.fechaVisible)}</Text>
                                                                    <Text>Estado actual desde: {formatDateTime(item.fechaEstadoActual)}</Text>
                                                                    <Text>Completado: {formatDateTime(item.fechaCompletado)}</Text>
                                                                    <Text>Último reporte por: {item.usuarioReportaNombre || "Sistema / sin registro"}</Text>
                                                                </Stack>

                                                                {item.observaciones?.trim() ? (
                                                                    <>
                                                                        <Separator my={3} />
                                                                        <Text fontSize="sm" whiteSpace="pre-wrap">
                                                                            {item.observaciones}
                                                                        </Text>
                                                                    </>
                                                                ) : null}
                                                            </Box>
                                                        ))}
                                                    </VStack>
                                                </Box>
                                            </VStack>
                                        </Tabs.Content>

                                        <Tabs.Content value="ruta" px={0} py={5}>
                                            <VStack align="stretch" gap={4}>
                                                <HStack gap={3} flexWrap="wrap">
                                                    <Badge colorPalette="teal">Tu área resaltada</Badge>
                                                    <Badge colorPalette="orange">Cola</Badge>
                                                    <Badge colorPalette="yellow">Espera</Badge>
                                                    <Badge colorPalette="blue">En proceso</Badge>
                                                    <Badge colorPalette="green">Completado</Badge>
                                                </HStack>

                                                {routeNodes.length > 0 ? (
                                                    <Box h="520px" borderWidth="1px" borderRadius="lg" overflow="hidden">
                                                        <ReactFlow
                                                            nodes={routeNodes}
                                                            edges={routeEdges}
                                                            nodeTypes={nodeTypes}
                                                            fitView
                                                            nodesDraggable={false}
                                                            nodesConnectable={false}
                                                            elementsSelectable={false}
                                                            zoomOnScroll
                                                            panOnDrag
                                                            proOptions={{ hideAttribution: true }}
                                                        >
                                                            <MiniMap pannable zoomable nodeColor={(node) => getEstadoColor((node.data as RouteNodeData).estadoActual)} />
                                                            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                                                        </ReactFlow>
                                                    </Box>
                                                ) : (
                                                    <Text color="app.textSubtle">La orden no tiene una ruta de proceso visual disponible.</Text>
                                                )}
                                            </VStack>
                                        </Tabs.Content>

                                        <Tabs.Content value="bom" px={0} py={5}>
                                            <VStack align="stretch" gap={6}>
                                                <Box>
                                                    <Text fontWeight="semibold" mb={3}>Receta jerárquica</Text>
                                                    {detail.bom.receta.length > 0 ? (
                                                        <VStack align="stretch" gap={3}>
                                                            {detail.bom.receta.map((node) => (
                                                                <BomTreeNode
                                                                    key={`${node.productoId}-${node.insumoId ?? "root"}`}
                                                                    node={node}
                                                                />
                                                            ))}
                                                        </VStack>
                                                    ) : (
                                                        <Text color="app.textSubtle">No hay receta configurada para este terminado.</Text>
                                                    )}
                                                </Box>

                                                <Box>
                                                    <Text fontWeight="semibold" mb={3}>Materiales de empaque</Text>
                                                    {detail.bom.empaque.length > 0 ? (
                                                        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
                                                            <Table.Root size="sm">
                                                                <Table.Header bg="app.tableHeader">
                                                                    <Table.Row>
                                                                        <Table.ColumnHeader>Producto</Table.ColumnHeader>
                                                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                                        <Table.ColumnHeader textAlign='end'>Cantidad total</Table.ColumnHeader>
                                                                        <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                                                                        <Table.ColumnHeader>Inventariable</Table.ColumnHeader>
                                                                    </Table.Row>
                                                                </Table.Header>
                                                                <Table.Body>
                                                                    {detail.bom.empaque.map((item) => (
                                                                        <Table.Row key={item.productoId}>
                                                                            <Table.Cell>{item.productoNombre}</Table.Cell>
                                                                            <Table.Cell>{item.productoId}</Table.Cell>
                                                                            <Table.Cell textAlign='end'>{formatCantidad(item.cantidadTotalRequerida)}</Table.Cell>
                                                                            <Table.Cell>{item.tipoUnidades || "-"}</Table.Cell>
                                                                            <Table.Cell>
                                                                                <Badge colorPalette={item.inventareable ? "blue" : "gray"}>
                                                                                    {item.inventareable ? "Sí" : "No"}
                                                                                </Badge>
                                                                            </Table.Cell>
                                                                        </Table.Row>
                                                                    ))}
                                                                </Table.Body>
                                                            </Table.Root>
                                                        </Box>
                                                    ) : (
                                                        <Text color="app.textSubtle">No hay materiales de empaque asociados a la orden.</Text>
                                                    )}
                                                </Box>
                                            </VStack>
                                        </Tabs.Content>
                                </Tabs.Root>
                            ) : null}

                            {!loading && !detail ? (
                                <Text color="app.textSubtle">No se encontró detalle operativo para esta orden.</Text>
                            ) : null}
                        </Drawer.Body>
                    </Drawer.Content>
                </Drawer.Positioner>

            </Portal>
        </Drawer.Root>
    );
}
