"use client";

/**
 * CompraDetailButton — "Ver detalles" action rendered in each row of the
 * Compras DataTable.
 *
 * Opens the shared global modal (useModal from @hce/shared) with the purchase
 * detail: a line-items table (producto, cantidad, precio, subtotal) plus a
 * subtotal / IGV / total summary. The modal is driven by the app-wide
 * ModalProvider, so this component only needs to call openModal().
 */

import { useModal } from "@hce/shared";
import type { Compra } from "@hce/shared";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hce/shared/ui";

const MONEDA = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const FECHA = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CompraDetailButton({ compra }: { compra: Compra }) {
  const { openModal } = useModal();

  const handleClick = () => {
    openModal({
      title: `Compra #${compra.idCompraCab}`,
      description: `Registrada el ${formatFecha(compra.fecRegistro)}`,
      content: <CompraDetail compra={compra} />,
      footer: (close) => (
        <Button variant="outline" onClick={close}>
          Cerrar
        </Button>
      ),
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      Ver detalles
    </Button>
  );
}

/** Detail body rendered inside the global modal. */
function CompraDetail({ compra }: { compra: Compra }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compra.detalles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-16 text-center text-muted-foreground"
                >
                  Sin ítems registrados.
                </TableCell>
              </TableRow>
            ) : (
              compra.detalles.map((det) => (
                <TableRow key={det.idCompraDet}>
                  <TableCell>#{det.idProducto}</TableCell>
                  <TableCell className="text-right">{det.cantidad}</TableCell>
                  <TableCell className="text-right">
                    {MONEDA.format(det.precio)}
                  </TableCell>
                  <TableCell className="text-right">
                    {MONEDA.format(det.subTotal)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="text-right">{MONEDA.format(compra.subTotal)}</dd>
        <dt className="text-muted-foreground">IGV</dt>
        <dd className="text-right">{MONEDA.format(compra.igv)}</dd>
        <dt className="font-medium">Total</dt>
        <dd className="text-right font-medium">{MONEDA.format(compra.total)}</dd>
      </dl>
    </div>
  );
}

/** fecRegistro may arrive as an ISO string or a Date-serialized string. */
function formatFecha(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : FECHA.format(d);
}
