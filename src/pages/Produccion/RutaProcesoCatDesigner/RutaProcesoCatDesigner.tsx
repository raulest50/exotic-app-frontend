import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Box, Flex, Button, Heading, Divider, useToast, Spinner, Text, IconButton } from "@chakra-ui/react";
import { ArrowBackIcon, CloseIcon, AddIcon, DeleteIcon } from "@chakra-ui/icons";
import {
    ReactFlow,
    Node,
    Edge,
    Controls,
    MiniMap,
    BackgroundVariant,
    Background,
    useNodesState,
    useEdgesState,
    Connection,
    addEdge,
    ConnectionMode,
    ReactFlowProvider,
    useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import AreaOperativaNode from "./AreaOperativaNode.tsx";
import AreaOperativaPicker from "./AreaOperativaPicker.tsx";
import { AreaOperativa, RutaProcesoCatDTO, RutaProcesoNodeDTO, RutaProcesoEdgeDTO } from "./types.ts";
import { Categoria } from "../types.tsx";

const nodeTypes = {
    areaOperativaNode: AreaOperativaNode,
};

const defaultEdgeOptions = {
    style: {
        strokeWidth: 3,
        stroke: '#805AD5',
    },
    animated: true,
};

interface Props {
    categoria: Categoria;
    onBack: () => void;
}

function RutaProcesoCatDesignerContent({ categoria, onBack }: Props) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedElement, setSelectedElement] = useState<Node | Edge | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [nodeIdCounter, setNodeIdCounter] = useState(1);

    const boxRef = useRef<HTMLDivElement>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const { fitView } = useReactFlow();

    // Validation: check if all enabled handles are connected
    const isRutaValid = useMemo(() => {
        if (nodes.length === 0) return true;

        for (const node of nodes) {
            const hasLeft = node.data.hasLeftHandle !== false;
            const hasRight = node.data.hasRightHandle !== false;

            if (hasLeft && !edges.some(e => e.target === node.id)) return false;
            if (hasRight && !edges.some(e => e.source === node.id)) return false;
        }
        return true;
    }, [nodes, edges]);

    const endPoints = new EndPointsURL();
    const toast = useToast();

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const isValidConnection = useCallback(
        (connection: Connection | Edge): boolean => {
            const conn = connection as Connection;
            const sourceNode = nodes.find((n) => n.id === conn.source);
            const targetNode = nodes.find((n) => n.id === conn.target);
            if (!sourceNode || !targetNode) return false;

            // Only allow area to area connections
            return sourceNode.type === "areaOperativaNode" && targetNode.type === "areaOperativaNode";
        },
        [nodes, edges]
    );

    // Load existing ruta on mount
    useEffect(() => {
        const loadRuta = async () => {
            setLoading(true);
            try {
                const response = await axios.get(
                    endPoints.get_ruta_proceso_cat.replace('{categoriaId}', String(categoria.categoriaId))
                );
                if (response.status === 200 && response.data) {
                    const ruta: RutaProcesoCatDTO = response.data;

                    // Convert nodes
                    const loadedNodes: Node[] = ruta.nodes.map((node: RutaProcesoNodeDTO) => ({
                        id: node.id,
                        type: 'areaOperativaNode',
                        position: { x: node.posicionX, y: node.posicionY },
                        data: {
                            label: node.label || node.areaOperativaNombre || 'Sin asignar',
                            areaOperativaId: node.areaOperativaId,
                            areaOperativaNombre: node.areaOperativaNombre,
                            hasLeftHandle: node.hasLeftHandle ?? true,
                            hasRightHandle: node.hasRightHandle ?? true,
                        },
                    }));

                    // Convert edges
                    const loadedEdges: Edge[] = ruta.edges.map((edge: RutaProcesoEdgeDTO) => ({
                        id: edge.id,
                        source: edge.sourceNodeId,
                        target: edge.targetNodeId,
                    }));

                    setNodes(loadedNodes);
                    setEdges(loadedEdges);

                    // Update counter to avoid ID collisions
                    const maxId = Math.max(0, ...ruta.nodes.map(n => parseInt(n.id) || 0));
                    setNodeIdCounter(maxId + 1);
                }
            } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 204) {
                    // No existing ruta - that's fine
                } else {
                    console.error('Error loading ruta:', err);
                    toast({
                        title: 'Error',
                        description: 'No se pudo cargar la ruta existente',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        loadRuta();
    }, [categoria.categoriaId]);

    const handleAddArea = () => {
        setIsPickerOpen(true);
    };

    const handleAreaSelected = (area: AreaOperativa) => {
        const newNode: Node = {
            id: String(nodeIdCounter),
            type: 'areaOperativaNode',
            position: { x: 200, y: nodes.length * 150 },
            data: {
                label: area.nombre,
                areaOperativaId: area.areaId,
                areaOperativaNombre: area.nombre,
                hasLeftHandle: true,
                hasRightHandle: true,
            },
        };
        setNodes([...nodes, newNode]);
        setNodeIdCounter(nodeIdCounter + 1);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const rutaDTO: RutaProcesoCatDTO = {
                categoriaId: categoria.categoriaId,
                nodes: nodes.map((node) => ({
                    id: node.id,
                    posicionX: node.position.x,
                    posicionY: node.position.y,
                    areaOperativaId: node.data.areaOperativaId || null,
                    areaOperativaNombre: node.data.areaOperativaNombre || null,
                    label: node.data.label || '',
                    hasLeftHandle: node.data.hasLeftHandle ?? true,
                    hasRightHandle: node.data.hasRightHandle ?? true,
                })),
                edges: edges.map((edge) => ({
                    id: edge.id,
                    sourceNodeId: edge.source,
                    targetNodeId: edge.target,
                })),
            };

            await axios.post(endPoints.save_ruta_proceso_cat, rutaDTO);

            toast({
                title: 'Guardado',
                description: 'Ruta de proceso guardada correctamente',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            console.error('Error saving ruta:', err);
            toast({
                title: 'Error',
                description: 'No se pudo guardar la ruta de proceso',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setNodes([]);
        setEdges([]);
        setNodeIdCounter(1);
        setSelectedElement(null);
    };

    const handleDeleteSelected = () => {
        if (selectedElement) {
            if ('data' in selectedElement) {
                // It's a node
                setNodes((prevNodes) => prevNodes.filter((node) => node.id !== selectedElement.id));
                setEdges((prevEdges) =>
                    prevEdges.filter((edge) => edge.source !== selectedElement.id && edge.target !== selectedElement.id)
                );
            } else {
                // It's an edge
                setEdges((prevEdges) => prevEdges.filter((edge) => edge.id !== selectedElement.id));
            }
            setSelectedElement(null);
        }
    };

    const toggleFullScreen = () => {
        const element = boxRef.current;
        if (!element) return;
        if (isFullScreen) {
            document.exitFullscreen?.();
        } else {
            element.requestFullscreen?.();
        }
        setIsFullScreen((prev) => !prev);
    };

    useEffect(() => {
        fitView();
    }, [isFullScreen, fitView]);

    if (loading) {
        return (
            <Flex justify="center" align="center" h="50vh">
                <Spinner size="xl" color="purple.500" />
            </Flex>
        );
    }

    return (
        <Flex direction="column" gap={4} p="1em">
            <Flex direction="row" align="center" gap={4}>
                <Button
                    leftIcon={<ArrowBackIcon />}
                    variant="outline"
                    onClick={onBack}
                >
                    Volver
                </Button>
                <Heading flex={2} as="h2" size="lg" fontFamily="Comfortaa Variable">
                    Ruta de Proceso - {categoria.categoriaNombre}
                </Heading>
            </Flex>

            <Divider />

            <Box
                w="full"
                ref={boxRef}
                position="relative"
                style={
                    isFullScreen
                        ? {
                            width: "100vw",
                            height: "100vh",
                            position: "fixed",
                            top: 0,
                            left: 0,
                            zIndex: 9999,
                            border: "2px solid purple",
                            background: "white",
                        }
                        : { height: "50vh", border: "2px solid purple", borderRadius: "8px" }
                }
            >
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    connectionMode={ConnectionMode.Loose}
                    connectOnClick
                    onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
                        if (selectedNodes.length > 0) setSelectedElement(selectedNodes[0]);
                        else if (selectedEdges.length > 0) setSelectedElement(selectedEdges[0]);
                        else setSelectedElement(null);
                    }}
                    isValidConnection={isValidConnection}
                >
                    <Controls />
                    <MiniMap nodeColor={() => '#805AD5'} />
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                </ReactFlow>
                {isFullScreen && (
                    <>
                        <IconButton
                            aria-label="Salir de pantalla completa"
                            icon={<CloseIcon />}
                            position="absolute"
                            top={4}
                            right={4}
                            size="lg"
                            colorScheme="purple"
                            onClick={toggleFullScreen}
                            zIndex={10000}
                            boxShadow="lg"
                        />
                        <Flex
                            position="absolute"
                            bottom={4}
                            left="50%"
                            transform="translateX(-50%)"
                            gap={4}
                            zIndex={10000}
                        >
                            <Button
                                colorScheme="purple"
                                leftIcon={<AddIcon />}
                                onClick={handleAddArea}
                                boxShadow="lg"
                            >
                                Agregar Area
                            </Button>
                            <Button
                                colorScheme="red"
                                leftIcon={<DeleteIcon />}
                                onClick={handleDeleteSelected}
                                isDisabled={!selectedElement}
                                boxShadow="lg"
                            >
                                Eliminar Seleccion
                            </Button>
                        </Flex>
                    </>
                )}
            </Box>

            <Flex direction="row" gap={4} alignItems="center" flexWrap="wrap">
                <Button
                    variant="solid"
                    colorScheme="purple"
                    onClick={handleAddArea}
                >
                    Agregar Area
                </Button>

                <Button
                    variant="solid"
                    colorScheme="green"
                    onClick={handleSave}
                    isLoading={saving}
                    isDisabled={!isRutaValid}
                    title={!isRutaValid ? "Hay handles sin conectar" : ""}
                >
                    Guardar
                </Button>

                <Button
                    variant="solid"
                    onClick={toggleFullScreen}
                >
                    {isFullScreen ? "Salir" : "Pantalla completa"}
                </Button>

                <Button
                    variant="solid"
                    colorScheme="red"
                    onClick={handleReset}
                >
                    Reset
                </Button>

                <Button
                    variant="solid"
                    colorScheme="red"
                    onClick={handleDeleteSelected}
                    isDisabled={!selectedElement}
                >
                    Eliminar Seleccion
                </Button>

                <Text color="gray.500" fontSize="sm">
                    Nodos: {nodes.length} | Conexiones: {edges.length}
                </Text>
            </Flex>

            <AreaOperativaPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelect={handleAreaSelected}
            />
        </Flex>
    );
}

export default function RutaProcesoCatDesigner(props: Props) {
    return (
        <ReactFlowProvider>
            <RutaProcesoCatDesignerContent {...props} />
        </ReactFlowProvider>
    );
}
