export type FirmaVisualUsuarioEstado = "VIGENTE" | "RETIRADA";

export interface FirmaVisualUsuarioVersion {
    id: number;
    usuarioId: number;
    version: number;
    estado: FirmaVisualUsuarioEstado;
    nombreArchivoOriginal: string;
    contentType: string;
    tamanoBytes: number;
    anchoPx: number;
    altoPx: number;
    sha256: string;
    vigenteDesde: string;
    vigenteHasta?: string | null;
    creadoEn: string;
    configuradaPorUsername: string;
    configuradaPorNombre: string;
    motivoCambio: string;
    retiradaPorUsername?: string | null;
    retiradaPorNombre?: string | null;
    motivoRetiro?: string | null;
}

export interface FirmaVisualUsuarioActual {
    usuarioId: number;
    configurada: boolean;
    vigente?: FirmaVisualUsuarioVersion | null;
}

export interface FirmaVisualSeleccionada {
    file: File;
    dataUrl: string;
    anchoPx: number;
    altoPx: number;
}
