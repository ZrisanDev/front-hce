"use client";

/**
 * SessionExpiredProvider — renders a BLOCKING modal whenever any apiClient call
 * receives a 401.
 *
 * It subscribes to the session-expired singleton (`subscribeSessionExpired`),
 * whose dedup flag collapses concurrent 401s into a single modal app-wide. When
 * no expiry is pending it renders `children` unchanged (wrap-through).
 *
 * The modal is intentionally non-dismissible: the Dialog is driven controlled
 * (`open`) with no `onOpenChange` handler, so backdrop clicks and Escape become
 * no-ops, and DialogContent renders with `showCloseButton={false}`. The only
 * exit is the "Volver a login" button, which hard-navigates to the shell login
 * (cross-zone, so plain `window.location`, never `next/link`).
 *
 * Mounted once per zone layout — each zone is a separate Next app with its own
 * React tree, so each needs its own provider instance. `resetSessionExpired()`
 * (called by AuthProvider after a successful login) clears the flag and hides
 * the modal so it does not reappear on the next 401.
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { subscribeSessionExpired } from "./session";
import { ROUTES } from "../routes";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui";

export function SessionExpiredProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSessionExpired((expired) => setOpen(expired));
    return unsubscribe;
  }, []);

  if (!open) return <>{children}</>;

  const goToLogin = () => {
    window.location.href = ROUTES.login;
  };

  return (
    <>
      {children}
      <Dialog open={open}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sesión expirada</DialogTitle>
            <DialogDescription>
              Tu sesión venció a los 30 min.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={goToLogin}>Volver a login</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
