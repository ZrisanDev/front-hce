"use client";

import * as React from "react";

import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "../ui/sidebar";
import {
  HeartPulseIcon,
  PackageIcon,
  ShoppingCartIcon,
  ReceiptTextIcon,
  ClipboardListIcon,
} from "lucide-react";

/**
 * Top-level navigation zones for HCE.
 *
 * Each zone is a distinct Next.js app living on its own host/path, so every
 * entry renders as a plain `<a href>` (full document navigation, cross-zone)
 * rather than a client-side `<Link>`. The list is intentionally flat: there
 * are no teams/projects and no collapsible sub-menus — every zone is one
 * click away.
 */
const navItems = [
  { title: "Productos", url: "/productos", icon: PackageIcon },
  { title: "Compras", url: "/compras", icon: ShoppingCartIcon },
  { title: "Ventas", url: "/ventas", icon: ReceiptTextIcon },
  { title: "Kardex", url: "/kardex", icon: ClipboardListIcon },
];

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="HCE"
              render={<a href="/" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <HeartPulseIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">HCE</span>
                <span className="truncate text-xs text-muted-foreground">
                  Sistema de gestión
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestión</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  tooltip={item.title}
                  render={<a href={item.url} />}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
