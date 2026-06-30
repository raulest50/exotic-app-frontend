import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Badge,
    Box,
    Button,
    Divider,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    IconButton,
    Input,
    ListItem,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    UnorderedList,
    Switch,
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

function toFlowNodes(ruta: RutaProcesoCatDTO): Node<RutaProcesoNodeData>[] {
    return ruta.nodes.map((node: RutaProcesoNodeDTO) => ({
        id: node.id,
        type: 'areaOperativaNode',
        position: { x: node.posicionX, y: node.posicionY },
        data: {
            label: node.label || node.areaOperativaNombre || 'Sin asignar',
            areaOperativaId: node.areaOperativaId,
            areaOperativaNombre: node.areaOperativaNombre,
            hasLeftHandle: node.hasLeftHandle ?? true,
            hasRightHandle: node.hasRightHandle ?? true,
            duracionEstimadaMinutos: node.duracionEstimadaMinutos ?? 0,
            requiereJornadaLaboral: node.requiereJornadaLaboral ?? true,
        },
    }));
}

function toFlowEdges(ruta: RutaProcesoCatDTO): Edge[] {
    return ruta.edges.map((edge: RutaProcesoEdgeDTO) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
    }));
}

function getNextNodeId(ruta: RutaProcesoCatDTO): number {
    const maxId = Math.max(0, ...ruta.nodes.map((node) => Number.parseInt(node.id, 10) || 0));
    return maxId + 1;
}

function buildGraphSignature(nodes: Node<RutaProcesoNodeData>[], edges: Edge[]): string {
    return JSON.stringify({
        nodes: nodes
            .map((node) => ({
                id: node.id,
                x: node.position.x,
                y: node.position.y,
                areaOperativaId: node.data.areaOperativaId ?? null,
                areaOperativaNombre: node.data.areaOperativaNombre ?? null,
                label: node.data.label ?? '',
                hasLeftHandle: node.data.hasLeftHandle ?? true,
                hasRightHandle: node.data.hasRightHandle ?? true,
                duracionEstimadaMinutos: node.data.duracionEstimadaMinutos ?? 0,
                requiereJornadaLaboral: node.data.requiereJornadaLaboral ?? true,
            }))
            .sort((left, right) => left.id.localeCompare(right.id)),
        edges: edges
            .map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
            }))
            .sort((left, right) => left.id.localeCompare(right.id)),
    });
}

