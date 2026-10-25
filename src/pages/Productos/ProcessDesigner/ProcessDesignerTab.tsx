import { useEffect, useRef, useState } from "react";
import { Badge, Box, Button, Flex, Heading, Text } from "@chakra-ui/react";
import {
    addEdge, useEdgesState, useNodesState,
    type Connection, type Edge, type NodeChange, type ReactFlowInstance,
} from "@xyflow/react";
import AreaPickerGeneric from "../../../components/Pickers/AreaPickerGeneric/AreaPickerGeneric.tsx";
import { ProcesoProduccionPicker } from "../DefProcesses/CreadorProcesos/components/ProcesoProduccionPicker/ProcesoProduccionPicker.tsx";
import type { Producto, ProcesoProduccionEntity, UnidadMedidaProducto } from "../types.tsx";
import type { MaterialFlowNode } from "./NodesEdges/MaterialNode.tsx";
import type { SemiterminadoFlowNode } from "./NodesEdges/SemiterminadoNode.tsx";
import type { ProcessFlowNode } from "./NodesEdges/ProcessNode.tsx";
import type { TerminadoFlowNode } from "./NodesEdges/TerminadoNode.tsx";
import CabeceraDatos, { type DesignerProduct } from "./CabeceraDatos.tsx";
import { useTabPermission } from "../../../auth/usePermissions.ts";
import { Modulo } from "../../Usuarios/GestionUsuarios/types.tsx";
import { listarUnidadesMedidaProducto, unidadesCompatibles } from "../UnidadesMedidaApi.ts";
import { guardarProducto, importedOutputQuantity, toDesignerPayload, type EditingProduct, type SavedProductSummary } from "./ProcessDesignerApi.ts";
import Validator from "./Validator.tsx";
import ProcessDesignerCanvas from "./ProcessDesignerCanvas.tsx";
import type { LoadedDraft } from "./LoadTerminadoDialog.tsx";

