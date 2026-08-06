import type { ReactNode } from "react";

export const metadata = {
  title: "Compras · HCE",
  description: "Micro-frontend de Compras",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
