"use client";

/**
 * Auth context + `useAuth` hook.
 *
 * Lives in its own module so the hook can be imported from Client Components
 * (pages, guards, the logout button) without pulling the provider's React
 * implementation details. The provider itself is in `./auth-provider`.
 */

import { createContext, useContext } from "react";
import type { AuthSession } from "../types";

export type LoginFn = (username: string, password: string) => Promise<void>;
export type LogoutFn = () => Promise<void>;

/** Shape exposed by `useAuth()` — the current status plus the auth actions. */
export interface AuthContextValue extends AuthSession {
  login: LoginFn;
  logout: LogoutFn;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Access the nearest AuthProvider. Throws if used outside of one so misuse
 * fails loudly instead of silently returning undefined.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return ctx;
}
