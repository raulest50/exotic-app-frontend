import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Badge,
    Box,
    Divider,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    Flex,
    HStack,
    SimpleGrid,
    Spinner,
    Stack,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    Tabs,
} from "@chakra-ui/react";
import { Background, BackgroundVariant, Edge, Handle, MiniMap, Node, NodeProps, Position, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    AreaOperativaOrdenDetalleDTO,
    BomRecetaNodeDTO,
    RutaProcesoVisualNodeDTO,
} from "./areaOperativaPanel.types.ts";
import { formatDateTime } from "../Produccion/components/SeguimientoBoardUI.tsx";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    detail: AreaOperativaOrdenDetalleDTO | null;
    loading: boolean;
    currentAreaId?: number | null;
}

type RouteNodeData = {
    label: string;
    areaNombre: string;
    estadoDescripcion: string;
    estadoActual: number | null;
    currentLeaderArea: boolean;
    currentAreaId?: number | null;
};

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

function RouteNode({ data }: NodeProps<RouteNodeData>) {
    const isCurrentAreaNode = data.currentAreaId != null && data.currentLeaderArea;
    const accentColor = getEstadoColor(data.estadoActual);

    return (
        <Box
            minW="220px"
            bg="white"
            borderRadius="lg"
            border="2px solid"
            borderColor={isCurrentAreaNode ? "teal.500" : "gray.200"}
            boxShadow={isCurrentAreaNode ? "0 0 0 3px rgba(49,151,149,0.15)" : "sm"}
            overflow="hidden"
        >
            <Box bg={accentColor} px={3} py={2}>
                <Text fontWeight="bold" color="white" fontSize="sm" noOfLines={2}>
                    {data.label}
                </Text>
            </Box>
            <VStack align="stretch" spacing={2} px={3} py={3}>
                <Text fontSize="sm" color="gray.700" fontWeight="semibold">
                    {data.areaNombre}
                </Text>
                <Badge alignSelf="start" colorScheme={getEstadoBadgeScheme(data.estadoActual)}>
                    {data.estadoDescripcion}
                </Badge>
                {isCurrentAreaNode ? (
                    <Badge alignSelf="start" colorScheme="teal">
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
};

function buildRouteNodes(detail: AreaOperativaOrdenDetalleDTO | null, currentAreaId?: number | null): Node<RouteNodeData>[] {
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
            bg="white"
            p={3}
            ml={depth > 0 ? depth * 4 : 0}
        >
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={2}>
                <Box>
                    <Text fontWeight="bold">{node.productoNombre}</Text>
                    <Text fontSize="sm" color="gray.600">
                        {node.productoId} · {node.tipoProducto}
                    </Text>
                </Box>
                <VStack align="end" spacing={1}>
                    <Badge colorScheme={node.inventareable ? "blue" : "gray"}>
                        {node.inventareable ? "Inventariable" : "No inventariable"}
                    </Badge>
                    <Text fontWeight="semibold">
                        {node.cantidadTotalRequerida} {node.tipoUnidades || ""}
                    </Text>
                </VStack>
            </HStack>
        </Box>
    );

    if (!hasChildren) {
        return content;
    }

    return (
        <Accordion allowToggle defaultIndex={[0]}>
            <AccordionItem border="none">
                <AccordionButton px={0} py={0} _hover={{ bg: "transparent" }}>
                    <Box flex="1" textAlign="left">
                        {content}
                    </Box>
                    <AccordionIcon />
                </AccordionButton>
                <AccordionPanel px={0} pt={3}>
                    <VStack align="stretch" spacing={3}>
                        {node.subInsumos.map((subNode) => (
                            <BomTreeNode
                                key={`${node.productoId}-${subNode.productoId}-${subNode.insumoId ?? "sub"}`}
                                node={subNode}
                                depth={depth + 1}
                            />
                        ))}
                    </VStack>
                </AccordionPanel>
            </AccordionItem>
        </Accordion>
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
        <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xl">
            <DrawerOverlay />
            <DrawerContent>
                <DrawerCloseButton />
                <DrawerHeader>Detalle operativo de la orden</DrawerHeader>

                <DrawerBody>
                    {loading ? (
                        <Flex align="center" justify="center" py={10}>
                            <Spinner />
                        </Flex>
                    ) : null}

                    {!loading && detail ? (
                        <Tabs variant="enclosed" colorScheme="teal" isLazy>
                            <TabList>
                                <Tab>Resumen</Tab>
                                <Tab>Ruta</Tab>
                                <Tab>BOM</Tab>
                            </TabList>

                            <TabPanels>
                                <TabPanel px={0} py={5}>
                                    <VStack align="stretch" spacing={5}>
                                        <Box>
                                            <Text fontWeight="bold">{detail.orden.loteAsignado || `OP-${detail.orden.ordenId}`}</Text>
                                            <Text color="gray.600">
                                                {detail.orden.productoNombre} · {detail.orden.productoId}
                                            </Text>
                                            <Text color="gray.600">
                                                Categoría: {detail.orden.categoriaNombre || "Sin categoría"} · Cantidad: {detail.orden.cantidadProducir}
                                            </Text>
                                        </Box>

                                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                            <Box borderWidth="1px" borderRadius="md" p={3}>
                                                <Text fontSize="sm" color="gray.500">Creación</Text>
                                                <Text>{formatDateTime(detail.orden.fechaCreacion)}</Text>
                                            </Box>
                                            <Box borderWidth="1px" borderRadius="md" p={3}>
                                                <Text fontSize="sm" color="gray.500">Fin planificada</Text>
                                                <Text>{formatDateTime(detail.orden.fechaFinalPlanificada)}</Text>
                                            </Box>
                                            <Box borderWidth="1px" borderRadius="md" p={3}>
                                                <Text fontSize="sm" color="gray.500">Inicio real</Text>
                                                <Text>{formatDateTime(detail.orden.fechaInicio)}</Text>
                                            </Box>
                                            <Box borderWidth="1px" borderRadius="md" p={3}>
                                                <Text fontSize="sm" color="gray.500">Fin real</Text>
                                                <Text>{formatDateTime(detail.orden.fechaFinal)}</Text>
                                            </Box>
                                        </SimpleGrid>

                                        <Box>
                                            <Text fontWeight="semibold" mb={2}>Observaciones de la orden</Text>
                                            <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                                                <Text whiteSpace="pre-wrap">
                                                    {detail.orden.ordenObservaciones?.trim() || "Sin observaciones registradas."}
                                                </Text>
                                            </Box>
                                        </Box>

                                        <Box>
                                            <Text fontWeight="semibold" mb={3}>Seguimiento actual</Text>
                                            <VStack align="stretch" spacing={3}>
                                                {detail.seguimiento.map((item, index) => (
                                                    <Box key={item.seguimientoId} borderWidth="1px" borderRadius="md" p={3}>
                                                        <HStack justify="space-between" align="start" mb={2}>
                                                            <Box>
                                                                <Text fontWeight="bold">
                                                                    {index + 1}. {item.nodeLabel}
                                                                </Text>
                                                                <Text fontSize="sm" color="gray.600">
                                                                    {item.areaNombre}
                                                                </Text>
                                                            </Box>
                                                            <Badge colorScheme={getEstadoBadgeScheme(item.estado)}>
                                                                {item.estadoDescripcion}
                                                            </Badge>
                                                        </HStack>

                                                        <Stack spacing={1} fontSize="sm" color="gray.600">
                                                            <Text>Visible desde: {formatDateTime(item.fechaVisible)}</Text>
                                                            <Text>Estado actual desde: {formatDateTime(item.fechaEstadoActual)}</Text>
                                                            <Text>Completado: {formatDateTime(item.fechaCompletado)}</Text>
                                                            <Text>Último reporte por: {item.usuarioReportaNombre || "Sistema / sin registro"}</Text>
                                                        </Stack>

                                                        {item.observaciones?.trim() ? (
                                                            <>
                                                                <Divider my={3} />
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
                                </TabPanel>

                                <TabPanel px={0} py={5}>
                                    <VStack align="stretch" spacing={4}>
                                        <HStack spacing={3} flexWrap="wrap">
                                            <Badge colorScheme="teal">Tu área resaltada</Badge>
                                            <Badge colorScheme="orange">Cola</Badge>
                                            <Badge colorScheme="yellow">Espera</Badge>
                                            <Badge colorScheme="blue">En proceso</Badge>
                                            <Badge colorScheme="green">Completado</Badge>
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
                                            <Text color="gray.500">La orden no tiene una ruta de proceso visual disponible.</Text>
                                        )}
                                    </VStack>
                                </TabPanel>

                                <TabPanel px={0} py={5}>
                                    <VStack align="stretch" spacing={6}>
                                        <Box>
                                            <Text fontWeight="semibold" mb={3}>Receta jerárquica</Text>
                                            {detail.bom.receta.length > 0 ? (
                                                <VStack align="stretch" spacing={3}>
                                                    {detail.bom.receta.map((node) => (
                                                        <BomTreeNode
                                                            key={`${node.productoId}-${node.insumoId ?? "root"}`}
                                                            node={node}
                                                        />
                                                    ))}
                                                </VStack>
                                            ) : (
                                                <Text color="gray.500">No hay receta configurada para este terminado.</Text>
                                            )}
                                        </Box>

                                        <Box>
                                            <Text fontWeight="semibold" mb={3}>Materiales de empaque</Text>
                                            {detail.bom.empaque.length > 0 ? (
                                                <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
                                                    <Table size="sm">
                                                        <Thead bg="gray.50">
                                                            <Tr>
                                                                <Th>Producto</Th>
                                                                <Th>ID</Th>
                                                                <Th isNumeric>Cantidad total</Th>
                                                                <Th>Unidad</Th>
                                                                <Th>Inventariable</Th>
                                                            </Tr>
                                                        </Thead>
                                                        <Tbody>
                                                            {detail.bom.empaque.map((item) => (
                                                                <Tr key={item.productoId}>
                                                                    <Td>{item.productoNombre}</Td>
                                                                    <Td>{item.productoId}</Td>
                                                                    <Td isNumeric>{item.cantidadTotalRequerida}</Td>
                                                                    <Td>{item.tipoUnidades || "-"}</Td>
                                                                    <Td>
                                                                        <Badge colorScheme={item.inventareable ? "blue" : "gray"}>
                                                                            {item.inventareable ? "Sí" : "No"}
                                                                        </Badge>
                                                                    </Td>
                                                                </Tr>
                                                            ))}
                                                        </Tbody>
                                                    </Table>
                                                </Box>
                                            ) : (
                                                <Text color="gray.500">No hay materiales de empaque asociados a la orden.</Text>
                                            )}
                                        </Box>
                                    </VStack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    ) : null}

                    {!loading && !detail ? (
                        <Text color="gray.500">No se encontró detalle operativo para esta orden.</Text>
                    ) : null}
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
}
