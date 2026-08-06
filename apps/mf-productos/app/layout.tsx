import type { ReactNode } from "react";

export const metadata = {
  title: "Productos · HCE",
  description: "Micro-frontend de Productos",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
