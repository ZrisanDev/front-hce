"use client";

/**
 * Compras — list page (F4-T4, REQ-COMPRA-02).
 *
 * GET /api/compras via apiClient.compras.list(). Rendered in the shared
 * <DataTable> (sorting, global search, pagination, column visibility).
 * loading/error states; the empty state is handled by the DataTable
 * emptyMessage. Cross-zone-safe nav with plain <a> built from ROUTES.compras.
 *
 * apiClient.compras.list() returns Compra[] (cabecera + embedded detalles),
 * typed against @hce/shared since PASO 0 of PR5 corrected the shared types to
 * match the back-hce contract.
 */

import { useEffect, useState } from "react";
import { ApiError, AuthGuard, ROUTES, apiClient } from "@hce/shared";
import type { Compra } from "@hce/shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  DataTable,
  Skeleton,
  buttonVariants,
  createDataTableColumnHelper,
} from "@hce/shared/ui";
import { CompraDetailButton } from "../components/compra-detail-button";

const MONEDA = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const FECHA = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
});

const helper = createDataTableColumnHelper<Compra>();

const columns = helper.columns([
  helper.accessor("idCompraCab", { header: "ID" }),
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
  helper.display({
    id: "acciones",
    header: "Acciones",
    cell: ({ row }) => <CompraDetailButton compra={row.original} />,
  }),
]);

export default function ComprasListPage() {
  return (
    <AuthGuard>
      <ComprasList />
    </AuthGuard>
  );
}

function ComprasList() {
  const [compras, setCompras] = useState<Compra[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.compras
      .list()
      .then((data) => {
        if (cancelled) return;
        setCompras(data ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el listado de compras.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Compras</h1>
        <a href={`${ROUTES.compras}/registrar`} className={buttonVariants()}>
          Registrar compra
        </a>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : compras === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={compras}
          searchPlaceholder="Buscar compras..."
          emptyMessage="No hay compras registradas todavía."
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
