import { useEffect, useRef, useState } from "react";
import { Badge, Box, Flex, Heading, Text } from "@chakra-ui/react";
import {
    addEdge, useEdgesState, useNodesState,
    type Connection, type Edge, type NodeChange, type ReactFlowInstance,
} from "@xyflow/react";
import AreaPickerGeneric from "../../../components/Pickers/AreaPickerGeneric/AreaPickerGeneric.tsx";
import { ProcesoProduccionPicker } from "../DefProcesses/CreadorProcesos/components/ProcesoProduccionPicker/ProcesoProduccionPicker.tsx";
import type { Producto, ProcesoProduccionEntity } from "../types.tsx";
import type { MaterialFlowNode } from "./NodesEdges/MaterialNode.tsx";
import type { SemiterminadoFlowNode } from "./NodesEdges/SemiterminadoNode.tsx";
import type { ProcessFlowNode } from "./NodesEdges/ProcessNode.tsx";
import type { TerminadoFlowNode } from "./NodesEdges/TerminadoNode.tsx";
import CabeceraDatos, { type DesignerProduct } from "./CabeceraDatos.tsx";
import Validator from "./Validator.tsx";
import ProcessDesignerCanvas from "./ProcessDesignerCanvas.tsx";
import type { LoadedDraft } from "./LoadTerminadoDialog.tsx";

export type DesignerNode = MaterialFlowNode | SemiterminadoFlowNode | ProcessFlowNode | TerminadoFlowNode;
const emptyDesignerProduct = (): DesignerProduct => ({
    productoId: "", nombre: "", tipo_producto: "T", tipoUnidades: "U", cantidadUnidad: "",
    inventareable: true, requiereOrdenFabricacion: true, ivaPercentual: 0, rendimientoTeorico: "0",
});

function canConnect(connection: Connection | Edge, nodes: DesignerNode[], edges: Edge[]) {
    const source = nodes.find((n) => n.id === connection.source), target = nodes.find((n) => n.id === connection.target);
    if (!source || !target || source.id === target.id || source.type === "target") return false;
    if (target.type !== "process" && !(source.type === "process" && target.type === "target")) return false;
    if (edges.some((edge) => edge.source === source.id)) return false;
    const visited = new Set<string>(), pending = [target.id];
    while (pending.length) {
        const id = pending.pop()!;
        if (id === source.id) return false;
        if (visited.has(id)) continue;
        visited.add(id);
        pending.push(...edges.filter((e) => e.source === id).map((e) => e.target));
    }
    return true;
}

