export type EstadoPlantillaDespeje = "BORRADOR" | "VIGENTE" | "RETIRADA";
export type TipoItemDespeje = "SI_NO_NA" | "NUMERO";
export type RespuestaDespeje = "SI" | "NO" | "NA";
export type EstadoDespeje = "BORRADOR" | "PENDIENTE_REVISION" | "APROBADA" | "RECHAZADA" | "INVALIDADA" | "UTILIZADA";

export interface DespejeAreaConfiguracion {
    areaId: number;
    requiereDespeje: boolean;
    requiereRevision: boolean;
    revisionContexto: number;
    antecedenteConocido: boolean;
    ultimoLoteId: number | null;
    ultimoLoteNumero: string | null;
    ocupanteSeguimientoId: number | null;
    ocupanteOperacionId: number | null;
    version: number;
}

export interface DespejeAreaConfiguracionWrite {
    requiereDespeje: boolean;
    requiereRevision: boolean;
    confirmaLineaExclusiva: boolean;
    version: number;
}

export interface ItemPlantillaDespejeWrite {
    orden: number;
    texto: string;
    tipo: TipoItemDespeje;
    obligatorio: boolean;
    permiteNa: boolean;
    respuestaConforme: "SI" | "NO" | null;
    minimo: number | null;
    maximo: number | null;
}

export interface ItemPlantillaDespeje extends ItemPlantillaDespejeWrite {
    id: number;
}

export interface PlantillaDespeje {
    id: number;
    areaId: number;
    numero: number;
    nombre: string;
    estado: EstadoPlantillaDespeje;
    motivoCambio: string;
    vigenteDesde: string | null;
    vigenteHasta: string | null;
    version: number;
    items: ItemPlantillaDespeje[];
}

export interface PlantillaDespejeWrite {
    id?: number;
    version?: number;
    nombre: string;
    motivoCambio: string;
    items: ItemPlantillaDespejeWrite[];
}

export interface ActorDespeje {
    id: number;
    username: string;
    nombre: string;
}

export interface RespuestaItemDespeje {
    itemId: number;
    valor: RespuestaDespeje | null;
    numero: number | null;
    observacion: string | null;
}

export interface EjecucionDespeje {
    id: number;
    areaId: number;
    areaNombre: string;
    seguimientoId: number | null;
    operacionId: number | null;
    ordenProduccionId: number | null;
    ordenFabricacionId: number | null;
    intento: number;
    revisionContexto: number;
    estado: EstadoDespeje;
    plantilla: PlantillaDespeje;
    requiereRevision: boolean;
    loteActualId: number;
    loteActualNumero: string;
    productoActualId: string | null;
    productoActualNombre: string | null;
    loteAnteriorId: number | null;
    loteAnteriorNumero: string | null;
    productoAnteriorId: string | null;
    productoAnteriorNombre: string | null;
    antecedenteConocido: boolean;
    confirmaAntecedenteDesconocido: boolean;
    observacionAntecedente: string | null;
    observaciones: string | null;
    motivoRevision: string | null;
    motivoInvalidacion: string | null;
    creadaEn: string;
    enviadaEn: string | null;
    revisadaEn: string | null;
    utilizadaEn: string | null;
    creadaPor: ActorDespeje;
    enviadaPor: ActorDespeje | null;
    revisadaPor: ActorDespeje | null;
    contenidoSha256: string | null;
    version: number;
    respuestas: RespuestaItemDespeje[];
}

export interface EjecucionDespejeWrite {
    version: number;
    confirmaAntecedenteDesconocido: boolean;
    observacionAntecedente: string | null;
    observaciones: string | null;
    respuestas: RespuestaItemDespeje[];
}

export interface PrepararDespejeRequest {
    seguimientoId?: number;
    operacionId?: number;
    nuevoIntento?: boolean;
}

export interface PreparacionDespeje {
    requiereDespeje: boolean;
    requiereRevision: boolean;
    puedeIniciar: boolean;
    motivo: string | null;
    ejecucion: EjecucionDespeje | null;
}
