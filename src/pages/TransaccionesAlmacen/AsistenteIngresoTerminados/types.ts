// Types for the AsistenteIngresoTerminados wizard

export interface CategoriaBE {
    categoriaId: number;
    categoriaNombre: string;
    categoriaDescripcion?: string;
    loteSize?: number;
    tiempoDiasFabricacion?: number;
}

export interface TerminadoBE {
    productoId: string;
    nombre: string;
    tipoUnidades?: string;
    cantidadUnidad?: number;
    fotoUrl?: string;
    categoria?: CategoriaBE;
    status?: number;
    prefijoLote?: string;
    tipo_producto?: string;
    costo?: number;
    ivaPercentual?: number;
    observaciones?: string;
}

export interface OrdenProduccionBE {
    ordenId: number;
    loteAsignado: string;
    estadoOrden: number;
    cantidadProducir: number;
    observaciones?: string;
    fechaCreacion?: string;
    fechaLanzamiento?: string;
    fechaFinalPlanificada?: string;
    fechaInicio?: string;
    fechaFinal?: string;
    areaOperativa?: string;
    departamentoOperativo?: string;
    numeroPedidoComercial?: string;
    producto?: TerminadoBE;
}

export interface IngresoTerminadoConsultaResponse {
    ordenProduccion: OrdenProduccionBE;
    terminado: TerminadoBE;
    loteSizeEsperado: number;
}

export interface IngresoTerminadoDatos {
    /** Unidades reales que ingresan al almacén (entero >= 1) */
    cantidadIngresada: number;
    /** Fecha de vencimiento en formato ISO YYYY-MM-DD */
    fechaVencimiento: string;
}

// ============================================================================
// Nuevos tipos para el flujo basado en Excel (carga masiva de ingresos)
// ============================================================================

/** Datos validados del Excel subido - representa una fila del Excel procesada */
export interface IngresoTerminadoValidado {
    ordenId: number;
    loteAsignado: string;
    productoId: string;
    productoNombre: string;
    categoriaNombre: string;
    cantidadEsperada: number;
    cantidadIngresada: number;
    fechaVencimiento: string; // YYYY-MM-DD
    diferenciaPorcentaje: number; // Para mostrar en UI
}

/** Payload para registro masivo de ingresos */
export interface RegistroMasivoPayload {
    username: string;
    ingresos: {
        ordenProduccionId: number;
        cantidadIngresada: number;
        fechaVencimiento: string;
    }[];
}

/** Error de validación individual */
export interface ValidationError {
    rowNumber: number;
    loteAsignado: string;
    message: string;
}

/** Respuesta de validación del Excel */
export interface ValidacionExcelResponse {
    valid: boolean;
    errors: ValidationError[];
    rowCount: number;
}
