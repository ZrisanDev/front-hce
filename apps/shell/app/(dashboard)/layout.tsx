import type { ReactNode } from "react";
import { AppLayout } from "@hce/shared";

/**
 * Dashboard route-group layout. Wraps every dashboard route (`/`, `/productos`,
 * ...) in the full application chrome: sidebar, header breadcrumb, ModeToggle
 * and NavUser. Auth routes live in the `(auth)` group and deliberately bypass
 * this chrome; both groups still share the providers from the single root
 * `app/layout.tsx`.
 */
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppLayout zone="Dashboard">{children}</AppLayout>;
}
