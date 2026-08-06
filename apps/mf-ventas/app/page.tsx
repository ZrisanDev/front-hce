"use client";

/**
 * Ventas — list page (F4-T6, REQ-VENTA-02).
 *
 * GET /api/ventas via apiClient.ventas.list() -> Venta[] (cabecera + embedded
 * detalles, typed in @hce/shared since PASO 0 of PR5). Rendered in the shared
 * <DataTable> (sorting, global search, pagination, column visibility).
 * loading/error states; the empty state is handled by the DataTable
 * emptyMessage. Cross-zone-safe nav with plain <a> built from ROUTES.ventas
 * (next/link cannot soft-navigate between Multi-Zones).
 *
 * On 401 the apiClient fires TriggerSessionExpired and the zone-level modal
 * (mounted in the layout) surfaces; we only render the ApiError.message here.
 */

import { useEffect, useState } from "react";
import { ApiError, AuthGuard, ROUTES, apiClient } from "@hce/shared";
import type { Venta } from "@hce/shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
  dateStyle: "medium",
  timeStyle: "short",
});

const helper = createDataTableColumnHelper<Venta>();

const columns = helper.columns([
  helper.accessor("idVentaCab", { header: "ID" }),
  helper.accessor("fecRegistro", {
    header: "Fecha",
    cell: ({ getValue }) => formatFecha(getValue()),
  }),
  helper.accessor("detalles", {
    header: "Items",
    cell: ({ getValue }) => getValue()?.length ?? 0,
  }),
  helper.accessor("total", {
    header: "Total",
    cell: ({ getValue }) => MONEDA.format(getValue()),
  }),
]);

export default function VentasListPage() {
  return (
    <AuthGuard>
      <VentasList />
    </AuthGuard>
  );
}

function VentasList() {
  const [ventas, setVentas] = useState<Venta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.ventas
      .list()
      .then((data) => {
        if (cancelled) return;
        setVentas(data ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el listado de ventas.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Ventas</h1>
        <a href={`${ROUTES.ventas}/registrar`} className={buttonVariants()}>
          Registrar venta
        </a>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : ventas === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={ventas}
          searchPlaceholder="Buscar ventas..."
          emptyMessage="No hay ventas registradas todavía."
        />
      )}
    </div>
  );
}

/** fecRegistro may arrive as an ISO string or a Date-serialized string. */
function formatFecha(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : FECHA.format(d);
}
