"use client";

/**
 * RegistrarProductoModal — inline "registrar producto" capability for the
 * compra registrar flow (Fix 04, REQ 1.2.1).
 *
 * When the desired product does not exist in the catalog, the user opens a
 * modal (driven by the app-wide ModalProvider via useModal/openModal, mirroring
 * compra-detail-button.tsx) and registers a new product right there. The form
 * computes precioVenta automatically from costo (costo x 1.35); the backend
 * re-derives precio_venta from costo on compra save, so this is only a starting
 * estimate. On success it calls onCreated(producto) so the parent page can
 * refresh the catalog and auto-select the new product in the originating row,
 * preserving all other useFieldArray rows.
 */

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ApiError, apiClient, useModal } from "@hce/shared";
import type { Producto } from "@hce/shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
} from "@hce/shared/ui";

/** Validation mirrors RegistrarProductoDto; numbers arrive as strings so coerce. */
const schema = z.object({
  nombreProducto: z.string().min(1, "El nombre es obligatorio"),
  nroLote: z.string().min(1, "El lote es obligatorio"),
  costo: z.coerce.number().positive("El costo debe ser > 0"),
});

type FormValues = z.infer<typeof schema>;

const MONEDA = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Margin used to estimate the selling price from cost (informational only). */
const MARGEN_VENTA = 1.35;

function computePrecioVenta(costo: number): number {
  return Math.round(costo * MARGEN_VENTA * 100) / 100;
}

/**
 * Small button rendered beside each per-row product Select. Opens the global
 * modal with the registrar-producto form as its content.
 */
export function RegistrarProductoButton({
  onCreated,
}: {
  onCreated?: (producto: Producto) => void;
}) {
  const { openModal } = useModal();

  const handleClick = () => {
    openModal({
      title: "Registrar producto",
      description:
        "Registre un nuevo producto para incluirlo en esta compra. El precio de venta se calcula automáticamente (costo × 1.35).",
      content: <RegistrarProductoForm onCreated={onCreated} />,
      footer: null,
    });
  };

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto justify-start px-0 text-xs"
      onClick={handleClick}
    >
      ¿Producto no existe? Regístralo
    </Button>
  );
}

/**
 * Form rendered inside the global modal. Uses useModal().closeModal to dismiss
 * on success / cancel; stays open on error so the user can fix and retry.
 */
export function RegistrarProductoForm({
  onCreated,
}: {
  onCreated?: (producto: Producto) => void;
}) {
  const { closeModal } = useModal();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreProducto: "",
      nroLote: "",
      costo: 0,
    },
  });

  const costo = watch("costo");
  const precioVenta = computePrecioVenta(Number(costo) || 0);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const producto = await apiClient.productos.create({
        nombreProducto: values.nombreProducto,
        nroLote: values.nroLote,
        costo: values.costo,
        precioVenta,
      });
      toast.success("Producto registrado");
      onCreated?.(producto);
      closeModal();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "No se pudo registrar el producto.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="rp-nombreProducto">Nombre</Label>
        <Input
          id="rp-nombreProducto"
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
        <Label htmlFor="rp-nroLote">N° de lote</Label>
        <Input
          id="rp-nroLote"
          autoComplete="off"
          {...register("nroLote")}
        />
        {errors.nroLote ? (
          <p className="text-sm text-destructive">{errors.nroLote.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="rp-costo">Costo</Label>
          <Input
            id="rp-costo"
            type="number"
            step="0.01"
            min="0"
            {...register("costo")}
          />
          {errors.costo ? (
            <p className="text-sm text-destructive">{errors.costo.message}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          Precio venta (auto, costo × 1.35)
        </span>
        <span className="float-right font-medium">
          {MONEDA.format(precioVenta)}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={closeModal}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}