// Path: src/pages/Personal/types.tsx
// Used in: src/pages/Personal/IncorporarPersonal.tsx; src/pages/Personal/ConsultaDePersonal.tsx; src/pages/Personal/ListaIntegrantes.tsx
// Summary: Tipos y helpers para integrantes de personal y su documentación transaccional.

export interface DocTranDePersonal {
    id?: number;  // opcional porque es auto-generado
    idIntegrante?: number;
    tipoDocTran: TipoDocTran;
    fechaHora: string;  // para LocalDateTime usamos string en formato ISO
    descripcion?: string;
    valoresAnteriores?: string;  // TEXT en formato JSON
    valoresNuevos?: string;      // TEXT en formato JSON
    usuarioResponsable?: string;
}

export enum TipoDocTran {
    INGRESO = 'INGRESO',
    MODIFICACION_SALARIO = 'MODIFICACION_SALARIO',
    MODIFICACION_CARGO = 'MODIFICACION_CARGO',
    MODIFICACION_DEPARTAMENTO = 'MODIFICACION_DEPARTAMENTO',
    MODIFICACION_DATOS_PERSONALES = 'MODIFICACION_DATOS_PERSONALES',
    CAMBIO_ESTADO = 'CAMBIO_ESTADO',
    SALIDA = 'SALIDA',
    HORAS_EXTRA_REGISTRO = 'HORAS_EXTRA_REGISTRO',
    HORAS_EXTRA_APROBACION = 'HORAS_EXTRA_APROBACION',
    HORAS_EXTRA_RECHAZO = 'HORAS_EXTRA_RECHAZO',
    HORAS_EXTRA_ANULACION = 'HORAS_EXTRA_ANULACION',
    OTRO = 'OTRO'
}

export type DepartamentoIntegrante = 'PRODUCCION' | 'ADMINISTRATIVO';

export interface IntegrantePersonalResumen {
    id: number;
    nombres: string;
    apellidos: string;
    cargo?: string;
    departamento?: DepartamentoIntegrante;
    centroDeCosto?: string;
    centroDeProduccion?: string;
    salario?: number;
    estado?: EstadoIntegrante;
    fechaIngreso?: string;
}

export interface IntegrantePersonalDetalle extends IntegrantePersonalResumen {
    celular: string;
    direccion: string;
    email?: string;
    nombreContactoEmergencia?: string;
    celularContactoEmergencia?: string;
    estadoCivil?: EstadoCivil;
    numeroHijos?: number;
    numeroCuentaBancaria?: string;
    banco?: string;
    fechaRegistro?: string;
}

export interface IntegrantePersonalRequest {
    id?: number;
    nombres: string;
    apellidos: string;
    celular: string;
    direccion: string;
    email?: string;
    nombreContactoEmergencia?: string;
    celularContactoEmergencia?: string;
    estadoCivil?: EstadoCivil;
    numeroHijos?: number;
    fechaIngreso: string;
    numeroCuentaBancaria?: string;
    banco?: string;
    cargo?: string;
    departamento?: DepartamentoIntegrante;
    centroDeCosto?: string;
    centroDeProduccion?: string;
    salario?: number;
    estado?: EstadoIntegrante;
}

export type IntegrantePersonal = IntegrantePersonalResumen;

export enum EstadoIntegrante {
    ACTIVO = 'ACTIVO',
    INACTIVO = 'INACTIVO'
}

export enum EstadoCivil {
    SOLTERO = 'SOLTERO',
    CASADO = 'CASADO',
    UNION_LIBRE = 'UNION_LIBRE',
    SEPARADO = 'SEPARADO',
    DIVORCIADO = 'DIVORCIADO',
    VIUDO = 'VIUDO'
}

export function getEstadoIntegranteText(estado?: EstadoIntegrante) {
    if (estado === EstadoIntegrante.ACTIVO) return 'Activo';
    if (estado === EstadoIntegrante.INACTIVO) return 'Inactivo';
    return '';
}

export function getEstadoCivilText(estado?: EstadoCivil) {
    if (estado === EstadoCivil.SOLTERO) return 'Soltero';
    if (estado === EstadoCivil.CASADO) return 'Casado';
    if (estado === EstadoCivil.UNION_LIBRE) return 'Unión libre';
    if (estado === EstadoCivil.SEPARADO) return 'Separado';
    if (estado === EstadoCivil.DIVORCIADO) return 'Divorciado';
    if (estado === EstadoCivil.VIUDO) return 'Viudo';
    return '';
}

export enum EstadoRegistroHoraExtra {
    REGISTRADA = 'REGISTRADA',
    APROBADA = 'APROBADA',
    RECHAZADA = 'RECHAZADA',
    ANULADA = 'ANULADA'
}

export interface RegistroHoraExtra {
    id: number;
    integranteId: number;
    integranteNombre: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    minutos: number;
    motivo: string;
    observaciones?: string;
    estado: EstadoRegistroHoraExtra;
    registradoPorId: number;
    registradoPorUsername: string;
    registradoPorNombre?: string;
    aprobadoPorId?: number;
    aprobadoPorUsername?: string;
    aprobadoPorNombre?: string;
    fechaRegistro: string;
    fechaDecision?: string;
    motivoRechazoOAnulacion?: string;
}

export interface RegistroHoraExtraRequest {
    fecha: string;
    horaInicio: string;
    horaFin: string;
    motivo: string;
    observaciones?: string;
}

export interface RegistroHoraExtraDecision {
    motivo: string;
}

export interface PageResponse<T> {
    content: T[];
    number: number;
    totalPages: number;
    totalElements: number;
}

export function getEstadoRegistroHoraExtraText(estado?: EstadoRegistroHoraExtra) {
    if (estado === EstadoRegistroHoraExtra.REGISTRADA) return 'Registrada';
    if (estado === EstadoRegistroHoraExtra.APROBADA) return 'Aprobada';
    if (estado === EstadoRegistroHoraExtra.RECHAZADA) return 'Rechazada';
    if (estado === EstadoRegistroHoraExtra.ANULADA) return 'Anulada';
    return '';
}
