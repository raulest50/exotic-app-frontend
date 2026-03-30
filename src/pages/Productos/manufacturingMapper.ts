import { Edge, Node } from "@xyflow/react";
import {
    CasePack,
    NodoInsumoDTO,
    NodoProcesoDTO,
    NodoTargetDTO,
    ProductoManufacturingDTO,
    ProductoSemiter,
    ProcesoFabricacionEdgeDTO,
    ProcesoFabricacionNodoDTO,
    ProcesoProduccionCompleto,
    TimeModelType,
    TIPOS_PRODUCTOS,
} from "./types.tsx";

type MaterialNodeData = {
    label: string;
    tipo_unidad: string;
    cantidad: number;
    productoId: string;
    insumoId?: number;
};

type ProcessNodeData = {
    label: string;
    nombreProceso: string;
    procesoId?: number;
    areaOperativaId?: number;
    areaOperativaNombre?: string;
    setupTime?: string;
    model?: string;
    constantSeconds?: number;
    throughputUnitsPerSec?: number;
    secondsPerUnit?: number;
    secondsPerBatch?: number;
    batchSize?: number;
};

type TargetNodeData = {
    label: string;
    tipo_unidad: string;
    tipo_producto: string;
};

const DEFAULT_TARGET_FRONTEND_ID = "tg";

const isInsumoNode = (node: ProcesoFabricacionNodoDTO): node is NodoInsumoDTO => node.nodeType === "INSUMO";
const isProcesoNode = (node: ProcesoFabricacionNodoDTO): node is NodoProcesoDTO => node.nodeType === "PROCESO";
const isTargetNode = (node: ProcesoFabricacionNodoDTO): node is NodoTargetDTO => node.nodeType === "TARGET";

const toNumber = (value: string | number | undefined): number => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const materialNodeIdForProduct = (productoId: string) => `ins-${productoId}`;

