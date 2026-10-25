import axios from "axios";
import type { Edge } from "@xyflow/react";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import type { Material, NodoProcesoDTO, Producto, ProductoManufacturingDTO, ProcesoFabricacionNodoDTO } from "../types.tsx";
import type { DesignerProduct } from "./CabeceraDatos.tsx";
import type { DesignerNode } from "./ProcessDesignerTab.tsx";

const endpoints = new EndPointsURL();
// Expand decimal exponents without converting exact server decimals to JS numbers.
function quantityText(value: string | number | undefined): string {
    let text = String(value ?? "");
    const exponent = /^(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(text);
    if (exponent && Math.abs(Number(exponent[3])) <= 24) {
        const digits = exponent[1] + (exponent[2] ?? "");
        const point = exponent[1].length + Number(exponent[3]);
        text = point <= 0 ? "0." + "0".repeat(-point) + digits
            : point >= digits.length ? digits + "0".repeat(point - digits.length)
            : digits.slice(0, point) + "." + digits.slice(point);
    }
    return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export type LoadMode = "all" | "graph" | "edit";
export type EditingProduct = Pick<ProductoManufacturingDTO, "productoId" | "tipoProducto" | "fotoUrl" | "status">;
type GraphCopy = { nodes: DesignerNode[]; edges: Edge[]; source: string; output: { quantity: string; unit: string } };
export type LoadedDraft = GraphCopy & (
    { mode: "all"; product: DesignerProduct } | { mode: "graph" }
    | { mode: "edit"; product: DesignerProduct; identity: EditingProduct }
);
export type ProductPage = { content: Producto[]; totalPages: number };
export type SearchQuery = { kind: "T" | "S"; searchTerm: string; tipoBusqueda: "NOMBRE" | "ID"; page: number };
export type Preview = GraphCopy & { dto: ProductoManufacturingDTO; product: DesignerProduct; hasSavedGraph: boolean };
function buildPreview(dto: ProductoManufacturingDTO, products: Map<string, Producto>): Preview {
    if (!["T", "S"].includes(dto.tipoProducto)) throw new Error("La referencia no es un terminado ni un semiterminado.");
    const saved = dto.procesoProduccionCompleto;
    const product: DesignerProduct = {
        productoId: dto.productoId, prefijoLote: dto.prefijoLote, nombre: dto.nombre,
        tipo_producto: dto.tipoProducto, tipoUnidades: dto.tipoUnidades, cantidadUnidad: String(dto.cantidadUnidad),
        unidadContenidoPorEnvase: dto.unidadContenidoPorEnvase ?? "",
        observaciones: dto.observaciones, costo: dto.costo == null ? undefined : String(dto.costo), ivaPercentual: dto.ivaPercentual,
        inventareable: dto.inventareable, requiereOrdenFabricacion: dto.tipoProducto === "T" || dto.requiereOrdenFabricacion,
        categoria: dto.categoriaId == null ? undefined : { categoriaId: dto.categoriaId, categoriaNombre: dto.categoriaNombre ?? "", categoriaDescripcion: "" },
        casePack: dto.casePack ? { ...dto.casePack, insumosEmpaque: dto.casePack.insumosEmpaque?.map(i => {
            const material = products.get(i.materialId);
            if (!material || material.tipo_producto !== "M" || !("tipoMaterial" in material) || material.tipoMaterial !== 2) {
                throw new Error("No se pudo resolver el material de empaque " + i.materialId + ".");
            }
            return {
                cantidad: i.cantidad, uom: i.uom?.trim() || material.tipoUnidades,
                material: { productoId: material.productoId, nombre: material.nombre, tipoUnidades: material.tipoUnidades, tipoMaterial: material.tipoMaterial },
            };
        }) } : undefined,
        rendimientoTeorico: String(saved?.rendimientoTeorico ?? 0),
        cantidadSalidaReceta: quantityText(saved?.cantidadSalidaReceta), unidadSalidaReceta: saved?.unidadSalidaReceta ?? "",
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
            data: { producto, cantidad: quantityText(input.cantidadReceta ?? input.cantidadRequerida), unidad: input.unidadReceta ?? producto.tipoUnidades } };
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
    return { dto, product, nodes, edges, hasSavedGraph, output: { quantity: product.cantidadSalidaReceta, unit: product.unidadSalidaReceta }, source: dto.productoId + " · " + dto.nombre };
}

export function copyPreview(preview: Preview, mode: Exclude<LoadMode, "edit">): LoadedDraft {
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
    const graph = { nodes, edges, source: preview.source, output: preview.output };
    return mode === "all" ? { ...graph, mode, product } : { ...graph, mode };
}

export function editPreview(preview: Preview): LoadedDraft {
    const { product, nodes, edges, source, output, dto } = structuredClone(preview);
    return { mode: "edit", product, nodes, edges, source, output,
        identity: { productoId: dto.productoId, tipoProducto: dto.tipoProducto, fotoUrl: dto.fotoUrl, status: dto.status } };
}


export async function buscarReferencias(query: SearchQuery, signal: AbortSignal): Promise<ProductPage> {
    const response = query.kind === "T"
        ? await axios.post<ProductPage>(endpoints.search_terminados_picker, { ...query, size: 10 }, { signal, withCredentials: true })
        : await axios.get<ProductPage>(endpoints.search_semi, { params: { search: query.searchTerm, tipoBusqueda: query.tipoBusqueda, page: query.page, size: 10 }, signal, withCredentials: true });
    return response.data;
}

export type PackagingPage = { content: Material[]; totalPages: number };
export async function buscarMaterialesEmpaque(query: { searchTerm: string; tipoBusqueda: "NOMBRE" | "ID"; page: number }, signal: AbortSignal): Promise<PackagingPage> {
    const { data } = await axios.get<PackagingPage>(endpoints.search_p4_receta_v2, {
        params: { ...query, clasificacion: "M", tipoMaterial: 2, size: 10 }, signal, withCredentials: true,
    });
    if (data.content.some(material => material.tipo_producto !== "M" || material.tipoMaterial !== 2)) {
        throw new Error("El catálogo devolvió materiales que no son de empaque.");
    }
    return data;
}

export async function cargarReferencia(id: string, signal: AbortSignal): Promise<Preview> {
    const { data: dto } = await axios.get<ProductoManufacturingDTO>(
        endpoints.get_producto_manufacturing.replace("{productoId}", encodeURIComponent(id)), { signal, withCredentials: true });
    if (dto.productoId !== id) throw new Error("La respuesta no corresponde a la referencia seleccionada.");
    const products = new Map<string, Producto>();
    const ids = [...new Set([
        ...dto.insumos.map(input => input.productoId),
        ...(dto.casePack?.insumosEmpaque ?? []).map(input => input.materialId),
    ])];
    for (let offset = 0; offset < ids.length; offset += 4) {
        const batch = await Promise.all(ids.slice(offset, offset + 4).map(async productId => {
            const { data } = await axios.get<Producto>(endpoints.update_producto.replace("{productoId}", encodeURIComponent(productId)), { signal, withCredentials: true });
            if (data.productoId !== productId) throw new Error("El catálogo devolvió un insumo diferente al solicitado.");
            return data;
        }));
        signal.throwIfAborted();
        batch.forEach(item => products.set(item.productoId, item));
    }
    return buildPreview(dto, products);
}

export function toDesignerPayload(product: DesignerProduct, nodes: DesignerNode[], edges: Edge[]): ProductoManufacturingDTO {
    return {
        productoId: product.productoId, nombre: product.nombre.trim(), tipoProducto: product.tipo_producto,
        tipoUnidades: product.tipoUnidades, cantidadUnidad: Number(product.cantidadUnidad), unidadContenidoPorEnvase: product.unidadContenidoPorEnvase,
        observaciones: product.observaciones, ivaPercentual: product.ivaPercentual,
        inventareable: product.inventareable, requiereOrdenFabricacion: product.requiereOrdenFabricacion,
        categoriaId: product.tipo_producto === "T" ? product.categoria?.categoriaId : undefined, prefijoLote: product.prefijoLote || undefined,
        insumos: nodes.flatMap(node => node.type === "material" || node.type === "semiterminado" ? [{
            productoId: node.data.producto.productoId, cantidadReceta: node.data.cantidad, unidadReceta: node.data.unidad,
            // The server derives the compatibility coefficient, never trusts this placeholder.
            cantidadRequerida: 0,
        }] : []),
        casePack: product.casePack ? { ...product.casePack, id: undefined, insumosEmpaque: product.casePack.insumosEmpaque?.map(i => ({ materialId: i.material.productoId, cantidad: i.cantidad, uom: i.uom })) } : undefined,
        procesoProduccionCompleto: {
            rendimientoTeorico: Number(product.rendimientoTeorico),
            cantidadSalidaReceta: product.cantidadSalidaReceta, unidadSalidaReceta: product.unidadSalidaReceta,
            nodes: nodes.map((node): ProcesoFabricacionNodoDTO => {
                const base = { frontendId: node.id, posicionX: node.position.x, posicionY: node.position.y };
                if (node.type === "target") return { ...base, nodeType: "TARGET" };
                if (node.type === "material" || node.type === "semiterminado") return { ...base, nodeType: "INSUMO", inputProductoId: node.data.producto.productoId };
                return { ...node.data.proceso, ...base, id: undefined, nodeType: "PROCESO" };
            }),
            edges: edges.map(edge => ({ frontendId: edge.id, sourceFrontendId: edge.source, targetFrontendId: edge.target })),
        },
    };
}

export type SavedProductSummary = {
    id: string; name: string; kind: string; quantity: string; unit: string;
    operation: "create" | "update"; product: DesignerProduct; identity: EditingProduct;
};

export async function guardarProducto(product: DesignerProduct, nodes: DesignerNode[], edges: Edge[], editing: EditingProduct | null): Promise<SavedProductSummary> {
    if (editing && (product.productoId !== editing.productoId || product.tipo_producto !== editing.tipoProducto)) {
        throw new Error("No se puede cambiar el código ni el tipo del producto que estás modificando.");
    }
    try {
        const payload = toDesignerPayload(product, nodes, edges);
        // Updating must preserve fields outside the designer, especially the existing photo.
        const { data } = editing
            ? await axios.put<ProductoManufacturingDTO>(
                endpoints.update_producto_manufacturing.replace("{productoId}", encodeURIComponent(editing.productoId)),
                { ...payload, fotoUrl: editing.fotoUrl, status: editing.status }, { withCredentials: true })
            : await axios.post<ProductoManufacturingDTO>(
                endpoints.create_producto_manufacturing + "/designer", payload, { withCredentials: true });
        if (data.productoId !== product.productoId || data.tipoProducto !== product.tipo_producto) {
            throw new Error("La respuesta del guardado no corresponde al producto. Conservamos el borrador; verifica el catálogo antes de reintentar.");
        }
        const savedProduct: DesignerProduct = {
            ...product, nombre: data.nombre, observaciones: data.observaciones,
            costo: data.costo == null ? undefined : String(data.costo), ivaPercentual: data.ivaPercentual,
            prefijoLote: data.prefijoLote, tipoUnidades: data.tipoUnidades,
            cantidadUnidad: String(data.cantidadUnidad), unidadContenidoPorEnvase: data.unidadContenidoPorEnvase ?? "",
            inventareable: data.inventareable, requiereOrdenFabricacion: data.tipoProducto === "T" || data.requiereOrdenFabricacion,
            rendimientoTeorico: String(data.procesoProduccionCompleto?.rendimientoTeorico ?? 0),
            cantidadSalidaReceta: quantityText(data.procesoProduccionCompleto?.cantidadSalidaReceta),
            unidadSalidaReceta: data.procesoProduccionCompleto?.unidadSalidaReceta ?? "",
        };
        return { id: data.productoId, name: data.nombre, kind: data.tipoProducto, operation: editing ? "update" : "create",
            quantity: savedProduct.cantidadSalidaReceta, unit: savedProduct.unidadSalidaReceta, product: savedProduct,
            identity: { productoId: data.productoId, tipoProducto: data.tipoProducto, fotoUrl: data.fotoUrl, status: data.status } };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const detail = error.response?.data?.error;
            if (error.response && [400, 409].includes(error.response.status) && typeof detail === "string") throw Object.assign(new Error(detail), { cause: error });
            if (error.response?.status === 403) throw Object.assign(new Error("No tienes permiso para guardar este producto."), { cause: error });
            if (error.response?.status === 401) throw Object.assign(new Error("La sesión ha expirado. Vuelve a iniciar sesión antes de guardar."), { cause: error });
            throw Object.assign(new Error(editing
                ? "No se pudo confirmar la actualización. Conservamos los cambios; verifica el producto en el catálogo antes de reintentar."
                : "No se pudo confirmar el guardado. Conservamos el borrador; verifica si el código ya existe en el catálogo antes de reintentar."), { cause: error });
        }
        throw error;
    }
}
