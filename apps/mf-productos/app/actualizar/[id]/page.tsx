"use client";

/**
 * Productos — actualizar page (F4-T3, REQ-PROD-01).
 *
 * Dynamic route [id]; Client Component, so params is a Promise unwrapped with
 * React's use(). The back-hce producto controller exposes no
 * GET /api/productos/:id (only list/post/patch/delete), so the existing record
 * is loaded via apiClient.productos.list() and filtered by id client-side
 * (pragmatic option, pre-approved). Form is pre-populated from that record;
 * PATCH sends an ActualizarProductoDto (Partial). Success → sonner toast +
 * hard redirect to the list; failure → Alert with the backend message.
 */

import { use, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ApiError, AuthGuard, ROUTES, apiClient } from "@hce/shared";
import type { Producto } from "@hce/shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
  Skeleton,
  buttonVariants,
} from "@hce/shared/ui";

const schema = z.object({
  nombreProducto: z.string().min(1, "El nombre es obligatorio"),
  nroLote: z.string().min(1, "El lote es obligatorio"),
  costo: z.coerce.number().nonnegative("El costo debe ser ≥ 0"),
  precioVenta: z.coerce.number().nonnegative("El precio debe ser ≥ 0"),
});

type FormValues = z.infer<typeof schema>;

export default function ActualizarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <ActualizarProducto id={id} />
    </AuthGuard>
  );
}

function ActualizarProducto({ id }: { id: string }) {
  const numericId = Number(id);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Load the existing product (list + filter — no GET /:id on the backend).
  useEffect(() => {
    if (!Number.isFinite(numericId)) {
      setLoadError("Identificador de producto inválido.");
      return;
    }
    let cancelled = false;
    apiClient.productos
      .list()
      .then((data) => {
        if (cancelled) return;
        const found = (data ?? []).find((p) => p.id === numericId);
        if (!found) {
          setLoadError("Producto no encontrado.");
          return;
        }
        setProducto(found);
        reset({
          nombreProducto: found.nombreProducto,
          nroLote: found.nroLote,
          costo: found.costo,
          precioVenta: found.precioVenta,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el producto.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [numericId, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await apiClient.productos.update(numericId, values);
      toast.success("Producto actualizado");
      window.location.href = ROUTES.productos;
    } catch (err: unknown) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar el producto.",
      );
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <a
          href={ROUTES.productos}
          className={`${buttonVariants({ variant: "outline" })} mt-4`}
        >
          Volver al listado
        </a>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-8">
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">
        Actualizar producto <span className="text-muted-foreground">#{producto.id}</span>
      </h1>

      {submitError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nombreProducto">Nombre</Label>
          <Input id="nombreProducto" autoComplete="off" {...register("nombreProducto")} />
          {errors.nombreProducto ? (
            <p className="text-sm text-destructive">
              {errors.nombreProducto.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="nroLote">N° de lote</Label>
          <Input id="nroLote" autoComplete="off" {...register("nroLote")} />
          {errors.nroLote ? (
            <p className="text-sm text-destructive">{errors.nroLote.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="costo">Costo</Label>
            <Input id="costo" type="number" step="0.01" min="0" {...register("costo")} />
            {errors.costo ? (
              <p className="text-sm text-destructive">{errors.costo.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="precioVenta">Precio de venta</Label>
            <Input
              id="precioVenta"
              type="number"
              step="0.01"
              min="0"
              {...register("precioVenta")}
            />
            {errors.precioVenta ? (
              <p className="text-sm text-destructive">
                {errors.precioVenta.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Guardar cambios"}
          </Button>
          <a
            href={ROUTES.productos}
            className={buttonVariants({ variant: "outline" })}
          >
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
