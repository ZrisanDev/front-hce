"use client";

/**
 * Compras — registrar page with dynamic items (F4-T5, REQ-COMPRA-01).
 *
 * react-hook-form + useFieldArray + zod manage a dynamic list of ItemDto. Each
 * row: idProducto (Select populated from GET /api/productos), cantidad and
 * precio (number inputs). The payload is DocDto = { items: ItemDto[] } sent via
 * apiClient.compras.create. Subtotal/total are computed in the UI as an
 * informational hint (the backend recalculates).
 *
 * Cross-zone eventing (Fase 5): on a successful create the page dispatches
 * emitInventoryChange({ origin: "compra" }) so other zones/tabs displaying
 * derived data (e.g. mf-kardex) can refresh. This fires before the redirect.
 *
 * Nav is cross-zone-safe: plain <a> built from ROUTES.compras. On success: a
 * sonner toast + window.location redirect to the compras list; on failure: the
 * backend ApiError.message in an Alert.
 */

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, type ControllerRenderProps } from "react-hook-form";
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
import { Controller } from "react-hook-form";

const itemSchema = z.object({
  idProducto: z.coerce.number().int().positive("Seleccione un producto"),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser > 0"),
  precio: z.coerce.number().nonnegative("El precio debe ser ≥ 0"),
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

export default function RegistrarCompraPage() {
  return (
    <AuthGuard>
      <RegistrarCompra />
    </AuthGuard>
  );
}

function RegistrarCompra() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        items: [{ idProducto: 0, cantidad: 0, precio: 0 }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Load product catalog for the per-row Select.
  useEffect(() => {
    let cancelled = false;
    apiClient.productos
      .list()
      .then((data) => {
        if (!cancelled) setProductos(data ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el catálogo de productos.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const watchedItems = watch("items");
  const total = (watchedItems ?? []).reduce(
    (sum, it) => sum + (Number(it.cantidad) || 0) * (Number(it.precio) || 0),
    0,
  );

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await apiClient.compras.create({ items: values.items });
      // Notify other zones/tabs (e.g. mf-kardex) that inventory changed.
      emitInventoryChange({ origin: "compra" });
      toast.success("Compra registrada");
      window.location.href = ROUTES.compras;
    } catch (err: unknown) {
      setSubmitError(
        err instanceof ApiError ? err.message : "No se pudo registrar la compra.",
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

  if (productos === null) {
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
      <h1 className="mb-6 text-2xl font-semibold">Registrar compra</h1>

      {submitError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {fields.map((field, index) => {
          const itemError = errors.items?.[index];
          return (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-end"
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
                      <SelectTrigger id={`items.${index}.idProducto`} className="w-full">
                        <SelectValue placeholder="Seleccione producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {productos.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
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
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`items.${index}.precio`}>Precio</Label>
                <Input
                  id={`items.${index}.precio`}
                  type="number"
                  min="0"
                  step="0.01"
                  {...register(`items.${index}.precio` as const)}
                />
                {itemError?.precio ? (
                  <p className="text-sm text-destructive">
                    {itemError.precio.message}
                  </p>
                ) : null}
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
            onClick={() => append({ idProducto: 0, cantidad: 0, precio: 0 })}
          >
            Agregar item
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Total (informativo)</span>
          <span className="text-lg font-semibold">{MONEDA.format(total)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registrando…" : "Registrar compra"}
          </Button>
          <a
            href={ROUTES.compras}
            className={buttonVariants({ variant: "outline" })}
          >
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
