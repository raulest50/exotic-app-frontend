import { useEffect, useRef, useState } from "react";
import {
    Badge, Box, Button, Checkbox, Dialog, Field, Flex, Heading, Input, NativeSelect,
    Portal, SimpleGrid, Spinner, Stack, Table, Tabs, Text,
} from "@chakra-ui/react";
import { Background, Controls, ReactFlow, type Edge } from "@xyflow/react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { useColorMode } from "../../../components/ui/color-mode.tsx";
import { fromProductoManufacturingResponse } from "../manufacturingMapper.ts";
import type { NodoProcesoDTO, Producto, ProductoManufacturingDTO } from "../types.tsx";
import type { DesignerProduct } from "./CabeceraDatos.tsx";
import type { DesignerNode } from "./ProcessDesignerTab.tsx";
import MaterialNode from "./NodesEdges/MaterialNode.tsx";
import SemiterminadoNode from "./NodesEdges/SemiterminadoNode.tsx";
import ProcessNode from "./NodesEdges/ProcessNode.tsx";
import TerminadoNode from "./NodesEdges/TerminadoNode.tsx";

const endpoints = new EndPointsURL();
const nodeTypes = { material: MaterialNode, semiterminado: SemiterminadoNode, process: ProcessNode, target: TerminadoNode };
type LoadMode = "all" | "graph";
type GraphCopy = { nodes: DesignerNode[]; edges: Edge[]; source: string };
export type LoadedDraft = GraphCopy & (
    { mode: "all"; product: DesignerProduct } | { mode: "graph" }
);
type ProductPage = { content: Producto[]; totalPages: number };
type SearchQuery = { kind: "T" | "S"; searchTerm: string; tipoBusqueda: "NOMBRE" | "ID"; page: number };
type Preview = GraphCopy & { dto: ProductoManufacturingDTO; product: DesignerProduct; hasSavedGraph: boolean };
type PreviewState = {
    id: string; status: "loading" | "ready" | "error";
    dto?: ProductoManufacturingDTO; prepared?: Preview; message?: string;
};

