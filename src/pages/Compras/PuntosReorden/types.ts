export interface ParametrosPuntosReorden {
    fechaDesde: string;
    fechaHasta: string;
    porcentajeSeguridad: number;
    minimoDiasEfectivos: number;
    fechasExcluidas: string[];
    proveedoresPorMaterial: Record<string, string>;
}

export type EstadoPuntoReorden = "LISTO" | "SIN_CONSUMO" | "SIN_PROVEEDOR" | "SIN_LEAD_TIME" | "SIN_DIAS";

export interface FilaPuntoReorden {
    productoId: string;
    nombre: string;
    unidad: string;
    proveedorId: string | null;
    proveedorNombre: string | null;
    leadTimeNegociado: number | null;
    comprasProveedor: number;
    proveedorManual: boolean;
    consumoTotal: number;
    consumoDiario: number;
    stockSeguridad: number;
    puntoReordenActual: number;
    puntoReordenNuevo: number | null;
    estado: EstadoPuntoReorden;
    seleccionadaPorDefecto: boolean;
}

export interface CalculoPuntosReorden {
    calculoHash: string;
    parametros: ParametrosPuntosReorden;
    calculadoEn: string;
    diasCalendario: number;
    diasExcluidos: number;
    diasEfectivos: number;
    minimoDiasEfectivos: number;
    diasConDispensacion: string[];
    filas: FilaPuntoReorden[];
}

export interface PreparacionPuntosReorden {
    preparacionId: string;
    expiraEn: string;
    token: string;
    tokenExpiraEn: string;
    intentosPermitidos: number;
    calculo: CalculoPuntosReorden;
}

export interface ResultadoPuntosReorden {
    operacionId: string;
    usuario: string;
    aplicadoEn: string;
    actualizados: number;
    calculo: CalculoPuntosReorden;
}
