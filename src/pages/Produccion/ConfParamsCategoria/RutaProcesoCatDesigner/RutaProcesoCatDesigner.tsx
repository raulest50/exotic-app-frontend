import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Divider,
    Flex,
    Heading,
    IconButton,
    ListItem,
    Spinner,
    Text,
    UnorderedList,
    useToast,
} from "@chakra-ui/react";
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
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import AreaOperativaNode from "./AreaOperativaNode.tsx";
import AreaOperativaPicker from "./AreaOperativaPicker.tsx";
import {
    AreaOperativa,
    RutaProcesoCatDTO,
    RutaProcesoEdgeDTO,
    RutaProcesoNodeDTO,
    RutaProcesoNodeData,
} from "./types.ts";
import { Categoria } from "../../types.tsx";
import { getConnectionError, validateRuta } from "./rutaValidation.ts";

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

interface BackendErrorResponse {
    title?: string;
    message?: string;
}

function RutaProcesoCatDesignerContent({ categoria, onBack }: Props) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<RutaProcesoNodeData>>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedElement, setSelectedElement] = useState<Node<RutaProcesoNodeData> | Edge | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [nodeIdCounter, setNodeIdCounter] = useState(1);

    const boxRef = useRef<HTMLDivElement>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const { fitView } = useReactFlow();

    const validation = useMemo(() => validateRuta(nodes, edges), [nodes, edges]);
    const disabledAreaIds = useMemo(
        () =>
            nodes
                .map((node) => node.data.areaOperativaId)
                .filter((areaId): areaId is number => areaId != null),
        [nodes],
    );

    const endPoints = new EndPointsURL();
    const toast = useToast();

    const onConnect = useCallback(
        (params: Connection) => {
            const error = getConnectionError(
                { source: params.source, target: params.target },
                nodes,
                edges,
            );

            if (error) {
                toast({
                    title: 'Conexión inválida',
                    description: error,
                    status: 'warning',
                    duration: 3000,
                    isClosable: true,
                });
                return;
            }

            setEdges((currentEdges) => addEdge(params, currentEdges));
        },
        [edges, nodes, setEdges, toast]
    );

    const isValidConnection = useCallback(
        (connection: Connection | Edge): boolean => {
            const error = getConnectionError(
                { source: connection.source, target: connection.target },
                nodes,
                edges,
            );
            return error == null;
        },
        [edges, nodes]
    );

    useEffect(() => {
        const loadRuta = async () => {
            setLoading(true);
            try {
                const response = await axios.get(
                    endPoints.get_ruta_proceso_cat.replace('{categoriaId}', String(categoria.categoriaId))
                );
                if (response.status === 200 && response.data) {
                    const ruta: RutaProcesoCatDTO = response.data;

                    const loadedNodes: Node<RutaProcesoNodeData>[] = ruta.nodes.map((node: RutaProcesoNodeDTO) => ({
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

                    const loadedEdges: Edge[] = ruta.edges.map((edge: RutaProcesoEdgeDTO) => ({
                        id: edge.id,
                        source: edge.sourceNodeId,
                        target: edge.targetNodeId,
                    }));

                    setNodes(loadedNodes);
                    setEdges(loadedEdges);

                    const maxId = Math.max(0, ...ruta.nodes.map((node) => Number.parseInt(node.id, 10) || 0));
                    setNodeIdCounter(maxId + 1);
                }
            } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 204) {
                    return;
                }

                console.error('Error loading ruta:', err);
                toast({
                    title: 'Error',
                    description: 'No se pudo cargar la ruta existente',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                setLoading(false);
            }
        };

        loadRuta();
    }, [categoria.categoriaId, endPoints.get_ruta_proceso_cat, setEdges, setNodes, toast]);

    const handleAddArea = () => {
        setIsPickerOpen(true);
    };

    const handleAreaSelected = (area: AreaOperativa) => {
        if (disabledAreaIds.includes(area.areaId)) {
            toast({
                title: 'Área repetida',
                description: 'Esa área operativa ya está presente en la ruta.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        const newNode: Node<RutaProcesoNodeData> = {
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
        setNodes((currentNodes) => [...currentNodes, newNode]);
        setNodeIdCounter((currentCounter) => currentCounter + 1);
    };

    const handleSave = async () => {
        if (!validation.isValid) {
            toast({
                title: 'Ruta inválida',
                description: 'Corrige las reglas marcadas antes de guardar.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

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

            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                const payload = err.response?.data as BackendErrorResponse | undefined;
                const message = payload?.message || payload?.title;

                toast({
                    title: status === 409 ? 'Ruta bloqueada' : 'Error',
                    description:
                        message ||
                        (status === 409
                            ? 'No se puede editar la ruta porque la categoría tiene órdenes activas.'
                            : 'No se pudo guardar la ruta de proceso'),
                    status: status === 409 ? 'warning' : 'error',
                    duration: 4000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: 'Error',
                    description: 'No se pudo guardar la ruta de proceso',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
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
        if (!selectedElement) {
            return;
        }

        if ('position' in selectedElement) {
            setNodes((prevNodes) => prevNodes.filter((node) => node.id !== selectedElement.id));
            setEdges((prevEdges) =>
                prevEdges.filter((edge) => edge.source !== selectedElement.id && edge.target !== selectedElement.id)
            );
        } else {
            setEdges((prevEdges) => prevEdges.filter((edge) => edge.id !== selectedElement.id));
        }
        setSelectedElement(null);
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
    }, [fitView, isFullScreen, nodes.length, edges.length]);

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

            <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                    <AlertTitle>Convención operativa</AlertTitle>
                    <AlertDescription>
                        La ruta debe iniciar en Almacen General y terminar en el último nodo productivo.
                        El ingreso del producto terminado a almacén se sigue manejando por su flujo propio.
                    </AlertDescription>
                </Box>
            </Alert>

            {!validation.isValid && (
                <Alert status="warning" borderRadius="md" alignItems="flex-start">
                    <AlertIcon mt={1} />
                    <Box>
                        <AlertTitle>La ruta aún no cumple las reglas</AlertTitle>
                        <AlertDescription>
                            <UnorderedList mt={2} spacing={1}>
                                {validation.errors.map((error) => (
                                    <ListItem key={error}>{error}</ListItem>
                                ))}
                            </UnorderedList>
                        </AlertDescription>
                    </Box>
                </Alert>
            )}

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
                        if (selectedNodes.length > 0) setSelectedElement(selectedNodes[0] as Node<RutaProcesoNodeData>);
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
                    isDisabled={!validation.isValid}
                    title={!validation.isValid ? "La ruta tiene reglas pendientes por corregir" : ""}
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
                disabledAreaIds={disabledAreaIds}
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
