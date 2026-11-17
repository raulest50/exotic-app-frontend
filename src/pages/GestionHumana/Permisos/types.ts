export type EstadoPermiso = "BORRADOR" | "SOLICITADA" | "APROBADA" | "RECHAZADA" | "ANULADA";
export type UnidadPermiso = "HORAS" | "DIAS" | "MESES";
export type ScopePermiso = "MIAS" | "POR_REVISAR" | "TODAS";
export const MOTIVOS_PERMISO = {
    CITA_TRATAMIENTO_MEDICO: "Cita o tratamiento médico",
    CALAMIDAD_DOMESTICA: "Calamidad doméstica",
    LICENCIA_REMUNERADA: "Licencia remunerada",
    LICENCIA_NO_REMUNERADA: "Licencia no remunerada",
    ASUNTOS_PERSONALES: "Asuntos personales",
    DILIGENCIAS_EMPRESA: "Diligencias de la empresa",
    ASUNTOS_ACADEMICOS: "Asuntos académicos",
    MOVILIDAD: "Movilidad",
    DIA_FAMILIA: "Día de la familia",
    OTROS: "Otros",
} as const;
export type MotivoPermiso = keyof typeof MOTIVOS_PERMISO;
export const ESTADOS_PERMISO: Record<EstadoPermiso, string> = {
    BORRADOR: "Borrador", SOLICITADA: "Solicitada", APROBADA: "Aprobada", RECHAZADA: "Rechazada", ANULADA: "Anulada",
};
export interface UsuarioPermiso { id: number; username: string; nombre: string }
export interface EmpleadoPermiso { id: number; nombre: string; cargo: string | null; proceso: string | null; usuarioId: number | null }
export interface ContextoPermisos {
    usuarioId: number; usuarioNombre: string; nivel: number; empleado: EmpleadoPermiso | null; jefe: UsuarioPermiso | null;
    habilitado: boolean; impedimentos: string[]; puedeRevisar: boolean; puedeConsultarTodas: boolean; puedeConfigurar: boolean;
}
export interface ConfiguracionEmpleadoPermiso {
    empleado: EmpleadoPermiso; jefeConfigurado: UsuarioPermiso | null; jefeOrganigrama: UsuarioPermiso | null; version: number | null;
}
export interface ConfiguracionPermisos { empleados: ConfiguracionEmpleadoPermiso[]; usuarios: UsuarioPermiso[] }
export interface BorradorPermiso {
    version: number | null; proceso: string; motivo: MotivoPermiso | ""; descripcion: string; documentoSoporte: string;
    mecanismoRecuperacion: string; fechaDesde: string; fechaHasta: string; cantidad: number | null; unidad: UnidadPermiso | "";
}
export interface FirmaPermisoRequest { confirmacion: true; imagenBase64?: string; firmaVisualVersionId?: number }
export interface FirmaVigentePermiso { id: number; imagenBase64: string; sha256: string }
export interface PermisoResumen {
    id: number; version: number; folio: string; estado: EstadoPermiso; fechaSolicitud: string;
    empleadoNombre: string; empleadoId: number; jefeNombre: string | null;
    fechaDesde: string | null; fechaHasta: string | null; cantidad: number | null; unidad: UnidadPermiso | null;
}
export interface SoportePermiso { nombre: string; contentType: string; tamanoBytes: number; sha256: string }
export interface FirmaPermiso {
    rol: "SOLICITANTE" | "JEFE"; usuarioId: number; username: string; nombre: string; cedula: string | null;
    firmadoEn: string; hashContenido: string; sha256: string; imagenBase64: string;
}
export interface EventoPermiso { id: number; tipo: string; actorId: number; actorNombre: string; creadoEn: string; detalle: string | null }
export interface PermisoDetalle {
    id: number; version: number; folio: string; estado: EstadoPermiso; fechaSolicitud: string;
    empleado: EmpleadoPermiso; jefe: UsuarioPermiso | null; proceso: string | null; motivo: MotivoPermiso | null;
    descripcion: string | null; documentoSoporte: string | null; mecanismoRecuperacion: string | null;
    fechaDesde: string | null; fechaHasta: string | null; cantidad: number | null; unidad: UnidadPermiso | null;
    soporte: SoportePermiso | null; hashContenido: string | null; creadoEn: string; presentadoEn: string | null;
    resueltoEn: string | null; motivoDecision: string | null; motivoAnulacion: string | null;
    firmas: FirmaPermiso[]; eventos: EventoPermiso[]; puedeEditar: boolean; puedePresentar: boolean; puedeDecidir: boolean; puedeAnular: boolean;
}
export interface PermisoPage<T> { content: T[]; number: number; totalPages: number; totalElements: number }
