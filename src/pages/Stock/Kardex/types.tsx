export interface KardexMovimientoRowDTO {
  movimientoId: number;
  cantidad: number;
  entrada: number;
  salida: number;
  batchNumber?: string | null;
  tipoMovimiento: string;
  almacen: string;
  fechaMovimiento: string;
  saldo: number;
}

export interface KardexMovimientosPageDTO {
  productoId: string;
  productoNombre: string;
  tipoUnidades: string;
  saldoInicial: number;
  content: KardexMovimientoRowDTO[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
