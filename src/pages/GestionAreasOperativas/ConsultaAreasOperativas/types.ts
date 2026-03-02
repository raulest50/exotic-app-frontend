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

export type SearchType = 'NOMBRE' | 'RESPONSABLE' | 'ID';

export interface SearchAreaOperativaDTO {
    searchType: SearchType;
    nombre?: string;
    responsableId?: number;
    areaId?: number;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}
