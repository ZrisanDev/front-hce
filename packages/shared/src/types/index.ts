/**
 * Domain types shared across all HCE front-end zones.
 *
 * Field names are camelCase to match the back-hce API contract (the backend
 * serializes responses in camelCase). These types are the single source of
 * truth for request/response shapes used by `@hce/shared/api`.
 */

export type EstadoProducto = "ACTIVO" | "INACTIVO";

export type TipoMovimiento = "ENTRADA" | "SALIDA";

export type TipoDocumentoOrigen = "COMPRA" | "VENTA";

export type AuthStatus = "checking" | "authenticated" | "guest";

export interface Producto {
  idProducto: number;
  nombreProducto: string;
  nroLote: string;
  fecRegistro: string;
  costo: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  estado: EstadoProducto;
}

/** Payload for POST /api/productos. */
export interface RegistrarProductoDto {
  nombreProducto: string;
  nroLote: string;
  costo: number;
  precioVenta: number;
  stockMinimo: number;
}

/** Payload for PATCH /api/productos/:id. All fields optional. */
export type ActualizarProductoDto = Partial<RegistrarProductoDto>;

/** A single line inside a purchase/sale document. */
export interface ItemDto {
  idProducto: number;
  cantidad: number;
  precio: number;
}

/**
 * Shared document body for registrar-compra and registrar-venta.
 * Maps to RegistrarCompraDto / RegistrarVentaDto on the backend, which share
 * the same `{ items: ItemDto[] }` shape.
 */
export interface DocDto {
  items: ItemDto[];
}

export interface CompraDet {
  idCompraDet: number;
  idCompraCab: number;
  idProducto: number;
  cantidad: number;
  precio: number;
  subTotal: number;
  igv: number;
  total: number;
}

export interface VentaDet {
  idVentaDet: number;
  idVentaCab: number;
  idProducto: number;
  cantidad: number;
  precio: number;
  subTotal: number;
  igv: number;
  total: number;
}

export interface MovimientoKardex {
  idMovimientoCab: number;
  fecRegistro: string;
  tipoMovimiento: TipoMovimiento;
  tipoDocumentoOrigen: TipoDocumentoOrigen;
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
}

/** Filters accepted by GET /api/kardex. `idTipoMovimiento` is 1=ENTRADA, 2=SALIDA. */
export interface KardexFilters {
  idProducto?: number;
  fechaInicio?: string;
  fechaFin?: string;
  idTipoMovimiento?: 1 | 2;
}

/**
 * Auth session shape consumed by UI providers. The HttpOnly session cookie is
 * not readable from JS, so `status` is deduced from the first protected call
 * (2xx -> authenticated, 401 -> guest + expired modal).
 */
export interface AuthSession {
  status: AuthStatus;
}

/**
 * Structural shape of the throwable `ApiError` (see `@hce/shared/api`).
 * Documented here as a type contract; the runtime class lives in api/client.
 */
export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}