function formatVersionDate(value?: string | null): string {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function RutaProcesoCatDesignerContent({ categoria, onBack }: Props) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<RutaProcesoNodeData>>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedElement, setSelectedElement] = useState<Node<RutaProcesoNodeData> | Edge | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const [currentRuta, setCurrentRuta] = useState<RutaProcesoCatDTO | null>(null);
    const [versions, setVersions] = useState<RutaProcesoCatDTO[]>([]);
    const [viewingHistorical, setViewingHistorical] = useState(false);
    const [lastSavedSignature, setLastSavedSignature] = useState<string | null>(null);
    const [motivoCambio, setMotivoCambio] = useState('');

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

    const endPoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();
    const isReadOnly = viewingHistorical;
    const selectedNode = useMemo(() => {
        if (!selectedElement || !('position' in selectedElement)) {
            return null;
        }
        return nodes.find((node) => node.id === selectedElement.id) ?? null;
    }, [nodes, selectedElement]);

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

    const applyRuta = useCallback(
        (ruta: RutaProcesoCatDTO | null, historical: boolean) => {
            if (!ruta) {
                setNodes([]);
                setEdges([]);
                setCurrentRuta(null);
                setNodeIdCounter(1);
                setSelectedElement(null);
                setViewingHistorical(false);
                setLastSavedSignature(null);
                return;
            }

            const loadedNodes = toFlowNodes(ruta);
            const loadedEdges = toFlowEdges(ruta);
            setNodes(loadedNodes);
            setEdges(loadedEdges);
            setCurrentRuta(ruta);
            setNodeIdCounter(getNextNodeId(ruta));
            setSelectedElement(null);
            setViewingHistorical(historical);
            setLastSavedSignature(historical ? null : buildGraphSignature(loadedNodes, loadedEdges));
        },
        [setEdges, setNodes],
    );

    const loadVersiones = useCallback(async () => {
        try {
            const response = await axios.get<RutaProcesoCatDTO[]>(
                endPoints.get_ruta_proceso_cat_versiones.replace('{categoriaId}', String(categoria.categoriaId)),
            );
            setVersions(response.data ?? []);
        } catch (err) {
            console.error('Error loading ruta versions:', err);
            setVersions([]);
        }
    }, [categoria.categoriaId, endPoints.get_ruta_proceso_cat_versiones]);

    const loadRutaVigente = useCallback(async () => {
        const response = await axios.get(
            endPoints.get_ruta_proceso_cat.replace('{categoriaId}', String(categoria.categoriaId)),
        );
        if (response.status === 200 && response.data) {
            applyRuta(response.data as RutaProcesoCatDTO, false);
        } else {
            applyRuta(null, false);
        }
    }, [applyRuta, categoria.categoriaId, endPoints.get_ruta_proceso_cat]);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                await loadRutaVigente();
                await loadVersiones();
            } catch (err) {
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

        void loadInitialData();
    }, [loadRutaVigente, loadVersiones, toast]);

    const handleAddArea = () => {
        if (isReadOnly) {
            return;
        }
        setIsPickerOpen(true);
    };

    const handleAreaSelected = (area: AreaOperativa) => {
        if (isReadOnly) {
            return;
        }

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
                duracionEstimadaMinutos: 0,
                requiereJornadaLaboral: true,
            },
        };
        setNodes((currentNodes) => [...currentNodes, newNode]);
        setNodeIdCounter((currentCounter) => currentCounter + 1);
    };

    const updateSelectedNodeData = (patch: Partial<RutaProcesoNodeData>) => {
        if (!selectedNode || isReadOnly) {
            return;
        }

        setNodes((currentNodes) =>
            currentNodes.map((node) =>
                node.id === selectedNode.id
                    ? { ...node, data: { ...node.data, ...patch } }
                    : node
            )
        );
    };

    const handleSelectedNodeDurationChange = (rawValue: string) => {
        const parsed = Number.parseInt(rawValue, 10);
        updateSelectedNodeData({
            duracionEstimadaMinutos: Number.isFinite(parsed) ? Math.max(parsed, 0) : 0,
        });
    };

    const handleSelectedNodeJornadaChange = (checked: boolean) => {
        updateSelectedNodeData({ requiereJornadaLaboral: checked });
    };

    const handleSave = async () => {
        if (isReadOnly) {
            toast({
                title: 'Versión solo lectura',
                description: 'Las versiones anteriores no se editan. Vuelve a la versión vigente para crear una nueva versión.',
                status: 'info',
                duration: 3500,
                isClosable: true,
            });
            return;
        }

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

        const currentSignature = buildGraphSignature(nodes, edges);
        if (lastSavedSignature === currentSignature) {
            toast({
                title: 'Sin cambios',
                description: 'No hay cambios en la ruta vigente para versionar.',
                status: 'info',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setSaving(true);
        try {
            const rutaDTO: RutaProcesoCatDTO = {
                categoriaId: categoria.categoriaId,
                motivoCambio: motivoCambio.trim() || null,
                nodes: nodes.map((node) => ({
                    id: node.id,
                    posicionX: node.position.x,
                    posicionY: node.position.y,
                    areaOperativaId: node.data.areaOperativaId || null,
                    areaOperativaNombre: node.data.areaOperativaNombre || null,
                    label: node.data.label || '',
                    hasLeftHandle: node.data.hasLeftHandle ?? true,
                    hasRightHandle: node.data.hasRightHandle ?? true,
                    duracionEstimadaMinutos: node.data.duracionEstimadaMinutos ?? 0,
                    requiereJornadaLaboral: node.data.requiereJornadaLaboral ?? true,
                })),
                edges: edges.map((edge) => ({
                    id: edge.id,
                    sourceNodeId: edge.source,
                    targetNodeId: edge.target,
                })),
            };

            const response = await axios.post<RutaProcesoCatDTO>(endPoints.save_ruta_proceso_cat, rutaDTO);
            applyRuta(response.data, false);
            setMotivoCambio('');
            await loadVersiones();

            toast({
                title: 'Guardado',
                description: 'Nueva versión de ruta de proceso activada correctamente',
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
                    title: status === 409 ? 'Conflicto al versionar' : 'Error',
                    description:
                        message ||
                        (status === 409
                            ? 'No se pudo crear la nueva versión de ruta.'
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
        if (isReadOnly) {
            return;
        }
        setNodes([]);
        setEdges([]);
        setNodeIdCounter(1);
        setSelectedElement(null);
    };

    const handleDeleteSelected = () => {
        if (!selectedElement || isReadOnly) {
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

    const handleViewVersion = async (versionId?: number | null) => {
        if (!versionId) {
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get<RutaProcesoCatDTO>(
                endPoints.get_ruta_proceso_cat_version
                    .replace('{categoriaId}', String(categoria.categoriaId))
                    .replace('{versionId}', String(versionId)),
            );
            if (response.status === 200 && response.data) {
                applyRuta(response.data, response.data.estado !== 'VIGENTE');
            }
        } catch (err) {
            console.error('Error loading ruta version:', err);
            toast({
                title: 'Error',
                description: 'No se pudo cargar la versión seleccionada.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReturnToVigente = async () => {
        setLoading(true);
        try {
            await loadRutaVigente();
            await loadVersiones();
        } catch (err) {
            console.error('Error loading active ruta:', err);
            toast({
                title: 'Error',
                description: 'No se pudo cargar la versión vigente.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
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
                {currentRuta?.versionNumber ? (
                    <Badge colorScheme={viewingHistorical ? 'gray' : 'green'} fontSize="sm" px={3} py={1}>
                        Versión {currentRuta.versionNumber} {currentRuta.estado ? `· ${currentRuta.estado}` : ''}
                    </Badge>
                ) : null}
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

            {viewingHistorical && (
                <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>Versión histórica solo lectura</AlertTitle>
                        <AlertDescription>
                            Esta versión se conserva para trazabilidad de órdenes existentes. Vuelve a la versión vigente para editar.
                        </AlertDescription>
                    </Box>
                </Alert>
            )}

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

            {!viewingHistorical && (
                <FormControl>
                    <FormLabel>Motivo del cambio</FormLabel>
                    <Input
                        value={motivoCambio}
                        onChange={(event) => setMotivoCambio(event.target.value)}
                        placeholder="Opcional: describe por qué se crea esta nueva versión"
                    />
                </FormControl>
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
                    onNodesChange={isReadOnly ? undefined : onNodesChange}
                    onEdgesChange={isReadOnly ? undefined : onEdgesChange}
                    onConnect={isReadOnly ? undefined : onConnect}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    connectionMode={ConnectionMode.Loose}
                    connectOnClick={!isReadOnly}
                    nodesDraggable={!isReadOnly}
                    nodesConnectable={!isReadOnly}
                    elementsSelectable={!isReadOnly}
                    onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
                        if (selectedNodes.length > 0) setSelectedElement(selectedNodes[0] as Node<RutaProcesoNodeData>);
                        else if (selectedEdges.length > 0) setSelectedElement(selectedEdges[0]);
                        else setSelectedElement(null);
                    }}
                    isValidConnection={isReadOnly ? undefined : isValidConnection}
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
                                isDisabled={isReadOnly}
                                boxShadow="lg"
                            >
                                Agregar Area
                            </Button>
                            <Button
                                colorScheme="red"
                                leftIcon={<DeleteIcon />}
                                onClick={handleDeleteSelected}
                                isDisabled={!selectedElement || isReadOnly}
                                boxShadow="lg"
                            >
                                Eliminar Seleccion
                            </Button>
                        </Flex>
                    </>
                )}
            </Box>

            {selectedNode && (
                <Box borderWidth="1px" borderRadius="md" p={4} bg="gray.50">
                    <Flex direction={{ base: "column", md: "row" }} gap={4} align={{ base: "stretch", md: "end" }}>
                        <Box flex={1}>
                            <Text fontWeight="semibold">{selectedNode.data.label || "Nodo seleccionado"}</Text>
                            <Text fontSize="sm" color="gray.500">
                                {selectedNode.data.areaOperativaNombre || "Área sin asignar"}
                            </Text>
                        </Box>

                        <FormControl maxW={{ base: "full", md: "220px" }}>
                            <FormLabel>Duración estimada (min)</FormLabel>
                            <Input
                                type="number"
                                min={0}
                                step={1}
                                value={selectedNode.data.duracionEstimadaMinutos ?? 0}
                                onChange={(event) => handleSelectedNodeDurationChange(event.target.value)}
                                isDisabled={isReadOnly}
                            />
                        </FormControl>

                        <FormControl display="flex" alignItems="center" gap={3} maxW={{ base: "full", md: "260px" }}>
                            <FormLabel mb={0}>Requiere jornada laboral</FormLabel>
                            <Switch
                                colorScheme="purple"
                                isChecked={selectedNode.data.requiereJornadaLaboral !== false}
                                onChange={(event) => handleSelectedNodeJornadaChange(event.target.checked)}
                                isDisabled={isReadOnly}
                            />
                        </FormControl>
                    </Flex>
                </Box>
            )}

            <Flex direction="row" gap={4} alignItems="center" flexWrap="wrap">
                <Button
                    variant="solid"
                    colorScheme="purple"
                    onClick={handleAddArea}
                    isDisabled={isReadOnly}
                >
                    Agregar Area
                </Button>

                <Button
                    variant="solid"
                    colorScheme="green"
                    onClick={handleSave}
                    isLoading={saving}
                    isDisabled={!validation.isValid || isReadOnly}
                    title={!validation.isValid ? "La ruta tiene reglas pendientes por corregir" : ""}
                >
                    Guardar nueva versión
                </Button>

                {viewingHistorical && (
                    <Button
                        variant="outline"
                        colorScheme="purple"
                        onClick={() => void handleReturnToVigente()}
                    >
                        Volver a vigente
                    </Button>
                )}

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
                    isDisabled={isReadOnly}
                >
                    Reset
                </Button>

                <Button
                    variant="solid"
                    colorScheme="red"
                    onClick={handleDeleteSelected}
                    isDisabled={!selectedElement || isReadOnly}
                >
                    Eliminar Seleccion
                </Button>

                <Text color="gray.500" fontSize="sm">
                    Nodos: {nodes.length} | Conexiones: {edges.length}
                </Text>
            </Flex>

            <Box borderWidth="1px" borderRadius="md" overflow="hidden">
                <Flex px={4} py={3} justify="space-between" align="center" bg="gray.50">
                    <Box>
                        <Text fontWeight="semibold">Historial de versiones</Text>
                        <Text fontSize="sm" color="gray.500">
                            Las versiones anteriores se conservan para órdenes existentes.
                        </Text>
                    </Box>
                    <Button size="sm" variant="outline" onClick={() => void loadVersiones()}>
                        Refrescar
                    </Button>
                </Flex>
                {versions.length === 0 ? (
                    <Text p={4} color="gray.500">
                        Aún no hay versiones guardadas para esta categoría.
                    </Text>
                ) : (
                    <TableContainer>
                        <Table size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Versión</Th>
                                    <Th>Estado</Th>
                                    <Th>Vigente desde</Th>
                                    <Th>Vigente hasta</Th>
                                    <Th>Motivo</Th>
                                    <Th>Acción</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {versions.map((version) => (
                                    <Tr key={version.versionId ?? version.versionNumber}>
                                        <Td>{version.versionNumber ?? '-'}</Td>
                                        <Td>
                                            <Badge colorScheme={version.estado === 'VIGENTE' ? 'green' : 'gray'}>
                                                {version.estado || '-'}
                                            </Badge>
                                        </Td>
                                        <Td>{formatVersionDate(version.vigenteDesde)}</Td>
                                        <Td>{formatVersionDate(version.vigenteHasta)}</Td>
                                        <Td maxW="320px">
                                            <Text noOfLines={2}>{version.motivoCambio || '-'}</Text>
                                        </Td>
                                        <Td>
                                            <Button
                                                size="xs"
                                                variant={currentRuta?.versionId === version.versionId ? 'solid' : 'outline'}
                                                colorScheme="purple"
                                                onClick={() => void handleViewVersion(version.versionId)}
                                                isDisabled={currentRuta?.versionId === version.versionId}
                                            >
                                                {currentRuta?.versionId === version.versionId ? 'Abierta' : 'Abrir'}
                                            </Button>
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

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
