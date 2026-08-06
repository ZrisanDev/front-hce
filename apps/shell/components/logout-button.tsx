"use client";

/**
 * Shell header logout button.
 *
 * Client Component because it consumes `useAuth()`. Calls `logout()` (browser
 * POST /api/auth/logout, cookie travels same-origin) and hard-redirects to the
 * shell login. Uses a hard `window.location` redirect because the login route
 * lives in the same zone but we want a full reload to drop client state.
 */

import { ROUTES, useAuth } from "@hce/shared";
import { Button } from "@hce/shared/ui";

export function LogoutButton() {
  const { logout } = useAuth();

  async function handleClick() {
    await logout();
    window.location.href = ROUTES.login;
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick}>
      Cerrar sesión
    </Button>
  );
}