export type DesignerNode = MaterialFlowNode | SemiterminadoFlowNode | ProcessFlowNode | TerminadoFlowNode;
const emptyDesignerProduct = (): DesignerProduct => ({
    productoId: "", nombre: "", tipo_producto: "T", tipoUnidades: "U", cantidadUnidad: "",
    inventareable: true, requiereOrdenFabricacion: true, ivaPercentual: 0, rendimientoTeorico: "0", cantidadSalidaReceta: "", unidadContenidoPorEnvase: "",
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
    const permission = useTabPermission(Modulo.PRODUCTOS, "PROCESS_DESIGNER");
    const canSave = permission.ready && permission.nivel >= 2;
    const [units, setUnits] = useState<UnidadMedidaProducto[]>([]);
    const [unitError, setUnitError] = useState("");
    const [unitRetry, setUnitRetry] = useState(0);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const [saveError, setSaveError] = useState("");
    const [result, setResult] = useState<SavedProductSummary | null>(null);
    const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
    const [savedDraft, setSavedDraft] = useState("");
    const [saveRevision, setSaveRevision] = useState(0);
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
    const [resetRevision, setResetRevision] = useState(0);
    const nextPosition = useRef(0);
    const selectedIds = nodes.filter((node) => node.type === "material" || node.type === "semiterminado").map((node) => node.data.producto.productoId);
    const draftKey = JSON.stringify(toDesignerPayload(product, nodes, edges));
    const hasDraft = nodes.length > 1 || edges.length > 0 || JSON.stringify(product) !== JSON.stringify(emptyDesignerProduct());
    const hasUnsavedChanges = hasDraft && savedDraft !== draftKey;

    useEffect(() => {
        if (!isActive) return;
        const controller = new AbortController();
        setUnits([]); setUnitError("");
        listarUnidadesMedidaProducto({ signal: controller.signal })
            .then(data => { if (!controller.signal.aborted) setUnits(data); })
            .catch(() => { if (!controller.signal.aborted) setUnitError("No se pudo cargar el catálogo de unidades. El guardado permanece deshabilitado."); });
        return () => controller.abort();
    }, [isActive, unitRetry]);

    async function save() {
        if (savingRef.current || !isActive || !canSave || !hasUnsavedChanges) return;
        savingRef.current = true; setSaving(true); setSaveError("");
        setProcessPickerOpen(false); setAreaNodeId(null);
        try {
            const saved = await guardarProducto(product, nodes, edges, editingProduct);
            setProduct(saved.product); setEditingProduct(saved.identity);
            setSavedDraft(JSON.stringify(toDesignerPayload(saved.product, nodes, edges))); setResult(saved);
            if (!editingProduct) setResetRevision(n => n + 1);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : "No se pudo guardar. El borrador se conserva.");
        } finally {
            savingRef.current = false; setSaving(false); setSaveRevision(n => n + 1);
        }
    }

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
            data: { producto, cantidad: "", unidad: producto.tipoUnidades }, position, selected: true,
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

    function loadDraft(draft: LoadedDraft) {
        // Commit the fully resolved draft together; failures before here cannot erase current work.
        if (savingRef.current || !isActive) return;
        const targetProduct = draft.mode !== "graph" ? draft.product : {
            ...product, cantidadSalidaReceta: importedOutputQuantity(draft.output, product.tipoUnidades, units),
        };
        const loadedNodes = draft.nodes.map((node) => node.type === "target"
            ? { ...node, data: { producto: targetProduct } } : node);
        setProduct(targetProduct); setSaveError(""); setResult(null);
        setNodes(loadedNodes);
        setEdges(draft.edges);
        if (draft.mode !== "graph") {
            setEditingProduct(draft.mode === "edit" ? draft.identity : null);
            setSavedDraft(draft.mode === "edit" ? JSON.stringify(toDesignerPayload(targetProduct, loadedNodes, draft.edges)) : "");
            setResetRevision(n => n + 1);
        }
        // Importing only a graph keeps the current destination and its create/edit mode.
        setCloneSource(draft.mode === "edit" ? "" : draft.source);
        nextPosition.current = draft.nodes.filter((n) => n.type === "material" || n.type === "semiterminado").length;
        setProcessPickerOpen(false); setAreaNodeId(null); setFitRevision((n) => n + 1); setSaveRevision(n => n + 1);
    }

    function clearDraft() {
        if (savingRef.current || !isActive) return;
        const initialProduct = emptyDesignerProduct();
        setProduct(initialProduct);
        setNodes([{ id: "target", type: "target", position: { x: 850, y: 180 }, deletable: false, data: { producto: initialProduct } }]);
        setEdges([]);
        setCloneSource(""); nextPosition.current = 0;
        setProcessPickerOpen(false); setAreaNodeId(null);
        setSaveError(""); setResult(null); setEditingProduct(null); setSavedDraft("");
        setSaveRevision(n => n + 1);
        setResetRevision(n => n + 1);
        setFitRevision(n => n + 1);
    }

    const renderedNodes = nodes.map((node): DesignerNode => {
        if (node.type === "target") return { ...node, data: {
            producto: { nombre: product.nombre || "Nuevo producto", tipo_producto: product.tipo_producto },
            output: { quantity: product.cantidadSalidaReceta, unit: product.tipoUnidades },
            units,
            onQuantityChange: (cantidadSalidaReceta: string) => setProduct(current => ({ ...current, cantidadSalidaReceta })),
            // Una unidad existente determina inventario, costos y cantidades de otras recetas.
            onUnitChange: editingProduct ? undefined : (tipoUnidades: string) => setProduct(current => ({
                ...current, tipoUnidades,
                cantidadUnidad: current.tipo_producto === "T" && tipoUnidades === "U" ? current.cantidadUnidad : "",
                unidadContenidoPorEnvase: current.tipo_producto === "T" && tipoUnidades === "U" ? current.unidadContenidoPorEnvase : "",
            })),
        } };
        if (node.type === "material" || node.type === "semiterminado") return { ...node, data: { ...node.data, units: unidadesCompatibles(units, node.data.producto.tipoUnidades), onUnitChange: (unidad: string) => {
            setNodes(current => current.map(item => item.id === node.id && (item.type === "material" || item.type === "semiterminado") ? { ...item, data: { ...item.data, unidad } } : item));
        }, onQuantityChange: (cantidad: string) => {
            setNodes((current) => current.map((item) => item.id === node.id && (item.type === "material" || item.type === "semiterminado") ? { ...item, data: { ...item.data, cantidad } } : item));
        } } };
        return node;
    });

    return (
        <Box w="calc(100vw - 3rem)" mx="calc(50% - 50vw + 1.5rem)" textAlign="left" py="3">
            <Flex align="center" justify="space-between" gap="3" flexWrap="wrap" mb="3">
                <Heading size="md">Process Designer v2</Heading>
                <Badge colorPalette={hasUnsavedChanges ? "orange" : "green"}>{hasUnsavedChanges ? "Cambios sin guardar" : editingProduct ? "Sin cambios pendientes" : "Nuevo producto"}</Badge>
            </Flex>
            {editingProduct && <Text mb="3" fontSize="sm" fontWeight="semibold" overflowWrap="anywhere">Modificando {editingProduct.productoId} · {product.nombre}</Text>}
            {cloneSource && <Text mb="3" fontSize="sm" color="fg.muted">Grafo importado de: {cloneSource}. {editingProduct ? `Los cambios se guardarán en ${editingProduct.productoId}.` : "Estás preparando un producto nuevo."}</Text>}
            {unitError && <Flex role="alert" align="center" gap="3" mb="3" color="red.fg"><Text>{unitError}</Text><Button size="sm" onClick={() => setUnitRetry(n => n + 1)}>Reintentar</Button></Flex>}
            {(cloneSource || editingProduct) && !product.cantidadSalidaReceta && <Text color="orange.fg" mb="3">La referencia no declara la salida física de su receta. Confirma la cantidad obtenida y las cantidades de los insumos antes de guardar.</Text>}
            <Box inert={saving} aria-busy={saving}>
            {/* Reset the header's manual-prefix state while keeping its fullscreen inert wrapper mounted. */}
            <Box><CabeceraDatos key={resetRevision} product={product} onChange={setProduct} isActive={isActive} units={units} isEditing={!!editingProduct} /></Box>
            <ProcessDesignerCanvas
                product={product} onProductChange={setProduct} units={units}
                isActive={isActive} nodes={renderedNodes} edges={edges} hasDraft={hasUnsavedChanges} editingProductId={editingProduct?.productoId}
                onAddProduct={addProduct} onLoad={loadDraft} onClear={clearDraft} onAddProcess={() => setProcessPickerOpen(true)} onAssignArea={setAreaNodeId}
                onRemoveSelection={() => {
                    const removed = new Set(nodes.filter((n) => n.selected && n.type !== "target").map((n) => n.id));
                    setNodes((current) => current.filter((n) => !removed.has(n.id)));
                    setEdges((current) => current.filter((e) => !e.selected && !removed.has(e.source) && !removed.has(e.target)));
                }}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onInit={setFlow}
                isValidConnection={(connection) => canConnect(connection, nodes, edges)}
                onConnect={(connection) => { if (canConnect(connection, nodes, edges)) setEdges((current) => addEdge(connection, current)); }}
            />
            </Box>
            <Validator product={product} nodes={nodes} edges={edges} isActive={isActive} units={units}
                saving={saving} canSave={canSave} onSave={save} error={saveError} result={result}
                onCloseResult={() => setResult(null)} editingProduct={editingProduct} hasUnsavedChanges={hasUnsavedChanges} revision={saveRevision} />
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
