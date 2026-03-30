import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Background,
    BackgroundVariant,
    Connection,
    ConnectionMode,
    Controls,
    Edge,
    MiniMap,
    Node,
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    useEdgesState,
    useNodesState,
    useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    Badge,
    Box,
    Button,
    Center,
    Divider,
    Flex,
    Heading,
    Stat,
    StatLabel,
    StatNumber,
    Text,
    VStack,
} from "@chakra-ui/react";
import MaterialPrimarioNode from "./Nodos/MaterialPrimarioNode.tsx";
import ProcesoNode from "./Nodos/ProcesoNode.tsx";
import TargetNode from "./Nodos/TargetNode.tsx";
import { ProcesoProduccionPicker } from "./components/ProcesoProduccionPicker/ProcesoProduccionPicker.tsx";
import AreaPickerGeneric from "../../../../components/Pickers/AreaPickerGeneric/AreaPickerGeneric.tsx";
import { AreaOperativaRef, ProductoSemiter, ProcesoDiseñado } from "../../types.tsx";
import {
    attachAreaToProcessNode,
    buildFlowFromProceso,
    buildNewProcessNode,
    buildProcesoFromFlow,
    getProcessNodeAreaName,
} from "../../manufacturingMapper.ts";

const nodeTypes = {
    materialPrimarioNode: MaterialPrimarioNode,
    procesoNode: ProcesoNode,
    targetNode: TargetNode,
};

interface Props {
    semioter2: ProductoSemiter;
    onProcessChange?: (proceso: ProcesoDiseñado) => void;
    onValidityChange?: (isValid: boolean) => void;
}

const defaultEdgeOptions = {
    style: {
        strokeWidth: 3,
        stroke: "#333333",
    },
    animated: true,
};

