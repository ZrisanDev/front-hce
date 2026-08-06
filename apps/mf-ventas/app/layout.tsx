import type { ReactNode } from "react";

export const metadata = {
  title: "Ventas · HCE",
  description: "Micro-frontend de Ventas",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
