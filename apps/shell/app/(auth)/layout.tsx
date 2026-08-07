import type { ReactNode } from "react";

/**
 * Auth route-group layout. Deliberately bare: `/login` and `/logout` render
 * WITHOUT dashboard chrome. The Auth/SessionExpired/Modal/Theme providers still
 * wrap them from the single root `app/layout.tsx` (login needs AuthProvider;
 * session-expiry handling needs SessionExpiredProvider). This fragment is kept
 * explicit so any future auth-only chrome (e.g. a centered card shell) has a
 * clear home.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
