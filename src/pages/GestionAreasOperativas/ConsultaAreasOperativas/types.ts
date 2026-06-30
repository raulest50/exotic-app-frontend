export interface CategoriaHabilitada {
    categoriaId: number;
    categoriaNombre: string;
    unidadMedidaId?: number | null;
    factorLote?: number | null;
}

export interface CategoriaHabilitadaMutation {
    categoriaId: number;
    unidadMedidaId?: number | null;
    factorLote?: number | null;
}

export interface AreaOperativa {
    areaId: number;
    nombre: string;
    descripcion: string;
    responsableArea: {
        id: number;
        cedula: number;
        username: string;
        nombreCompleto: string;
    } | null;
    categoriasHabilitadas: CategoriaHabilitada[];
}

export const ALMACEN_GENERAL_AREA_ID = -1;

export function isAlmacenGeneralArea(area: Pick<AreaOperativa, 'areaId'> | null | undefined): boolean {
    return area?.areaId === ALMACEN_GENERAL_AREA_ID;
}

export type SearchType = 'NOMBRE' | 'RESPONSABLE' | 'ID';

export interface SearchAreaOperativaDTO {
    searchType: SearchType;
    nombre?: string;
    responsableId?: number;
    areaId?: number;
}

export interface AreaOperativaMutationDTO {
    nombre: string;
    descripcion: string;
    responsableId: number;
    categoriaIds?: number[];
    categoriasHabilitadas?: CategoriaHabilitadaMutation[];
}

export type UnidadRelacionAreaOperativa = 'ML' | 'L' | 'G' | 'KG' | 'U';

export interface UnidadMedidaAreaOperativa {
    id: number;
    areaId: number;
    nombre: string;
    relacionEstandar: number;
    unidadRelacion: UnidadRelacionAreaOperativa;
}

export interface UnidadMedidaAreaOperativaRequest {
    nombre: string;
    relacionEstandar: number;
    unidadRelacion: UnidadRelacionAreaOperativa;
}

export interface ConversionUnidadAreaOperativaResponse {
    unidadOrigen: UnidadMedidaAreaOperativa;
    unidadDestino: UnidadMedidaAreaOperativa;
    cantidadOrigen: number;
    cantidadBase: number;
    unidadBase: string;
    cantidadDestino: number;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}
