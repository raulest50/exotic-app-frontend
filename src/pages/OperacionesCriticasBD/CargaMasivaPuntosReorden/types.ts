export interface CargaPuntosReordenError {
    rowNumber: number;
    productoId: string;
    columnName?: string | null;
    message: string;
}

export interface CargaPuntosReordenChange {
    rowNumber: number;
    productoId: string;
    nombre: string;
    currentValue: number;
    newValue: number;
}

export interface CargaPuntosReordenValidationResponse {
    valid: boolean;
    totalRows: number;
    ignoredRows: number;
    unchangedRows: number;
    updateRows: number;
    errorRows: number;
    changes: CargaPuntosReordenChange[];
    errors: CargaPuntosReordenError[];
}

export interface CargaPuntosReordenExecutionResponse {
    success: boolean;
    totalRows: number;
    ignoredRows: number;
    unchangedRows: number;
    updatedRows: number;
}
