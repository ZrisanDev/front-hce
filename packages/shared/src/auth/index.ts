export {
  TriggerSessionExpired,
  subscribeSessionExpired,
  resetSessionExpired,
  isSessionExpiredFlagSet,
  getLastSessionExpiredSource,
} from "./session";

// React layer (Client Components). The singleton above is pure module state;
// these providers subscribe to it and render the blocking modal / hold auth
// status. Re-exported here so consumers can import from "@hce/shared/auth".
export { SessionExpiredProvider } from "./session-expired-provider";
export { AuthProvider } from "./auth-provider";
export { AuthGuard } from "./guard";
export { useAuth } from "./use-auth";
export type { AuthContextValue, LoginFn, LogoutFn } from "./use-auth";