function buildPreview(dto: ProductoManufacturingDTO, products: Map<string, Producto>): Preview {
    if (!["T", "S"].includes(dto.tipoProducto)) throw new Error("La referencia no es un terminado ni un semiterminado.");
    const source = fromProductoManufacturingResponse(dto);
    const saved = dto.procesoProduccionCompleto;
    const product: DesignerProduct = {
        productoId: source.productoId, prefijoLote: source.prefijoLote, nombre: source.nombre,
        tipo_producto: source.tipo_producto, tipoUnidades: source.tipoUnidades, cantidadUnidad: source.cantidadUnidad,
        observaciones: source.observaciones, costo: source.costo, ivaPercentual: source.ivaPercentual,
        inventareable: source.inventareable, requiereOrdenFabricacion: source.requiereOrdenFabricacion,
        categoria: source.categoria, casePack: source.casePack, rendimientoTeorico: String(saved?.rendimientoTeorico ?? 0),
    };
    const ids = new Set<string>();
    const includedInputs = new Set<string>();
    const inputNode = (productId: string, id: string, position: { x: number; y: number }): DesignerNode => {
        const input = dto.insumos.find((i) => i.productoId === productId);
        const producto = products.get(productId);
        if (!input || !producto || !["M", "S"].includes(producto.tipo_producto)) {
            throw new Error("No se pudo resolver el insumo " + productId + ".");
        }
        if (includedInputs.has(productId)) throw new Error("La referencia repite un insumo en el grafo.");
        includedInputs.add(productId);
        return { id, position, type: producto.tipo_producto === "S" ? "semiterminado" : "material",
            data: { producto, cantidad: String(input.cantidadRequerida) } };
    };
    const hasSavedGraph = !!saved?.nodes.length;
    let nodes: DesignerNode[];
    let edges: Edge[];
    if (hasSavedGraph && saved) {
        if (saved.nodes.filter((n) => n.nodeType === "TARGET").length !== 1) {
            throw new Error("El grafo de la referencia debe tener un único destino.");
        }
        nodes = saved.nodes.map((node) => {
            if (!node.frontendId || ids.has(node.frontendId)) throw new Error("El grafo contiene identificadores de nodo vacíos o repetidos.");
            if (!Number.isFinite(node.posicionX) || !Number.isFinite(node.posicionY)) throw new Error("El grafo contiene posiciones inválidas.");
            ids.add(node.frontendId);
            const base = { id: node.frontendId, position: { x: node.posicionX, y: node.posicionY } };
            if (node.nodeType === "TARGET") return { ...base, type: "target", deletable: false, data: { producto: product } };
            if (node.nodeType === "INSUMO") return inputNode(node.inputProductoId, base.id, base.position);
            if (node.nodeType !== "PROCESO") throw new Error("El grafo contiene un tipo de nodo no reconocido.");
            const proceso: NodoProcesoDTO = {
                nodeType: "PROCESO", frontendId: base.id, posicionX: base.position.x, posicionY: base.position.y,
                label: node.label, procesoId: node.procesoId, procesoNombre: node.procesoNombre,
                areaOperativaId: node.areaOperativaId, areaOperativaNombre: node.areaOperativaNombre,
                setUpTime: node.setUpTime, model: node.model, constantSeconds: node.constantSeconds,
                throughputUnitsPerSec: node.throughputUnitsPerSec, secondsPerUnit: node.secondsPerUnit,
                secondsPerBatch: node.secondsPerBatch, batchSize: node.batchSize,
            };
            return { ...base, type: "process", data: { proceso } };
        });
        if (includedInputs.size !== dto.insumos.length) throw new Error("La receta y el grafo tienen insumos diferentes. No se cargará una copia parcial.");
        const edgeIds = new Set<string>();
        edges = saved.edges.map((edge) => {
            if (!ids.has(edge.sourceFrontendId) || !ids.has(edge.targetFrontendId)) throw new Error("Hay conexiones a nodos inexistentes.");
            if (!edge.frontendId || edgeIds.has(edge.frontendId)) throw new Error("Hay identificadores de conexión vacíos o repetidos.");
            edgeIds.add(edge.frontendId);
            return { id: edge.frontendId, source: edge.sourceFrontendId, target: edge.targetFrontendId, type: "smoothstep" };
        });
    } else {
        if (saved?.edges.length) throw new Error("La referencia tiene conexiones pero no tiene nodos.");
        // A product without a saved graph can start a full draft from its recipe, without inventing connections.
        nodes = dto.insumos.map((input, index) => inputNode(input.productoId, "input-" + index, { x: 0, y: index * 250 }));
        nodes.push({ id: "target", type: "target", position: { x: 750, y: 180 }, deletable: false, data: { producto: product } });
        edges = [];
    }
    return { dto, product, nodes, edges, hasSavedGraph, source: dto.productoId + " · " + dto.nombre };
}

function copyPreview(preview: Preview, mode: LoadMode): LoadedDraft {
    const product = structuredClone(preview.product);
    product.productoId = "";
    product.prefijoLote = "";
    if (product.casePack) {
        delete product.casePack.id;
        delete product.casePack.ean14;
        product.casePack.insumosEmpaque?.forEach((item) => { delete item.id; });
    }
    const ids = new Map(preview.nodes.map((node) => [node.id, crypto.randomUUID()]));
    const nodes = preview.nodes.map((original): DesignerNode => {
        const node = structuredClone(original);
        node.id = ids.get(original.id)!;
        if (node.type === "process") node.data.proceso.frontendId = node.id;
        if (node.type === "target") node.data = { producto: product };
        return node;
    });
    const edges = preview.edges.map((edge) => ({
        ...edge, id: crypto.randomUUID(), source: ids.get(edge.source)!, target: ids.get(edge.target)!, animated: true,
    }));
    const graph = { nodes, edges, source: preview.source };
    return mode === "all" ? { ...graph, mode, product } : { ...graph, mode };
}