export default function ProcessDesignerTab({ isActive }: { isActive: boolean }) {
    const [product, setProduct] = useState<DesignerProduct>(emptyDesignerProduct);
    const [nodes, setNodes, changeNodes] = useNodesState<DesignerNode>([
        { id: "target", type: "target", position: { x: 850, y: 180 }, deletable: false, data: { producto: emptyDesignerProduct() } },
    ]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [flow, setFlow] = useState<ReactFlowInstance<DesignerNode> | null>(null);
    const [processPickerOpen, setProcessPickerOpen] = useState(false);
    const [areaNodeId, setAreaNodeId] = useState<string | null>(null);
    const [cloneSource, setCloneSource] = useState("");
    const [fitRevision, setFitRevision] = useState(0);
    const nextPosition = useRef(0);
    const selectedIds = nodes.filter((node) => node.type === "material" || node.type === "semiterminado").map((node) => node.data.producto.productoId);
    const hasDraft = nodes.length > 1 || edges.length > 0 || JSON.stringify(product) !== JSON.stringify(emptyDesignerProduct());

    useEffect(() => {
        if (!isActive || !flow) return;
        const frame = requestAnimationFrame(() => { void flow.fitView({ padding: 0.2, maxZoom: 1, duration: 200 }); });
        return () => cancelAnimationFrame(frame);
    }, [isActive, flow, fitRevision]);

    function onNodesChange(changes: NodeChange<DesignerNode>[]) {
        const removed = new Set(changes.filter((change) => change.type === "remove").map((change) => change.id));
        if (removed.size) setEdges((current) => current.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)));
        changeNodes(changes);
    }

    function addProduct(producto: Producto) {
        if (selectedIds.includes(producto.productoId) || !["M", "S"].includes(producto.tipo_producto)) return;
        const index = nextPosition.current++;
        const position = { x: Math.floor(index / 4) * -280, y: (index % 4) * 250 };
        const node: MaterialFlowNode | SemiterminadoFlowNode = {
            id: crypto.randomUUID(), type: producto.tipo_producto === "S" ? "semiterminado" : "material",
            data: { producto, cantidad: "" }, position, selected: true,
        };
        setNodes((current) => current.some((n) => (n.type === "material" || n.type === "semiterminado") && n.data.producto.productoId === producto.productoId)
            ? current : [...current.map((n) => ({ ...n, selected: false })), node]);
        void flow?.setCenter(position.x + 96, position.y + 110, { zoom: 1, duration: 200 });
    }

    function addProcesses(processes: ProcesoProduccionEntity[]) {
        const offset = nodes.filter((n) => n.type === "process").length;
        const additions: ProcessFlowNode[] = processes.filter((p) => p.procesoId != null).map((process, index) => {
            const id = crypto.randomUUID();
            const position = { x: 350 + Math.floor((offset + index) / 3) * 350, y: ((offset + index) % 3) * 400 };
            return { id, type: "process", position, selected: index === processes.length - 1, data: { proceso: {
                nodeType: "PROCESO", frontendId: id, posicionX: position.x, posicionY: position.y,
                procesoId: process.procesoId!, procesoNombre: process.nombre, areaOperativaId: 0,
                setUpTime: process.setUpTime, model: process.model, constantSeconds: process.constantSeconds,
                throughputUnitsPerSec: process.throughputUnitsPerSec, secondsPerUnit: process.secondsPerUnit,
                secondsPerBatch: process.secondsPerBatch, batchSize: process.batchSize,
            } } };
        });
        setNodes((current) => [...current.map((n) => ({ ...n, selected: false })), ...additions]);
        setProcessPickerOpen(false); setFitRevision((n) => n + 1);
    }

    function loadClone(draft: LoadedDraft) {
        // Commit the fully resolved draft together; failures before here cannot erase current work.
        const targetProduct = draft.mode === "all" ? draft.product : product;
        if (draft.mode === "all") setProduct(draft.product);
        setNodes(draft.nodes.map((node) => node.type === "target"
            ? { ...node, data: { producto: targetProduct } } : node));
        setEdges(draft.edges);
        setCloneSource(draft.source); nextPosition.current = draft.nodes.filter((n) => n.type === "material" || n.type === "semiterminado").length;
        setAreaNodeId(null); setFitRevision((n) => n + 1);
    }

    const renderedNodes = nodes.map((node): DesignerNode => {
        if (node.type === "target") return { ...node, data: { producto: { nombre: product.nombre || "Nuevo producto", tipo_producto: product.tipo_producto } } };
        if (node.type === "material" || node.type === "semiterminado") return { ...node, data: { ...node.data, onQuantityChange: (cantidad: string) => {
            setNodes((current) => current.map((item) => item.id === node.id && (item.type === "material" || item.type === "semiterminado") ? { ...item, data: { ...item.data, cantidad } } : item));
        } } };
        return node;
    });

    return (
        <Box w="calc(100vw - 3rem)" mx="calc(50% - 50vw + 1.5rem)" textAlign="left" py="3">
            <Flex align="center" justify="space-between" gap="3" flexWrap="wrap" mb="3">
                <Heading size="md">Nuevo Process Designer</Heading>
                <Badge colorPalette="orange">Borrador · sin guardar</Badge>
            </Flex>
            {cloneSource && <Text mb="3" fontSize="sm" color="fg.muted">Referencia del grafo: {cloneSource}. Estás editando una copia.</Text>}
            <CabeceraDatos product={product} onChange={setProduct} isActive={isActive} />
            <Validator product={product} nodes={nodes} edges={edges} isActive={isActive} />
            <ProcessDesignerCanvas
                isActive={isActive} nodes={renderedNodes} edges={edges} hasDraft={hasDraft}
                onAddProduct={addProduct} onClone={loadClone} onAddProcess={() => setProcessPickerOpen(true)} onAssignArea={setAreaNodeId}
                onRemoveSelection={() => {
                    const removed = new Set(nodes.filter((n) => n.selected && n.type !== "target").map((n) => n.id));
                    setNodes((current) => current.filter((n) => !removed.has(n.id)));
                    setEdges((current) => current.filter((e) => !e.selected && !removed.has(e.source) && !removed.has(e.target)));
                }}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onInit={setFlow}
                isValidConnection={(connection) => canConnect(connection, nodes, edges)}
                onConnect={(connection) => { if (canConnect(connection, nodes, edges)) setEdges((current) => addEdge(connection, current)); }}
            />
            <Text fontSize="xs" color="fg.muted" mt="2">El borrador se conserva al cambiar de pestaña, pero se pierde al salir de Productos o recargar. Quitar un nodo no elimina el producto del catálogo.</Text>
            {processPickerOpen && <ProcesoProduccionPicker isOpen onClose={() => setProcessPickerOpen(false)} onConfirm={addProcesses} alreadySelected={[]} />}
            {areaNodeId && <AreaPickerGeneric isOpen onClose={() => setAreaNodeId(null)} onSelectArea={(area) => {
                setNodes((current) => current.map((node) => node.id === areaNodeId && node.type === "process"
                    ? { ...node, data: { proceso: { ...node.data.proceso, areaOperativaId: area.areaId, areaOperativaNombre: area.nombre } } } : node));
                setAreaNodeId(null);
            }} />}
        </Box>
    );
}
