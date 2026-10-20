import { useEffect, useId, useRef, useState } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import {
    Background, BackgroundVariant, Controls, ReactFlow,
    type Connection, type Edge, type EdgeChange, type NodeChange, type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useColorMode } from "../../../components/ui/color-mode.tsx";
import type { Producto } from "../types.tsx";
import type { DesignerNode } from "./ProcessDesignerTab.tsx";
import type { LoadedDraft } from "./LoadTerminadoDialog.tsx";
import MaterialSemiTerPanel from "./MaterialSemiTerPanel.tsx";
import PD_Controls from "./PD_Controls.tsx";
import MaterialNode from "./NodesEdges/MaterialNode.tsx";
import SemiterminadoNode from "./NodesEdges/SemiterminadoNode.tsx";
import ProcessNode from "./NodesEdges/ProcessNode.tsx";
import TerminadoNode from "./NodesEdges/TerminadoNode.tsx";

const nodeTypes = { material: MaterialNode, semiterminado: SemiterminadoNode, process: ProcessNode, target: TerminadoNode };
const MIN_HEIGHT = 360;
const MAX_HEIGHT = 1600;
const constrainHeight = (value: number) => Math.max(MIN_HEIGHT, Math.min(value, MAX_HEIGHT));

interface Props {
    isActive: boolean;
    nodes: DesignerNode[];
    edges: Edge[];
    hasDraft: boolean;
    onAddProduct: (producto: Producto) => void;
    onClone: (draft: LoadedDraft) => void;
    onAddProcess: () => void;
    onAssignArea: (nodeId: string) => void;
    onRemoveSelection: () => void;
    onNodesChange: (changes: NodeChange<DesignerNode>[]) => void;
    onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
    onInit: (flow: ReactFlowInstance<DesignerNode>) => void;
    isValidConnection: (connection: Connection | Edge) => boolean;
    onConnect: (connection: Connection) => void;
}