function SourceDetails({ dto }: { dto: ProductoManufacturingDTO }) {
    const yesNo = (value: boolean | undefined) => value == null ? "No informado" : value ? "Sí" : "No";
    const fields: [string, string | number | undefined][] = [
        ["Código", dto.productoId], ["Nombre", dto.nombre],
        ["Tipo", dto.tipoProducto === "S" ? "Semiterminado" : "Terminado"],
        ["Contenido por unidad", String(dto.cantidadUnidad) + " " + dto.tipoUnidades],
        ["Categoría", dto.categoriaNombre ?? dto.categoriaId], ["Prefijo de lote", dto.prefijoLote],
        ["IVA (%)", dto.ivaPercentual], ["Costo", dto.costo],
        ["Inventariable", yesNo(dto.inventareable)], ["Requiere orden de fabricación", yesNo(dto.requiereOrdenFabricacion)],
        ["Rendimiento teórico", dto.procesoProduccionCompleto?.rendimientoTeorico],
    ];
    return <Stack gap="4">
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
            {fields.map(([label, value]) => <Box key={label}>
                <Text fontSize="xs" color="fg.muted">{label}</Text>
                <Text fontSize="sm" overflowWrap="anywhere">{value == null || value === "" ? "—" : value}</Text>
            </Box>)}
        </SimpleGrid>
        <Box><Text fontSize="xs" color="fg.muted">Observaciones</Text>
            <Text fontSize="sm" whiteSpace="pre-wrap" overflowWrap="anywhere">{dto.observaciones || "Sin observaciones"}</Text>
        </Box>
        {dto.casePack && <Box borderTopWidth="1px" pt="3">
            <Heading size="sm" mb="2">Empaque</Heading>
            <Text fontSize="sm">{dto.casePack.unitsPerCase} unidades por caja · EAN14: {dto.casePack.ean14 || "—"}</Text>
            <Text fontSize="sm">
                Dimensiones (cm): {dto.casePack.largoCm ?? "—"} × {dto.casePack.anchoCm ?? "—"} × {dto.casePack.altoCm ?? "—"}.
                Peso bruto (kg): {dto.casePack.grossWeightKg ?? "—"}. Predeterminado para despacho: {yesNo(dto.casePack.defaultForShipping)}.
            </Text>
            <Stack gap="1" mt="2">
                {dto.casePack.insumosEmpaque?.map((item, index) => <Text key={item.materialId + "-" + index} fontSize="sm">
                    {item.materialId} · {item.materialNombre || item.materialId}: {item.cantidad} {item.uom}
                </Text>)}
            </Stack>
        </Box>}
    </Stack>;
}

function SourcePreview({ state }: { state: PreviewState }) {
    const { colorMode } = useColorMode();
    const { dto, prepared } = state;
    if (!dto) return null;
    return <Stack gap="3" minW="0">
        <Flex gap="2" align="center" flexWrap="wrap">
            <Heading size="md" overflowWrap="anywhere">{dto.nombre}</Heading>
            <Badge colorPalette="teal">Solo lectura</Badge>
        </Flex>
        <Tabs.Root defaultValue="data" lazyMount unmountOnExit>
            <Tabs.List>
                <Tabs.Trigger value="data">Datos</Tabs.Trigger>
                <Tabs.Trigger value="graph">Grafo</Tabs.Trigger>
                <Tabs.Trigger value="inputs">Insumos ({dto.insumos.length})</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="data"><SourceDetails dto={dto} /></Tabs.Content>
            <Tabs.Content value="graph">
                {prepared ? prepared.hasSavedGraph ? <>
                    <Text fontSize="xs" color="fg.muted" mb="2">{prepared.nodes.length} nodos · {prepared.edges.length} conexiones. Puedes desplazar y ampliar la vista.</Text>
                    <Box h={{ base: "22rem", lg: "28rem" }} borderWidth="1px" rounded="md" overflow="hidden">
                        <ReactFlow<DesignerNode>
                            key={dto.productoId} nodes={prepared.nodes} edges={prepared.edges} nodeTypes={nodeTypes}
                            nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
                            nodesFocusable={false} edgesFocusable={false} edgesReconnectable={false}
                            deleteKeyCode={null} zoomOnScroll={false} preventScrolling={false}
                            fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }} minZoom={0.05} maxZoom={2}
                            colorMode={colorMode} aria-label="Previsualización del grafo de la referencia">
                            <Background /><Controls showInteractive={false} />
                        </ReactFlow>
                    </Box>
                </> : <Text>Esta referencia no tiene un grafo guardado. La carga completa incluirá sus insumos y un destino, sin conexiones.</Text>
                    : <Text color="fg.muted">El grafo estará disponible cuando termine de cargar la referencia.</Text>}
            </Tabs.Content>
            <Tabs.Content value="inputs">
                <Box overflowX="auto">
                    <Table.Root size="sm">
                        <Table.Header><Table.Row>
                            <Table.ColumnHeader>Insumo</Table.ColumnHeader>
                            <Table.ColumnHeader>Cantidad requerida</Table.ColumnHeader>
                            <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                        </Table.Row></Table.Header>
                        <Table.Body>{dto.insumos.map((input, index) => <Table.Row key={input.productoId + "-" + index}>
                            <Table.Cell>{input.productoId} · {input.productoNombre || input.productoId}</Table.Cell>
                            <Table.Cell>{input.cantidadRequerida}</Table.Cell><Table.Cell>{input.tipoUnidades || "—"}</Table.Cell>
                        </Table.Row>)}</Table.Body>
                    </Table.Root>
                    {dto.insumos.length === 0 && <Text fontSize="sm" mt="3">La referencia no tiene insumos.</Text>}
                </Box>
            </Tabs.Content>
        </Tabs.Root>
    </Stack>;
}

