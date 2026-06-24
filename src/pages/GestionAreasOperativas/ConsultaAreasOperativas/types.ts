export interface CategoriaHabilitada {
    categoriaId: number;
    categoriaNombre: string;
    unidadMedidaIds?: number[];
}

export interface CategoriaHabilitadaMutation {
    categoriaId: number;
    unidadMedidaIds: number[];
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

export type DimensionUnidadAreaOperativa = 'VOLUMEN' | 'MASA' | 'CONTEO' | 'TIEMPO';
export type TipoCapacidadAreaOperativa = 'PRODUCTIVA' | 'ALMACENAMIENTO';
export type PeriodoCapacidadAreaOperativa = 'HORA' | 'TURNO' | 'DIA' | 'SEMANA';

export interface UnidadMedidaAreaOperativa {
    id: number;
    areaId: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    dimension: DimensionUnidadAreaOperativa;
    unidadEstandar: string;
    cantidadUnidadEstandar: number;
    principal: boolean;
    discreta: boolean;
    activo: boolean;
}

export interface UnidadMedidaAreaOperativaRequest {
    codigo: string;
    nombre: string;
    descripcion?: string | null;
    dimension: DimensionUnidadAreaOperativa;
    unidadEstandar: string;
    cantidadUnidadEstandar: number;
    principal: boolean;
    discreta: boolean;
    activo: boolean;
}

export interface CapacidadAreaOperativa {
    id: number;
    areaId: number;
    unidadMedidaId: number;
    unidadCodigo: string;
    unidadNombre: string;
    unidadEstandar: string;
    tipoCapacidad: TipoCapacidadAreaOperativa;
    cantidad: number;
    periodo: PeriodoCapacidadAreaOperativa;
    eficiencia: number;
    vigenteDesde: string | null;
    vigenteHasta: string | null;
    descripcion: string | null;
    activo: boolean;
}

export interface CapacidadAreaOperativaRequest {
    unidadMedidaId: number;
    tipoCapacidad: TipoCapacidadAreaOperativa;
    cantidad: number;
    periodo: PeriodoCapacidadAreaOperativa;
    eficiencia: number;
    vigenteDesde?: string | null;
    vigenteHasta?: string | null;
    descripcion?: string | null;
    activo: boolean;
}

export interface ConversionUnidadAreaOperativaResponse {
    unidadOrigen: UnidadMedidaAreaOperativa;
    unidadDestino: UnidadMedidaAreaOperativa;
    cantidadOrigen: number;
    cantidadEstandar: number;
    unidadEstandar: string;
    cantidadDestino: number;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}
