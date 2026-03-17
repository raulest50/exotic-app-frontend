export interface ExportacionTerminadosConInsumos {
    schemaVersion: number;
    exportedAt: string;
    terminados: TerminadoJsonConInsumos[];
}

export interface TerminadoJsonConInsumos {
    productoId: string;
    nombre: string;
    observaciones: string | null;
    costo: number;
    ivaPercentual: number;
    tipoUnidades: string;
    cantidadUnidad: number;
    stockMinimo: number;
    inventareable: boolean;
    status: number;
    categoria: CategoriaResumen | null;
    fotoUrl: string | null;
    prefijoLote: string | null;
    insumos: InsumoJsonConInsumos[];
}

export interface CategoriaResumen {
    categoriaId: number;
    categoriaNombre: string | null;
}

export interface InsumoJsonConInsumos {
    insumoId: number;
    cantidadRequerida: number;
    producto: ProductoResumen | null;
}

export interface ProductoResumen {
    productoId: string;
    nombre: string;
    tipoProducto: string;
}

export interface ErrorRecordDTO {
    rowNumber: number;
    productoId: string;
    message: string;
    columnName?: string;
}

export interface ValidationResultDTO {
    valid: boolean;
    errors: ErrorRecordDTO[];
    rowCount: number;
}
