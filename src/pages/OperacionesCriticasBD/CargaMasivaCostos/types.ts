export interface CargaCostosErrorFila {
    fila: number;
    codigo: string;
    campo: string;
    mensaje: string;
}

export interface CargaCostosErrorResponse {
    codigo: string;
    mensaje: string;
    errores: CargaCostosErrorFila[];
    advertencias: string[];
    intentosRestantes: number | null;
}

export interface CargaCostosPreparacion {
    loteId: string;
    estado: string;
    nombreArchivo: string;
    motivo: string;
    expiraEn: string;
    totalFilas: number;
    totalCandidatas: number;
    totalActualizadas: number;
    totalSinCambio: number;
    totalOmitidas: number;
    totalDependencias: number;
    totalSemiterminados: number;
    totalTerminados: number;
    totalDependenciasActualizadas: number;
    totalDependenciasSinCambio: number;
    advertencias: string[];
}

export interface CargaCostosItemPreview {
    fila: number;
    productoId: string;
    nombreProducto: string | null;
    descripcionExcel: string | null;
    descripcionCoincide: boolean;
    costoActual: number;
    costoNuevo: number;
    diferencia: number;
    porcentajeCambio: number | null;
    cambia: boolean;
}

export interface CargaCostosItemsPage {
    items: CargaCostosItemPreview[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface CargaCostosDependenciaPreview {
    productoId: string;
    nombreProducto: string | null;
    tipoProducto: "S" | "T";
    nivel: number;
    costoActual: number;
    costoNuevo: number;
    diferencia: number;
    porcentajeCambio: number | null;
    cambia: boolean;
}

export interface CargaCostosDependenciasPage {
    items: CargaCostosDependenciaPreview[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface CargaCostosToken {
    token: string;
    expiraEn: string;
    generacionesRestantes: number;
    intentosPermitidos: number;
}

export interface CargaCostosConfirmacion {
    loteId: string;
    ejecutado: boolean;
    estado: string;
    mensaje: string;
    ejecutadoEn: string | null;
    totalActualizadas: number;
    totalSinCambio: number;
    totalDependenciasActualizadas: number;
    totalDependenciasSinCambio: number;
}
