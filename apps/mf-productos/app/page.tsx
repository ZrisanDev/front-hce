"use client";

/**
 * Productos — list page (F4-T1, REQ-PROD-02).
 *
 * Locked decision (design v2): NO filters. A simple GET /api/productos list
 * rendered in the shared <DataTable> (sorting, global search, pagination,
 * column visibility). The list is wrapped in <AuthGuard> so a guest is sent
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
  DataTable,
  Skeleton,
  buttonVariants,
  createDataTableColumnHelper,
} from "@hce/shared/ui";

const MONEDA = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FECHA = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const helper = createDataTableColumnHelper<Producto>();

const columns = helper.columns([
  helper.accessor("id", { header: "ID" }),
  helper.accessor("nombreProducto", { header: "Nombre" }),
  helper.accessor("nroLote", { header: "Lote" }),
  helper.accessor("fecRegistro", {
    header: "Fecha registro",
    cell: ({ getValue }) => FECHA.format(new Date(getValue())),
  }),
  helper.accessor("costo", {
    header: "Costo",
    cell: ({ getValue }) => MONEDA.format(getValue()),
  }),
  helper.accessor("precioVenta", {
    header: "Precio venta",
    cell: ({ getValue }) => MONEDA.format(getValue()),
  }),
  helper.accessor("stockActual", {
    header: "Stock",
    cell: ({ getValue }) => MONEDA.format(getValue()),
  }),
  helper.accessor("estado", {
    header: "Estado",
    cell: ({ getValue }) => (
      <Badge variant={getValue() === "ACTIVO" ? "default" : "secondary"}>
        {getValue()}
      </Badge>
    ),
  }),
  helper.display({
    id: "acciones",
    header: "Acciones",
    cell: ({ row }) => (
      <a
        href={`${ROUTES.productos}/actualizar/${row.original.id}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Editar
      </a>
    ),
  }),
]);

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
      <div className="mb-6 flex items-center justify-end gap-4">
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
      ) : (
        <DataTable
          columns={columns}
          data={productos}
          searchPlaceholder="Buscar productos..."
          emptyMessage="No hay productos registrados todavía."
        />
      )}
    </div>
  );
}
