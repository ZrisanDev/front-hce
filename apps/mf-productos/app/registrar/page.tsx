"use client";

/**
 * Productos — registrar page (F4-T2, REQ-PROD-01).
 *
 * react-hook-form + zod drive a plain HTML <form> (the base-nova UI kit ships
 * no shadcn `form` wrapper — see packages/shared/src/ui/index.ts note). On
 * success it hard-redirects to the productos list (cross-zone-safe
 * window.location) and shows a sonner toast; on failure it surfaces the
 * backend ApiError.message inside an Alert. Nav uses plain <a href> built
 * from ROUTES.productos.
 */

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ApiError, AuthGuard, ROUTES, apiClient } from "@hce/shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
  buttonVariants,
} from "@hce/shared/ui";

/**
 * Client-side validation mirrors the RegistrarProductoDto contract. Numbers
 * come from <input type="number"> as strings, so coerce before validating.
 */
const schema = z.object({
  nombreProducto: z.string().min(1, "El nombre es obligatorio"),
  nroLote: z.string().min(1, "El lote es obligatorio"),
  costo: z.coerce.number().nonnegative("El costo debe ser ≥ 0"),
  precioVenta: z.coerce.number().nonnegative("El precio debe ser ≥ 0"),
});

type FormValues = z.infer<typeof schema>;

export default function RegistrarProductoPage() {
  return (
    <AuthGuard>
      <RegistrarProducto />
    </AuthGuard>
  );
}

function RegistrarProducto() {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreProducto: "",
      nroLote: "",
      costo: 0,
      precioVenta: 0,
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await apiClient.productos.create(values);
      toast.success("Producto registrado");
      window.location.href = ROUTES.productos;
    } catch (err: unknown) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "No se pudo registrar el producto.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Registrar producto</h1>

      {submitError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nombreProducto">Nombre</Label>
          <Input
            id="nombreProducto"
            autoComplete="off"
            {...register("nombreProducto")}
          />
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
            {isSubmitting ? "Guardando…" : "Registrar"}
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
