export type EstadoGrupoError = "ABIERTO" | "EN_INVESTIGACION" | "RESUELTO";
export type SeveridadError = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";

/** Datos de presentacion; la consulta al backend se incorporara en una etapa posterior. */
export interface GrupoErrorResumen {
    id: string;
    titulo: string;
    estado: EstadoGrupoError;
    severidad: SeveridadError;
    totalEventos: number;
    ultimaAparicion: string | null;
}
