"use client";

/**
 * Ventas — registrar page with dynamic items (F4-T7, REQ-VENTA-01).
 *
 * Mirrors the mf-compras registrar pattern (F4-T5): react-hook-form +
 * useFieldArray + zod manage a dynamic list of sale lines. Each row shows
 * idProducto (Select populated from GET /api/productos, bridged to rhf via
 * Controller because base-ui Select uses onValueChange), cantidad (number
 * input), and a READ-ONLY precioVenta display (formatted as currency, taken
 * from the selected producto — the user does NOT enter a price; the backend
 * re-derives it from producto.precio_venta and ignores any client-sent value).
 *
 * Stock is derived from the movimiento table via GET /api/kardex (not from
 * producto.stockActual, which is no longer kept in sync on a sale per Fix 02).
 * Available stock per product = Σ ENTRADA.cantidad − Σ SALIDA.cantidad, shown
 * read-only per row. On typing cantidad the page computes document-level
 * Subtotal / IGV (18%) / Total = Σ cantidad × precioVenta × {1, 0.18, 1.18}.
 *
 * Validation: the schema rejects cantidad ≤ 0; on submit the page also asserts
 * cantidad ≤ stock for every row — if any row exceeds, it sets
 * "La cantidad no debe ser mayor al stock." and does NOT send. The backend
 * rejects stock-insufficient with 409 as a safety net, surfaced via ApiError.
 *
 * Payload: DocVentaDto = { items: [{ idProducto, cantidad }] } — NO precio is
 * sent to POST /api/ventas (enforced at compile time by DocVentaDto).
 *
 * Cross-zone eventing (Fase 5): on a successful create the page dispatches
 * emitInventoryChange({ origin: "venta" }) so other zones/tabs (e.g. mf-kardex)
 * can refresh. This fires before the redirect. Nav is cross-zone-safe: plain
 * <a> built from ROUTES.ventas. On success: a sonner toast + window.location
 * redirect to the ventas list.
 */

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useFieldArray,
  useForm,
  type ControllerRenderProps,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ApiError, AuthGuard, ROUTES, apiClient, emitInventoryChange } from "@hce/shared";
import type { Producto } from "@hce/shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  buttonVariants,
} from "@hce/shared/ui";

const itemSchema = z.object({
  idProducto: z.coerce.number().int().positive("Seleccione un producto"),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser > 0"),
});

const formSchema = z.object({
  items: z.array(itemSchema).min(1, "Agregue al menos un item"),
});

type FormValues = z.infer<typeof formSchema>;
type ItemField = ControllerRenderProps<FormValues, `items.${number}.idProducto`>;

const MONEDA = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function RegistrarVentaPage() {
  return (
    <AuthGuard>
      <RegistrarVenta />
    </AuthGuard>
  );
}

function RegistrarVenta() {
  const [productoMap, setProductoMap] = useState<Map<number, Producto> | null>(null);
  const [stock, setStock] = useState<Map<number, number> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ idProducto: 0, cantidad: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Load product catalog (for id/nombre/lote/precioVenta) and kardex movements
  // (to derive available stock — producto.stockActual is no longer maintained
  // on a sale per Fix 02, so stock must come from the movimiento table).
  useEffect(() => {
    let cancelled = false;
    Promise.all([apiClient.productos.list(), apiClient.kardex.list()])
      .then(([productos, movs]) => {
        if (cancelled) return;
        const byId = new Map<number, Producto>();
        for (const p of productos ?? []) byId.set(p.id, p);
        const stockByProduct = new Map<number, number>();
        for (const m of movs ?? []) {
          const delta = m.tipoMovimiento === "ENTRADA" ? m.cantidad : -m.cantidad;
          stockByProduct.set(
            m.idProducto,
            (stockByProduct.get(m.idProducto) ?? 0) + delta,
          );
        }
        setProductoMap(byId);
        setStock(stockByProduct);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el catálogo de productos o el kardex.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const watchedItems = watch("items");
  const subtotal = (watchedItems ?? []).reduce(
    (sum, it) =>
      sum +
      (Number(it.cantidad) || 0) *
        (Number(productoMap?.get(Number(it.idProducto))?.precioVenta) || 0),
    0,
  );
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    // Client-side stock check (Fix 02): reject before sending. The backend
    // also rejects stock-insufficient with 409 as a safety net.
    const insufficient = values.items.some(
      (it) => Number(it.cantidad) > (stock?.get(Number(it.idProducto)) ?? 0),
    );
    if (insufficient) {
      setSubmitError("La cantidad no debe ser mayor al stock.");
      return;
    }
    try {
      await apiClient.ventas.create({ items: values.items });
      // Notify other zones/tabs (e.g. mf-kardex) that inventory changed.
      emitInventoryChange({ origin: "venta" });
      toast.success("Venta registrada");
      window.location.href = ROUTES.ventas;
    } catch (err: unknown) {
      // Backend rejects e.g. on insufficient stock; surface its message.
      setSubmitError(
        err instanceof ApiError ? err.message : "No se pudo registrar la venta.",
      );
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (productoMap === null || stock === null) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Registrar venta</h1>

      {submitError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {fields.map((field, index) => {
          const itemError = errors.items?.[index];
          const rowIdProducto = Number(watchedItems?.[index]?.idProducto);
          const rowProducto = productoMap.get(rowIdProducto);
          const rowStock = stock.get(rowIdProducto) ?? 0;
          const rowCantidad = Number(watchedItems?.[index]?.cantidad) || 0;
          const overStock = rowIdProducto > 0 && rowCantidad > rowStock;
          return (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_6rem_7rem_6rem_auto] sm:items-end"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor={`items.${index}.idProducto`}>Producto</Label>
                <Controller
                  control={control}
                  name={`items.${index}.idProducto` as const}
                  render={({ field }: { field: ItemField }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger
                        id={`items.${index}.idProducto`}
                        className="w-full"
                      >
                        <SelectValue placeholder="Seleccione producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(productoMap.values()).map((p) => (
                          <SelectItem
                            key={p.id}
                            value={String(p.id)}
                          >
                            {p.nombreProducto} (lote {p.nroLote})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {itemError?.idProducto ? (
                  <p className="text-sm text-destructive">
                    {itemError.idProducto.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`items.${index}.cantidad`}>Cantidad</Label>
                <Input
                  id={`items.${index}.cantidad`}
                  type="number"
                  min="1"
                  step="1"
                  {...register(`items.${index}.cantidad` as const)}
                />
                {itemError?.cantidad ? (
                  <p className="text-sm text-destructive">
                    {itemError.cantidad.message}
                  </p>
                ) : null}
                {overStock ? (
                  <p className="text-sm text-destructive">
                    La cantidad no debe ser mayor al stock.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Precio venta</Label>
                <p className="h-9 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm tabular-nums">
                  {rowProducto
                    ? MONEDA.format(rowProducto.precioVenta)
                    : "—"}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Stock</Label>
                <p className="h-9 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm tabular-nums">
                  {rowIdProducto > 0 ? rowStock : "—"}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                aria-label="Quitar item"
              >
                Quitar
              </Button>
            </div>
          );
        })}

        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ idProducto: 0, cantidad: 0 })}
          >
            Agregar item
          </Button>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums">{MONEDA.format(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">IGV (18%)</span>
            <span className="font-medium tabular-nums">{MONEDA.format(igv)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-semibold tabular-nums">
              {MONEDA.format(total)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registrando…" : "Registrar venta"}
          </Button>
          <a href={ROUTES.ventas} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}