export default function LoadTerminadoDialog({ hasDraft, onClose, onLoad }: {
    hasDraft: boolean; onClose: () => void; onLoad: (draft: LoadedDraft) => void;
}) {
    const [search, setSearch] = useState("");
    const [by, setBy] = useState<"NOMBRE" | "ID">("NOMBRE");
    const [query, setQuery] = useState<SearchQuery>({ kind: "T", searchTerm: "", tipoBusqueda: "NOMBRE", page: 0 });
    const [result, setResult] = useState<{ key: string; data?: ProductPage; error?: string } | null>(null);
    const [selected, setSelected] = useState("");
    const [preview, setPreview] = useState<PreviewState | null>(null);
    const [revision, setRevision] = useState(0);
    const [mode, setMode] = useState<LoadMode>("all");
    const [replace, setReplace] = useState(false);
    const [loadError, setLoadError] = useState("");
    const previewRequest = useRef<AbortController | null>(null);
    const loadingCopy = useRef(false);
    const queryKey = JSON.stringify(query);
    const currentResult = result?.key === queryKey ? result : null;
    const listLoading = !currentResult;
    const currentPreview = preview?.id === selected ? preview : null;
    const ready = currentPreview?.status === "ready" ? currentPreview.prepared : undefined;

    useEffect(() => {
        const controller = new AbortController();
        const request = query.kind === "T"
            ? axios.post<ProductPage>(endpoints.search_terminados_picker,
                { searchTerm: query.searchTerm, tipoBusqueda: query.tipoBusqueda, page: query.page, size: 10 },
                { signal: controller.signal })
            : axios.get<ProductPage>(endpoints.search_semi,
                { params: { search: query.searchTerm, tipoBusqueda: query.tipoBusqueda, page: query.page, size: 10 }, signal: controller.signal });
        request.then(({ data }) => {
            if (!controller.signal.aborted) setResult({ key: queryKey, data });
        }).catch(() => {
            if (!controller.signal.aborted) setResult({ key: queryKey, error: "No se pudo consultar el catálogo. Intenta nuevamente." });
        });
        return () => controller.abort();
    }, [query, queryKey]);

    useEffect(() => {
        if (!selected) return;
        const controller = new AbortController();
        previewRequest.current = controller;
        setPreview({ id: selected, status: "loading", message: "Cargando datos y grafo…" });
        let dto: ProductoManufacturingDTO | undefined;
        async function fetchPreview() {
            try {
                const response = await axios.get<ProductoManufacturingDTO>(
                    endpoints.get_producto_manufacturing.replace("{productoId}", encodeURIComponent(selected)),
                    { signal: controller.signal });
                dto = response.data;
                if (dto.productoId !== selected) throw new Error("La respuesta no corresponde a la referencia seleccionada.");
                if (controller.signal.aborted) return;
                setPreview({ id: selected, status: "loading", dto, message: "Cargando insumos…" });
                const products = new Map<string, Producto>();
                const inputIds = [...new Set(dto.insumos.map((input) => input.productoId))];
                for (let offset = 0; offset < inputIds.length; offset += 4) {
                    const batch = await Promise.all(inputIds.slice(offset, offset + 4).map(async (id) => {
                        const response = await axios.get<Producto>(
                            endpoints.update_producto.replace("{productoId}", encodeURIComponent(id)), { signal: controller.signal });
                        if (response.data.productoId !== id) throw new Error("El catálogo devolvió un insumo diferente al solicitado.");
                        return response.data;
                    }));
                    if (controller.signal.aborted) return;
                    batch.forEach((item) => products.set(item.productoId, item));
                }
                const prepared = buildPreview(dto, products);
                if (!controller.signal.aborted) setPreview({ id: selected, status: "ready", dto, prepared });
            } catch (cause) {
                if (!controller.signal.aborted) {
                    setPreview({ id: selected, status: "error", dto,
                        message: axios.isAxiosError(cause)
                            ? "No se pudo cargar toda la referencia. Tu borrador sigue intacto."
                            : cause instanceof Error ? cause.message : "No se pudo preparar la referencia." });
                }
            }
        }
        void fetchPreview();
        return () => controller.abort();
    }, [selected, revision]);

    function changeQuery(next: SearchQuery) {
        previewRequest.current?.abort();
        setSelected(""); setPreview(null); setReplace(false); setLoadError("");
        setResult(null); setQuery(next);
    }
    function select(id: string) {
        if (id === selected) return;
        previewRequest.current?.abort();
        setSelected(id); setPreview(null); setReplace(false); setLoadError("");
    }
    const disabledReason = !selected ? "Selecciona una referencia de la lista."
        : !currentPreview || currentPreview.status === "loading" ? "Espera a que termine de cargar la previsualización."
        : !ready ? "Resuelve el error de carga antes de continuar."
        : mode === "graph" && !ready.hasSavedGraph ? "La referencia no tiene grafo guardado. Puedes usar la carga completa."
        : hasDraft && !replace ? "Marca la confirmación de reemplazo para habilitar la carga." : "";

    function load() {
        if (disabledReason || !ready || loadingCopy.current) return;
        loadingCopy.current = true;
        try {
            onLoad(copyPreview(ready, mode));
        } catch (cause) {
            setLoadError(cause instanceof Error ? cause.message : "No se pudo preparar la copia.");
            loadingCopy.current = false;
        }
    }

    return <Dialog.Root open size="cover" scrollBehavior="inside" onOpenChange={(event) => { if (!event.open) onClose(); }}>
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content maxW="90rem" h="calc(100dvh - 3rem)">
            <Dialog.Header>
                <Dialog.Title>Cargar una referencia</Dialog.Title>
                <Dialog.Description>Busca un terminado o semiterminado y revisa sus datos antes de cargar una copia.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body minH="0">
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap="5">
                    <Stack gap="3" minW="0">
                        <Field.Root><Field.Label>Tipo de producto</Field.Label>
                            <NativeSelect.Root size="sm">
                                <NativeSelect.Field value={query.kind} onChange={(event) => changeQuery({ ...query, kind: event.target.value as "T" | "S", page: 0 })}>
                                    <option value="T">Terminados</option><option value="S">Semiterminados</option>
                                </NativeSelect.Field><NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field.Root>
                        <form onSubmit={(event) => {
                            event.preventDefault();
                            changeQuery({ ...query, searchTerm: by === "ID" ? search.trim().toUpperCase() : search.trim(), tipoBusqueda: by, page: 0 });
                        }}>
                            <Stack gap="2">
                                <Field.Root><Field.Label>Buscar por</Field.Label>
                                    <NativeSelect.Root size="sm">
                                        <NativeSelect.Field value={by} onChange={(event) => setBy(event.target.value as "NOMBRE" | "ID")}>
                                            <option value="NOMBRE">Nombre</option><option value="ID">Código exacto</option>
                                        </NativeSelect.Field><NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                </Field.Root>
                                <Flex gap="2">
                                    <Input aria-label="Buscar referencia" value={search} onChange={(event) => setSearch(event.target.value)} />
                                    <Button type="submit" loading={listLoading}>Buscar</Button>
                                </Flex>
                            </Stack>
                        </form>
                        <Stack maxH={{ base: "18rem", lg: "25rem" }} overflowY="auto" gap="1" aria-busy={listLoading}>
                            {listLoading ? <Flex role="status" gap="2" align="center"><Spinner size="sm" /><Text>Buscando…</Text></Flex>
                                : currentResult?.error ? <Text role="alert" color="fg.error">{currentResult.error}</Text>
                                : currentResult?.data?.content.length === 0 ? <Text>Sin resultados.</Text>
                                : currentResult?.data?.content.map((item) => <Button key={item.productoId}
                                    variant={selected === item.productoId ? "subtle" : "outline"} colorPalette="teal"
                                    justifyContent="start" flexShrink="0" h="auto" py="2" whiteSpace="normal" textAlign="left"
                                    aria-pressed={selected === item.productoId} onClick={() => select(item.productoId)}>
                                    {item.productoId} · {item.nombre}
                                </Button>)}
                        </Stack>
                        {!!currentResult?.data && currentResult.data.totalPages > 1 && <Flex justify="space-between" align="center">
                            <Button size="sm" disabled={query.page === 0} onClick={() => changeQuery({ ...query, page: query.page - 1 })}>Anterior</Button>
                            <Text fontSize="sm">{query.page + 1} / {currentResult.data.totalPages}</Text>
                            <Button size="sm" disabled={query.page + 1 >= currentResult.data.totalPages} onClick={() => changeQuery({ ...query, page: query.page + 1 })}>Siguiente</Button>
                        </Flex>}
                    </Stack>
                    <Box minW="0" borderWidth="1px" rounded="md" p="3">
                        {!selected && <Text color="fg.muted">Selecciona una referencia para ver sus datos, grafo e insumos.</Text>}
                        {selected && (!currentPreview || currentPreview.status === "loading") && <Flex role="status" gap="2" mb="3" align="center">
                            <Spinner size="sm" /><Text fontSize="sm">{currentPreview?.message || "Cargando previsualización…"}</Text>
                        </Flex>}
                        {currentPreview?.status === "error" && <Stack mb="3">
                            <Text role="alert" color="fg.error">{currentPreview.message}</Text>
                            <Button size="sm" variant="outline" onClick={() => {
                                previewRequest.current?.abort(); setPreview(null); setReplace(false); setRevision((value) => value + 1);
                            }}>Reintentar carga</Button>
                        </Stack>}
                        {currentPreview?.dto && <SourcePreview key={selected} state={currentPreview} />}
                    </Box>
                </SimpleGrid>
            </Dialog.Body>
            <Dialog.Footer flexDirection="column" alignItems="stretch" gap="2" borderTopWidth="1px">
                <Field.Root>
                    <Field.Label>Qué cargar</Field.Label>
                    <NativeSelect.Root size="sm">
                        <NativeSelect.Field value={mode} onChange={(event) => { setMode(event.target.value as LoadMode); setReplace(false); setLoadError(""); }}>
                            <option value="all">Datos completos, grafo e insumos</option>
                            <option value="graph">Solo grafo e insumos; conservar cabecera</option>
                        </NativeSelect.Field><NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Field.HelperText>{mode === "all"
                        ? "El código, prefijo de lote y EAN14 quedarán vacíos para la nueva referencia."
                        : "Conserva todos los datos actuales de la cabecera, incluido rendimiento y empaque. El destino del grafo usará el nombre y tipo actuales."}</Field.HelperText>
                </Field.Root>
                {hasDraft && <Checkbox.Root checked={replace} onCheckedChange={(event) => setReplace(event.checked === true)}>
                    <Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                    <Checkbox.Label>{mode === "all" ? "Confirmo reemplazar los datos y el grafo del borrador" : "Confirmo reemplazar solo el grafo y los insumos del borrador"}</Checkbox.Label>
                </Checkbox.Root>}
                {loadError && <Text role="alert" color="fg.error" fontSize="sm">{loadError}</Text>}
                <Flex justify="space-between" align="center" gap="3" flexWrap="wrap">
                    <Text fontSize="xs" color="fg.muted" role="status" flex="1">{disabledReason || "Se cargará un borrador. La referencia original permanece intacta."}</Text>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button colorPalette="teal" disabled={!!disabledReason} onClick={load}>Cargar copia</Button>
                </Flex>
            </Dialog.Footer>
        </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>;
}
