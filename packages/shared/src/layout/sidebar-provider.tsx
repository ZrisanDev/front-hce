"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { SidebarProvider } from "../ui/sidebar";

/**
 * Breakpoint above which the sidebar starts/remains expanded (laptops).
 * Below it (tablets and smaller) the sidebar collapses to the icon rail so
 * the content area keeps the space a clinical user needs at a glance.
 *
 * The `md` breakpoint of the shadcn sidebar already switches to an offcanvas
 * overlay below 768px; this provider only tunes the state of the fixed sidebar
 * between 768px and 1024px, where an expanded 256px rail would eat ~1/3 of a
 * portrait tablet.
 */
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Responsive sidebar state for clinical screens (Tablets/Laptops).
 *
 * State is controlled (`open`/`onOpenChange`) so the initial value is SSR-safe
 * (expanded) and a post-mount effect aligns it with the real viewport. The
 * effect also keeps the state in sync when the user rotates a tablet or docks
 * a laptop — crossing 1024px expands/collapses automatically without touching
 * the manual toggle.
 */
export function AppSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      {children}
    </SidebarProvider>
  );
}
