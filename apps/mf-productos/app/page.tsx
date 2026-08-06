"use client";

/**
 * Productos — list page (F4-T1, REQ-PROD-02).
 *
 * Locked decision (design v2): NO filters. A simple GET /api/productos list
 * rendered in a table. The list is wrapped in <AuthGuard> so a guest is sent
 * to the shell login and the optimistic-checking skeleton shows while the
 * AuthProvider resolves.
 *
 * Cross-zone-safe navigation: every link is a plain <a href> built from
 * ROUTES.productos (basePath is /productos in this zone, reached as
 * /productos/* both directly and through the shell proxy, so an absolute
 * /productos/... path works in both cases). next/link soft-navigates and
 * breaks between zones.
 */

import { useEffect, useState } from "react";
import { ApiError, AuthGuard, ROUTES, apiClient } from "@hce/shared";
import type { Producto } from "@hce/shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  buttonVariants,
} from "@hce/shared/ui";

const MONEDA = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function ProductosListPage() {
  return (
    <AuthGuard>
      <ProductosList />
    </AuthGuard>
  );
}

function ProductosList() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.productos
      .list()
      .then((data) => {
        if (!cancelled) setProductos(data ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el listado de productos.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <a href={`${ROUTES.productos}/registrar`} className={buttonVariants()}>
          Registrar producto
        </a>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : productos === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : productos.length === 0 ? (
        <Alert>
          <AlertTitle>Sin productos</AlertTitle>
          <AlertDescription>
            No hay productos registrados todavía.
          </AlertDescription>
        </Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Precio venta</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.nombreProducto}</TableCell>
                <TableCell>{p.nroLote}</TableCell>
                <TableCell>{MONEDA.format(p.costo)}</TableCell>
                <TableCell>{MONEDA.format(p.precioVenta)}</TableCell>
                <TableCell>
                  {p.stockActual}
                  <span className="text-muted-foreground">
                    {" "}
                    / mín {p.stockMinimo}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={p.estado === "ACTIVO" ? "default" : "secondary"}
                  >
                    {p.estado}
                  </Badge>
                </TableCell>
                <TableCell>
                  <a
                    href={`${ROUTES.productos}/actualizar/${p.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Editar
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