export default function ProcessDesignerCanvas({
    isActive, nodes, edges, hasDraft, onAddProduct, onClone, onAddProcess, onAssignArea,
    onRemoveSelection, onNodesChange, onEdgesChange, onInit, isValidConnection, onConnect,
}: Props) {
    const { colorMode } = useColorMode();
    const contentId = useId();
    const resizeHintId = useId();
    const [expanded, setExpanded] = useState(true);
    const [height, setHeight] = useState<number | null>(null);
    const [measuredHeight, setMeasuredHeight] = useState(576);
    const editorRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ pointerId: number; y: number; height: number } | null>(null);
    const active = isActive && expanded;
    const canvasHeight = height === null
        ? `clamp(${MIN_HEIGHT}px, max(36rem, calc(100dvh - 20rem)), ${MAX_HEIGHT}px)`
        : `${height}px`;
    const selectedIds = nodes.filter((node) => node.type === "material" || node.type === "semiterminado").map((node) => node.data.producto.productoId);
    const selectedProcesses = nodes.filter((node) => node.type === "process" && node.selected);
    const hasSelection = nodes.some((node) => node.selected && node.type !== "target") || edges.some((edge) => edge.selected);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const observer = new ResizeObserver(() => {
            // A hidden editor reports zero; retain its last visible height for keyboard resizing.
            if (editor.clientHeight > 0) setMeasuredHeight(Math.round(editor.clientHeight));
        });
        observer.observe(editor);
        return () => observer.disconnect();
    }, []);

    return <Box borderWidth="1px" rounded="lg" overflow="hidden" bg="bg.panel">
        <Button variant="ghost" justifyContent="start" w="full" rounded="none" size="sm"
            aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((value) => !value)}>
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
            Área de trabajo · {nodes.length} nodos · {edges.length} conexiones
        </Button>
        {/* Keep the entire subtree mounted: collapse must not reset the viewport or either panel. */}
        <Box id={contentId} display={expanded ? "block" : "none"} inert={!active} borderTopWidth="1px">
            <Flex direction={{ base: "column", lg: "row" }} h={{ base: "auto", lg: canvasHeight }}>
                <MaterialSemiTerPanel isActive={active} selectedIds={selectedIds} onAddProduct={onAddProduct} />
                <Flex ref={editorRef} flex={{ base: "none", lg: "1" }} minW="0" minH="0" direction="column"
                    h={{ base: canvasHeight, lg: "full" }}>
                    <Flex align="center" p="2" gap="2" flexWrap="wrap" borderBottomWidth="1px">
                        <Button size="sm" colorPalette="teal" onClick={onAddProcess}>Agregar proceso</Button>
                        <Button size="sm" variant="outline" disabled={selectedProcesses.length !== 1}
                            onClick={() => onAssignArea(selectedProcesses[0].id)}>Asignar área</Button>
                        <Button size="sm" variant="outline" disabled={!hasSelection} onClick={onRemoveSelection}>Quitar selección</Button>
                    </Flex>
                    <Text px="3" py="1" fontSize="xs" color="fg.muted">Conecta insumos → procesos → destino. Selecciona un proceso para asignarle un área.</Text>
                    <Box flex="1" minH="0" position="relative" bg="bg.subtle">
                        <ReactFlow<DesignerNode>
                            nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                            onInit={onInit} fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }} minZoom={0.2} maxZoom={2} colorMode={colorMode}
                            defaultEdgeOptions={{ type: "smoothstep", animated: true, style: { strokeWidth: 2 } }}
                            isValidConnection={isValidConnection} onConnect={onConnect}
                            onNodeDoubleClick={(_, node) => { if (node.type === "process") onAssignArea(node.id); }}
                            deleteKeyCode={active ? ["Backspace", "Delete"] : null} aria-label="Lienzo del nuevo Process Designer"
                        >
                            <Background variant={BackgroundVariant.Lines} gap={12} size={1} />
                            <Controls showInteractive={false} />
                        </ReactFlow>
                    </Box>
                </Flex>
                <PD_Controls hasDraft={hasDraft} onClone={onClone} />
            </Flex>
            <Flex role="separator" aria-label="Altura del área de trabajo" aria-orientation="horizontal"
                aria-controls={contentId} aria-describedby={resizeHintId}
                aria-valuemin={MIN_HEIGHT} aria-valuemax={MAX_HEIGHT} aria-valuenow={measuredHeight}
                aria-valuetext={`${measuredHeight} píxeles`} tabIndex={0}
                align="center" justify="center" gap="2" minH="7" px="2" borderTopWidth="1px"
                cursor="row-resize" touchAction="none" userSelect="none"
                _hover={{ bg: "teal.subtle" }} _focusVisible={{ bg: "teal.subtle", outline: "2px solid", outlineColor: "teal.focusRing", outlineOffset: "-2px" }}
                onPointerDown={(event) => {
                    if (event.button !== 0 || !event.isPrimary) return;
                    drag.current = { pointerId: event.pointerId, y: event.clientY, height: editorRef.current?.clientHeight || measuredHeight };
                    event.currentTarget.focus({ preventScroll: true });
                    event.currentTarget.setPointerCapture(event.pointerId);
                    event.preventDefault();
                }}
                onPointerMove={(event) => {
                    if (drag.current?.pointerId === event.pointerId) {
                        setHeight(constrainHeight(drag.current.height + event.clientY - drag.current.y));
                    }
                }}
                onPointerUp={(event) => {
                    drag.current = null;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={() => { drag.current = null; }}
                onLostPointerCapture={() => { drag.current = null; }}
                onKeyDown={(event) => {
                    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const step = event.shiftKey ? 96 : 32;
                    const currentHeight = editorRef.current?.clientHeight || measuredHeight;
                    setHeight(constrainHeight(event.key === "Home" ? MIN_HEIGHT : event.key === "End" ? MAX_HEIGHT
                        : currentHeight + (event.key === "ArrowDown" ? step : -step)));
                }}>
                <Box w="8" h="1" rounded="full" bg="fg.muted" aria-hidden="true" />
                <Text id={resizeHintId} fontSize="xs" color="fg.muted">Arrastra para ajustar la altura · ↑ / ↓ con teclado</Text>
            </Flex>
        </Box>
    </Box>;
}
