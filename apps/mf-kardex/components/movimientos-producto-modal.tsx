"use client";

/**
 * VerMovimientosButton — "Ver movimientos" action rendered in each row of the
 * per-product Kardex DataTable (REQ-KARDEX-01).
 *
 * Opens the shared global modal (useModal from @hce/shared) listing the
 * movements of the product passed in: a table with the three columns the exam
 * asks for (Fecha registro | Tipo Movimiento | Cantidad). The modal is driven
 * by the app-wide ModalProvider, so this component only needs to call
 * openModal() — it stays stateless.
 *
 * The movements list is pre-filtered by idProducto when this button is
 * rendered (the page builds a Map<number, MovimientoKardex[]> once per load);
 * we keep that contract simple by also filtering here defensively.
 */

import { useModal } from "@hce/shared";
import type { MovimientoKardex, Producto } from "@hce/shared";
import {
  Badge,
  Button,
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

export function VerMovimientosButton({
  producto,
  movimientos,
}: {
  producto: Producto;
  movimientos: MovimientoKardex[];
}) {
  const { openModal } = useModal();

  const handleClick = () => {
    const movs = movimientos.filter((m) => m.idProducto === producto.id);
    openModal({
      title: `Movimientos — ${producto.nombreProducto}`,
      description: `Lote ${producto.nroLote}`,
      content: <ListaMovimientos movs={movs} />,
      footer: (close) => (
        <Button variant="outline" onClick={close}>
          Cerrar
        </Button>
      ),
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      Ver movimientos
    </Button>
  );
}

/** Movements body rendered inside the global modal. */
function ListaMovimientos({ movs }: { movs: MovimientoKardex[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha registro</TableHead>
            <TableHead>Tipo Movimiento</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-16 text-center text-muted-foreground"
              >
                Sin movimientos registrados.
              </TableCell>
            </TableRow>
          ) : (
            movs.map((m) => (
              <TableRow key={m.idMovimientoCab}>
                <TableCell>{formatFecha(m.fecRegistro)}</TableCell>
                <TableCell>
                  <Badge
                    variant={m.tipoMovimiento === "ENTRADA" ? "default" : "secondary"}
                  >
                    {m.tipoMovimiento}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {m.tipoMovimiento === "SALIDA"
                    ? `-${m.cantidad}`
                    : m.cantidad}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/** fecRegistro may arrive as an ISO string or a Date-serialized string. */
function formatFecha(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : FECHA.format(d);
}