"use client";

/**
 * Compras — list page (F4-T4, REQ-COMPRA-02).
 *
 * GET /api/compras via apiClient.compras.list(). Columns: ID, Fecha, Items
 * (count), Total. loading/error/empty states. Cross-zone-safe nav with plain
 * <a> built from ROUTES.compras.
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
const FECHA = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
});

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
      ) : compras.length === 0 ? (
        <Alert>
          <AlertTitle>Sin compras</AlertTitle>
          <AlertDescription>No hay compras registradas todavía.</AlertDescription>
        </Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compras.map((c) => (
              <TableRow key={c.idCompraCab}>
                <TableCell>{c.idCompraCab}</TableCell>
                <TableCell>{formatFecha(c.fecRegistro)}</TableCell>
                <TableCell>{c.detalles?.length ?? 0}</TableCell>
                <TableCell>{MONEDA.format(c.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/** fecRegistro may arrive as an ISO string or a Date-serialized string. */
function formatFecha(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : FECHA.format(d);
}
