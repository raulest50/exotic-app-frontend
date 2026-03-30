export interface AreaOperativa {
    areaId: number;
    nombre: string;
    descripcion: string;
    responsableArea: {
        id: number;
        cedula: string;
        username: string;
        nombreCompleto: string;
    } | null;
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

export interface UpdateAreaOperativaDTO {
    nombre: string;
    descripcion: string;
    responsableId: number;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}