function ProcessDesignerContent({ semioter2, onProcessChange, onValidityChange }: Props) {
    const initialFlow = useMemo(() => buildFlowFromProceso(semioter2), [semioter2]);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges);
    const [selectedElement, setSelectedElement] = useState<Node | Edge | null>(null);
    const [isProcesoPickerOpen, setIsProcesoPickerOpen] = useState(false);
    const [isAreaPickerOpen, setIsAreaPickerOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const boxRef = useRef<HTMLDivElement>(null);
    const { fitView } = useReactFlow();

    useEffect(() => {
        const nextFlow = buildFlowFromProceso(semioter2);
        setNodes(nextFlow.nodes);
        setEdges(nextFlow.edges);
        setSelectedElement(null);
    }, [semioter2, setEdges, setNodes]);

    useEffect(() => {
        onProcessChange?.(buildProcesoFromFlow(nodes, edges));
    }, [nodes, edges, onProcessChange]);

    const selectedProcessNode = useMemo(() => {
        if (!selectedElement || !("data" in selectedElement) || selectedElement.type !== "procesoNode") {
            return null;
        }
        return nodes.find((node) => node.id === selectedElement.id && node.type === "procesoNode") ?? null;
    }, [nodes, selectedElement]);

    const selectedProcessData = selectedProcessNode?.data as
        | {
              nombreProceso?: string;
              areaOperativaId?: number;
              areaOperativaNombre?: string;
          }
        | undefined;

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((existingEdges) =>
                addEdge(
                    {
                        ...params,
                        id: `edge-${params.source}-${params.target}-${Date.now()}`,
                        animated: true,
                    },
                    existingEdges
                )
            );
        },
        [setEdges]
    );

    const isValidConnection = useCallback(
        (connection: Connection | Edge): boolean => {
            const sourceNode = nodes.find((node) => node.id === connection.source);
            const targetNode = nodes.find((node) => node.id === connection.target);

            if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) {
                return false;
            }

            if (sourceNode.type === "materialPrimarioNode") {
                const hasOutput = edges.some((edge) => edge.source === sourceNode.id);
                return !hasOutput && targetNode.type === "procesoNode";
            }

            if (sourceNode.type === "procesoNode") {
                const hasOutput = edges.some((edge) => edge.source === sourceNode.id);
                return !hasOutput && (targetNode.type === "procesoNode" || targetNode.type === "targetNode");
            }

            return false;
        },
        [edges, nodes]
    );

    const computeValidity = useCallback((currentNodes: Node[], currentEdges: Edge[]): boolean => {
        const materialNodes = currentNodes.filter((node) => node.type === "materialPrimarioNode");
        const processNodes = currentNodes.filter((node) => node.type === "procesoNode");
        const targetNodes = currentNodes.filter((node) => node.type === "targetNode");

        if (targetNodes.length !== 1 || processNodes.length === 0) {
            return false;
        }

        for (const node of materialNodes) {
            if (!currentEdges.some((edge) => edge.source === node.id)) {
                return false;
            }
        }

        for (const node of processNodes) {
            const incoming = currentEdges.filter((edge) => edge.target === node.id).length;
            const outgoing = currentEdges.filter((edge) => edge.source === node.id).length;
            const data = node.data as { procesoId?: number; areaOperativaId?: number };
            if (incoming < 1 || outgoing !== 1 || !data.procesoId || !data.areaOperativaId) {
                return false;
            }
        }

        for (const node of targetNodes) {
            if (!currentEdges.some((edge) => edge.target === node.id)) {
                return false;
            }
        }

        return true;
    }, []);

    useEffect(() => {
        onValidityChange?.(computeValidity(nodes, edges));
    }, [computeValidity, edges, nodes, onValidityChange]);

    useEffect(() => {
        fitView({ padding: 0.2 });
    }, [fitView, isFullScreen, nodes.length, edges.length]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.key === "Delete" || event.key === "Supr") && selectedElement) {
                if ("data" in selectedElement && selectedElement.type === "procesoNode") {
                    deleteNodeById(selectedElement.id);
                    return;
                }
                if (!("data" in selectedElement)) {
                    deleteEdgeById(selectedElement.id);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedElement]);

    const handleProcessSelection = (procesos: Array<{
        procesoId?: number;
        nombre: string;
        setUpTime?: number;
        model?: any;
        constantSeconds?: number;
        throughputUnitsPerSec?: number;
        secondsPerUnit?: number;
        secondsPerBatch?: number;
        batchSize?: number;
    }>) => {
        const currentProcessNodes = nodes.filter((node) => node.type === "procesoNode");
        const lastY = currentProcessNodes.length > 0
            ? Math.max(...currentProcessNodes.map((node) => node.position.y))
            : 40;
        const newNodes = procesos.map((proceso, index) =>
            buildNewProcessNode(proceso, lastY + 110 * (index + 1))
        );
        setNodes((prevNodes) => [...prevNodes, ...newNodes]);
    };

    const deleteNodeById = (id: string) => {
        setNodes((prevNodes) => prevNodes.filter((node) => node.id !== id));
        setEdges((prevEdges) => prevEdges.filter((edge) => edge.source !== id && edge.target !== id));
        setSelectedElement(null);
    };

    const deleteEdgeById = (id: string) => {
        setEdges((prevEdges) => prevEdges.filter((edge) => edge.id !== id));
        setSelectedElement(null);
    };

    const removeAllProcessNodes = () => {
        const baseFlow = buildFlowFromProceso({
            ...semioter2,
            procesoProduccionCompleto: { rendimientoTeorico: 0, nodes: [], edges: [] },
        });
        setNodes(baseFlow.nodes);
        setEdges(baseFlow.edges);
        setSelectedElement(null);
    };

    const handleAssignArea = (area: AreaOperativaRef) => {
        if (!selectedProcessNode) {
            return;
        }

        let updatedNode: Node | null = null;
        setNodes((prevNodes) =>
            prevNodes.map((node) => {
                if (node.id !== selectedProcessNode.id) {
                    return node;
                }
                updatedNode = attachAreaToProcessNode(node, area);
                return updatedNode;
            })
        );
        if (updatedNode) {
            setSelectedElement(updatedNode);
        }
        setIsAreaPickerOpen(false);
    };

    const toggleFullScreen = () => {
        const element = boxRef.current;
        if (!element) {
            return;
        }
        if (isFullScreen) {
            document.exitFullscreen?.();
        } else {
            element.requestFullscreen?.();
        }
        setIsFullScreen((prev) => !prev);
    };

    const selectedAreaLabel = selectedProcessData
        ? getProcessNodeAreaName(selectedProcessData) ?? "Sin area asignada"
        : "Seleccione un nodo de proceso";

    return (
        <Flex direction="column" gap={8} p="1em">
            <Flex direction="row">
                <Heading flex={2} as="h2" size="lg" fontFamily="Comfortaa Variable">
                    Process Designer
                </Heading>
            </Flex>

            <Divider />

            <Box
                w="fill"
                ref={boxRef}
                style={
                    isFullScreen
                        ? {
                              width: "100vw",
                              height: "100vh",
                              position: "fixed",
                              top: 0,
                              left: 0,
                              zIndex: 9999,
                              border: "1px solid black",
                          }
                        : { height: "50vh", border: "1px solid black" }
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
                        if (selectedNodes.length > 0) {
                            setSelectedElement(selectedNodes[0]);
                            return;
                        }
                        if (selectedEdges.length > 0) {
                            setSelectedElement(selectedEdges[0]);
                            return;
                        }
                        setSelectedElement(null);
                    }}
                    isValidConnection={isValidConnection}
                >
                    <Controls />
                    <MiniMap />
                    <Background variant={BackgroundVariant.Lines} gap={12} size={1} />
                </ReactFlow>
            </Box>

            <Flex direction={{ base: "column", xl: "row" }} gap={5} alignItems="stretch">
                <Flex direction="row" gap={5} alignItems="center" wrap="wrap" flex={2}>
                    <Button variant="solid" colorScheme="teal" onClick={() => setIsProcesoPickerOpen(true)}>
                        Agregar Proceso
                    </Button>

                    <Button variant="solid" onClick={toggleFullScreen}>
                        {isFullScreen ? "Salir" : "Pantalla completa"}
                    </Button>

                    <Button variant="solid" colorScheme="red" onClick={removeAllProcessNodes}>
                        Reset
                    </Button>

                    <Button
                        variant="solid"
                        colorScheme="red"
                        onClick={() => {
                            if (!selectedElement) {
                                return;
                            }
                            if ("data" in selectedElement && selectedElement.type === "procesoNode") {
                                deleteNodeById(selectedElement.id);
                                return;
                            }
                            if (!("data" in selectedElement)) {
                                deleteEdgeById(selectedElement.id);
                            }
                        }}
                        isDisabled={
                            !selectedElement ||
                            ("data" in selectedElement && selectedElement.type !== "procesoNode")
                        }
                    >
                        Eliminar seleccion
                    </Button>

                    <Center height="50px">
                        <Divider orientation="vertical" />
                    </Center>

                    <Stat backgroundColor="gray.50" p="1em" boxShadow="md" minW="260px">
                        <StatLabel>Total Costo Insumos</StatLabel>
                        <StatNumber>{semioter2.costo} ( $ COP)</StatNumber>
                    </Stat>
                </Flex>

                <Box
                    flex={1}
                    bg="gray.50"
                    borderWidth="1px"
                    borderRadius="md"
                    p={4}
                    minW={{ base: "auto", xl: "340px" }}
                >
                    <VStack align="stretch" spacing={3}>
                        <Heading size="sm">Nodo seleccionado</Heading>
                        <Text fontWeight="bold">
                            {selectedProcessData?.nombreProceso ?? "Ningun proceso seleccionado"}
                        </Text>
                        <Text>Area operativa</Text>
                        <Badge colorScheme={selectedProcessData?.areaOperativaId ? "green" : "orange"} w="fit-content">
                            {selectedAreaLabel}
                        </Badge>
                        <Button
                            colorScheme="blue"
                            onClick={() => setIsAreaPickerOpen(true)}
                            isDisabled={!selectedProcessNode}
                        >
                            Asignar area al proceso
                        </Button>
                        <Text fontSize="sm" color="gray.600">
                            Cada nodo de proceso debe quedar asociado a un AreaOperativa para que el diagrama sea valido.
                        </Text>
                    </VStack>
                </Box>
            </Flex>

            <ProcesoProduccionPicker
                isOpen={isProcesoPickerOpen}
                onClose={() => setIsProcesoPickerOpen(false)}
                onConfirm={handleProcessSelection}
                alreadySelected={[]}
            />

            <AreaPickerGeneric
                isOpen={isAreaPickerOpen}
                onClose={() => setIsAreaPickerOpen(false)}
                onSelectArea={handleAssignArea}
            />
        </Flex>
    );
}

export default function ProcessDesigner(props: Props) {
    return (
        <ReactFlowProvider>
            <ProcessDesignerContent {...props} />
        </ReactFlowProvider>
    );
}
