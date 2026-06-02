import type { EstadoRegistroHoraExtra, IntegrantePersonal } from "../../Personal/types.tsx";

export type HorasExtraBiGranularidad = "DIA" | "SEMANA" | "MES";
export type DepartamentoPersonal = NonNullable<IntegrantePersonal["departamento"]>;

export interface HorasExtraBiEstado {
    estado: EstadoRegistroHoraExtra;
    registros: number;
    minutos: number;
    horas: number;
}

export interface HorasExtraBiResumen {
    fechaDesde: string;
    fechaHasta: string;
    integranteId?: number;
    departamento?: DepartamentoPersonal;
    cargo?: string;
    totalRegistros: number;
    totalMinutos: number;
    totalHoras: number;
    estados: HorasExtraBiEstado[];
}

export interface HorasExtraBiSeriePunto {
    bucket: string;
    fechaInicio: string;
    fechaFin: string;
    registrosRegistrada: number;
    registrosAprobada: number;
    registrosRechazada: number;
    registrosAnulada: number;
    minutosRegistrada: number;
    minutosAprobada: number;
    minutosRechazada: number;
    minutosAnulada: number;
    horasRegistrada: number;
    horasAprobada: number;
    horasRechazada: number;
    horasAnulada: number;
}

export interface HorasExtraBiSerie {
    fechaDesde: string;
    fechaHasta: string;
    granularidad: HorasExtraBiGranularidad;
    integranteId?: number;
    departamento?: DepartamentoPersonal;
    cargo?: string;
    puntos: HorasExtraBiSeriePunto[];
}
