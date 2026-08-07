import type { ReactNode } from "react";
import { TooltipProvider } from "../ui/tooltip";
import { SidebarInset, SidebarTrigger } from "../ui/sidebar";
import { AppSidebarProvider } from "./sidebar-provider";
import { Separator } from "../ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "../ui/breadcrumb";
import { AppSidebar } from "./app-sidebar";
import { ModeToggle } from "../ui";

/**
 * Shared application chrome for every Multi-Zone app (shell + 4 zones).
 *
 * Composes the sidebar-07 pattern: TooltipProvider (sidebar uses tooltips
 * when collapsed) → SidebarProvider (open/collapse state) → AppSidebar +
 * SidebarInset (content area with a header containing the trigger and a
 * breadcrumb showing the active zone name).
 *
 * Each zone passes its display name via the `zone` prop so the breadcrumb
 * shows context (e.g. "Productos") without this component needing access to
 * the Next.js router — keeping it a pure Server Component with no hooks.
 *
 * Usage in a zone layout:
 *
 *   <AuthProvider>
 *     <SessionExpiredProvider>
 *       <AppLayout zone="Productos">{children}</AppLayout>
 *     </SessionExpiredProvider>
 *   </AuthProvider>
 */
export function AppLayout({
  children,
  zone,
}: {
  children: ReactNode;
  zone?: string;
}) {
  return (
    <TooltipProvider>
      <AppSidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            {zone && (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{zone}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
        </SidebarInset>
      </AppSidebarProvider>
    </TooltipProvider>
  );
}