const processNodeId = () =>
    `proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const edgeId = (sourceId: string, targetId: string) =>
    `edge-${sourceId}-${targetId}-${Math.random().toString(36).slice(2, 8)}`;

const buildMaterialNodeData = (producto: ProductoSemiter, node?: NodoInsumoDTO): MaterialNodeData => {
    const insumo = producto.insumos?.find((item) => item.producto.productoId === node?.inputProductoId);
    return {
        label: node?.label ?? insumo?.producto.nombre ?? node?.inputProductoId ?? "",
        tipo_unidad: insumo?.producto.tipoUnidades ?? "",
        cantidad: insumo?.cantidadRequerida ?? 0,
        productoId: insumo?.producto.productoId ?? node?.inputProductoId ?? "",
        insumoId: node?.insumoId,
    };
};

export const createEmptyProcesoProduccionCompleto = (): ProcesoProduccionCompleto => ({
    rendimientoTeorico: 0,
    nodes: [],
    edges: [],
});

export const buildFlowFromProceso = (producto: ProductoSemiter): { nodes: Node[]; edges: Edge[] } => {
    const proceso = producto.procesoProduccionCompleto;
    const savedNodes = proceso?.nodes ?? [];
    const savedEdges = proceso?.edges ?? [];

    const savedInsumoNodes = new Map(
        savedNodes.filter(isInsumoNode).map((node) => [node.inputProductoId, node] as const)
    );
    const materialNodes: Node[] = (producto.insumos ?? []).map((insumo, index) => {
        const savedNode = savedInsumoNodes.get(insumo.producto.productoId);
        const nodeId = savedNode?.frontendId ?? materialNodeIdForProduct(insumo.producto.productoId);
        return {
            id: nodeId,
            type: "materialPrimarioNode",
            position: {
                x: savedNode?.posicionX ?? 50,
                y: savedNode?.posicionY ?? index * 170,
            },
            data: {
                ...buildMaterialNodeData(producto, savedNode),
                label: savedNode?.label ?? insumo.producto.nombre,
                tipo_unidad: insumo.producto.tipoUnidades,
                cantidad: insumo.cantidadRequerida,
                productoId: insumo.producto.productoId,
            } satisfies MaterialNodeData,
        };
    });

    const processNodes: Node[] = savedNodes
        .filter(isProcesoNode)
        .map((node) => ({
            id: node.frontendId,
            type: "procesoNode",
            position: { x: node.posicionX, y: node.posicionY },
            data: {
                label: node.label ?? node.procesoNombre ?? "Proceso",
                nombreProceso: node.procesoNombre ?? node.label ?? "Proceso",
                procesoId: node.procesoId,
                areaOperativaId: node.areaOperativaId,
                areaOperativaNombre: node.areaOperativaNombre,
                setupTime: node.setUpTime != null ? String(node.setUpTime) : "",
                model: node.model ? String(node.model) : undefined,
                constantSeconds: node.constantSeconds,
                throughputUnitsPerSec: node.throughputUnitsPerSec,
                secondsPerUnit: node.secondsPerUnit,
                secondsPerBatch: node.secondsPerBatch,
                batchSize: node.batchSize,
            } satisfies ProcessNodeData,
        }));

    const targetNode = savedNodes.find(isTargetNode);
    const target: Node = {
        id: targetNode?.frontendId ?? DEFAULT_TARGET_FRONTEND_ID,
        type: "targetNode",
        position: {
            x: targetNode?.posicionX ?? 650,
            y: targetNode?.posicionY ?? 210,
        },
        data: {
            label: targetNode?.label ?? producto.nombre,
            tipo_unidad: producto.tipoUnidades,
            tipo_producto: producto.tipo_producto,
        } satisfies TargetNodeData,
    };

    const validNodeIds = new Set([...materialNodes, ...processNodes, target].map((node) => node.id));
    const edges: Edge[] = savedEdges
        .filter((edge) => validNodeIds.has(edge.sourceFrontendId) && validNodeIds.has(edge.targetFrontendId))
        .map((edge) => ({
            id: edge.frontendId,
            source: edge.sourceFrontendId,
            target: edge.targetFrontendId,
            animated: true,
        }));

    return { nodes: [...materialNodes, ...processNodes, target], edges };
};

export const buildProcesoFromFlow = (nodes: Node[], edges: Edge[]): ProcesoProduccionCompleto => {
    const dtoNodes: ProcesoFabricacionNodoDTO[] = nodes.map((node) => {
        if (node.type === "materialPrimarioNode") {
            const data = node.data as MaterialNodeData;
            return {
                nodeType: "INSUMO",
                frontendId: node.id,
                posicionX: node.position.x,
                posicionY: node.position.y,
                label: data.label,
                insumoId: data.insumoId,
                inputProductoId: data.productoId,
            } satisfies NodoInsumoDTO;
        }

        if (node.type === "procesoNode") {
            const data = node.data as ProcessNodeData;
            return {
                nodeType: "PROCESO",
                frontendId: node.id,
                posicionX: node.position.x,
                posicionY: node.position.y,
                label: data.label,
                procesoId: data.procesoId ?? 0,
                procesoNombre: data.nombreProceso,
                areaOperativaId: data.areaOperativaId ?? 0,
                areaOperativaNombre: data.areaOperativaNombre,
                setUpTime: toNumber(data.setupTime),
                model: data.model,
                constantSeconds: data.constantSeconds,
                throughputUnitsPerSec: data.throughputUnitsPerSec,
                secondsPerUnit: data.secondsPerUnit,
                secondsPerBatch: data.secondsPerBatch,
                batchSize: data.batchSize,
            } satisfies NodoProcesoDTO;
        }

        const data = node.data as TargetNodeData;
        return {
            nodeType: "TARGET",
            frontendId: node.id,
            posicionX: node.position.x,
            posicionY: node.position.y,
            label: data.label,
        } satisfies NodoTargetDTO;
    });

    const dtoEdges: ProcesoFabricacionEdgeDTO[] = edges.map((edge) => ({
        frontendId: edge.id ?? edgeId(edge.source, edge.target),
        sourceFrontendId: edge.source,
        targetFrontendId: edge.target,
    }));

    return {
        rendimientoTeorico: 0,
        nodes: dtoNodes,
        edges: dtoEdges,
    };
};

export const toProductoManufacturingPayload = (producto: ProductoSemiter): ProductoManufacturingDTO => ({
    productoId: producto.productoId,
    tipoProducto: producto.tipo_producto,
    nombre: producto.nombre,
    observaciones: producto.observaciones,
    costo: toNumber(producto.costo),
    ivaPercentual: producto.ivaPercentual ?? 0,
    tipoUnidades: producto.tipoUnidades,
    cantidadUnidad: toNumber(producto.cantidadUnidad),
    inventareable: producto.inventareable,
    categoriaId: producto.categoria?.categoriaId,
    categoriaNombre: producto.categoria?.categoriaNombre,
    prefijoLote: producto.prefijoLote,
    insumos: (producto.insumos ?? []).map((insumo) => ({
        productoId: insumo.producto.productoId,
        productoNombre: insumo.producto.nombre,
        costoUnitario: insumo.producto.costo,
        tipoUnidades: insumo.producto.tipoUnidades,
        cantidadRequerida: insumo.cantidadRequerida,
        subtotal: insumo.subtotal,
    })),
    casePack: producto.casePack
        ? {
              id: producto.casePack.id,
              unitsPerCase: producto.casePack.unitsPerCase,
              ean14: producto.casePack.ean14,
              largoCm: producto.casePack.largoCm,
              anchoCm: producto.casePack.anchoCm,
              altoCm: producto.casePack.altoCm,
              grossWeightKg: producto.casePack.grossWeightKg,
              defaultForShipping: producto.casePack.defaultForShipping,
              insumosEmpaque: (producto.casePack.insumosEmpaque ?? []).map((insumoEmpaque) => ({
                  id: insumoEmpaque.id,
                  materialId: insumoEmpaque.material.productoId,
                  materialNombre: insumoEmpaque.material.nombre,
                  cantidad: insumoEmpaque.cantidad,
                  uom: insumoEmpaque.uom ?? insumoEmpaque.material.tipoUnidades,
              })),
          }
        : undefined,
    procesoProduccionCompleto: producto.procesoProduccionCompleto,
});

export const fromProductoManufacturingResponse = (dto: ProductoManufacturingDTO): ProductoSemiter => {
    const casePack: CasePack | undefined = dto.casePack
        ? {
              id: dto.casePack.id,
              unitsPerCase: dto.casePack.unitsPerCase,
              ean14: dto.casePack.ean14,
              largoCm: dto.casePack.largoCm,
              anchoCm: dto.casePack.anchoCm,
              altoCm: dto.casePack.altoCm,
              grossWeightKg: dto.casePack.grossWeightKg,
              defaultForShipping: dto.casePack.defaultForShipping,
              insumosEmpaque: (dto.casePack.insumosEmpaque ?? []).map((insumoEmpaque) => ({
                  id: insumoEmpaque.id,
                  cantidad: insumoEmpaque.cantidad,
                  uom: insumoEmpaque.uom,
                  material: {
                      productoId: insumoEmpaque.materialId,
                      nombre: insumoEmpaque.materialNombre ?? insumoEmpaque.materialId,
                      tipoUnidades: insumoEmpaque.uom ?? "",
                      tipoMaterial: 2,
                  },
              })),
          }
        : undefined;

    return {
        productoId: dto.productoId,
        nombre: dto.nombre,
        observaciones: dto.observaciones,
        costo: dto.costo != null ? String(dto.costo) : undefined,
        insumos: (dto.insumos ?? []).map((insumo) => ({
            cantidadRequerida: insumo.cantidadRequerida,
            subtotal: insumo.subtotal,
            producto: {
                productoId: insumo.productoId,
                tipo_producto: "",
                nombre: insumo.productoNombre ?? insumo.productoId,
                costo: insumo.costoUnitario ?? 0,
                tipoUnidades: insumo.tipoUnidades ?? "",
                cantidadUnidad: "0",
            },
        })),
        tipoUnidades: dto.tipoUnidades,
        cantidadUnidad: String(dto.cantidadUnidad ?? 0),
        tipo_producto: dto.tipoProducto,
        procesoProduccionCompleto: dto.procesoProduccionCompleto,
        inventareable: dto.inventareable,
        categoria: dto.categoriaId
            ? {
                  categoriaId: dto.categoriaId,
                  categoriaNombre: dto.categoriaNombre ?? "",
                  categoriaDescripcion: "",
              }
            : undefined,
        casePack,
        prefijoLote: dto.prefijoLote,
        ivaPercentual: dto.ivaPercentual,
    };
};

export const getProcessNodeSummaries = (proceso?: ProcesoProduccionCompleto): string[] =>
    (proceso?.nodes ?? [])
        .filter(isProcesoNode)
        .map((node) => node.procesoNombre ?? node.label ?? `Proceso ${node.procesoId}`);

export const getTargetLabel = (producto: ProductoSemiter): string =>
    producto.tipo_producto === TIPOS_PRODUCTOS.terminado ? "Terminado" : "Semiterminado";

export const getProcessNodeAreaName = (nodeData: { areaOperativaNombre?: string }): string | null =>
    nodeData.areaOperativaNombre?.trim() ? nodeData.areaOperativaNombre : null;

export const buildNewProcessNode = (proceso: {
    procesoId?: number;
    nombre: string;
    setUpTime?: number;
    model?: TimeModelType;
    constantSeconds?: number;
    throughputUnitsPerSec?: number;
    secondsPerUnit?: number;
    secondsPerBatch?: number;
    batchSize?: number;
}, y: number): Node => ({
    id: processNodeId(),
    type: "procesoNode",
    position: { x: 240, y },
    data: {
        label: proceso.nombre,
        nombreProceso: proceso.nombre,
        procesoId: proceso.procesoId,
        setupTime: proceso.setUpTime != null ? String(proceso.setUpTime) : "",
        model: proceso.model,
        constantSeconds: proceso.constantSeconds,
        throughputUnitsPerSec: proceso.throughputUnitsPerSec,
        secondsPerUnit: proceso.secondsPerUnit,
        secondsPerBatch: proceso.secondsPerBatch,
        batchSize: proceso.batchSize,
    } satisfies ProcessNodeData,
});

export const attachAreaToProcessNode = (node: Node, area: { areaId: number; nombre: string }): Node => {
    if (node.type !== "procesoNode") {
        return node;
    }
    const data = node.data as ProcessNodeData;
    return {
        ...node,
        data: {
            ...data,
            areaOperativaId: area.areaId,
            areaOperativaNombre: area.nombre,
        } satisfies ProcessNodeData,
    };
};
