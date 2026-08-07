"use client";

/**
 * Kardex — per-product Kardex page (REQ-KARDEX-01, exam requirement 1.2.3).
 *
 * The exam asks for a PRODUCTS table showing id_producto, nombre_producto,
 * stock_actual, costo, precio_venta, PLUS a per-row button that opens a modal
 * listing the product's movements (Fecha registro | Tipo Movimiento | Cantidad
 * — compra/venta). This view replaces the previous flat movement list.
 *
 * Data sources loaded in parallel on mount:
 *   - apiClient.productos.list() → catalog (id / nombre / lote / costo /
 *     precioVenta)
 *   - apiClient.kardex.list(filters) → MovimientoKardex[] used both for the
 *     "Ver movimientos" modal and to DERIVE stock_actual per product:
 *       stockMap[id] = Σ (ENTRADA ? +cantidad : -cantidad)
 *     We deliberately do NOT read producto.stockActual: post-Fix-02
 *     sp_venta_registrar no longer maintains producto.stock_actual, so that
 *     column would be stale. The movement aggregation is the only correct
 *     source of truth ("basarte en la tabla movimiento").
 *
 * Filters: the existing filter bar (producto / fecha inicio+fin / tipo) scopes
 * the kardex load. The product table always renders the full catalog; the
 * derived stock and the modal reflect ONLY the movements matching the active
 * filters. With no filters, that means the true current stock. With a date
 * range, the stock column reads as the net movement within that window — a
 * reasonable behavior for a filterable kardex.
 *
 * Cross-zone eventing (Fase 5): the page subscribes to onInventoryChange so a
 * compra/venta registered in another zone/tab re-fetches the kardex with the
 * current filters; the subscription is cleaned up on unmount.
 *
 * Filters are plain controlled state (no react-hook-form): they're simple
 * selects/inputs and rhf would be overkill. Sentinels "__all__" keep base-ui
 * Select values non-empty (it treats "" as the placeholder sentinel).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, AuthGuard, apiClient, onInventoryChange } from "@hce/shared";
import type { KardexFilters, MovimientoKardex, Producto } from "@hce/shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  DataTable,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  createDataTableColumnHelper,
} from "@hce/shared/ui";
import { VerMovimientosButton } from "../components/movimientos-producto-modal";

const MONEDA = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Sentinel meaning "no filter" for base-ui Select values. */
const ALL = "__all__";

const helper = createDataTableColumnHelper<Producto>();

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

  /**
   * stockMap: derived stock_actual per product from the (filtered) movements.
   * ENTRADA adds cantidad, SALIDA subtracts it. We do NOT read
   * producto.stockActual — post-Fix-02 that column is stale for sales.
   * movimientosPorProducto: pre-grouped movements so the per-row modal button
   * never re-filters on each open; both maps recompute when `movimientos`
   * changes (i.e. on every kardex load with new filters).
   */
  const { stockMap, movimientosPorProducto } = useMemo(() => {
    const stocks = new Map<number, number>();
    const porProducto = new Map<number, MovimientoKardex[]>();
    if (movimientos) {
      for (const m of movimientos) {
        const delta = m.tipoMovimiento === "ENTRADA" ? m.cantidad : -m.cantidad;
        stocks.set(m.idProducto, (stocks.get(m.idProducto) ?? 0) + delta);
        const bucket = porProducto.get(m.idProducto);
        if (bucket) bucket.push(m);
        else porProducto.set(m.idProducto, [m]);
      }
    }
    return { stockMap: stocks, movimientosPorProducto: porProducto };
  }, [movimientos]);

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("id", { header: "ID" }),
        helper.accessor("nombreProducto", { header: "Producto" }),
        helper.display({
          id: "stock",
          header: "Stock actual",
          cell: ({ row }) => stockMap.get(row.original.id) ?? 0,
        }),
        helper.accessor("costo", {
          header: "Costo",
          cell: ({ getValue }) => MONEDA.format(getValue<number>()),
        }),
        helper.accessor("precioVenta", {
          header: "Precio venta",
          cell: ({ getValue }) => MONEDA.format(getValue<number>()),
        }),
        helper.display({
          id: "acciones",
          header: "Movimientos",
          cell: ({ row }) => (
            <VerMovimientosButton
              producto={row.original}
              movimientos={movimientosPorProducto.get(row.original.id) ?? []}
            />
          ),
        }),
      ]),
    [stockMap, movimientosPorProducto],
  );

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
                <SelectItem key={p.id} value={String(p.id)}>
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
      ) : (
        <DataTable
          columns={columns}
          data={productos}
          searchPlaceholder="Buscar producto..."
          emptyMessage="Sin productos para los filtros aplicados."
        />
      )}
    </div>
  );
}
