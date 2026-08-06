"use client";

/**
 * Kardex — filterable list page (F4-T8, REQ-KARDEX-01).
 *
 * GET /api/kardex via apiClient.kardex.list(filters) where filters is a
 * KardexFilters built from the filter bar (producto / fecha inicio+fin / tipo
 * de movimiento). Columns: ID Movimiento, Fecha, Tipo (Badge ENTRADA/SALIDA),
 * Origen (COMPRA/VENTA), Producto, Cantidad. States: loading (Skeleton), error
 * (Alert), and an explicit empty state "Sin resultados para los filtros
 * aplicados" (REQ-KARDEX-01). "Limpiar filtros" resets the bar.
 *
 * Filters are plain controlled state (no react-hook-form): they're simple
 * selects/inputs and rhf would be overkill. Cross-zone eventing (Fase 5): the
 * page subscribes to onInventoryChange so that when a compra/venta is
 * registered in another zone/tab it re-fetches the kardex with the currently
 * applied filters; the subscription is cleaned up on unmount.
 *
 * The producto Select is populated from GET /api/productos. The tipo Select
 * maps Entrada/Salida to idTipoMovimiento 1/2 (undefined = Todos). Sentinels
 * "__all__" keep base-ui Select values non-empty (it treats "" as the
 * placeholder sentinel).
 */

import { useCallback, useEffect, useState } from "react";
import { ApiError, AuthGuard, apiClient, onInventoryChange } from "@hce/shared";
import type { KardexFilters, MovimientoKardex, Producto } from "@hce/shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hce/shared/ui";

const FECHA = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Sentinel meaning "no filter" for base-ui Select values. */
const ALL = "__all__";

export default function KardexPage() {
  return (
    <AuthGuard>
      <KardexList />
    </AuthGuard>
  );
}

function KardexList() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoKardex[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter-bar state.
  const [fProducto, setFProducto] = useState<string>(ALL);
  const [fInicio, setFInicio] = useState<string>("");
  const [fFin, setFFin] = useState<string>("");
  const [fTipo, setFTipo] = useState<string>(ALL);

  const buildFilters = useCallback(
    (producto: string, inicio: string, fin: string, tipo: string): KardexFilters => {
      const filters: KardexFilters = {};
      if (producto !== ALL) filters.idProducto = Number(producto);
      if (inicio) filters.fechaInicio = inicio;
      if (fin) filters.fechaFin = fin;
      if (tipo === "1" || tipo === "2") {
        filters.idTipoMovimiento = Number(tipo) as 1 | 2;
      }
      return filters;
    },
    [],
  );

  const fetchKardex = useCallback(
    (filters: KardexFilters) => {
      setLoading(true);
      setError(null);
      let cancelled = false;
      apiClient.kardex
        .list(filters)
        .then((data) => {
          if (cancelled) return;
          setMovimientos(data ?? []);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar el kardex.",
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    },
    [],
  );

  // Initial load: product catalog + full kardex (no filters).
  useEffect(() => {
    let cancelled = false;
    apiClient.productos
      .list()
      .then((data) => {
        if (!cancelled) setProductos(data ?? []);
      })
      .catch(() => {
        // Catalog is best-effort for the filter Select; leave empty on error.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = fetchKardex({});
    return cancel;
  }, [fetchKardex]);

  // Cross-zone inventory refresh (F5-T3): when a compra/venta is registered in
  // another zone or tab, the @hce/shared window event fires; re-fetch the
  // kardex with the currently-applied filters. The effect re-subscribes when a
  // filter changes so the callback closure is always fresh, and the returned
  // unsubscribe cleans up on unmount.
  useEffect(() => {
    const unsubscribe = onInventoryChange(() => {
      fetchKardex(buildFilters(fProducto, fInicio, fFin, fTipo));
    });
    return unsubscribe;
  }, [fProducto, fInicio, fFin, fTipo, fetchKardex, buildFilters]);

  function aplicarFiltros() {
    fetchKardex(buildFilters(fProducto, fInicio, fFin, fTipo));
  }

  function limpiarFiltros() {
    setFProducto(ALL);
    setFInicio("");
    setFFin("");
    setFTipo(ALL);
    fetchKardex({});
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Kardex</h1>

      {/* Filter bar */}
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="f-producto">Producto</Label>
          <Select value={fProducto} onValueChange={(v) => setFProducto(v ?? ALL)}>
            <SelectTrigger id="f-producto" className="w-full">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {productos.map((p) => (
                <SelectItem key={p.idProducto} value={String(p.idProducto)}>
                  {p.nombreProducto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="f-inicio">Fecha inicio</Label>
          <Input
            id="f-inicio"
            type="date"
            value={fInicio}
            onChange={(e) => setFInicio(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="f-fin">Fecha fin</Label>
          <Input
            id="f-fin"
            type="date"
            value={fFin}
            onChange={(e) => setFFin(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="f-tipo">Tipo de movimiento</Label>
          <Select value={fTipo} onValueChange={(v) => setFTipo(v ?? ALL)}>
            <SelectTrigger id="f-tipo" className="w-full">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="1">Entrada</SelectItem>
              <SelectItem value="2">Salida</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-full flex flex-wrap items-center gap-2">
          <Button type="button" onClick={aplicarFiltros} disabled={loading}>
            {loading ? "Cargando…" : "Aplicar filtros"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={limpiarFiltros}
            disabled={loading}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>

      {/* Results */}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading || movimientos === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : movimientos.length === 0 ? (
        <Alert>
          <AlertTitle>Sin resultados</AlertTitle>
          <AlertDescription>
            Sin resultados para los filtros aplicados.
          </AlertDescription>
        </Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Movimiento</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.map((m) => (
              <TableRow key={m.idMovimientoCab}>
                <TableCell>{m.idMovimientoCab}</TableCell>
                <TableCell>{formatFecha(m.fecRegistro)}</TableCell>
                <TableCell>
                  <Badge
                    variant={m.tipoMovimiento === "ENTRADA" ? "default" : "secondary"}
                  >
                    {m.tipoMovimiento}
                  </Badge>
                </TableCell>
                <TableCell>{m.tipoDocumentoOrigen}</TableCell>
                <TableCell>{m.nombreProducto}</TableCell>
                <TableCell>{m.cantidad}</TableCell>
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
