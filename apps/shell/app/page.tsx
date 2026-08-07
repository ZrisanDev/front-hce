"use client";

/**
 * Shell home — clinical dashboard (Tablets/Laptops).
 *
 * Task-oriented landing, not a decorative dashboard: a quick pulse of the
 * system (KPIs), one-tap actions, then recent movement.
 *
 * Data is fetched through the shell's same-origin `/api/*` proxy (the shell
 * next.config rewrites /api to the backend), so it can reuse the same
 * `apiClient` endpoints the zones use. Guests are redirected to /login by
 * <AuthGuard> because every call here is protected.
 *
 * Responsiveness: the sidebar collapses to the icon rail below 1024px
 * (AppSidebarProvider), and this grid reflows 1 column (small tablets) →
 * 2 columns (portrait tablets) → 3+ (laptops). Action targets are ≥48px for
 * touch use.
 */

import { useEffect, useState } from "react";
import { ApiError, AuthGuard, ROUTES, apiClient } from "@hce/shared";
import type { Compra, MovimientoKardex, Producto, Venta } from "@hce/shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  Skeleton,
  buttonVariants,
} from "@hce/shared/ui";
import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  ClipboardListIcon,
  PackageCheckIcon,
  PackagePlusIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
} from "lucide-react";

const FECHA_HORA = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function HomePage() {
  return (
    <AuthGuard>
      <Home />
    </AuthGuard>
  );
}

function Home() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [ventas, setVentas] = useState<Venta[] | null>(null);
  const [compras, setCompras] = useState<Compra[] | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoKardex[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.productos.list(),
      apiClient.ventas.list(),
      apiClient.compras.list(),
      apiClient.kardex.list(),
    ])
      .then(([p, v, c, k]) => {
        if (cancelled) return;
        setProductos(p ?? []);
        setVentas(v ?? []);
        setCompras(c ?? []);
        setMovimientos(k ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el resumen del sistema.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (productos === null || ventas === null || compras === null || movimientos === null) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const activos = productos.filter((p) => p.estado === "ACTIVO").length;
  const recientes = [...movimientos]
    .sort(
      (a, b) =>
        new Date(b.fecRegistro).getTime() - new Date(a.fecRegistro).getTime(),
    )
    .slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <p className="mb-6 text-sm text-muted-foreground">
        {new Date().toLocaleDateString("es-PE", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>

      {/* KPIs — quick pulse of the system. */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3">
            <PackageCheckIcon className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-semibold leading-tight">{activos}</p>
              <p className="text-sm text-muted-foreground">
                Productos activos
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <ShoppingCartIcon className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-semibold leading-tight">
                {compras.length}
              </p>
              <p className="text-sm text-muted-foreground">Compras</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <ReceiptTextIcon className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-semibold leading-tight">
                {ventas.length}
              </p>
              <p className="text-sm text-muted-foreground">Ventas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions — one-tap, ≥48px targets for clinical touch use. */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-medium">Acciones rápidas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href={`${ROUTES.ventas}/registrar`}
            className={buttonVariants({
              variant: "default",
              className: "h-12 justify-start gap-3 text-base",
            })}
          >
            <ArrowUpFromLineIcon className="size-5" />
            Registrar venta
          </a>
          <a
            href={`${ROUTES.compras}/registrar`}
            className={buttonVariants({
              variant: "outline",
              className: "h-12 justify-start gap-3 text-base",
            })}
          >
            <ArrowDownToLineIcon className="size-5" />
            Registrar compra
          </a>
          <a
            href={`${ROUTES.productos}/registrar`}
            className={buttonVariants({
              variant: "outline",
              className: "h-12 justify-start gap-3 text-base",
            })}
          >
            <PackagePlusIcon className="size-5" />
            Registrar producto
          </a>
          <a
            href={ROUTES.kardex}
            className={buttonVariants({
              variant: "outline",
              className: "h-12 justify-start gap-3 text-base",
            })}
          >
            <ClipboardListIcon className="size-5" />
            Ver kardex
          </a>
        </div>
      </section>

      {/* Recent movement — compact, at-a-glance. */}
      <section>
        <h2 className="mb-3 text-lg font-medium">Movimientos recientes</h2>
        {recientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay movimientos registrados.
          </p>
        ) : (
          <Card>
            <ul className="divide-y">
              {recientes.map((m) => (
                <li
                  key={m.idMovimientoCab}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge
                      variant={
                        m.tipoMovimiento === "ENTRADA"
                          ? "default"
                          : "secondary"
                      }
                      className="shrink-0"
                    >
                      {m.tipoMovimiento === "ENTRADA" ? (
                        <ArrowDownToLineIcon className="size-3.5" />
                      ) : (
                        <ArrowUpFromLineIcon className="size-3.5" />
                      )}
                      {m.tipoMovimiento}
                    </Badge>
                    <span className="truncate font-medium">
                      {m.nombreProducto}
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {m.cantidad} ud.
                    </span>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {FECHA_HORA.format(new Date(m.fecRegistro))}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
