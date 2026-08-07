/**
 * Root barrel for @hce/shared.
 *
 * Exposes the commonly-imported surface (types, apiClient, ROUTES, events,
 * session singleton) so consumers can write:
 *
 *   import { apiClient, ROUTES, emitInventoryChange, Producto } from "@hce/shared";
 *
 * The UI kit is intentionally kept on its own subpath (`@hce/shared/ui`) so the
 * form/data layer can be imported without pulling React/components into modules
 * that only need types or the API client.
 *
 * Exports are explicit (not `export *`) to avoid the ApiError type/value
 * collision: the runtime class is re-exported from `./api`, while the structural
 * type shape of the same name stays only on the `./types` subpath.
 */

export type {
  ActualizarProductoDto,
  ApiError as ApiErrorShape,
  AuthSession,
  AuthStatus,
  Compra,
  CompraDet,
  DocDto,
  DocVentaDto,
  EstadoProducto,
  ItemDto,
  ItemVentaDto,
  KardexFilters,
  MovimientoKardex,
  Producto,
  RegistrarProductoDto,
  TipoDocumentoOrigen,
  TipoMovimiento,
  Venta,
  VentaDet,
} from "./types";

export { apiClient, req, ApiError } from "./api";

export { ROUTES } from "./routes";
export type { RouteKey, RoutePath } from "./routes";

export { emitInventoryChange, onInventoryChange } from "./events";
export type {
  InventoryChangeOrigin,
  InventoryChangePayload,
} from "./events";

export {
  TriggerSessionExpired,
  subscribeSessionExpired,
  resetSessionExpired,
  isSessionExpiredFlagSet,
  getLastSessionExpiredSource,
  tryRefresh,
  SessionExpiredProvider,
  AuthProvider,
  AuthGuard,
  useAuth,
} from "./auth";
export type { AuthContextValue, LoginFn, LogoutFn } from "./auth";

export { AppSidebar, NavUser, AppLayout } from "./layout";

export { ThemeProvider } from "./theme";

export { ModalProvider, useModal } from "./ui/modal-provider";
export type { ModalOptions } from "./ui/modal-provider";
