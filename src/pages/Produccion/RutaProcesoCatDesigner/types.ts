export interface AreaOperativa {
    areaId: number;
    nombre: string;
    descripcion: string;
}

export interface RutaProcesoNodeData {
    label: string;
    areaOperativa: AreaOperativa | null;
}

export interface RutaProcesoNodeDTO {
    id: string;
    posicionX: number;
    posicionY: number;
    areaOperativaId: number | null;
    areaOperativaNombre: string | null;
    label: string;
}

export interface RutaProcesoEdgeDTO {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
}

export interface RutaProcesoCatDTO {
    id?: number;
    categoriaId: number;
    nodes: RutaProcesoNodeDTO[];
    edges: RutaProcesoEdgeDTO[];
}
