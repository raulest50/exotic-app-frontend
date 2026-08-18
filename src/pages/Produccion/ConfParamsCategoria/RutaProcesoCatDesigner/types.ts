export interface AreaOperativa {
    areaId: number;
    nombre: string;
    descripcion: string;
}

export interface ProcesoRutaOption {
    procesoId: number;
    nombre: string;
    poeVigenteDisponible: boolean;
    poeVigenteVersion: number | null;
}

export interface RutaProcesoNodeData {
    [key: string]: unknown;
    label: string;
    areaOperativaId: number | null;
    areaOperativaNombre: string | null;
    procesoProduccionId: number | null;
    procesoProduccionNombre: string | null;
    poeVigenteDisponible: boolean;
    poeVigenteVersion: number | null;
    hasLeftHandle?: boolean;
    hasRightHandle?: boolean;
    duracionEstimadaMinutos?: number;
    requiereJornadaLaboral?: boolean;
}

export interface RutaProcesoNodeDTO {
    id: string;
    posicionX: number;
    posicionY: number;
    areaOperativaId: number | null;
    areaOperativaNombre: string | null;
    procesoProduccionId: number | null;
    procesoProduccionNombre: string | null;
    poeVigenteDisponible: boolean;
    poeVigenteVersion: number | null;
    label: string;
    hasLeftHandle: boolean;
    hasRightHandle: boolean;
    duracionEstimadaMinutos: number;
    requiereJornadaLaboral: boolean;
}

export interface RutaProcesoEdgeDTO {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
}

export interface RutaProcesoCatDTO {
    id?: number;
    categoriaId: number;
    versionId?: number | null;
    versionNumber?: number | null;
    estado?: string | null;
    vigenteDesde?: string | null;
    vigenteHasta?: string | null;
    creadoEn?: string | null;
    creadoPor?: string | null;
    motivoCambio?: string | null;
    nodes: RutaProcesoNodeDTO[];
    edges: RutaProcesoEdgeDTO[];
}
